import { describe, expect, it } from 'vitest';
import { improvement, isBetter, recordKey } from '../src/logic/records';

const best = { totalMs: 60_000, inTime: 18, count: 20, date: '2026-10-10' };
const s = (totalMs: number, inTime: number) => ({ count: 20, totalMs, inTime, wrong: 0 });

describe('records', () => {
  it('key separates every dimension', () => {
    const base = { mode: 'plus', booster: false, length: 20, variant: 'limit' } as const;
    const keys = new Set([
      recordKey(base),
      recordKey({ ...base, mode: 'minus' }),
      recordKey({ ...base, booster: true }),
      recordKey({ ...base, length: 30 }),
      recordKey({ ...base, variant: 'clock' }),
    ]);
    expect(keys.size).toBe(5);
    expect(recordKey(base)).toContain('tap');
  });

  it('first round is always a record', () => {
    expect(improvement('clock', s(99_000, 20), undefined)).toEqual({ kind: 'first' });
  });

  it('limit: more in time beats faster', () => {
    expect(isBetter('limit', s(90_000, 19), best)).toBe(true);
    expect(isBetter('limit', s(30_000, 17), best)).toBe(false);
    expect(improvement('limit', s(90_000, 19), best)).toEqual({ kind: 'inTime', more: 1 });
  });

  it('limit: same in time → faster wins', () => {
    expect(improvement('limit', s(55_000, 18), best)).toEqual({ kind: 'faster', ms: 5000 });
    expect(isBetter('limit', s(60_000, 18), best)).toBe(false);
  });

  it('clock: only time counts', () => {
    expect(improvement('clock', s(59_000, 20), best)).toEqual({ kind: 'faster', ms: 1000 });
    expect(improvement('clock', s(61_000, 20), best)).toBeNull();
  });
});
