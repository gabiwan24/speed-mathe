import { describe, expect, it } from 'vitest';
import type { TaskResult } from '../src/logic/round';
import { addResults, focusFacts, median, roundKnackpunkte, SAMPLES_PER_FACT } from '../src/logic/stats';
import { factPool } from '../src/logic/tasks';

const pool = factPool('plus', false);
const fact = (key: string) => pool.find((f) => f.key === key)!;
const res = (key: string, ms: number, wrong = 0, tooSlow = false): TaskResult => ({ fact: fact(key), ms, wrong, tooSlow });

describe('median', () => {
  it('odd, even, empty', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

describe('roundKnackpunkte', () => {
  it('ranks timeout > wrong > slow and returns max 3', () => {
    const results = [
      res('2+3', 1200),
      res('8+7', 7000),
      res('9+6', 4500, 1),
      res('7+5', 10_000, 0, true),
      res('4+4', 1100),
      res('6+7', 2000),
    ];
    expect(roundKnackpunkte(results).map((r) => r.fact.key)).toEqual(['7+5', '9+6', '8+7']);
  });

  it('a fast clean round has no Knackpunkte', () => {
    const results = [res('2+3', 1200), res('8+7', 1900), res('9+6', 1500)];
    expect(roundKnackpunkte(results)).toEqual([]);
  });

  it('slowness is relative to the child but never below 2.5 s', () => {
    const results = [res('2+3', 1000), res('8+7', 1000), res('9+6', 2400)];
    expect(roundKnackpunkte(results)).toEqual([]);
    const slower = [res('2+3', 4000), res('8+7', 4000), res('9+6', 5000)];
    // Median 4 s → threshold 6 s, so a uniformly slow round is not flagged task by task.
    expect(roundKnackpunkte(slower)).toEqual([]);
  });
});

describe('addResults', () => {
  it('appends per fact and keeps only the newest samples', () => {
    let stats = {};
    for (let i = 0; i < SAMPLES_PER_FACT + 3; i++) stats = addResults(stats, [res('8+7', 1000 + i)]);
    const samples = (stats as Record<string, { ms: number }[]>)['8+7'];
    expect(samples).toHaveLength(SAMPLES_PER_FACT);
    expect(samples.at(-1)!.ms).toBe(1000 + SAMPLES_PER_FACT + 2);
  });

  it('does not mutate the input', () => {
    const stats = {};
    addResults(stats, [res('8+7', 1000)]);
    expect(stats).toEqual({});
  });
});

describe('focusFacts', () => {
  const keys = pool.map((f) => f.key);

  it('picks troublesome facts of the mode, worst first', () => {
    const stats = addResults({}, [res('8+7', 7000), res('9+6', 4500, 1), res('2+3', 1000), res('7+5', 10_000, 0, true)]);
    expect(focusFacts(stats, keys)).toEqual(['7+5', '9+6', '8+7']);
  });

  it('ignores facts of other modes', () => {
    const minus = factPool('minus', false);
    const stats = { '13-6': [{ ms: 9000, wrong: 1, slow: false }] };
    expect(focusFacts(stats, keys)).toEqual([]);
    expect(focusFacts(stats, minus.map((f) => f.key))).toEqual(['13-6']);
  });

  it('three quick clean solves in a row clear a fact', () => {
    let stats = addResults({}, [res('8+7', 9000, 2)]);
    stats = addResults(stats, [res('8+7', 1500), res('8+7', 1400), res('8+7', 1300)]);
    expect(focusFacts(stats, keys)).toEqual([]);
  });
});
