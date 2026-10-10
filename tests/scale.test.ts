import { describe, expect, it } from 'vitest';
import { layoutScale, SCALE } from '../src/logic/scale';

const item = (ms: number, rank: number | null, last = false) => ({ ms, rank, last });

describe('layoutScale', () => {
  it('empty list has no markers', () => {
    expect(layoutScale([])).toEqual({ height: 0, markers: [] });
  });

  it('best (least time) at the bottom, slower rounds higher, height proportional to time', () => {
    const { height, markers } = layoutScale([item(45_000, 3), item(30_000, 1), item(70_000, 4), item(35_000, 2)]);
    expect(markers.map((m) => m.rank)).toEqual([1, 2, 3, 4]);
    expect(markers[0].y).toBe(height - SCALE.bestPad);
    const [a, b, c, d] = markers.map((m) => m.y);
    expect(b).toBeLessThan(a);
    // 5 s gap vs 10 s gap vs 25 s gap over a 40 s range: all wider than the minimum line distance
    expect((b - c) / (a - b)).toBeCloseTo(2);
    expect((c - d) / (a - b)).toBeCloseTo(5);
  });

  it('lines never come closer than the minimum gap, even for nearly equal times', () => {
    const { markers } = layoutScale([item(30_000, 1), item(30_050, 2), item(30_100, 3), item(60_000, 4)]);
    for (let i = 1; i < markers.length; i++) {
      expect(markers[i - 1].y - markers[i].y).toBeGreaterThanOrEqual(SCALE.gap);
    }
  });

  it('pushing a crowded line keeps the far ones at their time position', () => {
    const { height, markers } = layoutScale([item(30_000, 1), item(30_010, 2), item(60_000, 3)]);
    expect(markers[1].y).toBe(height - SCALE.bestPad - SCALE.gap);
    expect(markers[2].y).toBeCloseTo(height - SCALE.bestPad - SCALE.minSpan);
  });

  it('10-second variant: positions follow rank even when a better rank took longer', () => {
    const { markers } = layoutScale([item(60_000, 1), item(40_000, 2)]);
    expect(markers[1].y).toBeLessThan(markers[0].y);
  });

  it('a last attempt outside the best 20 sits above all ranked rounds', () => {
    const { markers } = layoutScale([item(30_000, 1), item(50_000, 2), item(45_000, null, true)]);
    expect(markers.at(-1)!.rank).toBeNull();
    expect(markers.at(-1)!.y).toBeLessThan(markers[1].y);
  });

  it('leaves room below the best and above the slowest line', () => {
    const { height, markers } = layoutScale([item(30_000, 1), item(40_000, 2, true)]);
    expect(height - markers[0].y).toBe(SCALE.bestPad);
    expect(markers.at(-1)!.y).toBeGreaterThanOrEqual(SCALE.slowPad);
  });

  it('a single round still renders', () => {
    const { height, markers } = layoutScale([item(30_000, 1, true)]);
    expect(markers[0].y).toBe(height - SCALE.bestPad);
    expect(height).toBeGreaterThan(SCALE.bestPad + SCALE.slowPad);
  });
});
