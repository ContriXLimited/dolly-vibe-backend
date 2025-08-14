import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserStatusService, UserConnectionStatus } from './user-status.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('User Connection Status')
@Controller('auth/user')
export class UserStatusController {
  constructor(private readonly userStatusService: UserStatusService) {}

  @Get('status/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户所有连接状态' })
  @ApiResponse({ 
    status: 200, 
    description: 'User connection status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        discord: {
          type: 'object',
          properties: {
            connected: { type: 'boolean', example: true },
            username: { type: 'string', example: 'user#1234' },
            userId: { type: 'string', example: '123456789' },
            verified: { type: 'boolean', example: true, description: '是否加入0G Discord' },
            connectedAt: { type: 'string', format: 'date-time' }
          }
        },
        twitter: {
          type: 'object',
          properties: {
            connected: { type: 'boolean', example: true },
            username: { type: 'string', example: 'dollyuser' },
            userId: { type: 'string', example: '987654321' },
            verified: { type: 'boolean', example: true, description: '是否关注Dolly' },
            connectedAt: { type: 'string', format: 'date-time' }
          }
        },
        wallet: {
          type: 'object',
          properties: {
            connected: { type: 'boolean', example: true },
            walletAddress: { type: 'string', example: '0x123...789' },
            verifiedAt: { type: 'string', format: 'date-time' }
          }
        },
        overall: {
          type: 'object',
          properties: {
            allConnected: { type: 'boolean', example: true },
            completedAt: { type: 'string', format: 'date-time' },
            canProceed: { type: 'boolean', example: true, description: '是否可以点击Let\'s Vibe按钮' }
          }
        }
      }
    }
  })
  @ApiParam({ name: 'id', description: 'VibeUser ID' })
  async getUserStatus(@Param('id') vibeUserId: string): Promise<UserConnectionStatus> {
    return this.userStatusService.getUserStatus(vibeUserId);
  }

  @Get('status')
  @ApiOperation({ summary: '根据标识符获取用户连接状态' })
  @ApiResponse({ 
    status: 200, 
    description: 'User status retrieved or created successfully'
  })
  @ApiQuery({ name: 'discordId', required: false, description: 'Discord user ID' })
  @ApiQuery({ name: 'twitterId', required: false, description: 'Twitter user ID' })
  @ApiQuery({ name: 'walletAddress', required: false, description: 'Wallet address' })
  async getUserStatusByIdentifier(
    @Query('discordId') discordId?: string,
    @Query('twitterId') twitterId?: string,
    @Query('walletAddress') walletAddress?: string,
  ): Promise<{ vibeUserId: string; status: UserConnectionStatus }> {
    
    // 查找或创建用户
    const vibeUserId = await this.userStatusService.findOrCreateUser({
      discordId,
      twitterId,
      walletAddress,
    });

    // 获取用户状态
    const status = await this.userStatusService.getUserStatus(vibeUserId);

    return { vibeUserId, status };
  }

  @Post('connect/discord')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新用户Discord连接状态' })
  @ApiResponse({ status: 200, description: 'Discord status updated successfully' })
  async updateDiscordConnection(
    @Body() body: {
      vibeUserId: string;
      discordId: string;
      username: string;
      isJoined: boolean;
    }
  ) {
    return this.userStatusService.updateDiscordStatus(body.vibeUserId, {
      discordId: body.discordId,
      username: body.username,
      isJoined: body.isJoined,
    });
  }

  @Post('connect/twitter')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新用户Twitter连接状态' })
  @ApiResponse({ status: 200, description: 'Twitter status updated successfully' })
  async updateTwitterConnection(
    @Body() body: {
      vibeUserId: string;
      twitterId: string;
      username: string;
      isFollowed: boolean;
    }
  ) {
    return this.userStatusService.updateTwitterStatus(body.vibeUserId, {
      twitterId: body.twitterId,
      username: body.username,
      isFollowed: body.isFollowed,
    });
  }

  @Post('connect/wallet')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新用户钱包连接状态' })
  @ApiResponse({ status: 200, description: 'Wallet status updated successfully' })
  async updateWalletConnection(
    @Body() body: {
      vibeUserId: string;
      walletAddress: string;
      verified: boolean;
    }
  ) {
    return this.userStatusService.updateWalletStatus(body.vibeUserId, {
      walletAddress: body.walletAddress,
      verified: body.verified,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: '获取用户连接完成统计' })
  @ApiResponse({ 
    status: 200, 
    description: 'User completion statistics',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', example: 1000, description: '总用户数' },
        completed: { type: 'number', example: 750, description: '完成所有连接的用户数' },
        completionRate: { type: 'string', example: '75.00', description: '完成率百分比' },
        connections: {
          type: 'object',
          properties: {
            discord: { type: 'number', example: 850 },
            twitter: { type: 'number', example: 800 },
            wallet: { type: 'number', example: 900 }
          }
        },
        verified: {
          type: 'object',
          properties: {
            joinedDiscord: { type: 'number', example: 700 },
            followedTwitter: { type: 'number', example: 650 }
          }
        }
      }
    }
  })
  async getCompletionStats() {
    return this.userStatusService.getCompletionStats();
  }
}