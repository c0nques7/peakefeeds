import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// Invite codes gate every sign-up path (email and Google). These helpers are the one place
// that checks and claims them.

export const INVITES_PER_NEW_USER = 3;

// Generated codes are "PEAKE-" plus hex (0-9, A-F), so a typed O, I or L can only mean 0 or 1
export function normalizeInviteCode(code: string) {
  const upper = code.trim().toUpperCase();
  if (!upper.startsWith('PEAKE-')) return upper;
  return 'PEAKE-' + upper.slice(6).replace(/O/g, '0').replace(/[IL]/g, '1');
}

/** The invite if it exists and hasn't been claimed yet. */
export async function findUsableInvite(code: string) {
  const invite = await prisma.inviteCode.findUnique({ where: { code: normalizeInviteCode(code) } });
  return invite && !invite.usedAt ? invite : null;
}

/**
 * Claims the invite for `userId` and mints the new user's own invites. The claim only succeeds
 * if the code is still unclaimed at that moment, so two sign-ups can't share one code.
 * Returns false when the code is missing or was already claimed.
 */
export async function claimInvite(tx: Prisma.TransactionClient, code: string, userId: string): Promise<boolean> {
  const claimed = await tx.inviteCode.updateMany({
    where: { code: normalizeInviteCode(code), usedAt: null },
    data: { usedAt: new Date(), usedById: userId },
  });
  if (claimed.count !== 1) return false;

  for (let i = 0; i < INVITES_PER_NEW_USER; i++) {
    await tx.inviteCode.create({
      data: { code: `PEAKE-${randomBytes(3).toString('hex').toUpperCase()}`, issuerId: userId },
    });
  }
  return true;
}

// --- Carrying an invite code through Google sign-in ---
// Google sign-up leaves the site and comes back, so the code is kept in a short-lived,
// HMAC-signed, httpOnly cookie that only the server can read or change.

export const INVITE_COOKIE = 'pf_invite';
export const INVITE_COOKIE_MAX_AGE = 15 * 60; // seconds

function sign(payload: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set');
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function encodeInviteCookie(code: string, now = Date.now()) {
  const payload = `${normalizeInviteCode(code)}.${now + INVITE_COOKIE_MAX_AGE * 1000}`;
  return `${payload}.${sign(payload)}`;
}

/** The invite code from a cookie value, or null if it's missing, expired or tampered with. */
export function decodeInviteCookie(value: string | undefined, now = Date.now()): string | null {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  const [code, expires, signature] = parts;
  const expected = Buffer.from(sign(`${code}.${expires}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (!(Number(expires) > now)) return null;
  return code;
}
