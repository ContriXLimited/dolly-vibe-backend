import { Module } from '@nestjs/common';
import { VibeUserService } from './vibe-user.service';
import { VibeUserController } from './vibe-user.controller';

@Module({
  controllers: [VibeUserController],
  providers: [VibeUserService],
  exports: [VibeUserService],
})
export class VibeUserModule {}