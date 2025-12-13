## Quick Overview

This repository is a Next.js (App Router) monorepo-like web app implementing a social feed with wallet & ad verification flows. Key folders:

- `app/` — Next.js route + layout groups (`(dashboard)`, `(admin)`, `(auth)`); UI composition lives here.
- `src/actions/` — Server Actions used by forms and client interactions (e.g. `create-post.ts`, `create-channel.ts`). These are authoritative places to look for server-side behaviors invoked from the UI.
- `src/lib/` — Shared runtime utilities (DB, auth config, verification, metadata, feed/profile services).
- `src/components/` — UI components; follow the folder-per-feature pattern (e.g. `posts/`, `feed/`, `comments/`).
- `prisma/` — Prisma schema, migrations, and `seed.ts`.

## Architecture & Dataflow Notes

- Server-first: Business logic often lives in `src/actions/*` and `src/lib/*` (e.g. verification and DB writes). Many actions are Next.js server actions (`'use server'`). See `src/actions/create-post.ts` for a canonical example: validation (Zod) -> session check -> verification -> `prisma.post.create` -> `revalidatePath`.
- Prisma client is single-instanced via `src/lib/prisma.ts` or `src/lib/db.ts` to avoid multiple clients in development.
- Auth: `next-auth` with a Prisma adapter is used; see `src/lib/auth.config.ts` and usages of `getServerSession` in actions.
- Verification: There are multiple verification sources (WALLET, AD, SKIP). Verification code lives under `src/lib/verification.*` and is exercised in actions like `create-post.ts`.
- Metadata/media: Link metadata and media parsing helpers are in `src/lib/media-parser.ts` and `src/lib/metadata.ts` and are used when saving posts (detect LINK vs TEXT posts).

## Developer Workflows (commands & tips)

- Dev server: `npm run dev` (runs `next dev`). App runs on `http://localhost:3000` by default.
- Build: `npm run build` — note the build script runs `prisma generate` then `next build --webpack` (custom build ordering/flag).
- Seed DB: `npm run seed` (executes `npx tsx prisma/seed.ts`). Use this for local dev data.
- Lint: `npm run lint` (calls `eslint`).
- Prisma migrations:
  - Local dev: `npx prisma migrate dev` (creates or applies migrations).
  - Production/deploy: `npx prisma migrate deploy` and `npx prisma generate`.
  - If you only need to sync schema: `npx prisma db push` (non-migration).

Notes: the repo contains `prisma/migrations/`, so prefer `migrate` for schema changes. The `build` step already invokes `prisma generate` so ensure generated client is in sync before starting server.

## Patterns & Conventions (project-specific)

- Server actions are first-class: prefer putting request handling in `src/actions/*` rather than ad-hoc API routes when the action is triggered by a UI form (see `create-post.ts`, `create-comment.ts`).
- Zod validation pattern: input schemas are defined inline in actions and returned as flattened `errors` for the UI to consume.
- DB helper usage: use the shared `prisma` instance imported from `src/lib/db` or default export `src/lib/prisma.ts` to keep a singleton.
- Revalidation: after writes, actions commonly call `revalidatePath('/home')` or channel-specific paths to update cached server components.
- Feature grouping: UI routes use Next's route groups (`(dashboard)`, `(admin)`) in `app/`; follow this when adding pages or layouts.

## Integration points & external dependencies

- Wallets / web3: integrations include `wagmi`, `ethers`, `viem`, `@metamask/sdk`, `@coinbase/wallet-sdk`. Client-side wallet hookups live under `src/hooks/` and `src/components/ConnectWalletButton.tsx`.
- Email: `resend` + `@react-email/*` are used for transactional emails in `src/components/emails/*` and server actions under `src/actions/*`.
- Third-party verification/ad providers: the code references `HYPELAB` (ad verification) — search `verification` and `AD` constants when updating flows.

## Where to look for common tasks (examples)

- Add a server action: copy pattern from `src/actions/create-post.ts` — start with `'use server'`, Zod schema, `getServerSession`, DB call, and `revalidatePath`.
- Add a DB model change: update `prisma/schema.prisma`, run `npx prisma migrate dev` and `npx prisma generate`, then update any `prisma.*` usages.
- Debugging server actions: check server console logs (actions use `console.log` and `console.error`), and verify session via `getServerSession(authOptions)`.

## Short examples (copyable)

- Create-post action skeleton (see `src/actions/create-post.ts`) — main steps:
  1. Parse & validate inputs with Zod
  2. Verify session (`getServerSession(authOptions)`)
  3. Perform verification (optional)
  4. Call `prisma.post.create(...)`
  5. Call `revalidatePath(...)` for affected routes

- Run local DB + dev server (safe sequence):
```bash
npx prisma migrate dev --name my_change
npx prisma generate
npm run dev
```

## Cautions & gotchas

- Do not create multiple PrismaClient instances in dev — always import the shared client (`src/lib/db` or `src/lib/prisma.ts`).
- The build script runs `next build --webpack` (non-default flag). If you hit build-time problems, try running `prisma generate` separately to isolate the issue.
- Many server actions assume `session.user.walletAddress` exists; handle missing wallets gracefully in any auth-related changes.

If anything above is unclear or you'd like me to expand sections (e.g., list of important files by feature, example unit tests, or CI steps), tell me which parts to improve and I will iterate.
