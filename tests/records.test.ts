import { describe, expect, it } from 'vitest';
import { addToHistory, HISTORY_SIZE, improvement, isBetter, recordKey } from '../src/logic/records';

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

describe('recordKey with display', () => {
  const base = { mode: 'plus', booster: false, length: 20, variant: 'clock' } as const;

  it('balls keep their own records, numbers keep the old key format', () => {
    expect(recordKey({ ...base, display: 'numbers' })).toBe(recordKey(base));
    expect(recordKey(base)).toBe('plus|base|20|clock|tap');
    expect(recordKey({ ...base, display: 'balls' })).toBe('plus|base|20|clock|tap|balls');
  });
});

describe('addToHistory', () => {
  const r = (totalMs: number, inTime = 20, date = String(totalMs)) => ({ totalMs, inTime, count: 20, date });

  it('keeps best first and reports the rank', () => {
    let list = [r(50_000), r(70_000)];
    const res = addToHistory(list, r(60_000), 'clock');
    expect(res.rank).toBe(2);
    expect(res.list.map((x) => x.totalMs)).toEqual([50_000, 60_000, 70_000]);
    list = res.list;
    expect(addToHistory(list, r(40_000), 'clock').rank).toBe(1);
  });

  it('limit variant ranks by tasks in time first', () => {
    const res = addToHistory([r(30_000, 18)], r(60_000, 20), 'limit');
    expect(res.rank).toBe(1);
  });

  it('keeps only the best 20; a worse 21st round is not stored', () => {
    let list: ReturnType<typeof r>[] = [];
    for (let i = 1; i <= HISTORY_SIZE; i++) list = addToHistory(list, r(i * 1000), 'clock').list;
    expect(list).toHaveLength(HISTORY_SIZE);
    const worse = addToHistory(list, r(99_000), 'clock');
    expect(worse.rank).toBeNull();
    expect(worse.list).toHaveLength(HISTORY_SIZE);
    const better = addToHistory(list, r(500), 'clock');
    expect(better.rank).toBe(1);
    expect(better.list).toHaveLength(HISTORY_SIZE);
    expect(better.list.at(-1)!.totalMs).toBe(19_000);
  });

  it('ties keep the older round ahead', () => {
    const old = r(5000, 20, 'old');
    const res = addToHistory([old], r(5000, 20, 'new'), 'clock');
    expect(res.list[0].date).toBe('old');
    expect(res.rank).toBe(2);
  });

  it('does not mutate the input list', () => {
    const list = [r(50_000)];
    addToHistory(list, r(10_000), 'clock');
    expect(list).toHaveLength(1);
  });
});
