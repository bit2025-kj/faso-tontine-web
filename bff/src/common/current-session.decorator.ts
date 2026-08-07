import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { SessionData } from './session.service';

export interface CurrentSession {
  id: string;
  data: SessionData;
}

/**
 * Pulls the authenticated session out of the request. Only usable behind
 * @UseGuards(SessionAuthGuard), which is what actually populates req.sessionId/sessionData.
 */
export const CurrentSession = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): CurrentSession => {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!req.sessionId || !req.sessionData) {
      throw new InternalServerErrorException(
        'CurrentSession used without SessionAuthGuard',
      );
    }
    return { id: req.sessionId, data: req.sessionData };
  },
);
