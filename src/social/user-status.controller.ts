import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  BadRequestException,
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

  @Get('status-by-wallet')
  @ApiOperation({ 
    summary: '根据Wallet地址获取用户完整状态',
    description: '此接口返回用户的连接状态，支持可选的Discord和Twitter实时检查。默认启用Discord检查，可通过参数控制'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User status retrieved and updated successfully by wallet address',
    schema: {
      type: 'object',
      properties: {
        vibeUserId: {
          type: 'string',
          example: 'clj123456789',
          description: 'VibeUser ID'
        },
        walletAddress: {
          type: 'string',
          example: '0x1234567890123456789012345678901234567890',
          description: 'Wallet address'
        },
        status: {
          type: 'object',
          properties: {
            discord: {
              type: 'object',
              properties: {
                connected: { type: 'boolean', example: true },
                username: { type: 'string', example: 'user#1234' },
                userId: { type: 'string', example: '123456789' },
                isJoined: { type: 'boolean', example: true, description: '是否加入Discord服务器（可能已实时检查）' },
                connectedAt: { type: 'string', format: 'date-time' }
              }
            },
            twitter: {
              type: 'object',
              properties: {
                connected: { type: 'boolean', example: true },
                username: { type: 'string', example: 'dollyuser' },
                userId: { type: 'string', example: '987654321' },
                isFollowed: { type: 'boolean', example: true, description: '是否关注Dolly Twitter（可能已实时检查）' },
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
                allConnected: { type: 'boolean', example: true, description: '所有连接是否完成' },
                completedAt: { type: 'string', format: 'date-time' },
                canProceed: { type: 'boolean', example: true, description: '是否可以点击Let\'s Vibe按钮' }
              }
            }
          }
        },
        realTimeChecks: {
          type: 'object',
          properties: {
            discordChecked: { type: 'boolean', example: true, description: '是否进行了Discord实时检查' },
            twitterChecked: { type: 'boolean', example: false, description: '是否进行了Twitter实时检查' },
            statusUpdated: { type: 'boolean', example: false, description: '状态是否有更新' }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found with this wallet address' 
  })
  @ApiQuery({ 
    name: 'walletAddress', 
    required: true, 
    description: 'Ethereum wallet address',
    example: '0x1234567890123456789012345678901234567890'
  })
  @ApiQuery({ 
    name: 'enableDiscordCheck', 
    required: false, 
    description: '启用Discord实时检查（默认true）',
    example: true
  })
  @ApiQuery({ 
    name: 'enableTwitterCheck', 
    required: false, 
    description: '启用Twitter实时检查（默认false）',
    example: false
  })
  async getUserStatusByWallet(
    @Query('walletAddress') walletAddress: string,
    @Query('enableDiscordCheck') enableDiscordCheck?: string,
    @Query('enableTwitterCheck') enableTwitterCheck?: string,
  ): Promise<{ 
    vibeUserId: string; 
    walletAddress: string; 
    status: UserConnectionStatus;
    realTimeChecks?: {
      discordChecked: boolean;
      twitterChecked: boolean;
      statusUpdated: boolean;
    }
  }> {
    if (!walletAddress) {
      throw new BadRequestException('Wallet address is required');
    }

    // 查找或创建用户
    const vibeUserId = await this.userStatusService.findOrCreateUser({
      walletAddress,
    });

    // 根据参数决定是否进行实时检查，默认启用Discord检查
    const shouldEnableDiscordCheck = enableDiscordCheck !== 'false'; // 默认true，除非明确传false
    const shouldEnableTwitterCheck = enableTwitterCheck === 'true'; // 默认false，需要明确传true
    
    if (shouldEnableDiscordCheck || shouldEnableTwitterCheck) {
      // 获取用户状态并进行指定的实时检查
      const status = await this.userStatusService.getUserStatusWithCustomChecks(
        vibeUserId, 
        shouldEnableDiscordCheck, 
        shouldEnableTwitterCheck
      );
      
      return { 
        vibeUserId, 
        walletAddress, 
        status,
        realTimeChecks: {
          discordChecked: shouldEnableDiscordCheck && status.discord.connected && !!status.discord.userId,
          twitterChecked: shouldEnableTwitterCheck && status.twitter.connected && !!status.twitter.userId,
          statusUpdated: true // 这里简化了，实际可以从service中返回更详细的信息
        }
      };
    } else {
      // 只获取数据库中的状态，不进行实时检查
      const status = await this.userStatusService.getUserStatus(vibeUserId);
      return { vibeUserId, walletAddress, status };
    }
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