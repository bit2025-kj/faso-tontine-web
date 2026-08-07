import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { DeviceIdMiddleware } from './common/device-id.middleware';
import { FeedModule } from './feed/feed.module';
import { KycModule } from './kyc/kyc.module';
import { ChatModule } from './chat/chat.module';
import { EventsModule } from './events/events.module';
import { ParticipantModule } from './participant/participant.module';
import { RelationsModule } from './relations/relations.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate-limit par IP de navigateur (nécessite `trust proxy`, cf. main.ts).
    // Avant le 2026-08-05, le BFF ne transmettait pas l'IP réelle au FastAPI,
    // donc tous les utilisateurs web partageaient un seul quota par IP côté
    // backend — un seul utilisateur pouvait bloquer tous les autres. La limite
    // est désormais appliquée ici, par navigateur. Défaut : 120 req/min
    // (aligné sur rate_limit_default du backend) ; les routes d'auth
    // resserrent via @Throttle (voir auth.controller.ts).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    CommonModule,
    AuthModule,
    FeedModule,
    KycModule,
    ParticipantModule,
    UsersModule,
    RelationsModule,
    EventsModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(DeviceIdMiddleware).forRoutes('*');
  }
}
