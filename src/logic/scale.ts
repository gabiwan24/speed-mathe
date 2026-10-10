/**
 * Geometry for the Highscore scale: a colour bar that starts at the bottom (0 seconds) and
 * grows with time. Less time is better, so the best round is the shortest stretch above the
 * ground and slower rounds stack above it.
 *
 * With `avail` (the height of the area on screen) the scale always fits into it, so the page never
 * needs to scroll (owner rule); without it a natural height is used.
 */

export interface ScaleInput {
  ms: number;
  /** Place in the best-20 list, or null for a last attempt that did not make the list. */
  rank: number | null;
  last: boolean;
}

export interface ScaleMarker extends ScaleInput {
  /** SVG y of the straight marker line; the distance above `baseline` is proportional to the time. */
  y: number;
  /** Opacity of the row: 1 for the best round, paler the longer the time. The last attempt always stays 1. */
  fade: number;
}

export interface ScaleLayout {
  height: number;
  /** SVG y of the ground (0 seconds) where the colour bar starts. */
  baseline: number;
  /** Minimum distance between two lines that was used; small values call for a denser label size. */
  gap: number;
  markers: ScaleMarker[];
}

export const SCALE = {
  /** Grey room above the slowest round. */
  topPad: 96,
  /** Room below the ground line for the label of a very short round. */
  basePad: 40,
  minSpan: 320,
  perEntry: 40,
  /** Minimum distance between two lines so their labels stay readable. */
  gap: 36,
  /** Lowest distance when many rounds have to fit into a small screen. */
  minGap: 16,
  /** Opacity of the slowest ranked round (owner rule: the longer the time, the paler the value). */
  fadeMin: 0.4,
};

export function layoutScale(items: ScaleInput[], avail?: number): ScaleLayout {
  if (!items.length) return { height: 0, baseline: 0, gap: SCALE.gap, markers: [] };

  const ranked = items.filter((i) => i.rank !== null).sort((a, b) => a.rank! - b.rank!);
  const unranked = items.filter((i) => i.rank === null);

  // Rank order and height must agree. In the 10-second variant a better rank can have
  // a longer time (more tasks in time wins), so values are made monotone along the ranks.
  const values: number[] = [];
  for (const item of ranked) values.push(Math.max(item.ms, values.at(-1) ?? -Infinity));
  // A last attempt outside the best 20 ranks below all of them (= highest line).
  const floor = values.at(-1) ?? -Infinity;
  for (const item of unranked) values.push(Math.max(item.ms, floor));

  const ordered = [...ranked, ...unranked];
  const n = ordered.length;
  const vmax = Math.max(...values, 1);

  let topPad: number = SCALE.topPad;
  let basePad: number = SCALE.basePad;
  let gap: number = SCALE.gap;
  // Height above the ground is proportional to time from 0 over `span`, but lines never sit closer
  // than `gap` (owner rule: no bent lines, so a crowded line moves up itself).
  const heightsFor = (span: number) => {
    const hs: number[] = [];
    values.forEach((v, i) => {
      const linear = (v / vmax) * span;
      hs.push(i ? Math.max(linear, hs[i - 1] + gap) : linear);
    });
    return hs;
  };

  let heights: number[];
  let baseline: number;
  let height: number;
  if (avail === undefined) {
    heights = heightsFor(Math.max(SCALE.minSpan, n * SCALE.perEntry));
    baseline = topPad + Math.max(Math.max(SCALE.minSpan, n * SCALE.perEntry), heights.at(-1)!);
    height = baseline + basePad;
  } else {
    topPad = Math.min(SCALE.topPad, Math.round(avail * 0.1));
    basePad = Math.min(SCALE.basePad, Math.round(avail * 0.05));
    const usable = Math.max(0, avail - topPad - basePad);
    gap = Math.max(SCALE.minGap, Math.min(SCALE.gap, Math.floor((0.85 * usable) / Math.max(1, n - 1))));
    // Largest proportional span whose highest line still fits (heights grow monotonically with the span).
    let lo = 0;
    let hi = usable;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (heightsFor(mid).at(-1)! <= usable) lo = mid;
      else hi = mid;
    }
    heights = heightsFor(lo);
    height = avail;
    baseline = avail - basePad;
  }

  // Fade follows the time itself (not the line position, which the minimum gap can shift): best = 1,
  // slowest ranked = fadeMin. The last attempt stays fully visible even when slow, because it is the
  // value the child came to look at.
  const vBest = values[0];
  const vSlow = values[ranked.length - 1] ?? vBest;
  const fadeFor = (item: ScaleInput, v: number) =>
    item.last || item.rank === null || vSlow === vBest ? 1 : 1 - (1 - SCALE.fadeMin) * ((v - vBest) / (vSlow - vBest));

  return {
    height,
    baseline,
    gap,
    markers: ordered.map((item, i) => ({ ...item, y: baseline - heights[i], fade: fadeFor(item, values[i]) })),
  };
}
