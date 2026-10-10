import type { Variant, RoundSummary } from './round';
import type { Mode } from './tasks';

export type Input = 'tap';

export interface RoundConfig {
  mode: Mode;
  booster: boolean;
  length: 20 | 30;
  variant: Variant;
}

export interface BestRound {
  totalMs: number;
  inTime: number;
  count: number;
  date: string;
}

/** Records are kept per mode, booster, length, variant and input method (Regelbuch). */
export function recordKey(cfg: RoundConfig, input: Input = 'tap'): string {
  return [cfg.mode, cfg.booster ? 'boost' : 'base', cfg.length, cfg.variant, input].join('|');
}

/** Best rounds kept per setting for the Highscore page. */
export const HISTORY_SIZE = 20;

type Scored = Pick<BestRound, 'totalMs' | 'inTime'>;

/** Negative when a is better. Limit variant: more tasks in time wins, then less time. Stopwatch: less time wins. */
export function compareRounds(variant: Variant, a: Scored, b: Scored): number {
  if (variant === 'limit' && a.inTime !== b.inTime) return b.inTime - a.inTime;
  return a.totalMs - b.totalMs;
}

export function isBetter(variant: Variant, s: RoundSummary, best: BestRound | undefined): boolean {
  return !best || compareRounds(variant, s, best) < 0;
}

/**
 * Inserts a finished round into the best-first list and keeps the best HISTORY_SIZE.
 * rank is 1-based, or null when the round did not make the list. Ties keep the older round ahead.
 */
export function addToHistory(list: BestRound[], entry: BestRound, variant: Variant): { list: BestRound[]; rank: number | null } {
  const next = [...list, entry].sort((a, b) => compareRounds(variant, a, b)).slice(0, HISTORY_SIZE);
  const i = next.indexOf(entry);
  return { list: next, rank: i < 0 ? null : i + 1 };
}

export type Improvement =
  | { kind: 'first' }
  | { kind: 'inTime'; more: number }
  | { kind: 'faster'; ms: number };

export function improvement(variant: Variant, s: RoundSummary, best: BestRound | undefined): Improvement | null {
  if (!isBetter(variant, s, best)) return null;
  if (!best) return { kind: 'first' };
  if (variant === 'limit' && s.inTime > best.inTime) return { kind: 'inTime', more: s.inTime - best.inTime };
  return { kind: 'faster', ms: best.totalMs - s.totalMs };
}
