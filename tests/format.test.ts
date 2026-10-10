import { describe, expect, it } from 'vitest';
import { formatClock, formatMs, formatTime } from '../src/logic/format';

describe('formatMs', () => {
  it.each([
    [0, '0,0 Sekunden'],
    [5000, '5,0 Sekunden'],
    [8449, '8,4 Sekunden'],
    [8450, '8,5 Sekunden'],
    [59_949, '59,9 Sekunden'],
    [59_950, '1:00,0 Minuten'],
    [65_300, '1:05,3 Minuten'],
    [612_000, '10:12,0 Minuten'],
    [-5, '0,0 Sekunden'],
  ])('%i ms → %s', (ms, text) => {
    expect(formatMs(ms)).toBe(text);
  });

  it('formatTime splits value and unit for big-number displays', () => {
    expect(formatTime(5000)).toEqual({ value: '5,0', unit: 'Sekunden' });
    expect(formatTime(65_300)).toEqual({ value: '1:05,3', unit: 'Minuten' });
  });
});

describe('formatClock', () => {
  it.each([
    [34_120, '00:34,12'],
    [0, '00:00,00'],
    [5, '00:00,01'],
    [65_300, '01:05,30'],
    [59_996, '01:00,00'],
  ])('%i ms → %s', (ms, text) => {
    expect(formatClock(ms)).toBe(text);
  });
});
