import { describe, expect, it } from 'vitest';

import { endOfPeriod, isValidIso, periodsOverlap, todayIso, yearOf } from './dates';

describe('dates', () => {
  it('calcule la fin d’une période de plusieurs années', () => {
    expect(endOfPeriod('2024-01-01', 3)).toBe('2026-12-31');
    expect(endOfPeriod('2024-07-01', 3)).toBe('2027-06-30');
    expect(endOfPeriod('2024-02-29', 1)).toBe('2025-02-28');
  });

  it('détecte le chevauchement, bornes incluses', () => {
    expect(periodsOverlap('2024-01-01', '2024-12-31', '2024-12-31', '2025-12-31')).toBe(true);
    expect(periodsOverlap('2024-01-01', '2024-12-31', '2025-01-01', '2025-12-31')).toBe(false);
  });

  it('valide les dates ISO', () => {
    expect(isValidIso('2024-02-30')).toBe(false);
    expect(isValidIso('2024-02-29')).toBe(true);
    expect(isValidIso('')).toBe(false);
    expect(yearOf('2026-05-04')).toBe(2026);
    expect(todayIso(new Date('2026-10-16T08:00:00Z'))).toBe('2026-10-16');
  });
});
