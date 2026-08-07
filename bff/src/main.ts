import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WsAdapter } from '@nestjs/platform-ws';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Derrière le proxy de Render : sans ça, `req.ip` (utilisé par le
  // rate-limiter) vaut l'IP du proxy, pas celle du navigateur — le throttling
  // par utilisateur ne fonctionnerait pas. On fait confiance au premier hop.
  app.set('trust proxy', 1);

  app.use(cookieParser(config.get<string>('SESSION_SECRET')));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');
  // Raw ws (not socket.io) so the browser can use the native WebSocket API
  // and the chat gateway can relay frames byte-for-byte to the FastAPI protocol.
  app.useWebSocketAdapter(new WsAdapter(app));

  // The built frontend (web/dist) is served by this same process — one
  // origin, no CORS, no cross-site cookie headaches for the session cookie.
  const webDist = join(__dirname, '..', '..', 'web', 'dist');
  if (existsSync(webDist)) {
    app.useStaticAssets(webDist);
    const indexHtml = join(webDist, 'index.html');
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
      res.sendFile(indexHtml);
    });
  } else {
    console.warn(
      `[bff] web/dist not found at ${webDist} — run "npm run build" in web/ to serve the frontend from here. Falling back to API-only.`,
    );
  }

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
  console.log(
    `[bff] listening on http://localhost:${port} (proxying ${config.get<string>('FASTAPI_BASE_URL')})`,
  );
}
void bootstrap();
