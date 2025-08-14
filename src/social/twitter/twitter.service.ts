import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class TwitterService {
  private readonly logger = new Logger(TwitterService.name);
  private readonly TWITTER_API_BASE = 'https://api.twitter.com';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 获取Twitter OAuth URL (OAuth 1.0a)
   */
  async getOAuthUrl(walletAddress?: string): Promise<string> {
    try {
      // Step 1: Get request token
      const requestTokenResponse = await this.getRequestToken();
      
      // Step 2: Cache wallet address with oauth token (if provided)
      if (walletAddress) {
        await this.cacheWalletAddressForToken(requestTokenResponse.oauth_token, walletAddress);
      }
      
      // Step 3: Redirect user to Twitter authorization
      const authUrl = `https://api.twitter.com/oauth/authenticate?oauth_token=${requestTokenResponse.oauth_token}`;
      
      return authUrl;

    } catch (error) {
      this.logger.error('Error getting Twitter OAuth URL:', error.message);
      throw new BadRequestException('Failed to initiate Twitter OAuth');
    }
  }

  /**
   * 处理Twitter OAuth回调 (OAuth 1.0a)
   */
  async handleOAuthCallback(oauthToken: string, oauthVerifier: string) {
    try {
      // Step 3: Exchange request token for access token
      const accessTokenData = await this.getAccessToken(oauthToken, oauthVerifier);
      
      // Step 4: Get user information
      const userInfo = await this.getUserInfo(
        accessTokenData.oauth_token,
        accessTokenData.oauth_token_secret
      );

      // Step 5: Check if user follows Dolly
      const isFollowingDolly = await this.checkFollowingStatus(
        accessTokenData.oauth_token,
        accessTokenData.oauth_token_secret,
        userInfo.screen_name
      );

      return {
        twitterId: userInfo.id_str,
        username: userInfo.screen_name,
        displayName: userInfo.name,
        profileImage: userInfo.profile_image_url_https,
        isFollowingDolly,
        accessToken: accessTokenData.oauth_token,
        accessTokenSecret: accessTokenData.oauth_token_secret,
      };

    } catch (error) {
      this.logger.error('Twitter OAuth callback error:', error.message);
      throw new BadRequestException('Twitter authentication failed');
    }
  }

  /**
   * 检查Twitter连接状态
   */
  async checkTwitterStatus(twitterId: string) {
    const vibeUser = await this.prisma.vibeUser.findFirst({
      where: { twitterId },
      select: {
        twitterConnected: true,
        twitterUsername: true,
        isFollowed: true,
        updatedAt: true,
      },
    });

    return {
      connected: vibeUser?.twitterConnected || false,
      username: vibeUser?.twitterUsername || null,
      userId: twitterId,
      verified: vibeUser?.isFollowed || false,
      connectedAt: vibeUser?.updatedAt || null,
    };
  }

  /**
   * 更新或创建用户的Twitter连接状态
   */
  async updateTwitterConnection(
    twitterId: string,
    username: string,
    isFollowingDolly: boolean,
    walletAddress?: string
  ) {
    let vibeUser;

    if (walletAddress) {
      // 根据钱包地址查找用户，并确保钱包已验证连接
      vibeUser = await this.prisma.vibeUser.findFirst({
        where: { 
          walletAddress: walletAddress.toLowerCase(),
          walletConnected: true, // 必须钱包已验证连接
        },
      });

      if (!vibeUser) {
        throw new BadRequestException(
          `No verified wallet connection found for address: ${walletAddress}. Please connect and verify your wallet first.`
        );
      }

      // 更新现有用户的Twitter信息
      vibeUser = await this.prisma.vibeUser.update({
        where: { id: vibeUser.id },
        data: {
          twitterId,
          twitterUsername: username,
          twitterConnected: true,
          isFollowed: isFollowingDolly,
        },
      });

      this.logger.log(`Updated Twitter connection for verified wallet ${walletAddress} -> Twitter ${twitterId}`);
    } else {
      // 原有逻辑：根据twitterId查找或创建
      vibeUser = await this.prisma.vibeUser.findFirst({
        where: { twitterId },
      });

      if (!vibeUser) {
        // 创建新用户
        vibeUser = await this.prisma.vibeUser.create({
          data: {
            id: require('@paralleldrive/cuid2').createId(),
            twitterId,
            twitterUsername: username,
            twitterConnected: true,
            isFollowed: isFollowingDolly,
          },
        });
      } else {
        // 更新现有用户
        vibeUser = await this.prisma.vibeUser.update({
          where: { id: vibeUser.id },
          data: {
            twitterId,
            twitterUsername: username,
            twitterConnected: true,
            isFollowed: isFollowingDolly,
          },
        });
      }
    }

    // 检查是否所有连接都完成
    await this.checkAndUpdateAllConnected(vibeUser.id);

    return vibeUser;
  }

  /**
   * 获取请求令牌 (OAuth 1.0a Step 1)
   */
  private async getRequestToken() {
    const consumerKey = this.configService.get<string>('TWITTER_CONSUMER_KEY');
    const consumerSecret = this.configService.get<string>('TWITTER_CONSUMER_SECRET');
    const callbackUrl = this.configService.get<string>('TWITTER_CALLBACK_URL');

    // 实际应用中需要实现OAuth 1.0a签名
    // 这里简化处理，推荐使用oauth-1.0a库
    const oauth = require('oauth-1.0a');
    const crypto = require('crypto');

    const oauthInstance = oauth({
      consumer: { key: consumerKey, secret: consumerSecret },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string: string, key: string) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      },
    });

    const requestData = {
      url: 'https://api.twitter.com/oauth/request_token',
      method: 'POST',
      data: { oauth_callback: callbackUrl },
    };

    const response = await axios.post(requestData.url, null, {
      headers: oauthInstance.toHeader(oauthInstance.authorize(requestData)),
    });

    const params = new URLSearchParams(response.data);
    return {
      oauth_token: params.get('oauth_token'),
      oauth_token_secret: params.get('oauth_token_secret'),
    };
  }

  /**
   * 获取访问令牌 (OAuth 1.0a Step 3)
   */
  private async getAccessToken(oauthToken: string, oauthVerifier: string) {
    const consumerKey = this.configService.get<string>('TWITTER_CONSUMER_KEY');
    const consumerSecret = this.configService.get<string>('TWITTER_CONSUMER_SECRET');

    const oauth = require('oauth-1.0a');
    const crypto = require('crypto');

    const oauthInstance = oauth({
      consumer: { key: consumerKey, secret: consumerSecret },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string: string, key: string) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      },
    });

    const requestData = {
      url: 'https://api.twitter.com/oauth/access_token',
      method: 'POST',
      data: { 
        oauth_token: oauthToken,
        oauth_verifier: oauthVerifier 
      },
    };

    const response = await axios.post(requestData.url, null, {
      headers: oauthInstance.toHeader(oauthInstance.authorize(requestData, { key: oauthToken, secret: '' })),
    });

    const params = new URLSearchParams(response.data);
    return {
      oauth_token: params.get('oauth_token'),
      oauth_token_secret: params.get('oauth_token_secret'),
      user_id: params.get('user_id'),
      screen_name: params.get('screen_name'),
    };
  }

  /**
   * 获取用户信息
   */
  private async getUserInfo(accessToken: string, accessTokenSecret: string) {
    const consumerKey = this.configService.get<string>('TWITTER_CONSUMER_KEY');
    const consumerSecret = this.configService.get<string>('TWITTER_CONSUMER_SECRET');

    const oauth = require('oauth-1.0a');
    const crypto = require('crypto');

    const oauthInstance = oauth({
      consumer: { key: consumerKey, secret: consumerSecret },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string: string, key: string) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      },
    });

    const requestData = {
      url: 'https://api.twitter.com/1.1/account/verify_credentials.json',
      method: 'GET',
    };

    const response = await axios.get(requestData.url, {
      headers: oauthInstance.toHeader(oauthInstance.authorize(requestData, { 
        key: accessToken, 
        secret: accessTokenSecret 
      })),
    });

    return response.data;
  }

  /**
   * 公共方法：检查用户是否关注Dolly
   */
  async checkUserFollowsDolly(username: string): Promise<boolean> {
    return this.checkFollowingStatus('', '', username);
  }

  /**
   * 检查用户是否关注Dolly (使用twitterapi.io)
   */
  private async checkFollowingStatus(
    accessToken: string,
    accessTokenSecret: string,
    username: string
  ): Promise<boolean> {
    try {
      const dollyTwitterId = this.configService.get<string>('DOLLY_TWITTER_ID');
      const twitterApiKey = this.configService.get<string>('TWITTER_API_IO_KEY');
      
      if (!dollyTwitterId) {
        this.logger.warn('DOLLY_TWITTER_ID not configured');
        return false;
      }

      if (!twitterApiKey) {
        this.logger.warn('TWITTER_API_IO_KEY not configured, skipping follow check');
        return false;
      }

      this.logger.log(`Checking if user ${username} follows Dolly (${dollyTwitterId}) using twitterapi.io`);

      // 使用twitterapi.io检查关注关系
      const url = 'https://api.twitterapi.io/twitter/user/check_follow_relationship';
      const response = await axios.get(url, {
        headers: {
          'X-API-Key': twitterApiKey,
        },
        params: {
          source_user_name: username,
          target_user_name: dollyTwitterId,
        },
      });

      if (response.data.status === 'success' && response.data.data) {
        const isFollowing = response.data.data.following === true;
        this.logger.log(`Follow check result for ${username} -> ${dollyTwitterId}: ${isFollowing}`);
        return isFollowing;
      } else {
        this.logger.warn('TwitterAPI.io response error:', response.data.message || 'Unknown error');
        return false;
      }

    } catch (error) {
      this.logger.error('Error checking Twitter following status:', error.message);
      if (error.response?.data) {
        this.logger.error('TwitterAPI.io error response:', JSON.stringify(error.response.data));
      }
      return false;
    }
  }

  /**
   * 缓存OAuth token与钱包地址的映射
   */
  async cacheWalletAddressForToken(oauthToken: string, walletAddress: string) {
    // 使用数据库临时存储，10分钟过期
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    await this.prisma.walletNonce.create({
      data: {
        id: require('@paralleldrive/cuid2').createId(),
        walletAddress: walletAddress.toLowerCase(),
        nonce: oauthToken, // 重用nonce字段存储token
        message: `Twitter OAuth token mapping for ${walletAddress}`,
        expiresAt,
      },
    });

    this.logger.log(`Cached wallet address ${walletAddress} for Twitter OAuth token`);
  }

  /**
   * 从缓存中获取OAuth token对应的钱包地址
   */
  async getWalletAddressFromToken(oauthToken: string): Promise<string | undefined> {
    try {
      const record = await this.prisma.walletNonce.findFirst({
        where: {
          nonce: oauthToken,
          expiresAt: { gt: new Date() },
        },
      });

      if (record) {
        // 清理已使用的记录
        await this.prisma.walletNonce.delete({
          where: { id: record.id },
        });
        
        this.logger.log(`Retrieved wallet address ${record.walletAddress} for Twitter OAuth token`);
        return record.walletAddress;
      }

      return undefined;
    } catch (error) {
      this.logger.warn('Failed to retrieve wallet address from token cache:', error.message);
      return undefined;
    }
  }

  /**
   * 检查并更新用户的全连接状态
   */
  private async checkAndUpdateAllConnected(vibeUserId: string) {
    const user = await this.prisma.vibeUser.findUnique({
      where: { id: vibeUserId },
      select: {
        discordConnected: true,
        twitterConnected: true,
        walletConnected: true,
        allConnected: true,
      },
    });

    if (!user) return;

    const allConnected = user.discordConnected && user.twitterConnected && user.walletConnected;

    if (allConnected && !user.allConnected) {
      await this.prisma.vibeUser.update({
        where: { id: vibeUserId },
        data: {
          allConnected: true,
          completedAt: new Date(),
        },
      });

      this.logger.log(`User ${vibeUserId} completed all connections!`);
    }
  }
}