import { describe, expect, it } from 'vitest';
import { ballPlan, ballShades } from '../src/logic/balls';
import { factPool } from '../src/logic/tasks';

const fact = (mode: 'love' | 'plus' | 'minus' | 'mixed', key: string, booster = false) =>
  factPool(mode, booster).find((f) => f.key === key)!;

describe('ballPlan', () => {
  it('plus: first number red, second blue, rows of ten', () => {
    expect(ballPlan(fact('plus', '8+7'))).toEqual({
      groups: [
        { color: 'a', filled: 8, slots: 10 },
        { color: 'b', filled: 7, slots: 10 },
      ],
      operator: '+',
    });
  });

  it('13 + 6 needs two rows for the red number (as in the mockup)', () => {
    const plan = ballPlan(fact('plus', '13+6'));
    expect(plan.groups[0]).toEqual({ color: 'a', filled: 13, slots: 20 });
    expect(plan.groups[1]).toEqual({ color: 'b', filled: 6, slots: 10 });
  });

  it('minus keeps the same picture with a minus sign', () => {
    const plan = ballPlan(fact('minus', '13-6'));
    expect(plan.operator).toBe('−');
    expect(plan.groups.map((g) => [g.filled, g.slots])).toEqual([[13, 20], [6, 10]]);
  });

  it('exact tens do not add an empty row', () => {
    expect(ballPlan(fact('minus', '20-10')).groups.map((g) => g.slots)).toEqual([20, 10]);
  });

  it('numbers up to 30 use three rows', () => {
    expect(ballPlan(fact('mixed', '25-4', true)).groups[0].slots).toBe(30);
  });

  it('verliebte Zahlen: one field for the whole, known part filled', () => {
    expect(ballPlan(fact('love', '7+?=10'))).toEqual({ groups: [{ color: 'a', filled: 7, slots: 10 }], operator: null });
  });

  it('verliebte Zahlen with the blank first: the known part is the second number, so blue', () => {
    expect(ballPlan(fact('love', '?+7=10'))).toEqual({ groups: [{ color: 'b', filled: 7, slots: 10 }], operator: null });
  });

  it('verliebte Zahlen booster: partners of 20 get two rows', () => {
    expect(ballPlan(fact('love', '13+?=20', true)).groups[0]).toEqual({ color: 'a', filled: 13, slots: 20 });
  });

  it('every fact of every mode produces a plan that fits its numbers', () => {
    for (const mode of ['love', 'plus', 'minus', 'mixed'] as const) {
      for (const f of factPool(mode, true)) {
        const { groups } = ballPlan(f);
        for (const g of groups) {
          expect(g.filled).toBeGreaterThan(0);
          expect(g.slots).toBeGreaterThanOrEqual(g.filled);
          expect(g.slots % 10).toBe(0);
        }
      }
    }
  });
});

describe('ballShades', () => {
  it('blocks of five alternate bright and deep, unfilled fields are empty', () => {
    expect(ballShades({ color: 'b', filled: 6, slots: 10 })).toEqual([
      ...Array(5).fill('bright'),
      'deep',
      ...Array(4).fill('empty'),
    ]);
  });

  it('a second row starts bright again (13 of 20)', () => {
    const s = ballShades({ color: 'a', filled: 13, slots: 20 });
    expect(s.slice(0, 10)).toEqual([...Array(5).fill('bright'), ...Array(5).fill('deep')]);
    expect(s.slice(10)).toEqual([...Array(3).fill('bright'), ...Array(7).fill('empty')]);
  });

  it('a full row of ten has a bright and a deep half', () => {
    expect(ballShades({ color: 'a', filled: 10, slots: 10 }).filter((x) => x === 'deep')).toHaveLength(5);
  });
});
