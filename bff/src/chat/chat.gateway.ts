import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { IncomingMessage } from 'http';
import { RawData, WebSocket } from 'ws';
import { BackendClientService } from '../common/backend-client.service';
import { SESSION_COOKIE } from '../common/constants';
import { SessionService } from '../common/session.service';

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    out[part.slice(0, eq).trim()] = decodeURIComponent(
      part.slice(eq + 1).trim(),
    );
  }
  return out;
}

/** The chat protocol is text-JSON only — this just normalizes whichever `ws`
 * RawData shape (Buffer / ArrayBuffer / Buffer[]) arrived into a string. */
function rawDataToString(data: RawData): string {
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf-8');
  if (Buffer.isBuffer(data)) return data.toString('utf-8');
  return Buffer.from(data).toString('utf-8');
}

/**
 * Bridges the browser to the backend's raw chat WebSocket (GET /chat/ws).
 * One upstream connection per browser connection: the browser sends/receives
 * the exact same {"action": ...} / {"event": ...} JSON frames the FastAPI
 * protocol defines — this gateway does no reshaping, it just relays bytes
 * both directions, so the real access token never has to leave the server.
 */
@WebSocketGateway({ path: '/api/chat/ws' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly upstreamUrl: string;
  private readonly upstreamBySocket = new WeakMap<WebSocket, WebSocket>();

  constructor(
    config: ConfigService,
    private readonly sessions: SessionService,
    private readonly backend: BackendClientService,
  ) {
    const base = config.get<string>('FASTAPI_BASE_URL')!;
    this.upstreamUrl = `${base.replace(/^http/, 'ws').replace(/\/+$/, '')}/chat/ws`;
  }

  async handleConnection(
    client: WebSocket,
    request: IncomingMessage,
  ): Promise<void> {
    // Filet de sécurité : ce handler n'a pas le filtre d'exceptions HTTP
    // habituel de Nest — une erreur inattendue non rattrapée ici plante tout
    // le processus BFF pour toutes les sessions (déjà arrivé une fois via
    // tryRefresh → fetch réseau en échec). Toute erreur imprévue ferme
    // juste CETTE connexion au lieu de faire tomber le serveur entier.
    try {
      await this.doHandleConnection(client, request);
    } catch {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1011, 'Internal error');
      }
    }
  }

  private async doHandleConnection(
    client: WebSocket,
    request: IncomingMessage,
  ): Promise<void> {
    const sessionId = parseCookies(request.headers.cookie)[SESSION_COOKIE];
    let session = this.sessions.get(sessionId);

    if (!session) {
      client.close(4401, 'No active session');
      return;
    }

    // Le navigateur voit SON socket comme ouvert dès sa propre poignée de
    // main avec le BFF — bien avant que connectUpstream() (jusqu'à ~1.2 s de
    // fenêtre d'auth) n'ait résolu. Une trame envoyée dans cette fenêtre
    // arrivait sur `client` alors qu'aucun listener 'message' n'y était
    // encore attaché : EventEmitter ne bufferise rien, elle était perdue
    // sans retour d'erreur (voir audit chat). On bufferise nous-mêmes en
    // attendant que l'amont soit prêt.
    const pending: string[] = [];
    const bufferFrame = (data: RawData) => pending.push(rawDataToString(data));
    client.on('message', bufferFrame);

    let upstream: WebSocket;
    try {
      upstream = await this.connectUpstream(session.accessToken);
    } catch {
      // Token might just be stale (browser tab backgrounded past the 15min
      // access-token lifetime) — refresh once and retry before giving up.
      const refreshed = await this.backend.tryRefresh(sessionId, session);
      if (!refreshed) {
        client.off('message', bufferFrame);
        client.close(4401, 'Session expired');
        return;
      }
      session = refreshed;
      try {
        upstream = await this.connectUpstream(session.accessToken);
      } catch {
        client.off('message', bufferFrame);
        client.close(1011, 'Upstream unavailable');
        return;
      }
    }

    this.upstreamBySocket.set(client, upstream);

    client.off('message', bufferFrame);
    for (const frame of pending) {
      if (upstream.readyState === WebSocket.OPEN) upstream.send(frame);
    }

    client.on('message', (data) => {
      if (upstream.readyState === WebSocket.OPEN)
        upstream.send(rawDataToString(data));
    });

    upstream.on('message', (data) => {
      if (client.readyState === WebSocket.OPEN)
        client.send(rawDataToString(data));
    });

    upstream.on('close', (code, reason) => {
      if (client.readyState === WebSocket.OPEN)
        client.close(1000, reason?.toString() || `upstream closed (${code})`);
    });

    upstream.on('error', () => {
      if (client.readyState === WebSocket.OPEN)
        client.close(1011, 'upstream error');
    });
  }

  handleDisconnect(client: WebSocket): void {
    const upstream = this.upstreamBySocket.get(client);
    if (upstream && upstream.readyState === WebSocket.OPEN) {
      upstream.close();
    }
  }

  /**
   * A WebSocket handshake succeeding doesn't mean the token was accepted —
   * the FastAPI protocol has no explicit auth-ack, it just closes the socket
   * if the auth frame is bad. So `open` alone can't be treated as "connected
   * with a valid token": wait out a short grace window after sending the
   * auth frame and only resolve if the upstream is still open by then. If it
   * closes during that window, treat it as an auth failure so the caller's
   * catch block (refresh-and-retry) actually gets a chance to run — without
   * this, a stale token silently "succeeds" here and only fails later with
   * no recovery (see chat_gateway audit finding).
   */
  private connectUpstream(accessToken: string): Promise<WebSocket> {
    const AUTH_GRACE_MS = 1200;
    return new Promise((resolve, reject) => {
      const upstream = new WebSocket(this.upstreamUrl);
      let settled = false;
      let graceTimer: ReturnType<typeof setTimeout> | undefined;

      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        if (graceTimer) clearTimeout(graceTimer);
        cleanup();
        fn();
      };
      const onOpen = () => {
        upstream.send(JSON.stringify({ action: 'auth', token: accessToken }));
        graceTimer = setTimeout(() => {
          settle(() => resolve(upstream));
        }, AUTH_GRACE_MS);
      };
      const onClose = (code: number) => {
        settle(() =>
          reject(
            new Error(
              `upstream closed before auth grace period elapsed (code ${code})`,
            ),
          ),
        );
      };
      const onError = (err: Error) => {
        settle(() => reject(err));
      };
      const cleanup = () => {
        upstream.off('open', onOpen);
        upstream.off('close', onClose);
        upstream.off('error', onError);
      };
      upstream.once('open', onOpen);
      upstream.once('close', onClose);
      upstream.once('error', onError);
    });
  }
}
