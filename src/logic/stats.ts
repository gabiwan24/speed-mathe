import type { TaskResult } from './round';

export interface Sample {
  ms: number;
  wrong: number;
  slow: boolean;
}

/** fact key → most recent samples (newest last). */
export type FactStats = Record<string, Sample[]>;

export const SAMPLES_PER_FACT = 8;
/** Below this a fact is fluent enough for a 2nd grader; never call it a Knackpunkt. */
export const FLUENT_MS = 2500;
const WRONG_PENALTY_MS = 3000;
const SLOW_PENALTY_MS = 5000;

/** One number per attempt: time plus penalties, so errors and timeouts rank above slow-but-right. */
export function cost(s: Sample): number {
  return s.ms + s.wrong * WRONG_PENALTY_MS + (s.slow ? SLOW_PENALTY_MS : 0);
}

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const toSample = (r: TaskResult): Sample => ({ ms: Math.round(r.ms), wrong: r.wrong, slow: r.tooSlow });

export function addResults(stats: FactStats, results: TaskResult[]): FactStats {
  const next: FactStats = { ...stats };
  for (const r of results) {
    next[r.fact.key] = [...(next[r.fact.key] ?? []), toSample(r)].slice(-SAMPLES_PER_FACT);
  }
  return next;
}

function isTrouble(s: Sample, threshold: number) {
  return s.wrong > 0 || s.slow || s.ms >= threshold;
}

/**
 * The round's hardest tasks: errors, timeouts, or clearly slower than the child's own median.
 * Relative to the child so a fast kid still learns something, but never below FLUENT_MS.
 */
export function roundKnackpunkte(results: TaskResult[], max = 3): TaskResult[] {
  const threshold = Math.max(FLUENT_MS, 1.5 * median(results.map((r) => r.ms)));
  return results
    .filter((r) => isTrouble(toSample(r), threshold))
    .sort((a, b) => cost(toSample(b)) - cost(toSample(a)))
    .slice(0, max);
}

/** Facts to practise, from all rounds so far, limited to the keys of the chosen mode. */
export function focusFacts(stats: FactStats, poolKeys: Iterable<string>, max = 6): string[] {
  const scored: { key: string; score: number }[] = [];
  for (const key of poolKeys) {
    const samples = stats[key];
    if (!samples?.length) continue;
    const score = median(samples.map(cost));
    const recent = samples.slice(-3);
    // A fact solved quickly and cleanly three times in a row is no longer a Knackpunkt.
    const mastered = recent.length === 3 && recent.every((s) => !isTrouble(s, FLUENT_MS));
    if (score >= FLUENT_MS && !mastered) scored.push({ key, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, max).map((s) => s.key);
}

