import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ethers } from 'ethers';
import { BlockchainConfigService } from './blockchain-config.service';
import { MintResult, TokenInfo } from '../types';
import { AIModelData, EncryptedMetadataResult, StorageConfig } from '../lib/types';
import { AgentNFTClient } from '../lib/AgentNFTClient';

@Injectable()
export class AgentNFTService {
  private readonly logger = new Logger(AgentNFTService.name);
  private agentNFTClient: AgentNFTClient;

  constructor(private readonly blockchainConfig: BlockchainConfigService) {
    this.initializeAgentNFTClient();
  }

  private initializeAgentNFTClient(): void {
    try {
      this.blockchainConfig.validateConfig();
      const config = this.blockchainConfig.getBlockchainConfig();

      // Initialize provider
      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      
      // Initialize storage config
      const storageConfig: StorageConfig = {
        rpcUrl: config.rpcUrl,
        indexerUrl: config.indexerUrl,
        chainId: config.chainId,
      };

      // Initialize AgentNFTClient
      this.agentNFTClient = new AgentNFTClient(
        config.contractAddress,
        config.privateKey,
        provider,
        storageConfig
      );

      this.logger.log(`AgentNFTClient initialized - Network: 0G Testnet, Contract: ${config.contractAddress}`);
    } catch (error) {
      this.logger.error(`Failed to initialize AgentNFTClient: ${error.message}`);
      throw error;
    }
  }

  /**
   * Step 1: Upload metadata to 0G Storage and get rootHash
   * This method uses the AgentNFTClient's makeMetadata functionality
   */
  async uploadMetadata(
    aiModelData: AIModelData,
    recipientAddress: string
  ): Promise<EncryptedMetadataResult> {
    try {
      this.logger.log(`Uploading metadata for recipient: ${recipientAddress}`);

      // Validate recipient address
      if (!ethers.isAddress(recipientAddress)) {
        throw new BadRequestException('Invalid recipient address');
      }

      // Use AgentNFTClient's makeMetadata function
      const encryptedResult = await this.agentNFTClient.makeMetadata(
        aiModelData,
        recipientAddress
      );

      this.logger.log(`Metadata uploaded successfully - rootHash: ${encryptedResult.rootHash}`);

      return encryptedResult;
    } catch (error: any) {
      this.logger.error(`Metadata upload failed: ${error.message}`);
      throw new BadRequestException(`Failed to upload metadata: ${error.message}`);
    }
  }

  /**
   * Step 2: Mint NFT using the encrypted result from Step 1
   * This method uses the AgentNFTClient's mint function with encryptedResult parameter
   */
  async mintWithEncryptedResult(
    aiModelData: AIModelData,
    encryptedResult: EncryptedMetadataResult,
    recipientAddress: string
  ): Promise<MintResult> {
    try {
      this.logger.log(`Minting INFT with rootHash: ${encryptedResult.rootHash} for recipient: ${recipientAddress}`);

      // Validate recipient address
      if (!ethers.isAddress(recipientAddress)) {
        throw new BadRequestException('Invalid recipient address');
      }

      // Use AgentNFTClient's mint function with encryptedResult parameter
      const result = await this.agentNFTClient.mint(
        aiModelData,
        recipientAddress,
        encryptedResult
      );

      this.logger.log(`INFT minted successfully! Token ID: ${result.tokenId}`);

      return {
        tokenId: result.tokenId,
        txHash: result.txHash,
        rootHash: result.rootHash,
        sealedKey: result.sealedKey,
      };
    } catch (error: any) {
      this.logger.error(`Mint failed: ${error.message}`);
      throw new BadRequestException(`Failed to mint INFT: ${error.message}`);
    }
  }

  /**
   * Combined method: Upload metadata and mint NFT (for backward compatibility)
   * This uses the AgentNFTClient's complete mint functionality
   */
  async mint(
    aiModelData: AIModelData,
    recipientAddress: string
  ): Promise<MintResult> {
    try {
      this.logger.log(`Minting INFT for recipient: ${recipientAddress}`);

      // Use AgentNFTClient's complete mint function
      const result = await this.agentNFTClient.mint(aiModelData, recipientAddress);

      this.logger.log(`INFT minted successfully! Token ID: ${result.tokenId}, TX: ${result.txHash}`);

      return result;
    } catch (error: any) {
      this.logger.error(`Mint failed: ${error.message}`);
      throw new BadRequestException(`Failed to mint INFT: ${error.message}`);
    }
  }

  /**
   * Get token information using AgentNFTClient
   */
  async getTokenInfo(tokenId: number): Promise<TokenInfo> {
    try {
      const tokenInfo = await this.agentNFTClient.getTokenInfo(tokenId);

      return {
        tokenId: tokenInfo.tokenId,
        owner: tokenInfo.owner,
        dataHashes: tokenInfo.dataHashes,
        dataDescriptions: tokenInfo.dataDescriptions,
        authorizedUsers: tokenInfo.authorizedUsers,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get token info: ${error.message}`);
      throw new BadRequestException(`Failed to get token info: ${error.message}`);
    }
  }

  /**
   * Check if the service is ready
   */
  async isReady(): Promise<boolean> {
    try {
      // Try to get contract name to verify connection
      await this.agentNFTClient.getContract().name();
      return true;
    } catch (error) {
      this.logger.warn(`Blockchain service not ready: ${error.message}`);
      return false;
    }
  }
}