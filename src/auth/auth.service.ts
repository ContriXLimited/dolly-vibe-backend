import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { Client, ClientStatus, VibeUserStatus } from '@prisma/client';
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

  async validateVibeUser(walletAddress: string): Promise<any> {
    const vibeUser = await this.prisma.vibeUser.findFirst({
      where: { 
        walletAddress: walletAddress.toLowerCase(),
        status: VibeUserStatus.NORMAL, // 确保用户状态正常
      },
    });

    if (!vibeUser) {
      return null;
    }

    // 检查是否完成所有必要的连接和验证
    const isFullyVerified = 
      vibeUser.walletConnected &&     // 钱包已连接
      vibeUser.discordConnected &&    // Discord已连接
      vibeUser.twitterConnected &&    // Twitter已连接
      vibeUser.isJoined &&            // 已加入Discord服务器
      vibeUser.isFollowed &&          // 已关注Twitter
      vibeUser.allConnected;          // 全部连接完成

    if (!isFullyVerified) {
      return null;
    }

    return vibeUser;
  }

  async login(loginDto: LoginDto) {
    const vibeUser = await this.validateVibeUser(loginDto.walletAddress);
    if (!vibeUser) {
      throw new UnauthorizedException(
        'Access denied. Please complete all verification steps: wallet connection, Discord join, and Twitter follow.'
      );
    }

    const payload = { 
      walletAddress: vibeUser.walletAddress,
      sub: vibeUser.id, 
      discordId: vibeUser.discordId,
      twitterId: vibeUser.twitterId,
      discordUsername: vibeUser.discordUsername,
      twitterUsername: vibeUser.twitterUsername,
      status: vibeUser.status,
      allConnected: vibeUser.allConnected,
      completedAt: vibeUser.completedAt
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: vibeUser.id,
        walletAddress: vibeUser.walletAddress,
        discordId: vibeUser.discordId,
        twitterId: vibeUser.twitterId,
        discordUsername: vibeUser.discordUsername,
        twitterUsername: vibeUser.twitterUsername,
        discordConnected: vibeUser.discordConnected,
        twitterConnected: vibeUser.twitterConnected,
        walletConnected: vibeUser.walletConnected,
        isJoined: vibeUser.isJoined,
        isFollowed: vibeUser.isFollowed,
        allConnected: vibeUser.allConnected,
        completedAt: vibeUser.completedAt,
        status: vibeUser.status,
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

  async findVibeUserById(id: string) {
    return this.prisma.vibeUser.findUnique({
      where: { id },
    });
  }

  async findClientById(id: string): Promise<Client | null> {
    return this.prisma.client.findUnique({
      where: { id },
    });
  }

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

  // Legacy method for backward compatibility
  async validateUser(email: string, password: string): Promise<any> {
    return this.validateClient(email, password);
  }

  // Legacy method for backward compatibility
  async findUserById(id: string): Promise<Client | null> {
    return this.findClientById(id);
  }
}