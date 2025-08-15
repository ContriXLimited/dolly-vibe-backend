import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Res,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DiscordService } from './discord.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SocialConnectionStatusDto } from '../dto/social-oauth.dto';

@ApiTags('Discord Integration')
@Controller('auth/discord')
export class DiscordController {
  constructor(private readonly discordService: DiscordService) {}

  @Get('oauth-url')
  @ApiOperation({ summary: '获取Discord OAuth授权链接' })
  @ApiResponse({ 
    status: 200, 
    description: 'OAuth URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        oauthUrl: { type: 'string', example: 'https://discord.com/api/oauth2/authorize?...' },
        walletAddress: { type: 'string', example: '0x1234567890123456789012345678901234567890' },
        callbackUrl: { type: 'string', example: 'https://custom-domain.com/callback' }
      }
    }
  })
  @ApiQuery({ 
    name: 'walletAddress', 
    required: true,
    description: 'Wallet address to bind Discord account to',
    example: '0x1234567890123456789012345678901234567890'
  })
  @ApiQuery({ 
    name: 'callbackUrl', 
    required: false,
    description: 'Custom callback URL (optional, uses .env default if not provided)',
    example: 'https://custom-domain.com/auth/discord/callback'
  })
  getOAuthUrl(
    @Query('walletAddress') walletAddress: string,
    @Query('callbackUrl') callbackUrl?: string,
  ) {
    if (!walletAddress) {
      throw new BadRequestException('Wallet address is required');
    }
    const url = this.discordService.getOAuthUrl(walletAddress, callbackUrl);
    return {
      oauthUrl: url,
      walletAddress: walletAddress,
      callbackUrl: callbackUrl || 'default from .env'
    };
  }

  @Get('oauth')
  @ApiOperation({ summary: '启动Discord OAuth授权流程（直接重定向）' })
  @ApiResponse({ 
    status: 302, 
    description: 'Redirect to Discord OAuth page' 
  })
  @ApiQuery({ 
    name: 'walletAddress', 
    required: true,
    description: 'Wallet address to bind Discord account to',
    example: '0x1234567890123456789012345678901234567890'
  })
  @ApiQuery({ 
    name: 'callbackUrl', 
    required: false,
    description: 'Custom callback URL (optional)',
    example: 'https://custom-domain.com/auth/discord/callback'
  })
  startOAuth(
    @Query('walletAddress') walletAddress: string, 
    @Query('callbackUrl') callbackUrl: string,
    @Res() res
  ) {
    if (!walletAddress) {
      throw new BadRequestException('Wallet address is required');
    }
    const url = this.discordService.getOAuthUrl(walletAddress, callbackUrl);
    return res.redirect(url);
  }

  @Get('callback')
  @ApiOperation({ summary: 'Discord OAuth回调处理' })
  @ApiResponse({ 
    status: 200, 
    description: 'Discord OAuth completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        discordId: { type: 'string', example: '123456789' },
        username: { type: 'string', example: 'user#1234' },
        isInGuild: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Discord connection successful' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'OAuth callback failed' })
  @ApiQuery({ name: 'code', description: 'Discord authorization code' })
  @ApiQuery({ name: 'state', required: false, description: 'OAuth state parameter' })
  @ApiQuery({ name: 'callbackUrl', required: false, description: 'Original callback URL used for token exchange' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state?: string,
    @Query('callbackUrl') callbackUrl?: string,
  ) {
    if (!code) {
      throw new BadRequestException('Missing authorization code');
    }

    const result = await this.discordService.handleOAuthCallback(code, state, callbackUrl);
    
    // 从state中获取walletAddress并更新用户连接状态
    const walletAddress = this.discordService.extractWalletAddressFromState(state);
    await this.discordService.updateDiscordConnection(
      result.discordId,
      `${result.username}#${result.discriminator}`,
      result.isInGuild,
      walletAddress,
    );

    return {
      success: true,
      discordId: result.discordId,
      username: `${result.username}#${result.discriminator}`,
      isInGuild: result.isInGuild,
      walletAddress: walletAddress,
      message: result.isInGuild 
        ? 'Discord connection successful! You are a member of the 0G Discord server.' 
        : 'Discord connection successful! Please join the 0G Discord server to complete verification.',
    };
  }

  @Get('status')
  @ApiOperation({ summary: '检查Discord连接状态' })
  @ApiResponse({ 
    status: 200, 
    description: 'Discord status retrieved successfully',
    type: SocialConnectionStatusDto
  })
  @ApiQuery({ 
    name: 'discordId', 
    required: false,
    description: 'Discord user ID to check status for' 
  })
  async getDiscordStatus(@Query('discordId') discordId?: string) {
    if (!discordId) {
      throw new BadRequestException('Discord ID is required');
    }

    return this.discordService.checkDiscordStatus(discordId);
  }

  @Get('guild-invite')
  @ApiOperation({ summary: '获取0G Discord服务器邀请链接' })
  @ApiResponse({ 
    status: 200, 
    description: 'Discord invite link',
    schema: {
      type: 'object',
      properties: {
        inviteUrl: { type: 'string', example: 'https://discord.gg/0g-invite' },
        guildName: { type: 'string', example: '0G Network' }
      }
    }
  })
  getGuildInvite() {
    // 这里应该返回实际的0G Discord邀请链接
    return {
      inviteUrl: 'https://discord.gg/0g-network', // 替换为实际邀请链接
      guildName: '0G Network Discord Server',
    };
  }

  @Post('check-membership')
  @ApiOperation({ summary: '检查用户Discord频道关注状态并更新数据库' })
  @ApiResponse({ 
    status: 200, 
    description: 'Discord membership status checked and updated',
    schema: {
      type: 'object',
      properties: {
        discordId: { type: 'string', example: '123456789' },
        isJoined: { type: 'boolean', example: true },
        updated: { type: 'boolean', example: true },
        message: { type: 'string', example: 'User is a member of the Discord server' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiQuery({ 
    name: 'discordId', 
    required: true,
    description: 'Discord user ID to check membership for',
    example: '123456789'
  })
  @ApiQuery({ 
    name: 'accessToken', 
    required: false,
    description: 'Discord access token for API check (optional, will use bot token if not provided)'
  })
  async checkMembership(
    @Query('discordId') discordId: string,
    @Query('accessToken') accessToken?: string,
  ) {
    if (!discordId) {
      throw new BadRequestException('Discord ID is required');
    }

    const result = await this.discordService.checkAndUpdateGuildMembership(discordId, accessToken);
    
    return {
      discordId,
      ...result,
    };
  }

  @Post('batch-check-membership')
  @ApiOperation({ summary: '批量检查多个用户的Discord频道关注状态' })
  @ApiResponse({ 
    status: 200, 
    description: 'Batch Discord membership status check completed',
    schema: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              discordId: { type: 'string', example: '123456789' },
              isJoined: { type: 'boolean', example: true },
              updated: { type: 'boolean', example: false },
              error: { type: 'string', example: 'User not found' }
            }
          }
        },
        summary: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 5 },
            joined: { type: 'number', example: 3 },
            updated: { type: 'number', example: 2 },
            errors: { type: 'number', example: 1 }
          }
        }
      }
    }
  })
  async batchCheckMembership(@Query('discordIds') discordIds: string) {
    if (!discordIds) {
      throw new BadRequestException('Discord IDs are required');
    }

    const discordIdArray = discordIds.split(',').map(id => id.trim()).filter(id => id);
    
    if (discordIdArray.length === 0) {
      throw new BadRequestException('At least one valid Discord ID is required');
    }

    const results = await this.discordService.batchCheckGuildMembership(discordIdArray);
    
    // 生成统计信息
    const summary = {
      total: results.length,
      joined: results.filter(r => r.isJoined).length,
      updated: results.filter(r => r.updated).length,
      errors: results.filter(r => r.error).length,
    };

    return {
      results,
      summary,
    };
  }

  @Get('test-bot-config')
  @ApiOperation({ 
    summary: '测试Discord Bot配置',
    description: '检查Discord Bot Token是否有效，以及Bot是否能访问目标Guild'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Bot configuration test results',
    schema: {
      type: 'object',
      properties: {
        botTokenValid: { type: 'boolean', example: true },
        guildAccessible: { type: 'boolean', example: true },
        guildId: { type: 'string', example: '123456789' },
        botPermissions: { 
          type: 'array',
          items: { type: 'string' },
          example: ['123456789', '987654321']
        },
        error: { type: 'string', example: 'Bot lacks View Server Members permission' }
      }
    }
  })
  async testBotConfiguration() {
    return this.discordService.testBotConfiguration();
  }
}