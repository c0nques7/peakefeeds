# PeakeFeeds Developer Documentation

## 🛡️ Moderation & Reporting System

### Unified Reporting
We have implemented a unified reporting system that handles multiple content types:
- **POST**: Anchored to blockchain if verified.
- **COMMENT**: Threaded discussions.
- **MESSAGE**: Direct user-to-user DMs.
- **USER**: Direct profile reporting.
- **CHANNEL**: Reporting entire communities.
- **ADVERTISEMENT**: Reporting sponsored content.

Reporting any content triggers a **Block Prompt**, allowing users to immediately secure their experience.

### Admin Logging
All administrative actions are logged in the `AdminLog` table. This includes:
- Content Locking/Unlocking.
- Report Resolutions.
- User Role Updates & Bans.
- Channel Permission changes.

Audit logs are viewable at `/admin/logs`.

## 📡 Channel Permissions
Managed by server actions in `src/actions/channel-permissions.ts` (`getChannelPermissions`, `updateChannelPermissions`, `removeChannelUser`), used by the channel settings page.
- **Who:** the channel creator, OWNER members and site admins manage everyone; channel moderators manage ordinary members only.
- **Never:** nobody changes the creator's membership or their own, and only owners hand out MODERATOR/OWNER.

## 🧪 Testing
Tests use **Vitest** (`vitest.config.ts`, `src/test/setup.ts`). Many are integration tests that create and delete rows, so they run against a **local** Postgres only: `vitest.config.ts` refuses to start if `DATABASE_URL` isn't localhost (`.env.local` holds production's URL).

```bash
cp .env.example .env.development.local   # once; fill in what you need
docker compose up -d postgres
npx prisma migrate deploy
npm test
```

**CI** (`.github/workflows/ci.yml`) runs on every pull request and push to `main`: `npm ci`, `prisma validate`, `npm run typecheck`, `npm run lint`, migrations against a throwaway Postgres (plus a check that they match `schema.prisma`), `npm test` and `npm run build`.

**Lint:** `no-explicit-any`, `react-hooks/set-state-in-effect` and `react-hooks/purity` are warnings for now (existing debt, see `eslint.config.mjs`); every other rule fails CI.

## 📦 Dependencies
`@coinbase/wallet-sdk`, `@gemini-wallet/core`, `@metamask/sdk`, `@safe-global/safe-apps-provider`, `@walletconnect/ethereum-provider` and `porto` are never imported directly: they are optional peer dependencies of wagmi's connectors, which load them when a user picks that wallet. Keep them.

## 🔒 Content Rules
One rule decides who may edit or delete a post: `getPostPermissions` in `src/lib/permissions.ts`. Creating or changing content also goes through `getInteractionBlockReason` in `src/lib/interaction-guard.ts`.
- **Verified Content**: Once signed and published to the blockchain, content **cannot** be edited; only site staff can remove it, with a reason.
- **Unverified Content**: The author, channel owner, channel moderators and site staff can edit; the author, channel owner, members with `canDeletePosts` and site staff can delete (anyone but the author gives a reason).
- **Locked Content**: Staff can lock a channel, post, comment or account for review. Locked content shows a `LockedOverlay`; the server refuses new posts, comments and reactions on it (site staff excepted).

## 🔑 Google Sign-In
Google sign-in is offered only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.

- **Invite-only:** a new account needs an unclaimed invite code. The register page checks it and keeps it in a signed, httpOnly cookie (`pf_invite`, 15 minutes) for the round trip through Google. The code is claimed atomically when the account is created (`src/lib/invites.ts`, `src/lib/google-signup.ts`).
- **Existing members** sign in with Google without a code. A Google account with the same verified email as an email-and-password account is linked to it.
- **Usernames:** Google doesn't provide one, so new Google users choose it at `/welcome` before using the app.
- **Bans** are checked on Google sign-in as well as on every session.

**Google Cloud setup:** create an OAuth client ID (type "Web application") and add these authorised redirect URIs:
- `http://localhost:3000/api/auth/callback/google`
- `https://www.peakefeeds.com/api/auth/callback/google`
