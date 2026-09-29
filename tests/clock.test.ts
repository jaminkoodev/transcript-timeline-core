import { describe, expect, test } from 'bun:test';
import { formatClock, parseClock } from '../src/clock.ts';

describe('human-readable time', () => {
  test('parses seconds precisely and round-trips whole seconds', () => {
    expect(parseClock('47:05')).toBe(2_825_000);
    expect(parseClock('1:02:03')).toBe(3_723_000);
    expect(formatClock(3_723_000)).toBe('1:02:03');
  });

  test('treats numeric input as minutes', () => {
    expect(parseClock('90')).toBe(5_400_000);
  });

  test('keeps missing and invalid input distinct', () => {
    expect(parseClock('  ')).toBeNull();
    expect(parseClock('47:60')).toBeUndefined();
    expect(parseClock('not a time')).toBeUndefined();
  });
});
