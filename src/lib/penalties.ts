import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

// How long the strike penalties last
export const TIMEOUT_MS = 24 * 60 * 60 * 1000;     // STRIKE_1_TIMEOUT: 24h mute
export const SUSPENSION_MS = 7 * 24 * 60 * 60 * 1000; // STRIKE_2_SUSPENSION: 7-day lockout

export type AccountStatus = {
  role: UserRole;
  isBanned: boolean;
  bannedUntil: Date | null;
  mutedUntil: Date | null;
  walletAddress: string | null;
  username: string | null;
  ageConfirmedAt: Date | null;
  ageRejectedAt: Date | null;
};

export function isBanned(status: Pick<AccountStatus, 'isBanned' | 'bannedUntil'>, now = new Date()): boolean {
  return status.isBanned || (!!status.bannedUntil && status.bannedUntil > now);
}

/** Closed because the age check showed the person is under the minimum age (see lib/age.ts). */
export function isUnderage(status: Pick<AccountStatus, 'ageRejectedAt'>): boolean {
  return !!status.ageRejectedAt;
}

export function isMuted(status: AccountStatus, now = new Date()): boolean {
  return !!status.mutedUntil && status.mutedUntil > now;
}

async function loadStatus(userId: string): Promise<AccountStatus | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isBanned: true, bannedUntil: true, mutedUntil: true, walletAddress: true, username: true, ageConfirmedAt: true, ageRejectedAt: true },
  });
}

// The session check runs on every authenticated request, so it reads through a short
// per-instance cache: a ban or role change reaches existing sessions within a minute.
const SESSION_CACHE_MS = 60 * 1000;
const sessionCache = new Map<string, { status: AccountStatus | null; at: number }>();

export async function getSessionAccountStatus(userId: string): Promise<AccountStatus | null> {
  const hit = sessionCache.get(userId);
  if (hit && Date.now() - hit.at < SESSION_CACHE_MS) return hit.status;
  const status = await loadStatus(userId);
  sessionCache.set(userId, { status, at: Date.now() });
  return status;
}

export function clearAccountStatusCache(userId: string) {
  sessionCache.delete(userId);
}

/**
 * For actions that create content (posts, comments, reactions, DMs, channels, uploads).
 * Returns a user-facing reason when the user may not post, or null when they may.
 * Reads the database directly so a new mute applies immediately.
 */
export async function getPostingBlockReason(userId: string): Promise<string | null> {
  const status = await loadStatus(userId);
  if (!status) return 'Account not found.';
  if (isBanned(status)) return 'Your account is suspended.';
  if (isUnderage(status)) return 'This account has been closed.';
  if (!status.ageConfirmedAt) return 'Confirm your date of birth before posting.';
  if (isMuted(status)) {
    return `You're muted until ${status.mutedUntil!.toUTCString()} and can't post, comment, react or send messages until then.`;
  }
  return null;
}
