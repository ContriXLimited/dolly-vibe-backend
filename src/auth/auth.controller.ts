import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Wallet-based login for verified users' })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful - all verification steps completed',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clj123456789' },
            walletAddress: { type: 'string', example: '0x1234567890123456789012345678901234567890' },
            discordId: { type: 'string', example: '123456789' },
            twitterId: { type: 'string', example: '987654321' },
            allConnected: { type: 'boolean', example: true },
            isJoined: { type: 'boolean', example: true },
            isFollowed: { type: 'boolean', example: true }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Access denied - verification steps incomplete',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Access denied. Please complete all verification steps: wallet connection, Discord join, and Twitter follow.' }
      }
    }
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 401, description: 'Email already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ 
    status: 200, 
    description: 'Profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'clj123456789' },
        walletAddress: { type: 'string', example: '0x1234567890123456789012345678901234567890' },
        discordId: { type: 'string', example: '123456789' },
        twitterId: { type: 'string', example: '987654321' },
        discordUsername: { type: 'string', example: 'user#1234' },
        twitterUsername: { type: 'string', example: 'dollyuser' },
        allConnected: { type: 'boolean', example: true },
        isJoined: { type: 'boolean', example: true },
        isFollowed: { type: 'boolean', example: true },
        status: { type: 'string', example: 'NORMAL' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@Request() req) {
    return req.user;
  }
}