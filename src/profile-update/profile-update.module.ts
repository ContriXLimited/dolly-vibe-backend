import { Module, forwardRef } from '@nestjs/common';
import { ProfileUpdateController, ScoreRecordController } from './profile-update.controller';
import { ProfileUpdateService } from './profile-update.service';
import { CommonModule } from '../common/common.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';

@Module({
  imports: [CommonModule, forwardRef(() => LeaderboardModule)],
  controllers: [ProfileUpdateController, ScoreRecordController],
  providers: [ProfileUpdateService],
  exports: [ProfileUpdateService],
})
export class ProfileUpdateModule {}