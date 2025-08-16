import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AiApiGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const aiSecret = request.headers['x-ai-secret'];

    if (!aiSecret) {
      throw new UnauthorizedException('AI API secret is required');
    }

    if (aiSecret !== process.env.AI_API_SECRET) {
      throw new UnauthorizedException('Invalid AI API secret');
    }

    return true;
  }
}