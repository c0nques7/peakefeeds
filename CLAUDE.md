@AGENTS.md

## Working on PeakeFeeds

- Read [DEVELOPER.md](DEVELOPER.md) for permissions, testing and CI.
- Before calling work done: `npm run typecheck`, `npm run lint`, `npm test` (local Docker Postgres only) and `npm run build`.
- Branch per change; `main` deploys to production on Vercel, so merge only verified work.
- Schema changes need a migration in `prisma/migrations/` (CI fails on drift). Production migrations are applied by hand with `npx prisma migrate deploy` before the code that needs them is merged.
- `.env.local` holds production credentials: never point scripts or tests at it.
