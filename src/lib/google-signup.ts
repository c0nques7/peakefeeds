import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { isBanned } from '@/lib/penalties';
import { claimInvite, decodeInviteCookie, findUsableInvite, INVITE_COOKIE } from '@/lib/invites';

// Rules for signing in with Google. PeakeFeeds is invite-only, so Google can sign in existing
// members (and link to an existing email account), but a new account needs an invite code that
// the register page put in a signed cookie (see actions/oauth-invite.ts).

const STATUS_SELECT = { id: true, role: true, isBanned: true, bannedUntil: true, mutedUntil: true, walletAddress: true, username: true } as const;

async function inviteCodeFromCookie(): Promise<string | null> {
  return decodeInviteCookie((await cookies()).get(INVITE_COOKIE)?.value);
}

/**
 * next-auth `signIn` callback for Google. Returns true to continue, or a URL to send the
 * person to instead (with an error code the login/register pages explain).
 */
export async function decideGoogleSignIn({ providerAccountId, email, emailVerified }: {
  providerAccountId: string;
  email: string | null | undefined;
  emailVerified: boolean;
}): Promise<true | string> {
  if (!email || !emailVerified) return '/login?error=GoogleEmailUnverified';

  // Already signed up with Google, or an existing email account with the same verified address
  // (next-auth links the two because the Google provider allows email linking)
  const linked = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: 'google', providerAccountId } },
    select: { user: { select: STATUS_SELECT } },
  });
  const existing = linked?.user ?? await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: STATUS_SELECT });

  if (existing) {
    return isBanned(existing) ? '/login?error=ACCOUNT_SUSPENDED' : true;
  }

  // A new account: only with a valid, unclaimed invite code
  const code = await inviteCodeFromCookie();
  if (!code || !(await findUsableInvite(code))) return '/register?error=InviteRequired';
  return true;
}

/**
 * next-auth `createUser` event: runs once the adapter has created a new Google user. Claims the
 * invite atomically; if someone else claimed it first, the new account is removed again, which
 * makes the rest of the sign-in fail.
 */
export async function claimInviteForNewGoogleUser(userId: string, email: string | null | undefined): Promise<boolean> {
  const code = await inviteCodeFromCookie();
  const claimed = !!code && await prisma.$transaction(async (tx) => {
    const ok = await claimInvite(tx, code, userId);
    // Store the email lowercased, like every other sign-up path, so email login lookups match
    if (ok && email && email !== email.toLowerCase()) {
      await tx.user.update({ where: { id: userId }, data: { email: email.toLowerCase() } });
    }
    return ok;
  });

  if (!claimed) {
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    return false;
  }
  (await cookies()).delete(INVITE_COOKIE);
  return true;
}
