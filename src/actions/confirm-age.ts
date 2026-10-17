'use server'

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { prisma } from '@/lib/db';
import { ageOn, MINIMUM_AGE, parseDateOfBirth } from '@/lib/age';
import { clearAccountStatusCache } from '@/lib/penalties';

/**
 * The one-time age check every account goes through before using the app. Only the outcome is
 * stored, never the date of birth. An account under the minimum age is closed, and the answer
 * can't be changed afterwards (a mistake goes through Help).
 */
export async function confirmAge(dateOfBirth: string): Promise<{ ok: true } | { closed: true } | { error: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: 'Log in first.' };

  const dob = parseDateOfBirth(dateOfBirth);
  if (!dob) return { error: 'Enter your real date of birth.' };

  const oldEnough = ageOn(dob) >= MINIMUM_AGE;
  // Only accounts that haven't answered yet, so a closed account can't try another date
  const updated = await prisma.user.updateMany({
    where: { id: session.user.id, ageConfirmedAt: null, ageRejectedAt: null },
    data: oldEnough ? { ageConfirmedAt: new Date() } : { ageRejectedAt: new Date() },
  });
  clearAccountStatusCache(session.user.id);

  if (updated.count !== 1) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { ageConfirmedAt: true } });
    return user?.ageConfirmedAt ? { ok: true } : { closed: true };
  }
  return oldEnough ? { ok: true } : { closed: true };
}
