import { ApiProperty } from '@nestjs/swagger';

export class DiscordOAuthCallbackDto {
  @ApiProperty({ example: 'abc123def456', description: 'Discord authorization code' })
  code: string;

  @ApiProperty({ example: 'random-state-string', description: 'OAuth state parameter' })
  state?: string;
}

export class TwitterOAuthCallbackDto {
  @ApiProperty({ example: 'twitter-oauth-token', description: 'Twitter OAuth token' })
  oauth_token: string;

  @ApiProperty({ example: 'twitter-oauth-verifier', description: 'Twitter OAuth verifier' })
  oauth_verifier: string;
}

export class SocialConnectionStatusDto {
  @ApiProperty({ example: true, description: 'Whether the service is connected' })
  connected: boolean;

  @ApiProperty({ example: 'username123', description: 'Username on the platform' })
  username?: string;

  @ApiProperty({ example: '123456789', description: 'Platform user ID' })
  userId?: string;

  @ApiProperty({ example: true, description: 'Additional verification status (joined/followed)' })
  verified?: boolean;

  @ApiProperty({ description: 'Connection timestamp' })
  connectedAt?: Date;
}