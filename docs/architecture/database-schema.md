# Database Schema & Data Model

Peake Feeds uses **Prisma** with a **PostgreSQL** database.

## Core Models

### User
The central entity. It handles both "Web2" identity (via NextAuth) and "Web3" identity (Wallet Address).
*   **`role`**: Enum (`STANDARD`, `MODERATOR`, `ADMIN`, etc.) defining system-wide permissions.
*   **`walletAddress`**: Unique constraint. Links the user to their on-chain identity.
*   **`strikeCount` / `isBanned`**: Used by the moderation system.

### Post
The primary content unit.
*   **`content`**: The text body.
*   **`contentHash` / `salt` / `signature`**: The cryptographic proof fields (see [The Truth Layer](../features/the-truth-layer.md)).
*   **`verificationTx`**: Stores the blockchain transaction hash if anchored.
*   **`channelId`**: All posts must belong to a channel.

### Channel
Sub-communities (like Subreddits).
*   **`slug`**: Unique URL identifier.
*   **`creatorId`**: The user who owns the channel.

## Moderation Models

### Report
When a user flags content.
*   **`reason`**: Enum (`SPAM`, `HATE_SPEECH`, etc.).
*   **`targetType`**: Can report a `POST`, `USER`, or `CHANNEL`.
*   **`status`**: Tracked lifecycle (`PENDING` -> `RESOLVED`).

### Penalty
The outcome of a report.
*   **`type`**: `WARNING`, `STRIKE`, `BAN`.
*   **`expiresAt`**: Allows for temporary suspensions.

## Engagement

### Reaction
Represents Likes/Dislikes.
*   Unique constraint on `[userId, postId]` prevents double-voting.

### Subscription
Join table for Users following Channels.
*   **`role`**: Users can be `MEMBER` or `MODERATOR` within a specific channel.

## Migration Workflow
We use Prisma Migrate for schema changes.

```bash
# Apply changes to local DB
npx prisma migrate dev --name describe_your_change

# Reset DB (Data loss!)
npx prisma migrate reset
```
