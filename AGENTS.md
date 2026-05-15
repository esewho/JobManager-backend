# JobManager-backend

NestJS 11 + Prisma 7.3 + PostgreSQL backend for time-tracking, tip-pooling, and workspace management.

## Commands

```sh
npm run start:dev        # dev server with watch (main dev command)
npm run build            # nest build
npm run lint             # eslint --fix with prettier plugin
npm run format           # prettier --write "src/**/*.ts" "test/**/*.ts"
npm test                 # jest (unit tests: *.spec.ts in src/)
npm run test:e2e         # jest --config ./test/jest-e2e.json (*.e2e-spec.ts in test/)
npm run test:cov         # jest --coverage
```

No typecheck script exists — `nest build` acts as typecheck or rely on IDE.

## Prisma

- Uses `prisma.config.ts` (Prisma 6/7 `defineConfig`) — NOT standard `prisma/schema.prisma` only setup.
- Client initialized as a **global singleton** in `src/prisma/prisma.ts` using `@prisma/adapter-pg`, **not** injected via NestJS DI. Import directly: `import { prisma } from '../../prisma/prisma'`.
- VS Code has `prisma.pinToPrisma6: true` in `.vscode/settings.json`.
- Run migrations: `npx prisma migrate dev`, generate client: `npx prisma generate`.

## Architecture

- Single NestJS app (not a monorepo).
- Feature modules under `src/app/` (auth, admin, work-sessions, work-schedules, tip-pool, workspace, userSettings, monthlyHistory, weekly-history, token-invitations).
- `src/user/` and `src/HistoryCalendar/` are standalone modules outside `app/`.
- `src/app/common/` holds shared guards (`jwt-auth`, `roles`, `workspace`), decorators, enums, filters.
- Entrypoint: `src/main.ts` — CORS origin `http://localhost:5173`, static `/uploads` from `uploads/` dir.

## Auth

- JWT via `@nestjs/jwt` + Passport, secret from `JWT_SECRET_KEY` env var, `expiresIn: '1d'`.
- JWT payload: `{ sub: userId, role: Role, workspaceId?: string }`.
- Auth routes at `POST /auth/register`, `/auth/login`, `/auth/register-admin`.
- Express.User augmented with `{ userId: string, role: Role }` in `src/types/express.d.ts`.

## Env

Required variables in `.env`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jobmanager
JWT_SECRET_KEY=...
PORT=3000
```

## Docker

`docker-compose.yml` runs backend + PostgreSQL 15. Backend uses `npm run start:dev`.

## Style

- Prettier: singleQuote, trailingComma: all, endOfLine: auto (set in ESLint config).
- ESLint: flat config (`eslint.config.mjs`), `@typescript-eslint/recommended-type-checked`, `no-explicit-any: off`.
- Source type in ESLint set to `commonjs` despite TS target.
