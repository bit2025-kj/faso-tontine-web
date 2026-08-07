import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { SESSION_COOKIE } from './constants';
import { SessionService } from './session.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const sessionId = req.cookies?.[SESSION_COOKIE] as string | undefined;
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new UnauthorizedException('No active session');
    }
    req.sessionId = sessionId;
    req.sessionData = session;
    return true;
  }
}
