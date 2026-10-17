// PeakeFeeds is for adults only. People enter a date of birth once; we keep whether they met
// the minimum age (User.ageConfirmedAt / ageRejectedAt), never the date itself.
export const MINIMUM_AGE = 18;

/** Parses a YYYY-MM-DD date of birth (what <input type="date"> submits), or null if it isn't a real, past date. */
export function parseDateOfBirth(value: string, now = new Date()): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);

  // Rejects dates like 2001-02-30, which Date would roll over into March
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (year < 1900 || date > now) return null;
  return { year, month, day };
}

/** Age in whole years on `now`'s calendar date (UTC); someone turns a year older on their birthday. */
export function ageOn(dob: { year: number; month: number; day: number }, now = new Date()): number {
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  const hadBirthday = month > dob.month || (month === dob.month && day >= dob.day);
  return now.getUTCFullYear() - dob.year - (hadBirthday ? 0 : 1);
}
