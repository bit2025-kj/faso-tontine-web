# Faso Tontine — client web participant

Client web React (Vite + TypeScript) réservé aux **participants** de Faso
Tontine. Consomme le backend FastAPI existant via le BFF NestJS (`../bff`) —
même origine, cookie de session httpOnly, aucun token exposé au navigateur.
Voir [`../WEBAPP.md`](../WEBAPP.md) pour l'architecture d'ensemble.

## Démarrage (dev)

Deux process (le proxy Vite pointe déjà vers le BFF sur `:3000`) :

```bash
# Terminal 1 — BFF
cd ../bff && cp .env.example .env && npm install && npm run start

# Terminal 2 — web
npm install && npm run dev
```

App sur http://localhost:5173.

## Build de production

```bash
npm run build   # → web/dist, servi en statique par le BFF
```

## Structure

- `src/features/` — un dossier par domaine (`auth`, `feed`, `kyc`, `chat`,
  `profile`, `relations`, `tontines`, `notifications`, `realtime`), chacun avec
  son client HTTP typé (`*-api.ts`), ses types et ses pages.
- `src/components/` — composants transverses (dont `ErrorBoundary`).
- `src/layout/` — coquille applicative (`AppShell`).
- `src/lib/` — utilitaires partagés.
