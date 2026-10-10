import { describe, expect, it } from 'vitest';
import { layoutScale, SCALE } from '../src/logic/scale';

const item = (ms: number, rank: number | null, last = false) => ({ ms, rank, last });

describe('layoutScale', () => {
  it('empty list has no markers', () => {
    expect(layoutScale([])).toEqual({ height: 0, markers: [] });
  });

  it('best on top, height proportional to time', () => {
    const { markers } = layoutScale([item(39_120, 3), item(34_120, 1), item(44_120, 4), item(35_120, 2)]);
    expect(markers.map((m) => m.rank)).toEqual([1, 2, 3, 4]);
    expect(markers[0].y).toBe(SCALE.top);
    const [a, b, c, d] = markers.map((m) => m.y);
    // 1 s gap vs 4 s gap vs 5 s gap
    expect((c - b) / (b - a)).toBeCloseTo(4);
    expect((d - c) / (b - a)).toBeCloseTo(5);
  });

  it('labels never overlap, even for nearly equal times', () => {
    const { markers } = layoutScale([item(30_000, 1), item(30_050, 2), item(30_100, 3), item(60_000, 4)]);
    for (let i = 1; i < markers.length; i++) {
      expect(markers[i].labelY - markers[i - 1].labelY).toBeGreaterThanOrEqual(SCALE.labelGap);
      expect(markers[i].labelY).toBeGreaterThanOrEqual(markers[i].y);
    }
  });

  it('the "Letzter Versuch" line gets extra room below it', () => {
    const { markers } = layoutScale([item(30_000, 1, true), item(30_010, 2), item(60_000, 3)]);
    expect(markers[1].labelY - markers[0].labelY).toBe(SCALE.labelGap + SCALE.lastExtra);
  });

  it('10-second variant: positions follow rank even when a better rank took longer', () => {
    const { markers } = layoutScale([item(60_000, 1), item(40_000, 2)]);
    expect(markers[1].y).toBeGreaterThanOrEqual(markers[0].y);
  });

  it('a last attempt outside the best 20 sits below all ranked rounds', () => {
    const { markers } = layoutScale([item(30_000, 1), item(50_000, 2), item(45_000, null, true)]);
    expect(markers.at(-1)!.rank).toBeNull();
    expect(markers.at(-1)!.y).toBeGreaterThanOrEqual(markers[1].y);
  });

  it('height leaves room above the best and below the lowest label', () => {
    const { height, markers } = layoutScale([item(30_000, 1), item(40_000, 2, true)]);
    expect(height).toBeGreaterThanOrEqual(markers.at(-1)!.labelY + SCALE.lastExtra + SCALE.bottom);
  });

  it('a single round still renders', () => {
    const { height, markers } = layoutScale([item(30_000, 1, true)]);
    expect(markers[0].y).toBe(SCALE.top);
    expect(height).toBeGreaterThan(SCALE.top + SCALE.bottom);
  });
});
