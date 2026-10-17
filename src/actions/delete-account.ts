'use server'

import { getServerSession } from 'next-auth';
import * as argon2 from 'argon2';
import { authOptions } from '@/lib/auth.config';
import { prisma } from '@/lib/db';
import { deleteAccount, getDeletionBlocker } from '@/lib/account-deletion';

/**
 * Permanently deletes the logged-in account (see lib/account-deletion.ts). Accounts with a
 * password confirm with it; Google-only accounts confirm by typing their username.
 */
export async function deleteMyAccount(confirmation: string): Promise<{ ok: true } | { error: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: 'Log in first.' };

  const blocker = await getDeletionBlocker(session.user.id);
  if (blocker) return { error: blocker };

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true, username: true } });
  if (!user) return { error: 'Account not found.' };

  const confirmed = user.passwordHash
    ? await argon2.verify(user.passwordHash, confirmation).catch(() => false)
    : !!user.username && confirmation.trim().replace(/^@/, '').toLowerCase() === user.username.toLowerCase();
  if (!confirmed) return { error: user.passwordHash ? 'That password isn’t right.' : 'That isn’t your username.' };

  try {
    await deleteAccount(session.user.id);
  } catch (err) {
    console.error('Account deletion failed:', err);
    return { error: 'Your account couldn’t be deleted. Nothing was removed; try again or open Help.' };
  }
  return { ok: true };
}
