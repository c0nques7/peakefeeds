'use server'

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { prisma } from '@/lib/db';
import { clearAccountStatusCache } from '@/lib/penalties';

// Same characters existing usernames use: letters, numbers, dots and underscores
const USERNAME_PATTERN = /^[a-zA-Z0-9._]{3,30}$/;

/** Sets the username for an account that doesn't have one yet (new Google sign-ups). */
export async function chooseUsername(username: string): Promise<{ ok: true } | { error: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: 'Log in first.' };

  const name = username.trim();
  if (!USERNAME_PATTERN.test(name)) {
    return { error: 'Use 3 to 30 letters, numbers, dots or underscores.' };
  }

  const taken = await prisma.user.findFirst({
    where: { username: { equals: name, mode: 'insensitive' }, NOT: { id: session.user.id } },
    select: { id: true },
  });
  if (taken) return { error: `@${name} is taken. Try another.` };

  // Only accounts without a username can use this; existing usernames don't change here
  const updated = await prisma.user.updateMany({
    where: { id: session.user.id, username: null },
    data: { username: name },
  });
  if (updated.count !== 1) return { error: 'Your account already has a username.' };

  // The session picks up the new username on its next check
  clearAccountStatusCache(session.user.id);
  return { ok: true };
}
