import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

/**
 * Everything the BFF knows about one logged-in browser. Never sent to the
 * browser itself — only the opaque session id (as a signed httpOnly cookie)
 * ever leaves this process.
 */
export interface SessionData {
  userId: string;
  role: string;
  accessToken: string;
  refreshToken: string;
  deviceId: string;
  profileComplete: boolean;
}

/**
 * v1 session store: in-memory Map, one Node process. Fine for a single
 * Render instance; swap for Redis if this ever runs on more than one
 * instance (the FastAPI backend's own rate limiter has the same limitation
 * today, see docs/technical_debt.md).
 */
@Injectable()
export class SessionService {
  private readonly store = new Map<string, SessionData>();

  create(data: SessionData): string {
    const id = randomUUID();
    this.store.set(id, data);
    return id;
  }

  get(id: string | undefined): SessionData | undefined {
    if (!id) return undefined;
    return this.store.get(id);
  }

  update(id: string, patch: Partial<SessionData>): SessionData | undefined {
    const current = this.store.get(id);
    if (!current) return undefined;
    const next = { ...current, ...patch };
    this.store.set(id, next);
    return next;
  }

  destroy(id: string): void {
    this.store.delete(id);
  }
}
