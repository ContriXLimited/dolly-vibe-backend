import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const adminSecret = request.headers['x-admin-secret'];

    if (!adminSecret) {
      throw new UnauthorizedException('Admin secret is required');
    }

    if (adminSecret !== process.env.ADMIN_SECRET) {
      throw new UnauthorizedException('Invalid admin secret');
    }

    return true;
  }
}