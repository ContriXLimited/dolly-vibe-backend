import {
  Controller,
  Get,
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
import { TwitterService } from './twitter.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SocialConnectionStatusDto } from '../dto/social-oauth.dto';
import { ConfigService } from '@nestjs/config';

@ApiTags('Twitter Integration')
@Controller('auth/twitter')
export class TwitterController {
  constructor(
    private readonly twitterService: TwitterService,
    private readonly configService: ConfigService,
  ) {}

  @Get('oauth-url')
  @ApiOperation({ summary: '获取Twitter OAuth授权链接' })
  @ApiResponse({ 
    status: 200, 
    description: 'OAuth URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        oauthUrl: { type: 'string', example: 'https://api.twitter.com/oauth/authenticate?...' },
        walletAddress: { type: 'string', example: '0x1234567890123456789012345678901234567890' }
      }
    }
  })
  @ApiQuery({ 
    name: 'walletAddress', 
    required: true,
    description: 'Wallet address to bind Twitter account to',
    example: '0x1234567890123456789012345678901234567890'
  })
  async getOAuthUrl(@Query('walletAddress') walletAddress: string) {
    if (!walletAddress) {
      throw new BadRequestException('Wallet address is required');
    }
    const url = await this.twitterService.getOAuthUrl(walletAddress);
    return {
      oauthUrl: url,
      walletAddress: walletAddress
    };
  }

  @Get('oauth')
  @ApiOperation({ summary: '启动Twitter OAuth授权流程（直接重定向）' })
  @ApiResponse({ 
    status: 302, 
    description: 'Redirect to Twitter OAuth page' 
  })
  @ApiQuery({ 
    name: 'walletAddress', 
    required: true,
    description: 'Wallet address to bind Twitter account to',
    example: '0x1234567890123456789012345678901234567890'
  })
  async startOAuth(@Query('walletAddress') walletAddress: string, @Res() res) {
    if (!walletAddress) {
      throw new BadRequestException('Wallet address is required');
    }
    const url = await this.twitterService.getOAuthUrl(walletAddress);
    return res.redirect(url);
  }

  @Get('callback')
  @ApiOperation({ summary: 'Twitter OAuth回调处理' })
  @ApiResponse({ 
    status: 200, 
    description: 'Twitter OAuth completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        twitterId: { type: 'string', example: '123456789' },
        username: { type: 'string', example: 'dollyuser' },
        displayName: { type: 'string', example: 'Dolly User' },
        isFollowingDolly: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Twitter connection successful' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'OAuth callback failed' })
  @ApiQuery({ name: 'oauth_token', description: 'Twitter OAuth token' })
  @ApiQuery({ name: 'oauth_verifier', description: 'Twitter OAuth verifier' })
  @ApiQuery({ 
    name: 'walletAddress', 
    required: false,
    description: 'Wallet address to bind Twitter account to (optional for backward compatibility)' 
  })
  async handleCallback(
    @Query('oauth_token') oauthToken: string,
    @Query('oauth_verifier') oauthVerifier: string,
    @Query('walletAddress') walletAddress?: string,
  ) {
    if (!oauthToken || !oauthVerifier) {
      throw new BadRequestException('Missing OAuth parameters');
    }

    const result = await this.twitterService.handleOAuthCallback(oauthToken, oauthVerifier);
    
    // 如果提供了钱包地址，从token缓存中获取；否则使用查询参数
    const targetWalletAddress = walletAddress || 
      await this.twitterService.getWalletAddressFromToken(oauthToken);
    
    // 更新用户连接状态
    await this.twitterService.updateTwitterConnection(
      result.twitterId,
      result.username,
      result.isFollowingDolly,
      targetWalletAddress,
    );

    return {
      success: true,
      twitterId: result.twitterId,
      username: result.username,
      displayName: result.displayName,
      isFollowingDolly: result.isFollowingDolly,
      walletAddress: targetWalletAddress,
      message: result.isFollowingDolly 
        ? 'Twitter connection successful! You are following Dolly.' 
        : 'Twitter connection successful! Please follow @Dolly to complete verification.',
    };
  }

  @Get('status')
  @ApiOperation({ summary: '检查Twitter连接状态' })
  @ApiResponse({ 
    status: 200, 
    description: 'Twitter status retrieved successfully',
    type: SocialConnectionStatusDto
  })
  @ApiQuery({ 
    name: 'twitterId', 
    required: false,
    description: 'Twitter user ID to check status for' 
  })
  async getTwitterStatus(@Query('twitterId') twitterId?: string) {
    if (!twitterId) {
      throw new BadRequestException('Twitter ID is required');
    }

    return this.twitterService.checkTwitterStatus(twitterId);
  }

  @Get('check-follow')
  @ApiOperation({ summary: '检查用户是否关注Dolly' })
  @ApiResponse({ 
    status: 200, 
    description: 'Follow status checked successfully',
    schema: {
      type: 'object',
      properties: {
        isFollowing: { type: 'boolean', example: true },
        sourceUser: { type: 'string', example: 'username123' },
        targetUser: { type: 'string', example: 'AskDollyToday' },
        message: { type: 'string', example: 'Follow status checked successfully' }
      }
    }
  })
  @ApiQuery({ 
    name: 'username', 
    required: true,
    description: 'Twitter username to check (without @)' 
  })
  async checkFollowStatus(@Query('username') username: string) {
    if (!username) {
      throw new BadRequestException('Username is required');
    }

    const isFollowing = await this.twitterService.checkUserFollowsDolly(username);
    const dollyTwitterId = this.configService.get<string>('DOLLY_TWITTER_ID') || 'AskDollyToday';
    
    return {
      isFollowing,
      sourceUser: username,
      targetUser: dollyTwitterId,
      message: isFollowing 
        ? `@${username} is following @${dollyTwitterId}` 
        : `@${username} is not following @${dollyTwitterId}`,
    };
  }

  @Get('dolly-profile')
  @ApiOperation({ summary: '获取Dolly Twitter资料链接' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dolly Twitter profile info',
    schema: {
      type: 'object',
      properties: {
        profileUrl: { type: 'string', example: 'https://twitter.com/AskDollyToday' },
        username: { type: 'string', example: 'AskDollyToday' },
        displayName: { type: 'string', example: 'Ask Dolly Today' }
      }
    }
  })
  getDollyProfile() {
    const dollyTwitterId = this.configService.get<string>('DOLLY_TWITTER_ID') || 'AskDollyToday';
    return {
      profileUrl: `https://twitter.com/${dollyTwitterId}`,
      username: dollyTwitterId,
      displayName: 'Ask Dolly Today',
    };
  }
}