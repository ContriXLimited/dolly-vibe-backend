import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const vibeUser = await this.authService.findVibeUserById(payload.sub);
    if (!vibeUser) {
      return null;
    }
    
    return {
      id: vibeUser.id,
      walletAddress: vibeUser.walletAddress,
      discordId: vibeUser.discordId,
      twitterId: vibeUser.twitterId,
      discordUsername: vibeUser.discordUsername,
      twitterUsername: vibeUser.twitterUsername,
      discordConnected: vibeUser.discordConnected,
      twitterConnected: vibeUser.twitterConnected,
      walletConnected: vibeUser.walletConnected,
      isJoined: vibeUser.isJoined,
      isFollowed: vibeUser.isFollowed,
      allConnected: vibeUser.allConnected,
      status: vibeUser.status,
    };
  }
}