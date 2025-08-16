import { Module } from '@nestjs/common';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { CommonModule } from '../common/common.module';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [CommonModule, RedisModule],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}