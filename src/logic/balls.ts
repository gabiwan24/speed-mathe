import type { Fact } from './tasks';

/** Balls come in rows of ten; every row is split into two blocks of five (Zehnerfeld / Rechenrahmen). */
export const ROW = 10;
export const BLOCK = 5;

/** a = first number (red), b = second number (blue). */
export type BallColor = 'a' | 'b';

export interface BallGroup {
  color: BallColor;
  /** Balls that are drawn in colour. */
  filled: number;
  /** Fields shown in total (rounded up to full rows of ten); the rest is grey. */
  slots: number;
}

export interface BallPlan {
  groups: BallGroup[];
  /** Sign between the two groups; null when only one field is shown. */
  operator: '+' | '−' | null;
}

const slotsFor = (n: number) => Math.max(ROW, Math.ceil(n / ROW) * ROW);

/**
 * Plus/minus: first number red, second number blue, each in its own rows of ten.
 * Verliebte Zahlen ("7 + ? = 10" or "? + 7 = 10"): one field for the whole, the known part filled,
 * the missing part left grey – the child sees what is still to be filled up.
 */
export function ballPlan(fact: Fact): BallPlan {
  const [t0, op, t2, , t4] = fact.tokens;
  if (t0 === '?' || t2 === '?') {
    const known = Number(t0 === '?' ? t2 : t0);
    return { groups: [{ color: t0 === '?' ? 'b' : 'a', filled: known, slots: slotsFor(Number(t4)) }], operator: null };
  }
  const a = Number(t0);
  const b = Number(t2);
  return {
    groups: [
      { color: 'a', filled: a, slots: slotsFor(a) },
      { color: 'b', filled: b, slots: slotsFor(b) },
    ],
    operator: op === '−' ? '−' : '+',
  };
}

export type Shade = 'bright' | 'deep' | 'empty';

/** Shade per field: the first five of each row are bright, the second five deep, unfilled fields grey. */
export function ballShades(group: BallGroup): Shade[] {
  return Array.from({ length: group.slots }, (_, i) =>
    i >= group.filled ? 'empty' : Math.floor((i % ROW) / BLOCK) === 0 ? 'bright' : 'deep',
  );
}
