import { describe, expect, it } from 'vitest';
import { factPool, generateTasks, solvedText, type Mode } from '../src/logic/tasks';

/** Deterministic PRNG (mulberry32) so statistical assertions are reproducible. */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const operands = (key: string) => key.match(/\d+/g)!.map(Number);
const many = (mode: Mode, booster: boolean, n = 3000, seed = 1) =>
  generateTasks({ mode, booster, count: n, rng: seeded(seed) });

describe('factPool', () => {
  // The known addend sits at token 0 or 2, depending on where the blank is.
  const known = (f: { tokens: string[] }) => Number(f.tokens[0] === '?' ? f.tokens[2] : f.tokens[0]);

  it('love: partners of 10 in both forms, booster adds partners of 20', () => {
    const base = factPool('love', false);
    expect(base).toHaveLength(2 * 9);
    expect(base.map((f) => f.answer + known(f))).toEqual(Array(18).fill(10));
    expect(base.filter((f) => f.tokens[0] === '?')).toHaveLength(9);
    const boosted = factPool('love', true);
    expect(boosted).toHaveLength(2 * (9 + 19));
    expect(boosted.every((f) => [10, 20].includes(f.answer + known(f)))).toBe(true);
  });

  it.each([
    ['plus', false, 20],
    ['minus', false, 20],
    ['mixed', false, 20],
    ['mixed', true, 30],
  ] as const)('%s booster=%s stays within 0..%i, never negative, never 0 as operand', (mode, booster, max) => {
    for (const f of factPool(mode, booster)) {
      expect(f.answer).toBeGreaterThanOrEqual(0);
      expect(f.answer).toBeLessThanOrEqual(max);
      for (const n of operands(f.key)) {
        expect(n).toBeGreaterThan(0);
        expect(n).toBeLessThanOrEqual(max);
      }
    }
  });

  it('marks Zehnerübergang correctly', () => {
    const byKey = Object.fromEntries(factPool('mixed', true).map((f) => [f.key, f.crossing]));
    expect(byKey['8+7']).toBe(true);
    expect(byKey['17+5']).toBe(true);
    expect(byKey['8+2']).toBe(false);
    expect(byKey['12+5']).toBe(false);
    expect(byKey['13-6']).toBe(true);
    expect(byKey['23-5']).toBe(true);
    expect(byKey['15-3']).toBe(false);
    expect(byKey['9-6']).toBe(false);
  });

  it('mixed pool contains plus and minus', () => {
    const pool = factPool('mixed', false);
    expect(pool.some((f) => f.key.includes('+'))).toBe(true);
    expect(pool.some((f) => f.key.includes('-'))).toBe(true);
  });
});

describe('generateTasks', () => {
  it.each([20, 30])('returns exactly %i tasks', (count) => {
    expect(generateTasks({ mode: 'plus', booster: false, count, rng: seeded(3) })).toHaveLength(count);
  });

  it.each(['love', 'plus', 'minus', 'mixed'] as const)('%s: no fact repeats within 3 tasks, no equal answers back to back', (mode) => {
    const tasks = many(mode, false);
    for (let i = 1; i < tasks.length; i++) {
      const recent = tasks.slice(Math.max(0, i - 3), i).map((t) => t.key);
      expect(recent).not.toContain(tasks[i].key);
      expect(tasks[i].answer).not.toBe(tasks[i - 1].answer);
    }
  });

  it.each(['plus', 'minus'] as const)('%s: about 40 %% Zehnerübergang', (mode) => {
    const share = many(mode, false).filter((t) => t.crossing).length / 3000;
    expect(share).toBeGreaterThan(0.33);
    expect(share).toBeLessThan(0.47);
  });

  it('plus: operand 1 is rare (< 6 %)', () => {
    const ones = many('plus', false).filter((t) => operands(t.key).includes(1)).length / 3000;
    expect(ones).toBeLessThan(0.06);
  });

  it('mixed: plus and minus roughly balanced', () => {
    const plus = many('mixed', false).filter((t) => t.key.includes('+')).length / 3000;
    expect(plus).toBeGreaterThan(0.42);
    expect(plus).toBeLessThan(0.58);
  });

  it('mixed booster reaches beyond 20, plain mixed never does', () => {
    expect(many('mixed', true).some((t) => Math.max(t.answer, ...operands(t.key)) > 20)).toBe(true);
    expect(many('mixed', false).every((t) => Math.max(t.answer, ...operands(t.key)) <= 20)).toBe(true);
  });

  it('love mixes "a + ? = 10" and "? + a = 10" about evenly', () => {
    const blankFirst = many('love', false).filter((t) => t.tokens[0] === '?').length / 3000;
    expect(blankFirst).toBeGreaterThan(0.4);
    expect(blankFirst).toBeLessThan(0.6);
  });

  it('love booster mixes partners of 10 and 20', () => {
    const totals = new Set(many('love', true).map((t) => t.tokens[4]));
    expect(totals).toEqual(new Set(['10', '20']));
  });

  it('focus facts appear far more often', () => {
    const focus = ['8+7', '9+6', '7+5'];
    const tasks = generateTasks({ mode: 'plus', booster: false, count: 3000, rng: seeded(9), focus });
    const share = tasks.filter((t) => focus.includes(t.key)).length / 3000;
    // Uniform chance for 3 of 190 facts is ~2 %; focus targets ~half the tasks minus repeat blocking.
    expect(share).toBeGreaterThan(0.25);
  });

  it('a single focus fact still yields a full round without back-to-back repeats', () => {
    const tasks = generateTasks({ mode: 'plus', booster: false, count: 30, rng: seeded(5), focus: ['8+7'] });
    expect(tasks).toHaveLength(30);
    for (let i = 1; i < tasks.length; i++) expect(tasks[i].key).not.toBe(tasks[i - 1].key);
  });
});

describe('solvedText', () => {
  it('fills the blank', () => {
    const love = factPool('love', false).find((f) => f.key === '7+?=10')!;
    expect(solvedText(love)).toBe('7 + 3 = 10');
    const loveFlipped = factPool('love', false).find((f) => f.key === '?+7=10')!;
    expect(solvedText(loveFlipped)).toBe('3 + 7 = 10');
    const minus = factPool('minus', false).find((f) => f.key === '13-6')!;
    expect(solvedText(minus)).toBe('13 − 6 = 7');
  });
});

describe('verliebte Zahlen: both forms stay mixed', () => {
  it('"7 + ? = 10" and "? + 7 = 10" both occur and never three of the same form in a row', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const tasks = generateTasks({ mode: 'love', booster: seed % 2 === 0, count: 20, rng: seeded(seed) });
      const forms = tasks.map((t) => t.tokens.indexOf('?'));
      expect(new Set(forms).size).toBe(2);
      for (let i = 2; i < forms.length; i++) expect(forms[i] === forms[i - 1] && forms[i] === forms[i - 2]).toBe(false);
    }
  });
});
