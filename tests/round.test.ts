import { describe, expect, it } from 'vitest';
import { Round, TASK_LIMIT_MS } from '../src/logic/round';
import { factPool } from '../src/logic/tasks';

const pool = factPool('plus', false);
const fact = (key: string) => pool.find((f) => f.key === key)!;
const tasks = [fact('8+7'), fact('5+4'), fact('9+3')];

describe('Round', () => {
  it('correct answers advance and record their time', () => {
    const r = new Round(tasks, 'clock');
    r.begin(0);
    expect(r.answer(15, 2000)).toBe('correct');
    expect(r.results[0]).toMatchObject({ ms: 2000, wrong: 0, tooSlow: false });
    expect(r.index).toBe(1);
  });

  it('the next task timer starts only at begin(), so feedback pauses do not count', () => {
    const r = new Round(tasks, 'clock');
    r.begin(0);
    r.answer(15, 1000);
    expect(r.answer(9, 1500)).toBe('ignored');
    r.begin(1800);
    r.answer(9, 2800);
    expect(r.summary().totalMs).toBe(2000);
  });

  it('wrong answer keeps the task and the clock running', () => {
    const r = new Round(tasks, 'clock');
    r.begin(0);
    expect(r.answer(14, 1000)).toBe('wrong');
    expect(r.index).toBe(0);
    expect(r.answer(15, 3500)).toBe('correct');
    expect(r.results[0]).toMatchObject({ ms: 3500, wrong: 1 });
  });

  it('limit: timeout marks "zu langsam" and the round continues', () => {
    const r = new Round(tasks, 'limit');
    r.begin(0);
    expect(r.tick(TASK_LIMIT_MS - 1)).toBeNull();
    expect(r.tick(TASK_LIMIT_MS + 40)).toBe('timeout');
    expect(r.results[0]).toMatchObject({ ms: TASK_LIMIT_MS, tooSlow: true });
    expect(r.done).toBe(false);
    expect(r.current?.key).toBe('5+4');
  });

  it('limit: a late answer after 10 s is ignored, tick closes the task', () => {
    const r = new Round(tasks, 'limit');
    r.begin(0);
    expect(r.answer(15, TASK_LIMIT_MS)).toBe('ignored');
    expect(r.tick(TASK_LIMIT_MS)).toBe('timeout');
  });

  it('limit: wrong answers count toward the same 10 s', () => {
    const r = new Round(tasks, 'limit');
    r.begin(0);
    r.answer(1, 4000);
    r.answer(2, 8000);
    expect(r.tick(10_000)).toBe('timeout');
    expect(r.results[0]).toMatchObject({ wrong: 2, tooSlow: true });
  });

  it('clock: never times out', () => {
    const r = new Round(tasks, 'clock');
    r.begin(0);
    expect(r.tick(60_000)).toBeNull();
    expect(r.answer(15, 60_000)).toBe('correct');
  });

  it('pause excludes the paused time and blocks answers', () => {
    const r = new Round(tasks, 'limit');
    r.begin(0);
    r.pause(3000);
    expect(r.answer(15, 5000)).toBe('ignored');
    expect(r.tick(20_000)).toBeNull();
    r.resume(20_000);
    expect(r.elapsed(21_000)).toBe(4000);
    expect(r.answer(15, 21_000)).toBe('correct');
    expect(r.results[0].ms).toBe(4000);
  });

  it('summary over a full round', () => {
    const r = new Round(tasks, 'limit');
    r.begin(0);
    r.answer(15, 2000);
    r.begin(2000);
    r.tick(12_000);
    r.begin(12_000);
    r.answer(11, 13_000);
    r.answer(12, 15_000);
    expect(r.done).toBe(true);
    expect(r.summary()).toEqual({ count: 3, totalMs: 2000 + 10_000 + 3000, inTime: 2, wrong: 1 });
  });
});
