import { describe, expect, it } from 'vitest';
import { layoutTrack, spreadLabels, TRACK_PAD } from '../src/logic/scale';

const item = (ms: number, rank: number | null, last = false) => ({ ms, rank, last });

describe('layoutTrack', () => {
  it('empty list has no positions', () => {
    expect(layoutTrack([], 300)).toEqual({ ys: [], ground: 300, top: 300 });
  });

  it('the scale is fitted to the saved times: fastest near the bottom, slowest near the top', () => {
    const { ys } = layoutTrack([item(60_000, 1), item(80_000, 2)], 300);
    expect(ys[0]).toBeCloseTo(300 * (1 - TRACK_PAD / (1 + 2 * TRACK_PAD)));
    expect(ys[1]).toBeCloseTo(300 * (TRACK_PAD / (1 + 2 * TRACK_PAD)));
  });

  it('heights stay proportional to the time differences', () => {
    const { ys } = layoutTrack([item(60_000, 1), item(70_000, 2), item(90_000, 3)], 400);
    expect((ys[0] - ys[1]) / (ys[1] - ys[2])).toBeCloseTo(0.5);
  });

  it('is independent of the absolute level (a scale for 20 s and one for 100 s look the same)', () => {
    const a = layoutTrack([item(20_000, 1), item(30_000, 2)], 300).ys;
    const b = layoutTrack([item(100_000, 1), item(110_000, 2)], 300).ys;
    expect(a[0]).toBeCloseTo(b[0]);
    expect(a[1]).toBeCloseTo(b[1]);
  });

  it('keeps rank order and height in agreement (10-second variant: better place, longer time)', () => {
    const { ys } = layoutTrack([item(40_000, 2), item(50_000, 1)], 300);
    expect(ys[1]).toBeGreaterThanOrEqual(ys[0]);
  });

  it('a last attempt outside the list sits at or above the slowest ranked one', () => {
    const { ys, top } = layoutTrack([item(40_000, 1), item(50_000, 2), item(45_000, null, true)], 300);
    expect(ys[2]).toBeLessThanOrEqual(ys[1]);
    expect(top).toBe(Math.min(...ys));
  });

  it('a single time sits in the middle', () => {
    expect(layoutTrack([item(30_000, 1, true)], 200).ys).toEqual([100]);
  });
});

describe('spreadLabels', () => {
  it('leaves labels that already have room untouched', () => {
    expect(spreadLabels([20, 100, 200], 24, 10, 290)).toEqual([20, 100, 200]);
  });

  it('pushes close labels apart by the minimum gap and keeps the order', () => {
    const out = spreadLabels([100, 110], 24, 10, 290);
    expect(out[1] - out[0]).toBeGreaterThanOrEqual(24);
    expect(out[0]).toBeLessThan(out[1]);
  });

  it('identical positions are separated too', () => {
    const out = spreadLabels([150, 150], 24, 10, 290);
    expect(Math.abs(out[0] - out[1])).toBeGreaterThanOrEqual(24);
  });

  it('stays inside the bounds', () => {
    const out = spreadLabels([12, 14, 16], 24, 10, 290);
    expect(Math.min(...out)).toBeGreaterThanOrEqual(10);
    expect(Math.max(...out)).toBeLessThanOrEqual(290);
    const edge = spreadLabels([286, 288], 24, 10, 290);
    expect(Math.max(...edge)).toBeLessThanOrEqual(290);
    expect(Math.abs(edge[0] - edge[1])).toBeGreaterThanOrEqual(24);
  });

  it('works on unsorted input and returns in input order', () => {
    const out = spreadLabels([200, 100, 110], 24, 10, 290);
    expect(out[0]).toBe(200);
    expect(out[2] - out[1]).toBeGreaterThanOrEqual(24);
  });
});
