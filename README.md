# Faso Tontine — client web participant

Client web pour les **participants** de Faso Tontine. NestJS (BFF) + React/Vite
(front), déployé en un seul service Render (le BFF sert aussi le build React).
Consomme le backend FastAPI de production sans le modifier.

Voir [`WEBAPP.md`](WEBAPP.md) pour l'architecture détaillée, [`bff/README.md`](bff/README.md)
et [`web/README.md`](web/README.md) pour chaque sous-projet.

## Structure

- `bff/` — BFF NestJS (un module par domaine, passe par `common/backend-client.service.ts`).
- `web/` — client React + Vite + TypeScript (`src/features/` par domaine).
- `render.yaml` — config de déploiement Render (un service, `web/dist` servi par le BFF).

## Dev local

```bash
# Terminal 1 — BFF
cd bff && cp .env.example .env && npm install && npm run start

# Terminal 2 — front
cd web && npm install && npm run dev
```

Front sur http://localhost:5173, BFF sur `:3000` (appelé via le proxy `/api`).

## Build de production

```bash
cd web && npm install && npm run build
cd ../bff && npm install && npm run build && npm run start:prod
```

Le BFF sert alors `web/dist` sur son propre port.

## Déploiement Render

`render.yaml` déclare le service `faso-tontine-web` (build des deux dossiers,
start du BFF). Après avoir poussé ce dépôt sur GitHub, créer un service Render
« Blueprint » pointant sur ce repo — il lira `render.yaml` automatiquement.
La variable `SESSION_SECRET` est générée par Render ; `FASTAPI_BASE_URL` pointe
sur le backend existant.
