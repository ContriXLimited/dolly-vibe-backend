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
        walletAddress: { type: 'string', example: '0x1234567890123456789012345678901234567890' }
      }
    }
  })
  @ApiQuery({ 
    name: 'walletAddress', 
    required: true,
    description: 'Wallet address to bind Discord account to',
    example: '0x1234567890123456789012345678901234567890'
  })
  getOAuthUrl(@Query('walletAddress') walletAddress: string) {
    if (!walletAddress) {
      throw new BadRequestException('Wallet address is required');
    }
    const url = this.discordService.getOAuthUrl(walletAddress);
    return {
      oauthUrl: url,
      walletAddress: walletAddress
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
  startOAuth(@Query('walletAddress') walletAddress: string, @Res() res) {
    if (!walletAddress) {
      throw new BadRequestException('Wallet address is required');
    }
    const url = this.discordService.getOAuthUrl(walletAddress);
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
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state?: string,
  ) {
    if (!code) {
      throw new BadRequestException('Missing authorization code');
    }

    const result = await this.discordService.handleOAuthCallback(code, state);
    
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
}