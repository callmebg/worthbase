/// <reference types="jest" />

/**
 * WorthBase (家底) - Format Utility Tests
 * Tests for getMonthsHeld (with optional end date) and formatDuration.
 */

import { getMonthsHeld, formatDuration, getCurrentDate } from '@/utils/format';

describe('getMonthsHeld', () => {
  test('counts months between purchase and an explicit end date (inclusive of start month)', () => {
    expect(getMonthsHeld('2022-01-15', '2022-03-20')).toBe(3); // 20th >= 15th → +1
    expect(getMonthsHeld('2022-01-15', '2022-03-10')).toBe(2); // 10th < 15th → no +1
  });

  test('sold asset duration stops at sell date, not today', () => {
    // Purchased 2018-10, sold 2022-10 → 49 months (4年1个月), regardless of current date
    expect(getMonthsHeld('2018-10-01', '2022-10-15')).toBe(49);
    // Without an end date it keeps growing past the sell date (today > sell date)
    expect(getMonthsHeld('2018-10-01')).toBeGreaterThan(49);
  });

  test('null/undefined end date falls back to today', () => {
    const purchase = '2020-06-10';
    const expected = getMonthsHeld(purchase, getCurrentDate());
    expect(getMonthsHeld(purchase, null)).toBe(expected);
    expect(getMonthsHeld(purchase, undefined)).toBe(expected);
    expect(getMonthsHeld(purchase)).toBe(expected);
  });

  test('minimum one month even for a same-day or reversed range', () => {
    expect(getMonthsHeld('2022-05-10', '2022-05-10')).toBe(1);
    expect(getMonthsHeld('2022-05-10', '2022-05-01')).toBe(1); // clamped, never <= 0
  });
});

describe('formatDuration', () => {
  test('formats months below a year', () => {
    expect(formatDuration(6)).toBe('6个月');
    expect(formatDuration(11)).toBe('11个月');
  });

  test('formats whole years and years + months', () => {
    expect(formatDuration(48)).toBe('4年');
    expect(formatDuration(49)).toBe('4年1个月');
  });
});
