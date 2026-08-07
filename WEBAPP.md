# Faso Tontine — client web participant

Client web pour les **participants** de Faso Tontine (pas les tontiniers — cf. contexte ci-dessous). Consomme le backend FastAPI existant, déjà en production sur Render (`https://tontine-backend-qoti.onrender.com`) — ce backend et le repo Flutter (`bit2025-kj/newapp1`) ne sont pas modifiés par ce projet.

## Pourquoi ce projet

L'app mobile lit les SMS pour attribuer automatiquement les dépôts Mobile Money — fonctionnalité tontinier uniquement, incompatible avec l'App Store. Les participants n'en ont pas besoin : ce client web leur donne un accès complet (feed, KYC, tontines, profil, relations, chat) sans dépendre du store iOS.

**Hors périmètre** : création/gestion de tontine, revue des demandes d'adhésion, SMS/rappels, `/sync/*` — tout ça reste tontinier-only sur mobile.

## Architecture

```
Navigateur ──(cookie de session httpOnly)──► BFF NestJS ──(JWT, X-Device-ID)──► FastAPI (Render)
                                                 │
                                                 └─► sert aussi web/dist en statique
```

Un seul service déployé : NestJS sert l'API sous `/api/*` et les fichiers statiques du build React partout ailleurs — même origine, donc pas de CORS ni de souci de cookie cross-site. Voir [bff/README.md](bff/README.md) pour le détail des raisons (tokens jamais exposés au navigateur, refresh transparent, pont temps réel).

- **`bff/`** — NestJS. Un module par domaine (`auth`, `feed`, `kyc`, `participant`, `users`, `relations`, `chat`, `events`), tous passant par `common/backend-client.service.ts`.
- **`web/`** — React + Vite + TypeScript + TanStack Query + React Router. Écrans organisés par feature sous `src/features/`.

## Démarrage en dev

Deux process séparés (le proxy Vite pointe déjà vers le BFF) :

```bash
# Terminal 1
cd bff
cp .env.example .env
npm install
npm run start

# Terminal 2
cd web
npm install
npm run dev
```

App sur `http://localhost:5173` (BFF sur `:3000`, appelé via le proxy `/api`).

## Build de production

```bash
cd web && npm install && npm run build
cd ../bff && npm install && npm run build && npm run start:prod
```

Le BFF sert alors `web/dist` directement sur son propre port (`:3000` par défaut, ou `$PORT`).

## Déploiement (Render)

`render.yaml` à la racine déclare le service (`faso-tontine-web`, build+start des deux dossiers, cf. commentaires dans le fichier). À connecter depuis le dashboard Render une fois ce dossier poussé sur un repo Git — non fait automatiquement, ça reste une action à faire par vous (accès au compte/repo requis).

## État du build (dernière session)

Tout compile (`npm run build` clean côté `bff/` et `web/`) et le cœur du parcours (login OTP → feed → KYC → post → tontines → profil) a été vérifié en direct contre le vrai backend Render. Le temps réel (SSE + chat WebSocket) est codé et le pont WebSocket a été testé hors-ligne (rejet correct des connexions sans session) mais pas encore exercé avec de vrais messages — à valider en usage réel.

Pas de suite de tests automatisés (cohérent avec le reste du projet — voir `docs/technical_debt.md`) : chaque endpoint a été smoke-testé contre le vrai backend plutôt que mocké.
