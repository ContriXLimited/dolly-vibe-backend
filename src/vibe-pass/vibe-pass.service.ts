import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WalletVerificationService } from '../wallet/services/wallet-verification.service';
import { AgentNFTService } from '../blockchain/services/agent-nft.service';
import { createId } from '@paralleldrive/cuid2';
import { JoinProjectDto } from './dto/join-project.dto';
import { MintInftDto } from './dto/mint-inft.dto';
import { UploadMetadataDto } from './dto/upload-metadata.dto';
import { MintWithMetadataDto } from './dto/mint-with-metadata.dto';
import { GetMintParamsDto } from './dto/get-mint-params.dto';
import { ConfirmMintDto } from './dto/confirm-mint.dto';
import { QueryVibePassDto } from './dto/query-vibe-pass.dto';
import { VibePass, VibePassStatus, User, VibeUser } from '@prisma/client';
import { AIModelData, EncryptedMetadataResult } from '@/blockchain/lib/types';

@Injectable()
export class VibePassService {
  private readonly logger = new Logger(VibePassService.name);

  constructor(
    private prisma: PrismaService,
    private walletVerificationService: WalletVerificationService,
    private agentNFTService: AgentNFTService,
  ) {}

  async joinProject(currentUser: VibeUser, dto: JoinProjectDto): Promise<VibePass> {
    const { vibeProjectId } = dto;

    // 确定要加入的项目
    let targetVibeProjectId = vibeProjectId;
    
    if (!targetVibeProjectId) {
      // 使用默认项目
      targetVibeProjectId = process.env.DEFAULT_VIBE_PROJECT_ID;
      if (!targetVibeProjectId) {
        throw new BadRequestException('Default VibeProject not configured');
      }
    }

    // 验证 VibeProject 是否存在
    const vibeProject = await this.prisma.vibeProject.findUnique({
      where: { id: targetVibeProjectId },
    });

    if (!vibeProject) {
      throw new NotFoundException(`VibeProject with ID ${targetVibeProjectId} not found`);
    }

    // 检查用户是否已经加入该项目
    const existingVibePass = await this.prisma.vibePass.findFirst({
      where: {
        vibeUserId: currentUser.id,
        vibeProjectId: vibeProject.id,
      },
    });

    if (existingVibePass) {
      throw new ConflictException('User has already joined this project');
    }

    // 创建或查找对应的 User 记录
    let user = await this.prisma.user.findFirst({
      where: {
        projectId: vibeProject.projectId,
        platformId: currentUser.discordId,
        platform: 'DISCORD',
      },
    });

    if (!user) {
      // 验证用户必须有 Discord ID
      if (!currentUser.discordId) {
        throw new BadRequestException('Discord ID is required to join project');
      }

      // 创建新的 User 记录
      const platform = 'DISCORD';
      const platformId = currentUser.discordId;
      const userName = currentUser.discordUsername || 'Unknown User';

      user = await this.prisma.user.create({
        data: {
          id: createId(),
          projectId: vibeProject.projectId,
          platform,
          platformId,
          name: userName,
        },
      });
    }

    // 创建 VibePass
    const vibePass = await this.prisma.vibePass.create({
      data: {
        id: createId(),
        vibeUserId: currentUser.id,
        vibeProjectId: vibeProject.id,
        userId: user.id,
        params: JSON.stringify([0, 0, 0, 0, 0]), // 初始化 5 个维度参数为 0
        status: VibePassStatus.NORMAL,
      },
    });

    return this.serializeVibePassJsonFields(vibePass);
  }

  async mintInft(vibePassId: string, dto: MintInftDto): Promise<VibePass> {
    const { walletAddress, nonce, signature, tokenMetadata } = dto;

    // 验证 VibePass 是否存在
    const vibePass = await this.prisma.vibePass.findUnique({
      where: { id: vibePassId },
    });

    if (!vibePass) {
      throw new NotFoundException(`VibePass with ID ${vibePassId} not found`);
    }

    // 检查是否已经铸造
    if (vibePass.tokenId) {
      throw new ConflictException('INFT has already been minted for this VibePass');
    }

    // 验证钱包签名
    try {
      await this.walletVerificationService.verifySignatureOnly(
        walletAddress,
        nonce,
        signature,
      );
    } catch (error) {
      throw new BadRequestException(`Invalid wallet signature: ${error.message}`);
    }

    // 获取用户数据以创建 AI 模型元数据
    const vibeUser = await this.prisma.vibeUser.findUnique({
      where: { id: vibePass.vibeUserId },
    });

    if (!vibeUser) {
      throw new NotFoundException('VibeUser not found');
    }

    // 获取对应的 User 记录（包含 name 和 profile）
    const user = await this.prisma.user.findUnique({
      where: { id: vibePass.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 获取用户的历史消息
    const messages = await this.prisma.message.findMany({
      where: {
        authorId: user.platformId, // Discord ID
        platform: user.platform,
        projectId: user.projectId,
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // 限制最近100条消息
      select: {
        message: true,
        createdAt: true,
        sentiment: true,
      },
    });

    // 创建 AI 模型数据
    const aiModelData: AIModelData = {
      name: user.name || vibeUser.discordUsername || 'Dolly Vibe INFT',
      version: '1.0.0',
      description: `Intelligent NFT for ${user.name || vibeUser.discordUsername || 'user'} representing their profile and participation in Dolly Vibe`,
      parameters: {
        userName: user.name,
        userProfile: user.profile,
        messageHistory: messages.map(msg => ({
          content: msg.message,
          timestamp: msg.createdAt.toISOString(),
          sentiment: msg.sentiment,
        })),
        vibePassId: vibePass.id,
        walletAddress: walletAddress,
      },
      metadata: tokenMetadata || {},
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
    };

    this.logger.log(`Minting INFT for VibePass ${vibePassId} to wallet ${walletAddress}`);

    try {
      // Step 1: Upload metadata to 0G Storage
      this.logger.log('Step 1: Uploading metadata to 0G Storage...');
      const encryptedResult = await this.agentNFTService.uploadMetadata(aiModelData, walletAddress);
      
      // Step 2: Mint INFT using the encrypted result
      this.logger.log('Step 2: Minting INFT with uploaded metadata...');
      const mintResult = await this.agentNFTService.mintWithEncryptedResult(aiModelData, encryptedResult, walletAddress);

      this.logger.log(`INFT minted successfully - Token ID: ${mintResult.tokenId}, TX: ${mintResult.txHash}`);

      // 更新 VibePass 记录
      const updatedVibePass = await this.prisma.vibePass.update({
        where: { id: vibePassId },
        data: {
          tokenId: mintResult.tokenId.toString(),
          mintTxHash: mintResult.txHash,
          rootHash: mintResult.rootHash,
          sealedKey: mintResult.sealedKey, // 保存 sealedKey
          mintedAt: new Date(),
        },
      });

      return this.serializeVibePassJsonFields(updatedVibePass);
    } catch (error) {
      this.logger.error(`Failed to mint INFT: ${error.message}`);
      throw new BadRequestException(`Failed to mint INFT: ${error.message}`);
    }
  }

  /**
   * Step 1: Upload metadata to 0G Storage
   */
  async uploadMetadata(vibePassId: string, dto: UploadMetadataDto): Promise<{ 
    rootHash: string; 
    sealedKey: string; 
    message: string; 
  }> {
    const { walletAddress, nonce, signature, tokenMetadata } = dto;

    // 验证 VibePass 是否存在
    const vibePass = await this.prisma.vibePass.findUnique({
      where: { id: vibePassId },
    });

    if (!vibePass) {
      throw new NotFoundException(`VibePass with ID ${vibePassId} not found`);
    }

    // 检查是否已经铸造
    if (vibePass.tokenId) {
      throw new ConflictException('INFT has already been minted for this VibePass');
    }

    // // 验证钱包签名
    // try {
    //   await this.walletVerificationService.verifySignatureOnly(
    //     walletAddress,
    //     nonce,
    //     signature,
    //   );
    // } catch (error) {
    //   throw new BadRequestException(`Invalid wallet signature: ${error.message}`);
    // }

    // 获取用户数据
    const { aiModelData } = await this.getUserAIModelData(vibePass, walletAddress, tokenMetadata);

    this.logger.log(`Uploading metadata for VibePass ${vibePassId} to wallet ${walletAddress}`);

    try {
      // 上传元数据到 0G Storage
      const encryptedResult = await this.agentNFTService.uploadMetadata(aiModelData, walletAddress);

      this.logger.log(`Metadata uploaded successfully - rootHash: ${encryptedResult.rootHash}`);

      // 将 sealedKey 保存到 VibePass 中
      await this.prisma.vibePass.update({
        where: { id: vibePassId },
        data: {
          sealedKey: encryptedResult.sealedKey,
        },
      });

      this.logger.log(`SealedKey saved to VibePass ${vibePassId}`);

      return {
        rootHash: encryptedResult.rootHash,
        sealedKey: encryptedResult.sealedKey,
        message: 'Metadata uploaded successfully to 0G Storage',
      };
    } catch (error) {
      this.logger.error(`Failed to upload metadata: ${error.message}`);
      throw new BadRequestException(`Failed to upload metadata: ${error.message}`);
    }
  }

  /**
   * Step 2: Mint INFT using uploaded metadata
   */
  async mintWithMetadata(vibePassId: string, dto: MintWithMetadataDto): Promise<VibePass> {
    const { walletAddress, rootHash, sealedKey, nonce, signature, tokenMetadata } = dto;

    // 验证 VibePass 是否存在
    const vibePass = await this.prisma.vibePass.findUnique({
      where: { id: vibePassId },
    });

    if (!vibePass) {
      throw new NotFoundException(`VibePass with ID ${vibePassId} not found`);
    }

    // 检查是否已经铸造
    if (vibePass.tokenId) {
      throw new ConflictException('INFT has already been minted for this VibePass');
    }

    // 验证钱包签名
    try {
      await this.walletVerificationService.verifySignatureOnly(
        walletAddress,
        nonce,
        signature,
      );
    } catch (error) {
      throw new BadRequestException(`Invalid wallet signature: ${error.message}`);
    }

    // 获取 sealedKey：优先使用前端传递的，否则从数据库获取
    let finalSealedKey = sealedKey;
    if (!finalSealedKey) {
      if (!vibePass.sealedKey) {
        throw new BadRequestException('SealedKey not found. Please upload metadata first.');
      }
      finalSealedKey = vibePass.sealedKey;
      this.logger.log(`Using sealedKey from database for VibePass ${vibePassId}`);
    } else {
      // 验证传递的 sealedKey 与数据库中的是否一致（如果数据库中有的话）
      if (vibePass.sealedKey && vibePass.sealedKey !== finalSealedKey) {
        this.logger.warn(`SealedKey mismatch for VibePass ${vibePassId}. Using provided sealedKey.`);
      }
    }

    // 获取用户数据
    const { aiModelData } = await this.getUserAIModelData(vibePass, walletAddress, tokenMetadata);

    this.logger.log(`Minting INFT for VibePass ${vibePassId} with rootHash: ${rootHash}`);

    try {
      // 使用上传的元数据铸造 INFT
      const encryptedResult: EncryptedMetadataResult = {
        rootHash,
        sealedKey: finalSealedKey,
      };

      const mintResult = await this.agentNFTService.mintWithEncryptedResult(
        aiModelData, 
        encryptedResult, 
        walletAddress
      );

      this.logger.log(`INFT minted successfully - Token ID: ${mintResult.tokenId}, TX: ${mintResult.txHash}`);

      // 更新 VibePass 记录
      const updatedVibePass = await this.prisma.vibePass.update({
        where: { id: vibePassId },
        data: {
          tokenId: mintResult.tokenId.toString(),
          mintTxHash: mintResult.txHash,
          rootHash: mintResult.rootHash,
          sealedKey: finalSealedKey, // 确保保存最终使用的 sealedKey
          mintedAt: new Date(),
        },
      });

      return this.serializeVibePassJsonFields(updatedVibePass);
    } catch (error) {
      this.logger.error(`Failed to mint INFT: ${error.message}`);
      throw new BadRequestException(`Failed to mint INFT: ${error.message}`);
    }
  }

  /**
   * Helper method to serialize VibePass JSON fields
   */
  private serializeVibePassJsonFields(vibePass: VibePass): any {
    return {
      ...vibePass,
      params: vibePass.params ? JSON.parse(vibePass.params) : null,
      tags: vibePass.tags ? JSON.parse(vibePass.tags) : null,
    };
  }

  /**
   * Helper method to serialize array of VibePass JSON fields
   */
  private serializeVibePassArrayJsonFields(vibePasses: VibePass[]): any[] {
    return vibePasses.map(vibePass => this.serializeVibePassJsonFields(vibePass));
  }

  /**
   * Helper method to get user AI model data
   */
  private async getUserAIModelData(vibePass: VibePass, walletAddress: string, tokenMetadata?: any): Promise<{
    aiModelData: AIModelData;
    vibeUser: VibeUser;
    user: User;
  }> {
    // 获取用户数据以创建 AI 模型元数据
    const vibeUser = await this.prisma.vibeUser.findUnique({
      where: { id: vibePass.vibeUserId },
    });

    if (!vibeUser) {
      throw new NotFoundException('VibeUser not found');
    }

    // 获取对应的 User 记录（包含 name 和 profile）
    const user = await this.prisma.user.findUnique({
      where: { id: vibePass.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 获取用户的历史消息
    const messages = await this.prisma.message.findMany({
      where: {
        authorId: user.platformId, // Discord ID
        platform: user.platform,
        projectId: user.projectId,
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // 限制最近100条消息
      select: {
        message: true,
        createdAt: true,
        sentiment: true,
      },
    });

    // 创建 AI 模型数据
    const aiModelData: AIModelData = {
      name: user.name || vibeUser.discordUsername || 'Dolly Vibe INFT',
      version: '1.0.0',
      description: `Intelligent NFT for ${user.name || vibeUser.discordUsername || 'user'} representing their profile and participation in Dolly Vibe`,
      parameters: {
        userName: user.name,
        userProfile: user.profile,
        messageHistory: messages.map(msg => ({
          content: msg.message,
          timestamp: msg.createdAt.toISOString(),
          sentiment: msg.sentiment,
        })),
        vibePassId: vibePass.id,
        walletAddress: walletAddress,
      },
      metadata: tokenMetadata || {},
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
    };

    return { aiModelData, vibeUser, user };
  }

  async findByUser(vibeUserId: string): Promise<VibePass[]> {
    const vibePasses = await this.prisma.vibePass.findMany({
      where: { vibeUserId },
      orderBy: { createdAt: 'desc' },
    });

    return this.serializeVibePassArrayJsonFields(vibePasses);
  }

  async findById(id: string): Promise<VibePass> {
    const vibePass = await this.prisma.vibePass.findUnique({
      where: { id },
    });

    if (!vibePass) {
      throw new NotFoundException(`VibePass with ID ${id} not found`);
    }

    return this.serializeVibePassJsonFields(vibePass);
  }

  async findMany(dto: QueryVibePassDto) {
    const { vibeProjectId, page = 1, limit = 20 } = dto;

    const skip = (page - 1) * limit;

    const where: any = {};
    if (vibeProjectId) {
      where.vibeProjectId = vibeProjectId;
    }

    const [vibePasses, total] = await Promise.all([
      this.prisma.vibePass.findMany({
        where,
        skip,
        take: limit,
        orderBy: { score: 'desc' }, // 按积分降序排列
      }),
      this.prisma.vibePass.count({ where }),
    ]);

    return {
      data: this.serializeVibePassArrayJsonFields(vibePasses),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDefaultVibeProject() {
    const defaultVibeProjectId = process.env.DEFAULT_VIBE_PROJECT_ID;
    if (!defaultVibeProjectId) {
      throw new BadRequestException('Default VibeProject not configured');
    }

    const vibeProject = await this.prisma.vibeProject.findUnique({
      where: { id: defaultVibeProjectId },
    });

    if (!vibeProject) {
      throw new NotFoundException('Default VibeProject not found');
    }

    return vibeProject;
  }

  async checkVibePassExists(userId: string, projectId: string): Promise<{ exists: boolean; vibePassId?: string }> {
    // 首先根据 projectId 查找对应的 VibeProject
    const vibeProject = await this.prisma.vibeProject.findFirst({
      where: { projectId },
    });

    if (!vibeProject) {
      return { exists: false };
    }

    // 然后查找是否有对应的 User 记录
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { exists: false };
    }

    // 最后检查是否存在对应的 VibePass
    const vibePass = await this.prisma.vibePass.findFirst({
      where: {
        userId: userId,
        vibeProjectId: vibeProject.id,
      },
    });

    if (vibePass) {
      return { exists: true, vibePassId: vibePass.id };
    } else {
      return { exists: false };
    }
  }

  /**
   * Get mint contract call parameters for frontend to execute the transaction
   */
  async getMintParams(vibePassId: string, dto: { walletAddress: string; rootHash: string; sealedKey?: string }): Promise<{
    contractAddress: string;
    methodName: string;
    params: any[];
    abi: any[];
    to: string;
    data: string;
    metadata: {
      rootHash: string;
      sealedKey: string;
      proof: string;
      dataDescriptions: string[];
    };
  }> {
    const { walletAddress, rootHash, sealedKey } = dto;

    // 验证 VibePass 是否存在
    const vibePass = await this.prisma.vibePass.findUnique({
      where: { id: vibePassId },
    });

    if (!vibePass) {
      throw new NotFoundException(`VibePass with ID ${vibePassId} not found`);
    }

    // 检查是否已经铸造
    if (vibePass.tokenId) {
      throw new ConflictException('INFT has already been minted for this VibePass');
    }

    // 获取 sealedKey：优先使用传入的，否则从数据库获取
    let finalSealedKey = sealedKey;
    if (!finalSealedKey) {
      if (!vibePass.sealedKey) {
        throw new BadRequestException('SealedKey not found. Please upload metadata first or provide sealedKey.');
      }
      finalSealedKey = vibePass.sealedKey;
    }

    // 获取用户数据
    const { aiModelData } = await this.getUserAIModelData(vibePass, walletAddress);

    this.logger.log(`Preparing mint parameters for VibePass ${vibePassId} to wallet ${walletAddress}`);

    try {
      // 构造加密结果
      const encryptedResult: EncryptedMetadataResult = {
        rootHash,
        sealedKey: finalSealedKey,
      };

      // 获取合约调用参数
      const mintCallParams = await this.agentNFTService.getMintCallParams(
        aiModelData,
        walletAddress,
        encryptedResult
      );

      this.logger.log(`Mint parameters prepared successfully for VibePass ${vibePassId}`);

      return {
        ...mintCallParams,
        metadata: {
          rootHash: encryptedResult.rootHash,
          sealedKey: encryptedResult.sealedKey,
          proof: mintCallParams.params[0][0], // First proof from params
          dataDescriptions: mintCallParams.params[1], // Data descriptions from params
        },
      };
    } catch (error) {
      this.logger.error(`Failed to prepare mint parameters: ${error.message}`);
      throw new BadRequestException(`Failed to prepare mint parameters: ${error.message}`);
    }
  }

  /**
   * Confirm mint transaction and extract tokenId from transaction hash
   */
  async confirmMint(vibePassId: string, dto: ConfirmMintDto): Promise<VibePass> {
    const { txHash, rootHash, sealedKey } = dto;

    // 验证 VibePass 是否存在
    const vibePass = await this.prisma.vibePass.findUnique({
      where: { id: vibePassId },
    });

    if (!vibePass) {
      throw new NotFoundException(`VibePass with ID ${vibePassId} not found`);
    }

    // 检查是否已经铸造
    if (vibePass.tokenId) {
      throw new ConflictException('INFT has already been minted for this VibePass');
    }

    this.logger.log(`Confirming mint transaction for VibePass ${vibePassId} with txHash: ${txHash}`);

    try {
      // 使用 AgentNFTService 从交易哈希中提取 tokenId
      const tokenId = await this.agentNFTService.getTokenIdFromTransaction(txHash);

      // 更新 VibePass 记录
      const updatedVibePass = await this.prisma.vibePass.update({
        where: { id: vibePassId },
        data: {
          tokenId: tokenId.toString(),
          mintTxHash: txHash,
          rootHash: rootHash,
          sealedKey: sealedKey,
          mintedAt: new Date(),
        },
      });

      this.logger.log(`Mint confirmed successfully for VibePass ${vibePassId} - Token ID: ${tokenId}, TX: ${txHash}`);

      return this.serializeVibePassJsonFields(updatedVibePass);
    } catch (error) {
      this.logger.error(`Failed to confirm mint: ${error.message}`);
      throw new BadRequestException(`Failed to confirm mint: ${error.message}`);
    }
  }
}