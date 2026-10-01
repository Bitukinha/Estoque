import { describe, it, expect } from 'vitest';
import { isInPeriod, periodLabel, todayPeriod } from './period';

const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).toISOString();

describe('isInPeriod', () => {
  it('matches the whole local day, excluding the next midnight', () => {
    const day = { mode: 'day' as const, value: '2026-09-15' };
    expect(isInPeriod(at(2026, 9, 15, 0, 0), day)).toBe(true);
    expect(isInPeriod(at(2026, 9, 15, 23, 59), day)).toBe(true);
    expect(isInPeriod(at(2026, 9, 16, 0, 0), day)).toBe(false);
    expect(isInPeriod(at(2026, 9, 14, 23, 59), day)).toBe(false);
  });

  it('matches the whole month', () => {
    const month = { mode: 'month' as const, value: '2026-09' };
    expect(isInPeriod(at(2026, 9, 1), month)).toBe(true);
    expect(isInPeriod(at(2026, 9, 30, 23, 59), month)).toBe(true);
    expect(isInPeriod(at(2026, 10, 1), month)).toBe(false);
    expect(isInPeriod(at(2026, 8, 31, 23, 59), month)).toBe(false);
  });

  it('matches everything for "all"', () => {
    expect(isInPeriod(at(2001, 1, 1), { mode: 'all', value: '' })).toBe(true);
  });
});

describe('periodLabel', () => {
  it('labels today, a past day and a month', () => {
    expect(periodLabel(todayPeriod())).toBe('Hoje');
    expect(periodLabel({ mode: 'day', value: '2001-01-05' })).toBe('05/01/2001');
    expect(periodLabel({ mode: 'month', value: '2026-09' })).toBe('set/2026');
  });
});
