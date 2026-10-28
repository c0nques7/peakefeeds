# PeakeFeeds

A social feed where posts can be signed with an Ethereum wallet and anchored as "verified". Next.js 16 (App Router) with server actions, Prisma on Postgres (Neon in production), next-auth, Backblaze B2 for media and Resend for email. Deployed on Vercel from `main` to www.peakefeeds.com.

## Getting started

```bash
cp .env.example .env.development.local   # fill in what you need
docker compose up -d postgres
npm install
npx prisma migrate deploy
npm run dev                              # http://localhost:3000
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | `prisma generate` + production build |
| `npm run typecheck` | Generate route types, then `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest; needs the local Postgres above (it refuses any other database) |
| `npm run seed` | Sample data for local development |

CI (`.github/workflows/ci.yml`) runs all of these on every pull request.

## Where things live

- `src/app/` – routes: `(dashboard)` the app, `(admin)` staff tools, `(auth)` sign-in flows, plus the landing and legal pages
- `src/actions/` – server actions (all writes go through these)
- `src/lib/` – auth, permissions (`permissions.ts`, `interaction-guard.ts`), feeds, B2 storage, email
- `src/components/` – UI, with shared primitives in `src/components/ui/`
- `prisma/` – schema and migrations

More detail (moderation, permissions, testing, Google sign-in): [DEVELOPER.md](DEVELOPER.md).
