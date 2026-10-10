/**
 * Geometry for the Highscore track: a vertical bar whose height range is fitted to the SAVED times
 * (owner decision: the scale follows the data, it does not start at 0). Fast is at the bottom, slow on top.
 * Only a few times get a label; the pure functions here place them so they never overlap.
 */

export interface ScaleInput {
  ms: number;
  /** Place in the best list, or null for a last attempt that did not make the list. */
  rank: number | null;
  last: boolean;
}

export interface TrackLayout {
  /** SVG/CSS y per input item (same order): bottom = fastest, top = slowest. */
  ys: number[];
  /** y of the ground (bottom end of the colour bar). */
  ground: number;
  /** y of the slowest item (top end of the colour bar). */
  top: number;
}

/** Share of the height kept free below the fastest and above the slowest time (room for the labels). */
export const TRACK_PAD = 0.1;

export function layoutTrack(items: ScaleInput[], height: number): TrackLayout {
  if (!items.length) return { ys: [], ground: height, top: height };
  const ranked = items.map((it, i) => ({ it, i })).filter((x) => x.it.rank !== null).sort((a, b) => a.it.rank! - b.it.rank!);
  const unranked = items.map((it, i) => ({ it, i })).filter((x) => x.it.rank === null);
  // Rank order and height must agree: in the 10-second variant a better place can have a longer time.
  const values = new Array<number>(items.length);
  let floor = -Infinity;
  for (const { it, i } of ranked) values[i] = floor = Math.max(it.ms, floor);
  for (const { it, i } of unranked) values[i] = Math.max(it.ms, floor);

  const vmin = Math.min(...values);
  const vmax = Math.max(...values);
  const span = vmax - vmin || 1;
  const lo = vmin - span * TRACK_PAD;
  const hi = vmax + span * TRACK_PAD;
  const y = (v: number) => height - ((v - lo) / (hi - lo)) * height;
  const single = vmax === vmin;
  const ys = values.map((v) => (single ? height / 2 : y(v)));
  return { ys, ground: height, top: Math.min(...ys) };
}

/**
 * Moves labels apart so that neighbours are at least `gap` high, keeping their order and staying inside
 * [min, max]. Input and output are in the same order; the input need not be sorted.
 */
export function spreadLabels(ys: number[], gap: number, min: number, max: number): number[] {
  const order = ys.map((_, i) => i).sort((a, b) => ys[a] - ys[b]);
  const out = [...ys];
  let prev = min - gap;
  for (const i of order) {
    out[i] = Math.max(out[i], prev + gap, min);
    prev = out[i];
  }
  let next = max + gap;
  for (const i of [...order].reverse()) {
    out[i] = Math.min(out[i], next - gap, max);
    next = out[i];
  }
  return out;
}
