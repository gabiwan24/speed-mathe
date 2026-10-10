import type { Fact } from './tasks';

export type Variant = 'limit' | 'clock';
export const TASK_LIMIT_MS = 10_000;

export interface TaskResult {
  fact: Fact;
  /** Time on this task; capped at TASK_LIMIT_MS when too slow. */
  ms: number;
  wrong: number;
  tooSlow: boolean;
}

export type AnswerOutcome = 'correct' | 'wrong' | 'ignored';

/**
 * One round as a pure state machine; all times come in as arguments so it is testable
 * without a clock. A task's timer runs only between begin() and its result, so feedback
 * animations between tasks never count against the child.
 */
export class Round {
  readonly results: TaskResult[] = [];
  index = 0;
  private taskStart: number | null = null;
  private pausedAt: number | null = null;
  private wrongCurrent = 0;

  constructor(
    readonly tasks: Fact[],
    readonly variant: Variant,
  ) {}

  get current(): Fact | undefined {
    return this.tasks[this.index];
  }

  get done(): boolean {
    return this.index >= this.tasks.length;
  }

  get active(): boolean {
    return this.taskStart !== null && this.pausedAt === null;
  }

  begin(now: number) {
    if (this.done || this.taskStart !== null) return;
    this.taskStart = now;
    this.wrongCurrent = 0;
  }

  /** Milliseconds spent on the current task so far (frozen while paused). */
  elapsed(now: number): number {
    if (this.taskStart === null) return 0;
    return (this.pausedAt ?? now) - this.taskStart;
  }

  /** Total time of finished tasks plus the running one. */
  totalElapsed(now: number): number {
    return this.results.reduce((s, r) => s + r.ms, 0) + this.elapsed(now);
  }

  answer(value: number, now: number): AnswerOutcome {
    const fact = this.current;
    if (!fact || !this.active) return 'ignored';
    if (this.variant === 'limit' && this.elapsed(now) >= TASK_LIMIT_MS) return 'ignored';
    if (value !== fact.answer) {
      this.wrongCurrent++;
      return 'wrong';
    }
    this.finish({ fact, ms: this.elapsed(now), wrong: this.wrongCurrent, tooSlow: false });
    return 'correct';
  }

  /** Limit variant: closes the task as "zu langsam" once 10 s are up. The round goes on. */
  tick(now: number): 'timeout' | null {
    const fact = this.current;
    if (this.variant !== 'limit' || !fact || !this.active) return null;
    if (this.elapsed(now) < TASK_LIMIT_MS) return null;
    this.finish({ fact, ms: TASK_LIMIT_MS, wrong: this.wrongCurrent, tooSlow: true });
    return 'timeout';
  }

  pause(now: number) {
    if (this.taskStart !== null && this.pausedAt === null) this.pausedAt = now;
  }

  resume(now: number) {
    if (this.pausedAt === null || this.taskStart === null) return;
    this.taskStart += now - this.pausedAt;
    this.pausedAt = null;
  }

  summary(): RoundSummary {
    return {
      count: this.tasks.length,
      totalMs: this.results.reduce((s, r) => s + r.ms, 0),
      inTime: this.results.filter((r) => !r.tooSlow).length,
      wrong: this.results.reduce((s, r) => s + r.wrong, 0),
    };
  }

  private finish(result: TaskResult) {
    this.results.push(result);
    this.index++;
    this.taskStart = null;
    this.pausedAt = null;
  }
}

export interface RoundSummary {
  count: number;
  totalMs: number;
  inTime: number;
  wrong: number;
}
