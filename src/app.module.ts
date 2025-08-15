import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { VibeUserModule } from './vibe-user/vibe-user.module';
import { WalletModule } from './wallet/wallet.module';
import { SocialModule } from './social/social.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    CommonModule,
    VibeUserModule,
    WalletModule,
    SocialModule,
    HealthModule,
  ],
})
export class AppModule {}