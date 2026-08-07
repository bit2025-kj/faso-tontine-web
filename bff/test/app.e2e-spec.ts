import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// Le test scaffold par défaut testait `GET / → "Hello World!"`, une route qui
// n'existe pas (l'app n'expose que `GET /health`) — il aurait échoué s'il
// avait été exécuté. Corrigé pour vérifier le vrai endpoint de santé (voir
// audit du 2026-08-05). NB : le préfixe global `/api` est posé dans main.ts,
// pas ici, donc la route testée est `/health`.
describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  // BackendClientService lève au démarrage si cette variable est absente.
  // On la fixe avant l'instanciation du module (aucun appel réseau réel
  // n'est fait par ce test — seul /health est exercé).
  beforeAll(() => {
    process.env.FASTAPI_BASE_URL ??= 'http://127.0.0.1:9999';
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // ChatModule expose une gateway WebSocket : sans le WsAdapter (posé dans
    // main.ts en production), app.init() échoue en tentant de charger le
    // driver socket.io par défaut.
    app.useWebSocketAdapter(new WsAdapter(app));
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', service: 'faso-tontine-bff' });
  });

  afterEach(async () => {
    await app.close();
  });
});
