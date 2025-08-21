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
    isJoined: boolean; // 是否加入Discord服务器
    connectedAt?: Date;
  };
  twitter: {
    connected: boolean;
    username?: string;
    userId?: string;
    verified: boolean; // 是否关注Dolly
    isFollowed: boolean; // 是否关注Dolly Twitter
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
        isJoined: user.isJoined,
        connectedAt: user.discordConnected ? user.updatedAt : null,
      },
      twitter: {
        connected: user.twitterConnected,
        username: user.twitterUsername,
        userId: user.twitterId,
        verified: user.isFollowed,
        isFollowed: user.isFollowed,
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
   * 获取用户状态并根据参数选择性进行实时检查
   */
  async getUserStatusWithCustomChecks(
    vibeUserId: string, 
    checkDiscord: boolean = true, 
    checkTwitter: boolean = false
  ): Promise<UserConnectionStatus> {
    const user = await this.prisma.vibeUser.findUnique({
      where: { id: vibeUserId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let updatedUser = user;
    let isUpdated = false;

    // 检查Discord状态：如果启用检查且用户已连接Discord但isJoined为false，则实时检查
    if (checkDiscord && user.discordConnected && user.discordId && !user.isJoined) {
      try {
        this.logger.log(`Checking Discord membership for user ${user.discordId}...`);
        const discordResult = await this.discordService.checkAndUpdateGuildMembership(user.discordId);
        
        if (discordResult.updated) {
          isUpdated = true;
          this.logger.log(`Discord status updated for user ${vibeUserId}: isJoined=${discordResult.isJoined}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to check Discord membership for user ${vibeUserId}: ${error.message}`);
      }
    }

    // 检查Twitter状态：如果启用检查且用户已连接Twitter但isFollowed为false，则实时检查
    if (checkTwitter && user.twitterConnected && user.twitterId && !user.isFollowed) {
      try {
        this.logger.log(`Checking Twitter follow status for user ${user.twitterId}...`);
        const twitterResult = await this.twitterService.checkAndUpdateFollowStatus(user.twitterId);
        
        if (twitterResult.updated) {
          isUpdated = true;
          this.logger.log(`Twitter status updated for user ${vibeUserId}: isFollowed=${twitterResult.isFollowed}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to check Twitter follow status for user ${vibeUserId}: ${error.message}`);
      }
    }

    // 如果有更新，重新获取用户数据
    if (isUpdated) {
      updatedUser = await this.prisma.vibeUser.findUnique({
        where: { id: vibeUserId },
      });
      
      // 重新检查全连接状态
      await this.checkAndUpdateAllConnected(vibeUserId);
      
      // 再次获取最新数据（可能allConnected状态已更新）
      updatedUser = await this.prisma.vibeUser.findUnique({
        where: { id: vibeUserId },
      });
    }

    return {
      discord: {
        connected: updatedUser.discordConnected,
        username: updatedUser.discordUsername,
        userId: updatedUser.discordId,
        verified: updatedUser.isJoined,
        isJoined: updatedUser.isJoined,
        connectedAt: updatedUser.discordConnected ? updatedUser.updatedAt : null,
      },
      twitter: {
        connected: updatedUser.twitterConnected,
        username: updatedUser.twitterUsername,
        userId: updatedUser.twitterId,
        verified: updatedUser.isFollowed,
        isFollowed: updatedUser.isFollowed,
        connectedAt: updatedUser.twitterConnected ? updatedUser.updatedAt : null,
      },
      wallet: {
        connected: updatedUser.walletConnected,
        walletAddress: updatedUser.walletAddress,
        verifiedAt: updatedUser.walletVerifiedAt,
      },
      overall: {
        allConnected: updatedUser.allConnected,
        completedAt: updatedUser.completedAt,
        canProceed: updatedUser.discordConnected && updatedUser.twitterConnected && updatedUser.walletConnected,
      },
    };
  }

  /**
   * 获取用户状态并只检查Discord状态（已弃用，请使用getUserStatusWithCustomChecks）
   * @deprecated 请使用 getUserStatusWithCustomChecks 方法
   */
  async getUserStatusWithDiscordCheck(vibeUserId: string): Promise<UserConnectionStatus> {
    const user = await this.prisma.vibeUser.findUnique({
      where: { id: vibeUserId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let updatedUser = user;
    let isUpdated = false;

    // 检查Discord状态：如果用户已连接Discord但isJoined为false，则实时检查
    if (user.discordConnected && user.discordId && !user.isJoined) {
      try {
        this.logger.log(`Checking Discord membership for user ${user.discordId}...`);
        const discordResult = await this.discordService.checkAndUpdateGuildMembership(user.discordId);
        
        if (discordResult.updated) {
          isUpdated = true;
          this.logger.log(`Discord status updated for user ${vibeUserId}: isJoined=${discordResult.isJoined}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to check Discord membership for user ${vibeUserId}: ${error.message}`);
      }
    }

    // 如果有更新，重新获取用户数据
    if (isUpdated) {
      updatedUser = await this.prisma.vibeUser.findUnique({
        where: { id: vibeUserId },
      });
      
      // 重新检查全连接状态
      await this.checkAndUpdateAllConnected(vibeUserId);
      
      // 再次获取最新数据（可能allConnected状态已更新）
      updatedUser = await this.prisma.vibeUser.findUnique({
        where: { id: vibeUserId },
      });
    }

    return {
      discord: {
        connected: updatedUser.discordConnected,
        username: updatedUser.discordUsername,
        userId: updatedUser.discordId,
        verified: updatedUser.isJoined,
        isJoined: updatedUser.isJoined,
        connectedAt: updatedUser.discordConnected ? updatedUser.updatedAt : null,
      },
      twitter: {
        connected: updatedUser.twitterConnected,
        username: updatedUser.twitterUsername,
        userId: updatedUser.twitterId,
        verified: updatedUser.isFollowed,
        isFollowed: updatedUser.isFollowed,
        connectedAt: updatedUser.twitterConnected ? updatedUser.updatedAt : null,
      },
      wallet: {
        connected: updatedUser.walletConnected,
        walletAddress: updatedUser.walletAddress,
        verifiedAt: updatedUser.walletVerifiedAt,
      },
      overall: {
        allConnected: updatedUser.allConnected,
        completedAt: updatedUser.completedAt,
        canProceed: updatedUser.discordConnected && updatedUser.twitterConnected && updatedUser.walletConnected,
      },
    };
  }

  /**
   * 获取用户状态并自动检查更新Discord和Twitter关注状态（已弃用，请使用getUserStatusWithDiscordCheck）
   * @deprecated 请使用 getUserStatusWithDiscordCheck 方法
   */
  async getUserStatusWithRealTimeCheck(vibeUserId: string): Promise<UserConnectionStatus> {
    const user = await this.prisma.vibeUser.findUnique({
      where: { id: vibeUserId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let updatedUser = user;
    let isUpdated = false;

    // 检查Discord状态：如果用户已连接Discord但isJoined为false，则实时检查
    if (user.discordConnected && user.discordId && !user.isJoined) {
      try {
        this.logger.log(`Checking Discord membership for user ${user.discordId}...`);
        const discordResult = await this.discordService.checkAndUpdateGuildMembership(user.discordId);
        
        if (discordResult.updated) {
          isUpdated = true;
          this.logger.log(`Discord status updated for user ${vibeUserId}: isJoined=${discordResult.isJoined}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to check Discord membership for user ${vibeUserId}: ${error.message}`);
      }
    }

    // 检查Twitter状态：如果用户已连接Twitter但isFollowed为false，则实时检查
    if (user.twitterConnected && user.twitterId && !user.isFollowed) {
      try {
        this.logger.log(`Checking Twitter follow status for user ${user.twitterId}...`);
        const twitterResult = await this.twitterService.checkAndUpdateFollowStatus(user.twitterId);
        
        if (twitterResult.updated) {
          isUpdated = true;
          this.logger.log(`Twitter status updated for user ${vibeUserId}: isFollowed=${twitterResult.isFollowed}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to check Twitter follow status for user ${vibeUserId}: ${error.message}`);
      }
    }

    // 如果有更新，重新获取用户数据
    if (isUpdated) {
      updatedUser = await this.prisma.vibeUser.findUnique({
        where: { id: vibeUserId },
      });
      
      // 重新检查全连接状态
      await this.checkAndUpdateAllConnected(vibeUserId);
      
      // 再次获取最新数据（可能allConnected状态已更新）
      updatedUser = await this.prisma.vibeUser.findUnique({
        where: { id: vibeUserId },
      });
    }

    return {
      discord: {
        connected: updatedUser.discordConnected,
        username: updatedUser.discordUsername,
        userId: updatedUser.discordId,
        verified: updatedUser.isJoined,
        isJoined: updatedUser.isJoined,
        connectedAt: updatedUser.discordConnected ? updatedUser.updatedAt : null,
      },
      twitter: {
        connected: updatedUser.twitterConnected,
        username: updatedUser.twitterUsername,
        userId: updatedUser.twitterId,
        verified: updatedUser.isFollowed,
        isFollowed: updatedUser.isFollowed,
        connectedAt: updatedUser.twitterConnected ? updatedUser.updatedAt : null,
      },
      wallet: {
        connected: updatedUser.walletConnected,
        walletAddress: updatedUser.walletAddress,
        verifiedAt: updatedUser.walletVerifiedAt,
      },
      overall: {
        allConnected: updatedUser.allConnected,
        completedAt: updatedUser.completedAt,
        canProceed: updatedUser.discordConnected && updatedUser.twitterConnected && updatedUser.walletConnected,
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