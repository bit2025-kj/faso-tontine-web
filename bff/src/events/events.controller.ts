import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Readable } from 'stream';
import type { ReadableStream as NodeWebReadableStream } from 'stream/web';
import { BackendClientService } from '../common/backend-client.service';
import { CurrentSession } from '../common/current-session.decorator';
import { SessionAuthGuard } from '../common/session-auth.guard';

/**
 * Bridges the backend's SSE feed (GET /events?token=...) to the browser.
 * The browser only ever talks to /api/events — the real access token stays
 * server-side, passed upstream in the query string exactly once per (re)connect.
 * EventSource retries on its own, so a dropped/expired-token connection just
 * gets a fresh attempt from the browser a few seconds later.
 */
@Controller('events')
@UseGuards(SessionAuthGuard)
export class EventsController {
  constructor(private readonly backend: BackendClientService) {}

  @Get()
  async stream(
    @CurrentSession() session: CurrentSession,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    let accessToken = session.data.accessToken;
    let upstream = await this.backend.rawGet('/events', {
      query: { token: accessToken },
    });

    if (upstream.status === 401) {
      const refreshed = await this.backend.tryRefresh(session.id, session.data);
      if (!refreshed) {
        res.status(401).end();
        return;
      }
      accessToken = refreshed.accessToken;
      upstream = await this.backend.rawGet('/events', {
        query: { token: accessToken },
      });
    }

    if (!upstream.ok || !upstream.body) {
      res.status(upstream.status || 502).end();
      return;
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const nodeStream = Readable.fromWeb(
      upstream.body as NodeWebReadableStream<Uint8Array>,
    );

    // `.pipe()` never forwards source-stream errors — without this, a
    // dropped/reset upstream connection (common on Render's free tier for a
    // long-lived SSE stream) emits an unhandled 'error' event, which Node
    // treats as fatal and crashes the whole BFF process for every session,
    // not just this one. The browser's EventSource reconnects on its own,
    // so ending the response here is enough — no need to propagate further.
    nodeStream.on('error', () => {
      if (!res.writableEnded) res.end();
    });
    res.on('error', () => nodeStream.destroy());

    nodeStream.pipe(res);

    const cleanup = () => nodeStream.destroy();
    req.on('close', cleanup);
    res.on('close', cleanup);
  }
}
