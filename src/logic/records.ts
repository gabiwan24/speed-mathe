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

/** Limit variant: more tasks in time wins, then less time. Stopwatch: less time wins. */
export function isBetter(variant: Variant, s: RoundSummary, best: BestRound | undefined): boolean {
  if (!best) return true;
  if (variant === 'limit' && s.inTime !== best.inTime) return s.inTime > best.inTime;
  return s.totalMs < best.totalMs;
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
