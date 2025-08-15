import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { VibeUserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async validateVibeUser(walletAddress: string): Promise<any> {
    const vibeUser = await this.prisma.vibeUser.findFirst({
      where: { 
        walletAddress: walletAddress.toLowerCase(),
        status: VibeUserStatus.NORMAL, // 确保用户状态正常
      },
    });

    if (!vibeUser) {
      return null;
    }

    // 检查是否完成所有必要的连接和验证
    const isFullyVerified = 
      vibeUser.walletConnected &&     // 钱包已连接
      vibeUser.discordConnected &&    // Discord已连接
      vibeUser.twitterConnected &&    // Twitter已连接
      vibeUser.isJoined &&            // 已加入Discord服务器
      vibeUser.isFollowed &&          // 已关注Twitter
      vibeUser.allConnected;          // 全部连接完成

    if (!isFullyVerified) {
      return null;
    }

    return vibeUser;
  }


  async findVibeUserById(id: string) {
    return this.prisma.vibeUser.findUnique({
      where: { id },
    });
  }

}