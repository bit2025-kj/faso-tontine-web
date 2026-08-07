# Faso Tontine — BFF

NestJS Backend-For-Frontend for the participant web client. Proxies the existing FastAPI backend (`https://tontine-backend-qoti.onrender.com`) and keeps its JWTs server-side — the browser only ever holds an `httpOnly` session cookie.

See [../WEBAPP.md](../WEBAPP.md) for the full picture (architecture, why a BFF, dev setup, deployment).

## Quick start

```bash
cp .env.example .env   # then edit FASTAPI_BASE_URL / SESSION_SECRET if needed
npm install
npm run start
```

Runs on `http://localhost:3000`. In dev, point the Vite frontend's `/api` proxy at it (already configured in `../web/vite.config.ts`) rather than building `web/` every time.

## Layout

```
src/
  common/           session store, backend HTTP client (refresh-and-retry), auth guard/decorator
  auth/             OTP login, profile, avatar, logout
  feed/             feed CRUD, likes, comments, join requests
  kyc/               KYC submission/status
  participant/      read-only tontine views
  users/            public profile/score, ratings, reports, referral
  relations/        friend/association requests
  chat/             REST passthrough + chat.gateway.ts (WebSocket bridge)
  events/           SSE bridge (events.controller.ts)
```

## Notes

- Every module goes through `common/backend-client.service.ts` — it's the only place that knows the FastAPI base URL, attaches `Authorization`/`X-Device-ID`, and retries once on 401 after refreshing the session's tokens.
- The chat WebSocket gateway (`chat/chat.gateway.ts`) opens one upstream `ws` connection per browser connection and relays frames verbatim — no reshaping, so it stays correct if the backend's chat protocol evolves.
- No automated test suite yet (consistent with the rest of this project — see its `docs/technical_debt.md`); each endpoint was smoke-tested against the real backend during development instead of mocked.
