import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { DiscordService } from './discord/discord.service';
import { TwitterService } from './twitter/twitter.service';
import { WalletVerificationService } from '../wallet/services/wallet-verification.service';

export interface UserConnectionStatus {
  discord: {
    connected: boolean;
    username?: string;
    userId?: string;
    verified: boolean; // 是否加入0G Discord
    connectedAt?: Date;
  };
  twitter: {
    connected: boolean;
    username?: string;
    userId?: string;
    verified: boolean; // 是否关注Dolly
    connectedAt?: Date;
  };
  wallet: {
    connected: boolean;
    walletAddress?: string;
    verifiedAt?: Date;
  };
  overall: {
    allConnected: boolean;
    completedAt?: Date;
    canProceed: boolean; // 是否可以点击"Let's Vibe"按钮
  };
}

@Injectable()
export class UserStatusService {
  private readonly logger = new Logger(UserStatusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly discordService: DiscordService,
    private readonly twitterService: TwitterService,
    private readonly walletVerificationService: WalletVerificationService,
  ) {}

  /**
   * 获取用户的完整连接状态
   */
  async getUserStatus(vibeUserId: string): Promise<UserConnectionStatus> {
    const user = await this.prisma.vibeUser.findUnique({
      where: { id: vibeUserId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      discord: {
        connected: user.discordConnected,
        username: user.discordUsername,
        userId: user.discordId,
        verified: user.isJoined,
        connectedAt: user.discordConnected ? user.updatedAt : null,
      },
      twitter: {
        connected: user.twitterConnected,
        username: user.twitterUsername,
        userId: user.twitterId,
        verified: user.isFollowed,
        connectedAt: user.twitterConnected ? user.updatedAt : null,
      },
      wallet: {
        connected: user.walletConnected,
        walletAddress: user.walletAddress,
        verifiedAt: user.walletVerifiedAt,
      },
      overall: {
        allConnected: user.allConnected,
        completedAt: user.completedAt,
        canProceed: user.discordConnected && user.twitterConnected && user.walletConnected,
      },
    };
  }

  /**
   * 根据不同标识符查找或创建用户
   */
  async findOrCreateUser(identifier: {
    discordId?: string;
    twitterId?: string;
    walletAddress?: string;
  }): Promise<string> {
    const { discordId, twitterId, walletAddress } = identifier;

    // 尝试查找现有用户
    let user = await this.prisma.vibeUser.findFirst({
      where: {
        OR: [
          discordId ? { discordId } : null,
          twitterId ? { twitterId } : null,
          walletAddress ? { walletAddress: walletAddress.toLowerCase() } : null,
        ].filter(Boolean),
      },
    });

    if (!user) {
      // 创建新用户
      const { createId } = require('@paralleldrive/cuid2');
      user = await this.prisma.vibeUser.create({
        data: {
          id: createId(),
          discordId: discordId || null,
          twitterId: twitterId || null,
          walletAddress: walletAddress?.toLowerCase() || null,
        },
      });

      this.logger.log(`Created new VibeUser: ${user.id}`);
    }

    return user.id;
  }

  /**
   * 更新Discord连接状态
   */
  async updateDiscordStatus(
    vibeUserId: string,
    discordData: {
      discordId: string;
      username: string;
      isJoined: boolean;
    }
  ) {
    const updatedUser = await this.prisma.vibeUser.update({
      where: { id: vibeUserId },
      data: {
        discordId: discordData.discordId,
        discordUsername: discordData.username,
        discordConnected: true,
        isJoined: discordData.isJoined,
      },
    });

    await this.checkAndUpdateAllConnected(vibeUserId);
    return updatedUser;
  }

  /**
   * 更新Twitter连接状态
   */
  async updateTwitterStatus(
    vibeUserId: string,
    twitterData: {
      twitterId: string;
      username: string;
      isFollowed: boolean;
    }
  ) {
    const updatedUser = await this.prisma.vibeUser.update({
      where: { id: vibeUserId },
      data: {
        twitterId: twitterData.twitterId,
        twitterUsername: twitterData.username,
        twitterConnected: true,
        isFollowed: twitterData.isFollowed,
      },
    });

    await this.checkAndUpdateAllConnected(vibeUserId);
    return updatedUser;
  }

  /**
   * 更新钱包连接状态
   */
  async updateWalletStatus(
    vibeUserId: string,
    walletData: {
      walletAddress: string;
      verified: boolean;
    }
  ) {
    const updatedUser = await this.prisma.vibeUser.update({
      where: { id: vibeUserId },
      data: {
        walletAddress: walletData.walletAddress.toLowerCase(),
        walletConnected: walletData.verified,
        walletVerifiedAt: walletData.verified ? new Date() : null,
      },
    });

    await this.checkAndUpdateAllConnected(vibeUserId);
    return updatedUser;
  }

  /**
   * 获取所有完成连接的用户统计
   */
  async getCompletionStats() {
    const [
      totalUsers,
      allConnectedUsers,
      discordConnectedUsers,
      twitterConnectedUsers,
      walletConnectedUsers,
      joinedDiscordUsers,
      followedTwitterUsers,
    ] = await Promise.all([
      this.prisma.vibeUser.count(),
      this.prisma.vibeUser.count({ where: { allConnected: true } }),
      this.prisma.vibeUser.count({ where: { discordConnected: true } }),
      this.prisma.vibeUser.count({ where: { twitterConnected: true } }),
      this.prisma.vibeUser.count({ where: { walletConnected: true } }),
      this.prisma.vibeUser.count({ where: { isJoined: true } }),
      this.prisma.vibeUser.count({ where: { isFollowed: true } }),
    ]);

    return {
      total: totalUsers,
      completed: allConnectedUsers,
      completionRate: totalUsers > 0 ? (allConnectedUsers / totalUsers * 100).toFixed(2) : '0.00',
      connections: {
        discord: discordConnectedUsers,
        twitter: twitterConnectedUsers,
        wallet: walletConnectedUsers,
      },
      verified: {
        joinedDiscord: joinedDiscordUsers,
        followedTwitter: followedTwitterUsers,
      },
    };
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

      this.logger.log(`🎉 User ${vibeUserId} completed all connections!`);
    }
  }
}