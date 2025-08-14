import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { createId } from '@paralleldrive/cuid2';

@Injectable()
export class WalletVerificationService {
  private readonly logger = new Logger(WalletVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 生成钱包签名用的nonce
   */
  async generateNonce(walletAddress: string) {
    // 验证钱包地址格式
    if (!ethers.isAddress(walletAddress)) {
      throw new BadRequestException('Invalid wallet address');
    }

    // 清理过期的nonce
    await this.cleanupExpiredNonces();

    // 检查是否已存在未过期的nonce
    const existingNonce = await this.prisma.walletNonce.findFirst({
      where: {
        walletAddress: walletAddress.toLowerCase(),
        expiresAt: { gt: new Date() },
      },
    });

    if (existingNonce) {
      return {
        nonce: existingNonce.nonce,
        message: existingNonce.message,
        expiresAt: existingNonce.expiresAt,
      };
    }

    // 生成新的nonce
    const nonce = this.generateRandomNonce();
    const messagePrefix = this.configService.get<string>('WALLET_SIGN_MESSAGE_PREFIX');
    const message = `${messagePrefix}${nonce}`;
    const expireMinutes = parseInt(this.configService.get<string>('NONCE_EXPIRE_MINUTES', '10'));
    const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000);

    const walletNonce = await this.prisma.walletNonce.create({
      data: {
        id: createId(),
        walletAddress: walletAddress.toLowerCase(),
        nonce,
        message,
        expiresAt,
      },
    });

    this.logger.log(`Generated nonce for wallet ${walletAddress}`);

    return {
      nonce: walletNonce.nonce,
      message: walletNonce.message,
      expiresAt: walletNonce.expiresAt,
    };
  }

  /**
   * 验证钱包签名
   */
  async verifyWalletSignature(walletAddress: string, nonce: string, signature: string) {
    // 验证钱包地址格式
    if (!ethers.isAddress(walletAddress)) {
      throw new BadRequestException('Invalid wallet address');
    }

    // 查找nonce记录
    const nonceRecord = await this.prisma.walletNonce.findFirst({
      where: {
        walletAddress: walletAddress.toLowerCase(),
        nonce,
        expiresAt: { gt: new Date() },
      },
    });

    if (!nonceRecord) {
      throw new BadRequestException('Invalid or expired nonce');
    }

    try {
      // 验证签名
      const recoveredAddress = ethers.verifyMessage(nonceRecord.message, signature);
      
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new BadRequestException('Signature verification failed');
      }

      // 删除已使用的nonce
      await this.prisma.walletNonce.delete({
        where: { id: nonceRecord.id },
      });

      this.logger.log(`Wallet signature verified for ${walletAddress}`);

      return {
        verified: true,
        walletAddress: walletAddress.toLowerCase(),
      };

    } catch (error) {
      this.logger.error(`Wallet verification failed for ${walletAddress}:`, error.message);
      throw new BadRequestException('Invalid signature');
    }
  }

  /**
   * 检查钱包是否已连接
   */
  async checkWalletStatus(walletAddress: string) {
    if (!ethers.isAddress(walletAddress)) {
      throw new BadRequestException('Invalid wallet address');
    }

    const vibeUser = await this.prisma.vibeUser.findFirst({
      where: {
        walletAddress: walletAddress.toLowerCase(),
        walletConnected: true,
      },
      select: {
        id: true,
        walletAddress: true,
        walletConnected: true,
        walletVerifiedAt: true,
      },
    });

    return {
      connected: !!vibeUser,
      walletAddress: walletAddress.toLowerCase(),
      verifiedAt: vibeUser?.walletVerifiedAt || null,
    };
  }

  /**
   * 生成随机nonce
   */
  private generateRandomNonce(): string {
    return ethers.hexlify(ethers.randomBytes(16)).substring(2); // 移除0x前缀
  }

  /**
   * 清理过期的nonce记录
   */
  private async cleanupExpiredNonces() {
    const deleted = await this.prisma.walletNonce.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (deleted.count > 0) {
      this.logger.log(`Cleaned up ${deleted.count} expired nonce records`);
    }
  }
}