import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { VibeUserModule } from './vibe-user/vibe-user.module';
import { WalletModule } from './wallet/wallet.module';
import { SocialModule } from './social/social.module';
import { HealthModule } from './health/health.module';
import { VibePassModule } from './vibe-pass/vibe-pass.module';
import { ProfileUpdateModule } from './profile-update/profile-update.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    CommonModule,
    VibeUserModule,
    WalletModule,
    SocialModule,
    HealthModule,
    VibePassModule,
    ProfileUpdateModule,
    LeaderboardModule,
  ],
})
export class AppModule {}