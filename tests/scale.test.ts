import { describe, expect, it } from 'vitest';
import { layoutScale, SCALE } from '../src/logic/scale';

const item = (ms: number, rank: number | null, last = false) => ({ ms, rank, last });

describe('layoutScale', () => {
  it('empty list has no markers', () => {
    expect(layoutScale([])).toEqual({ height: 0, baseline: 0, gap: SCALE.gap, markers: [] });
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

  it('values get paler the longer the time: best 1, slowest ranked fadeMin, in between linear', () => {
    const { markers } = layoutScale([item(20_000, 1), item(40_000, 2), item(60_000, 3), item(80_000, 4)]);
    const fades = markers.map((m) => m.fade);
    expect(fades[0]).toBe(1);
    expect(fades[3]).toBeCloseTo(SCALE.fadeMin);
    expect(fades[1]).toBeGreaterThan(fades[2]);
    expect(fades[1]).toBeCloseTo(1 - (1 - SCALE.fadeMin) / 3);
  });

  it('the last attempt and an unranked attempt are never faded', () => {
    const { markers } = layoutScale([item(20_000, 1), item(80_000, 2, true), item(90_000, null, true)]);
    expect(markers.map((m) => m.fade)).toEqual([1, 1, 1]);
  });

  it('a single ranked round or equal times stay fully visible', () => {
    expect(layoutScale([item(30_000, 1)]).markers[0].fade).toBe(1);
    expect(layoutScale([item(30_000, 1), item(30_000, 2)]).markers.map((m) => m.fade)).toEqual([1, 1]);
  });

  describe('fitting into an available height (no scrolling)', () => {
    const rounds = (n: number, spread = 1000) =>
      Array.from({ length: n }, (_, i) => item(30_000 + i * spread, i + 1));

    it.each([1, 2, 5, 9, 20])('%i rounds fit into 600, 450 and 360 px', (n) => {
      for (const avail of [600, 450, 360]) {
        const { height, baseline, markers } = layoutScale(rounds(n), avail);
        expect(height).toBeLessThanOrEqual(avail);
        expect(baseline).toBeLessThanOrEqual(height);
        for (const m of markers) {
          expect(m.y).toBeGreaterThanOrEqual(0);
          expect(m.y).toBeLessThanOrEqual(baseline);
        }
      }
    });

    it('keeps lines apart by at least the minimum gap, even with 20 rounds on a small screen', () => {
      const { markers } = layoutScale(rounds(20, 10), 450);
      for (let i = 1; i < markers.length; i++) {
        expect(markers[i - 1].y - markers[i].y).toBeGreaterThanOrEqual(SCALE.minGap - 1e-6);
      }
    });

    it('uses the full height for few rounds: the slowest line reaches near the top', () => {
      const { markers, height } = layoutScale(rounds(3, 15_000), 600);
      expect(markers.at(-1)!.y).toBeLessThan(height * 0.2);
    });

    it('stays proportional to time when there is room', () => {
      const { baseline, markers } = layoutScale([item(20_000, 1), item(40_000, 2), item(60_000, 3)], 600);
      const h = markers.map((m) => baseline - m.y);
      expect(h[1] / h[0]).toBeCloseTo(2, 1);
      expect(h[2] / h[0]).toBeCloseTo(3, 1);
    });

    it('reports a small gap for crowded screens so labels can shrink', () => {
      expect(layoutScale(rounds(20), 450).gap).toBeLessThan(26);
      expect(layoutScale(rounds(4), 600).gap).toBe(SCALE.gap);
    });
  });
});
