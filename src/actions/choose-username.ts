'use server'

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { prisma } from '@/lib/db';
import { clearAccountStatusCache } from '@/lib/penalties';
import { UsernameSchema, firstError } from '@/lib/credentials';


/** Sets the username for an account that doesn't have one yet (new Google sign-ups). */
export async function chooseUsername(username: string): Promise<{ ok: true } | { error: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: 'Log in first.' };

  const parsed = UsernameSchema.safeParse(username);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const name = parsed.data;

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
