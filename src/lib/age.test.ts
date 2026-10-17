import { describe, it, expect } from 'vitest';
import { ageOn, parseDateOfBirth } from './age';

const now = new Date('2026-10-17T12:00:00Z');

describe('parseDateOfBirth', () => {
  it('accepts a real past date', () => {
    expect(parseDateOfBirth('2001-02-28', now)).toEqual({ year: 2001, month: 2, day: 28 });
  });

  it('rejects impossible, future, too-old and malformed dates', () => {
    for (const value of ['2001-02-30', '2027-01-01', '1899-12-31', '17/10/2000', '', '2000-1-1']) {
      expect(parseDateOfBirth(value, now)).toBeNull();
    }
  });
});

describe('ageOn', () => {
  it('counts a year only once the birthday has passed', () => {
    expect(ageOn({ year: 2008, month: 10, day: 17 }, now)).toBe(18); // 18th birthday today
    expect(ageOn({ year: 2008, month: 10, day: 18 }, now)).toBe(17); // tomorrow
    expect(ageOn({ year: 2008, month: 11, day: 1 }, now)).toBe(17);
    expect(ageOn({ year: 1990, month: 1, day: 1 }, now)).toBe(36);
  });

  it('treats a 29 February birthday as passed on 1 March in other years', () => {
    expect(ageOn({ year: 2008, month: 2, day: 29 }, new Date('2026-02-28T12:00:00Z'))).toBe(17);
    expect(ageOn({ year: 2008, month: 2, day: 29 }, new Date('2026-03-01T12:00:00Z'))).toBe(18);
  });
});
