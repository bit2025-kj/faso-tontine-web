import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionService } from './session.service';

export interface UploadFile {
  field: string;
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

interface JsonRequestOptions {
  method: string;
  path: string;
  sessionId?: string;
  body?: unknown;
  query?: object;
  /** Set false for endpoints the FastAPI backend accepts without a token. */
  authRequired?: boolean;
}

interface MultipartRequestOptions {
  method: string;
  path: string;
  sessionId?: string;
  fields?: Record<string, string | undefined>;
  files: UploadFile[];
}

/**
 * Single point of contact with the existing FastAPI backend
 * (tontine-backend-qoti.onrender.com). Every other module goes through this
 * service instead of calling fetch() directly, so token attachment,
 * X-Device-ID binding, and refresh-and-retry-on-401 only live in one place.
 */
@Injectable()
export class BackendClientService {
  private readonly baseUrl: string;
  // Concurrent requests on the same session can all 401 at once (e.g. several
  // calls fired on page load right as the access token expires). Without this,
  // each one independently POSTs /auth/refresh with the same refresh token;
  // the backend rotates token_version on first use, so every refresh after
  // the first gets rejected and destroys the session the first one just
  // repaired. Sharing one in-flight promise per session fixes that.
  private readonly refreshInFlight = new Map<
    string,
    Promise<import('./session.service').SessionData | undefined>
  >();

  constructor(
    private readonly config: ConfigService,
    private readonly sessions: SessionService,
  ) {
    const base = this.config.get<string>('FASTAPI_BASE_URL');
    if (!base) {
      throw new Error('FASTAPI_BASE_URL is not configured');
    }
    this.baseUrl = base.replace(/\/+$/, '');
  }

  /**
   * Enveloppe `fetch()` — sans ça, un échec réseau (DNS, connexion refusée,
   * timeout...) rejette avec une simple `TypeError` qui, non interceptée,
   * remonte comme exception non gérée et fait planter tout le processus BFF
   * pour TOUTES les sessions, pas seulement l'appel en cours. Déjà arrivé
   * deux fois (flux SSE, puis connexion WebSocket du chat) avant ce correctif
   * centralisé — chaque appel réseau de ce service passe maintenant par ici.
   */
  private async safeFetch(
    url: string,
    init?: RequestInit,
  ): Promise<Response> {
    try {
      return await fetch(url, init);
    } catch {
      throw new ServiceUnavailableException(
        'Backend injoignable — réessayez dans quelques instants.',
      );
    }
  }

  async json<T = unknown>(
    opts: JsonRequestOptions,
  ): Promise<{ status: number; data: T }> {
    const session = opts.sessionId
      ? this.sessions.get(opts.sessionId)
      : undefined;

    const attempt = async (accessToken?: string) => {
      const res = await this.safeFetch(this.buildUrl(opts.path, opts.query), {
        method: opts.method,
        headers: this.headers(accessToken, session, {
          'Content-Type': 'application/json',
        }),
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
      return { res, data: await this.readBody(res) };
    };

    let { res, data } = await attempt(session?.accessToken);

    if (res.status === 401 && session && opts.sessionId) {
      const refreshed = await this.tryRefresh(opts.sessionId, session);
      if (refreshed) {
        ({ res, data } = await attempt(refreshed.accessToken));
      }
    }

    if (!res.ok) {
      throw new HttpException(data ?? { detail: res.statusText }, res.status);
    }
    return { status: res.status, data: data as T };
  }

  async multipart<T = unknown>(
    opts: MultipartRequestOptions,
  ): Promise<{ status: number; data: T }> {
    const session = opts.sessionId
      ? this.sessions.get(opts.sessionId)
      : undefined;

    const buildForm = () => {
      const form = new FormData();
      for (const [key, value] of Object.entries(opts.fields ?? {})) {
        if (value !== undefined) form.append(key, value);
      }
      for (const file of opts.files) {
        form.append(
          file.field,
          new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
          file.filename,
        );
      }
      return form;
    };

    const attempt = async (accessToken?: string) => {
      const res = await this.safeFetch(this.buildUrl(opts.path), {
        method: opts.method,
        headers: this.headers(accessToken, session),
        body: buildForm(),
      });
      return { res, data: await this.readBody(res) };
    };

    let { res, data } = await attempt(session?.accessToken);

    if (res.status === 401 && session && opts.sessionId) {
      const refreshed = await this.tryRefresh(opts.sessionId, session);
      if (refreshed) {
        ({ res, data } = await attempt(refreshed.accessToken));
      }
    }

    if (!res.ok) {
      throw new HttpException(data ?? { detail: res.statusText }, res.status);
    }
    return { status: res.status, data: data as T };
  }

  /** Raw fetch Response passthrough — used by the SSE bridge, which needs the live stream, not a parsed body. */
  async rawGet(
    path: string,
    opts: { sessionId?: string; query?: Record<string, string | undefined> },
  ): Promise<Response> {
    const session = opts.sessionId
      ? this.sessions.get(opts.sessionId)
      : undefined;
    return this.safeFetch(this.buildUrl(path, opts.query), {
      headers: this.headers(session?.accessToken, session),
    });
  }

  /** Backend base URL, for modules (e.g. the chat WS bridge) that need to open their own connection. */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Public because streaming bridges (SSE, chat WS) open their own upstream
   * connections outside json()/multipart() and need to refresh-and-reconnect
   * themselves on an expired token.
   *
   * De-duplicated per sessionId: if a refresh is already in flight for this
   * session, concurrent callers await that same one instead of each firing
   * their own /auth/refresh (see refreshInFlight comment above).
   */
  async tryRefresh(
    sessionId: string,
    session: import('./session.service').SessionData,
  ): Promise<import('./session.service').SessionData | undefined> {
    const existing = this.refreshInFlight.get(sessionId);
    if (existing) return existing;

    const promise = this.doRefresh(sessionId, session).finally(() => {
      this.refreshInFlight.delete(sessionId);
    });
    this.refreshInFlight.set(sessionId, promise);
    return promise;
  }

  private async doRefresh(
    sessionId: string,
    session: import('./session.service').SessionData,
  ) {
    let res: Response;
    try {
      res = await fetch(this.buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: session.refreshToken }),
      });
    } catch {
      // Backend injoignable au niveau réseau — traité comme un échec de
      // rafraîchissement ordinaire (undefined), jamais une exception : tous
      // les appelants (dont ChatGateway.handleConnection, qui n'a pas son
      // propre try/catch autour de cet appel) s'attendent à ce contrat.
      return undefined;
    }
    if (!res.ok) {
      // Refresh token is dead (rotated/expired) — the session can't recover.
      this.sessions.destroy(sessionId);
      return undefined;
    }
    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
    };
    return this.sessions.update(sessionId, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    });
  }

  private headers(
    accessToken: string | undefined,
    session: import('./session.service').SessionData | undefined,
    extra?: Record<string, string>,
  ): Record<string, string> {
    const headers: Record<string, string> = { ...extra };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    if (session?.deviceId) headers['X-Device-ID'] = session.deviceId;
    return headers;
  }

  private buildUrl(path: string, query?: object): string {
    const url = new URL(this.baseUrl + path);
    if (query) {
      for (const [key, value] of Object.entries(
        query as Record<string, unknown>,
      )) {
        if (value === undefined || value === null) continue;
        const asString =
          typeof value === 'string'
            ? value
            : typeof value === 'number' || typeof value === 'boolean'
              ? String(value)
              : JSON.stringify(value);
        url.searchParams.set(key, asString);
      }
    }
    return url.toString();
  }

  private async readBody(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}
