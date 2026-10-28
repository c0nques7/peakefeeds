import { authenticator } from 'otplib';
import { withAdvisoryLock } from '@/lib/advisory-lock';

// A 6-digit code can be guessed given enough tries, so wrong codes are counted per account (in the
// database, so it holds across instances) and code checks pause after a few in a row.
export const MAX_TWO_FACTOR_FAILURES = 5;
export const TWO_FACTOR_LOCK_MS = 15 * 60 * 1000;

export type TwoFactorCheck = 'ok' | 'invalid' | 'locked';

/** Checks `token` against the account's 2FA secret, recording the outcome. */
export function checkTwoFactorCode(userId: string, token: string | null | undefined): Promise<TwoFactorCheck> {
  // Locked per account so parallel guesses can't all read the counter before any is recorded
  return withAdvisoryLock(`two-factor:${userId}`, async tx => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorFailures: true, twoFactorLockedUntil: true },
    });
    if (!user?.twoFactorSecret) return 'invalid';
    if (user.twoFactorLockedUntil && user.twoFactorLockedUntil > new Date()) return 'locked';

    if (token && authenticator.verify({ token, secret: user.twoFactorSecret })) {
      if (user.twoFactorFailures > 0 || user.twoFactorLockedUntil) {
        await tx.user.update({ where: { id: userId }, data: { twoFactorFailures: 0, twoFactorLockedUntil: null } });
      }
      return 'ok';
    }

    const failures = user.twoFactorFailures + 1;
    const lock = failures >= MAX_TWO_FACTOR_FAILURES;
    await tx.user.update({
      where: { id: userId },
      data: lock
        ? { twoFactorFailures: 0, twoFactorLockedUntil: new Date(Date.now() + TWO_FACTOR_LOCK_MS) }
        : { twoFactorFailures: failures },
    });
    return lock ? 'locked' : 'invalid';
  });
}
