import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgentNFTService } from './services/agent-nft.service';
import { BlockchainConfigService } from './services/blockchain-config.service';

@Module({
  imports: [ConfigModule],
  providers: [BlockchainConfigService, AgentNFTService],
  exports: [AgentNFTService, BlockchainConfigService],
})
export class BlockchainModule {}