'use server'

import { cookies } from 'next/headers';
import { findUsableInvite, encodeInviteCookie, INVITE_COOKIE, INVITE_COOKIE_MAX_AGE } from '@/lib/invites';

/**
 * Step 1 of signing up with Google: check the invite code and keep it in a signed cookie for
 * the round trip through Google. The code is only claimed once the account is created.
 */
export async function prepareGoogleSignup(inviteCode: string): Promise<{ ok: true } | { error: string }> {
  if (!inviteCode?.trim()) return { error: 'Enter your invite code first.' };

  const invite = await findUsableInvite(inviteCode);
  if (!invite) return { error: "That invite code isn't valid or has already been used." };

  (await cookies()).set(INVITE_COOKIE, encodeInviteCookie(invite.code), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // must survive the redirect back from Google
    path: '/',
    maxAge: INVITE_COOKIE_MAX_AGE,
  });
  return { ok: true };
}
