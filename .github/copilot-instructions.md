## Quick overview

PeakeFeeds is a Next.js 16 (App Router) social feed where posts can be signed with an Ethereum wallet. Key folders:

- `src/app/` — routes in groups: `(dashboard)` (the app), `(admin)` (staff tools), `(auth)` (sign-in flows); landing and legal pages at the root.
- `src/actions/` — server actions; every write goes through one of these.
- `src/lib/` — auth (`auth.config.ts`), permissions (`permissions.ts`, `interaction-guard.ts`, `rbac.ts`), feeds, B2 storage (`b2.ts`), email (`email.ts`), DB client (`db.ts`).
- `src/components/` — UI; shared primitives (Button, Field, Modal, EmptyState…) in `src/components/ui/`.
- `prisma/` — schema, migrations, `seed.ts`.

## Patterns

- Server action shape (see `src/actions/create-post.ts`): `'use server'` → session → Zod validation → permission checks → Prisma write → `revalidatePath` with slugs/usernames from the database.
- Permissions are enforced on the server, never only in the UI:
  - who may edit/delete a post: `getPostPermissions` (`src/lib/permissions.ts`);
  - who may post, comment or react (penalties, locks, channel switches): `getInteractionBlockReason` (`src/lib/interaction-guard.ts`);
  - staff-only actions: `requireStaff` / `requireRole` (`src/lib/rbac.ts`).
- Import Prisma from `@/lib/db`. Send email with `resend` and `EMAIL_FROM` from `@/lib/email`.
- Media lives in a private B2 bucket: store plain bucket URLs and sign them for display with `signMediaUrl` (`src/lib/b2.ts`).
- Shared credential rules (username, email, password) are in `src/lib/credentials.ts`.
- Verification sources: `WALLET` (signed content hash) and `SKIP` (unverified). Sponsored (`AD`) posts are disabled until ad proofs can be checked server-side.

## Workflows

- `npm run dev`, `npm run build` (Turbopack), `npm run typecheck`, `npm run lint`, `npm test`.
- Tests run only against a local Postgres: `docker compose up -d postgres && npx prisma migrate deploy && npm test`.
- Schema changes: edit `prisma/schema.prisma`, run `npx prisma migrate dev --name <change>`, commit the migration (CI checks for drift).

## Cautions

- `.env.local` holds production credentials. Use `.env.development.local` (see `.env.example`) for local work.
- Wallet connector packages (`@metamask/sdk`, `@coinbase/wallet-sdk`, …) and `@wagmi/core` look unused but are peer dependencies of wagmi/AppKit; keep them.
