import { Module } from '@nestjs/common';
import { VibePassController } from './vibe-pass.controller';
import { VibePassService } from './vibe-pass.service';
import { CommonModule } from '../common/common.module';
import { WalletModule } from '../wallet/wallet.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [CommonModule, WalletModule, BlockchainModule],
  controllers: [VibePassController],
  providers: [VibePassService],
  exports: [VibePassService],
})
export class VibePassModule {}