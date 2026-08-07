import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { DEVICE_COOKIE } from './constants';

/**
 * Every browser gets a stable anonymous device id, set before login even
 * exists yet. It's what we hand the FastAPI backend as device_id on
 * verify-otp and as X-Device-ID on every authenticated call afterwards —
 * the browser JS never sees or needs to know about it.
 */
@Injectable()
export class DeviceIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    let deviceId = req.cookies?.[DEVICE_COOKIE] as string | undefined;
    if (!deviceId) {
      deviceId = randomUUID();
      res.cookie(DEVICE_COOKIE, deviceId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 365 * 24 * 3600 * 1000,
      });
    }
    req.deviceId = deviceId;
    next();
  }
}
