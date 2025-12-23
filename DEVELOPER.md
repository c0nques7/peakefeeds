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

## 📡 API Endpoints

### Channel Permissions
Managed via Route Handlers at `src/app/api/channels/[channelId]/permissions/route.ts`.

#### `GET /api/channels/[channelId]/permissions`
- **Auth**: Requires Channel Owner, Moderator, or Global Admin.
- **Returns**: Array of subscription records with user details.

#### `POST /api/channels/[channelId]/permissions`
- **Auth**: Requires Channel Owner, Moderator, or Global Admin.
- **Body**:
  ```json
  {
    "userId": "string",
    "role": "MEMBER | MODERATOR | OWNER",
    "permissions": {
      "canPost": "boolean",
      "canComment": "boolean",
      "canDeletePosts": "boolean",
      "canPinPosts": "boolean"
    }
  }
  ```

#### `DELETE /api/channels/[channelId]/permissions?userId=[userId]`
- **Auth**: Requires Channel Owner, Moderator, or Global Admin.
- **Action**: Removes a user from the channel.

## 🧪 Testing
Unit tests are implemented using **Vitest**.
- **Run Tests**: `npm test`
- **Setup**: Configured in `vitest.config.ts` and `src/test/setup.ts`.

## 🔒 Content Rules
- **Verified Content**: Once signed and published to the blockchain, content **cannot** be edited or deleted.
- **Unverified Content**: Can be edited/deleted by the Author, Channel Owner, Moderator (with `canDeletePosts` permission), or Global Admin.
- **Locked Content**: Admins can lock any content for review. Locked content shows a `LockedOverlay` and disables all interactions.
