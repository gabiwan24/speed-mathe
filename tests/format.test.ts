import { describe, expect, it } from 'vitest';
import { formatMs, formatTime } from '../src/logic/format';

describe('formatMs', () => {
  it.each([
    [0, '0 Sekunden'],
    [1000, '1 Sekunde'],
    [5000, '5 Sekunden'],
    [8449, '8 Sekunden'],
    [8500, '9 Sekunden'],
    [59_499, '59 Sekunden'],
    [59_500, '1:00 Minuten'],
    [65_300, '1:05 Minuten'],
    [612_000, '10:12 Minuten'],
    [-5, '0 Sekunden'],
  ])('%i ms -> %s', (ms, text) => {
    expect(formatMs(ms)).toBe(text);
  });

  it('formatTime splits value and unit for big-number displays', () => {
    expect(formatTime(5000)).toEqual({ value: '5', unit: 'Sekunden' });
    expect(formatTime(65_300)).toEqual({ value: '1:05', unit: 'Minuten' });
  });
});
