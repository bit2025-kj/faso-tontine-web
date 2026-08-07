import type { SessionData } from './session.service';

declare global {
  namespace Express {
    interface Request {
      deviceId?: string;
      sessionId?: string;
      sessionData?: SessionData;
    }
  }
}

export {};
