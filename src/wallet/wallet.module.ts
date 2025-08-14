import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletVerificationService } from './services/wallet-verification.service';

@Module({
  controllers: [WalletController],
  providers: [WalletVerificationService],
  exports: [WalletVerificationService],
})
export class WalletModule {}