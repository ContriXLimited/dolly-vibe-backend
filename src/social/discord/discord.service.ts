import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);
  private readonly DISCORD_API_BASE = 'https://discord.com/api/v10';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 获取Discord OAuth URL
   */
  getOAuthUrl(walletAddress?: string): string {
    const clientId = this.configService.get<string>('DISCORD_CLIENT_ID');
    const redirectUri = this.configService.get<string>('DISCORD_REDIRECT_URI');
    const state = this.generateState(walletAddress);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify guilds',
      state,
    });

    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  }

  /**
   * 处理Discord OAuth回调
   */
  async handleOAuthCallback(code: string, state?: string) {
    try {
      // 验证state参数（实际应用中应该验证state的有效性）
      if (!code) {
        throw new BadRequestException('Missing authorization code');
      }

      this.logger.log(`Processing Discord OAuth callback with code: ${code.substring(0, 10)}...`);

      // 交换访问令牌
      const tokenData = await this.exchangeCodeForToken(code);
      this.logger.log('Successfully exchanged code for token');
      
      // 获取用户信息
      const userInfo = await this.getUserInfo(tokenData.access_token);
      this.logger.log(`Retrieved user info for Discord ID: ${userInfo.id}`);
      
      // 检查用户是否加入了指定的Discord服务器
      const isInGuild = await this.checkGuildMembership(tokenData.access_token, userInfo.id);
      this.logger.log(`Guild membership check result: ${isInGuild}`);

      return {
        discordId: userInfo.id,
        username: userInfo.username,
        discriminator: userInfo.discriminator || '0', // Discord移除了discriminator，默认为0
        avatar: userInfo.avatar,
        isInGuild,
        accessToken: tokenData.access_token, // 用于后续API调用
      };

    } catch (error) {
      this.logger.error('Discord OAuth callback error:', error.message);
      this.logger.error('Error stack:', error.stack);
      if (error.response?.data) {
        this.logger.error('Discord API error response:', JSON.stringify(error.response.data));
      }
      throw new BadRequestException(`Discord authentication failed: ${error.message}`);
    }
  }

  /**
   * 检查Discord连接状态
   */
  async checkDiscordStatus(discordId: string) {
    const vibeUser = await this.prisma.vibeUser.findFirst({
      where: { discordId },
      select: {
        discordConnected: true,
        discordUsername: true,
        isJoined: true,
        updatedAt: true,
      },
    });

    return {
      connected: vibeUser?.discordConnected || false,
      username: vibeUser?.discordUsername || null,
      userId: discordId,
      verified: vibeUser?.isJoined || false,
      connectedAt: vibeUser?.updatedAt || null,
    };
  }

  /**
   * 更新或创建用户的Discord连接状态
   */
  async updateDiscordConnection(
    discordId: string, 
    username: string, 
    isInGuild: boolean,
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

      // 更新现有用户的Discord信息
      vibeUser = await this.prisma.vibeUser.update({
        where: { id: vibeUser.id },
        data: {
          discordId,
          discordUsername: username,
          discordConnected: true,
          isJoined: isInGuild,
        },
      });

      this.logger.log(`Updated Discord connection for verified wallet ${walletAddress} -> Discord ${discordId}`);
    } else {
      // 原有逻辑：根据discordId查找或创建
      vibeUser = await this.prisma.vibeUser.findFirst({
        where: { discordId },
      });

      if (!vibeUser) {
        // 创建新用户
        vibeUser = await this.prisma.vibeUser.create({
          data: {
            id: require('@paralleldrive/cuid2').createId(),
            discordId,
            discordUsername: username,
            discordConnected: true,
            isJoined: isInGuild,
          },
        });
      } else {
        // 更新现有用户
        vibeUser = await this.prisma.vibeUser.update({
          where: { id: vibeUser.id },
          data: {
            discordId,
            discordUsername: username,
            discordConnected: true,
            isJoined: isInGuild,
          },
        });
      }
    }

    // 检查是否所有连接都完成
    await this.checkAndUpdateAllConnected(vibeUser.id);

    return vibeUser;
  }

  /**
   * 交换授权码为访问令牌
   */
  private async exchangeCodeForToken(code: string) {
    const clientId = this.configService.get<string>('DISCORD_CLIENT_ID');
    const clientSecret = this.configService.get<string>('DISCORD_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('DISCORD_REDIRECT_URI');

    this.logger.log(`Exchanging code for token with redirect URI: ${redirectUri}`);

    try {
      const response = await axios.post(
        'https://discord.com/api/oauth2/token',
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error('Token exchange failed:', error.message);
      if (error.response?.data) {
        this.logger.error('Discord token exchange error:', JSON.stringify(error.response.data));
      }
      throw error;
    }
  }

  /**
   * 获取用户信息
   */
  private async getUserInfo(accessToken: string) {
    const response = await axios.get(`${this.DISCORD_API_BASE}/users/@me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  }

  /**
   * 检查用户是否加入了指定的Guild
   */
  private async checkGuildMembership(accessToken: string, userId: string): Promise<boolean> {
    try {
      const guildId = this.configService.get<string>('DISCORD_GUILD_ID');
      
      if (!guildId) {
        this.logger.warn('DISCORD_GUILD_ID not configured');
        return false;
      }

      const response = await axios.get(`${this.DISCORD_API_BASE}/users/@me/guilds`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const guilds = response.data;
      return guilds.some((guild: any) => guild.id === guildId);

    } catch (error) {
      this.logger.error('Error checking guild membership:', error.message);
      return false;
    }
  }

  /**
   * 生成OAuth state参数
   */
  private generateState(walletAddress?: string): string {
    const randomState = Math.random().toString(36).substring(2, 15);
    if (walletAddress) {
      // 将钱包地址编码到state中
      const encodedAddress = Buffer.from(walletAddress).toString('base64');
      return `${randomState}_${encodedAddress}`;
    }
    return randomState;
  }

  /**
   * 从state中提取钱包地址
   */
  extractWalletAddressFromState(state?: string): string | undefined {
    if (!state || !state.includes('_')) {
      return undefined;
    }

    try {
      const parts = state.split('_');
      if (parts.length >= 2) {
        const encodedAddress = parts.slice(1).join('_'); // 处理地址中可能包含下划线的情况
        return Buffer.from(encodedAddress, 'base64').toString();
      }
    } catch (error) {
      this.logger.warn('Failed to decode wallet address from state:', error.message);
    }

    return undefined;
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