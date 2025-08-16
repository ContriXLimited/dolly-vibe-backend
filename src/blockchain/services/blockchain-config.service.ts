import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockchainConfig } from '../types';

@Injectable()
export class BlockchainConfigService {
  constructor(private readonly configService: ConfigService) {}

  getBlockchainConfig(): BlockchainConfig {
    return {
      chainId: this.configService.get<number>('ZG_CHAIN_ID', 16601),
      rpcUrl: this.configService.get<string>('ZG_RPC_URL', 'https://evmrpc-testnet.0g.ai'),
      indexerUrl: this.configService.get<string>('ZG_INDEXER_URL', 'https://indexer-storage-testnet-turbo.0g.ai'),
      privateKey: this.configService.get<string>('ZG_PRIVATE_KEY', ''),
      contractAddress: this.configService.get<string>('AGENT_NFT_CONTRACT_ADDRESS', '0xCE5290211Fce86A0CAb876570fc7a97A2E4dbdD1'),
    };
  }

  validateConfig(): void {
    const config = this.getBlockchainConfig();
    
    if (!config.privateKey) {
      throw new Error('ZG_PRIVATE_KEY is required but not provided');
    }

    if (!config.contractAddress) {
      throw new Error('AGENT_NFT_CONTRACT_ADDRESS is required but not provided');
    }

    if (!config.rpcUrl) {
      throw new Error('ZG_RPC_URL is required but not provided');
    }
  }
}