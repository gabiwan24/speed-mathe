import { describe, expect, it } from 'vitest';
import { layoutScale, SCALE } from '../src/logic/scale';

const item = (ms: number, rank: number | null, last = false) => ({ ms, rank, last });

describe('layoutScale', () => {
  it('empty list has no markers', () => {
    expect(layoutScale([])).toEqual({ height: 0, baseline: 0, markers: [] });
  });

  it('the bar starts at the ground; line height above it is proportional to time from 0', () => {
    const { baseline, markers } = layoutScale([item(60_000, 3), item(20_000, 1), item(80_000, 4), item(40_000, 2)]);
    expect(markers.map((m) => m.rank)).toEqual([1, 2, 3, 4]);
    const h = markers.map((m) => baseline - m.y);
    // 20 : 40 : 60 : 80 seconds, all further apart than the minimum line distance
    expect(h[1] / h[0]).toBeCloseTo(2);
    expect(h[2] / h[0]).toBeCloseTo(3);
    expect(h[3] / h[0]).toBeCloseTo(4);
  });

  it('the slowest round reaches the top of the bar, best is the shortest stretch', () => {
    const { baseline, markers } = layoutScale([item(30_000, 1), item(60_000, 2)]);
    expect(baseline - markers[1].y).toBeCloseTo(SCALE.minSpan);
    expect(baseline - markers[0].y).toBeCloseTo(SCALE.minSpan / 2);
  });

  it('keeps grey room above the slowest line and room below the ground', () => {
    const { height, baseline, markers } = layoutScale([item(30_000, 1), item(40_000, 2)]);
    expect(markers.at(-1)!.y).toBe(SCALE.topPad);
    expect(height - baseline).toBe(SCALE.basePad);
  });

  it('lines never come closer than the minimum gap, even for nearly equal times', () => {
    const { markers } = layoutScale([item(30_000, 1), item(30_050, 2), item(30_100, 3), item(60_000, 4)]);
    for (let i = 1; i < markers.length; i++) {
      expect(markers[i - 1].y - markers[i].y).toBeGreaterThanOrEqual(SCALE.gap);
    }
  });

  it('crowded lines move up, the bar grows to fit them', () => {
    const { height, baseline, markers } = layoutScale([item(60_000, 1), item(60_010, 2), item(60_020, 3)]);
    expect(baseline - markers[2].y).toBeGreaterThan(SCALE.minSpan);
    expect(markers[2].y).toBe(SCALE.topPad);
    expect(height).toBe(baseline + SCALE.basePad);
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

  it('a single round fills the span', () => {
    const { baseline, markers } = layoutScale([item(30_000, 1, true)]);
    expect(baseline - markers[0].y).toBeCloseTo(SCALE.minSpan);
  });
});
