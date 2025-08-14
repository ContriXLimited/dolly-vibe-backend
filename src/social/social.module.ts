import { Module } from '@nestjs/common';
import { DiscordService } from './discord/discord.service';
import { DiscordController } from './discord/discord.controller';
import { TwitterService } from './twitter/twitter.service';
import { TwitterController } from './twitter/twitter.controller';
import { UserStatusService } from './user-status.service';
import { UserStatusController } from './user-status.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [
    DiscordController,
    TwitterController,
    UserStatusController,
  ],
  providers: [
    DiscordService,
    TwitterService,
    UserStatusService,
  ],
  exports: [
    DiscordService,
    TwitterService,
    UserStatusService,
  ],
})
export class SocialModule {}