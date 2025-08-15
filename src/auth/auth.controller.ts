import { Controller, UseGuards, Get, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}


  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile (requires wallet login JWT)' })
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