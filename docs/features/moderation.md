# Moderation System

The Peake Feeds Moderation System is designed as a "digital courtroom," enabling moderators to review user reports and issue penalties efficiently. It leverages a Role-Based Access Control (RBAC) system to ensure only authorized personnel can access sensitive tools.

## 1. Roles & Permissions

We utilize a hierarchical role system defined in the `UserRole` enum.

| Role | Level | Access |
| :--- | :--- | :--- |
| **ADMIN** | 5 | Full system access. Can ban users, manage config, and promote/demote staff. |
| **MODERATOR** | 4 | Can access the Moderation Queue (`/admin/moderation`), resolve reports, and issue strikes. |
| **STANDARD** | 1 | Regular user. Can post, comment, and report content. |

*   **Logic Location**: `src/lib/rbac.ts`
*   **Gatekeeper**: `requireStaff()` is a server-side helper that throws an error if the user is not a MODERATOR or ADMIN.

## 2. The Report Lifecycle

The moderation flow follows a standard triage process:

1.  **Submission**: A user reports a Post, Comment, or Profile (e.g., for "Spam" or "Hate Speech").
2.  **Queueing**: The report is saved with status `PENDING`.
3.  **Review**: Moderators pull from the `getModerationQueue` (FIFO order).
4.  **Verdict**: The moderator issues a verdict (`DISMISS` or `PENALIZE`).

### Data Model (`Report`)
*   `status`: `PENDING` -> `REVIEWING` -> `RESOLVED` | `DISMISSED`
*   `targetType`: `POST` | `USER` | `CHANNEL`
*   `reporterId`: The whistleblower.
*   `resolverId`: The moderator who handled it.

## 3. Verdicts & Penalties

When resolving a report, the moderator chooses a path. This logic is handled atomically in `src/actions/admin-moderation.ts`.

### A. Dismiss (False Alarm)
*   **Action**: Report status updated to `DISMISSED`.
*   **Outcome**: No action taken against the reported user.

### B. Penalize (Violation Found)
*   **Action**: Report status updated to `RESOLVED`.
*   **Outcome**: A `Penalty` record is created, and consequences are applied immediately.

#### Penalty Types

| Type | Consequence |
| :--- | :--- |
| `WARNING` | User receives a notification. No functional restrictions. |
| `STRIKE_1_TIMEOUT` | User's `strikeCount` increments. (Future: 24h Mute). |
| `STRIKE_2_SUSPENSION`| User's `strikeCount` increments. (Future: 7-day Ban). |
| `PERMANENT_BAN` | `user.isBanned` set to `true`. User cannot log in. |
| `CONTENT_REMOVAL` | The reported post/comment is permanently deleted from the database. |

## 4. Technical Implementation

The resolution logic is wrapped in a **Prisma Transaction** to ensure data integrity.

```typescript
// src/actions/admin-moderation.ts

await prisma.$transaction(async (tx) => {
  // 1. Create Penalty
  await tx.penalty.create({ ... });

  // 2. Update User (Strike/Ban)
  await tx.user.update({ ... });

  // 3. Delete Content (if applicable)
  if (penaltyType === "CONTENT_REMOVAL") {
    await tx.post.delete({ ... });
  }

  // 4. Close Report
  await tx.report.update({ status: "RESOLVED", ... });
});
```
