import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { Client, ClientStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { createId } from '@paralleldrive/cuid2';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateClient(email: string, password: string): Promise<any> {
    const client = await this.prisma.client.findUnique({
      where: { email },
    });

    if (client && 
        client.status === ClientStatus.NORMAL &&
        (await bcrypt.compare(password, client.passwordHash))) {
      const { passwordHash, ...result } = client;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const client = await this.validateClient(loginDto.email, loginDto.password);
    if (!client) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login time
    await this.prisma.client.update({
      where: { id: client.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = { 
      email: client.email, 
      sub: client.id, 
      username: client.username,
      status: client.status 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: client.id,
        email: client.email,
        username: client.username,
        avatar: client.avatar,
        discordId: client.discordId,
        telegramId: client.telegramId,
        status: client.status,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const existingClient = await this.prisma.client.findUnique({
      where: { email: registerDto.email },
    });

    if (existingClient) {
      throw new UnauthorizedException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const client = await this.prisma.client.create({
      data: {
        id: createId(),
        email: registerDto.email,
        passwordHash: hashedPassword,
        username: registerDto.name,
        status: ClientStatus.NORMAL,
      },
    });

    const { passwordHash, ...result } = client;
    return result;
  }

  async findClientById(id: string): Promise<Client | null> {
    return this.prisma.client.findUnique({
      where: { id },
    });
  }

  // Legacy method for backward compatibility
  async validateUser(email: string, password: string): Promise<any> {
    return this.validateClient(email, password);
  }

  // Legacy method for backward compatibility
  async findUserById(id: string): Promise<Client | null> {
    return this.findClientById(id);
  }
}