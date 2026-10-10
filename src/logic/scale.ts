/**
 * Geometry for the Highscore scale: a colour bar that starts at the bottom (0 seconds) and
 * grows with time. Less time is better, so the best round is the shortest stretch above the
 * ground and slower rounds stack above it.
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
}

export interface ScaleLayout {
  height: number;
  /** SVG y of the ground (0 seconds) where the colour bar starts. */
  baseline: number;
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
};

export function layoutScale(items: ScaleInput[]): ScaleLayout {
  if (!items.length) return { height: 0, baseline: 0, markers: [] };

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
  const vmax = Math.max(...values, 1);
  const span = Math.max(SCALE.minSpan, ordered.length * SCALE.perEntry);

  // Height above the ground is proportional to time from 0, but lines never sit closer than
  // SCALE.gap (owner rule: no bent lines, so a crowded line moves up itself).
  const heights: number[] = [];
  values.forEach((v, i) => {
    const linear = (v / vmax) * span;
    heights.push(i ? Math.max(linear, heights[i - 1] + SCALE.gap) : linear);
  });

  const baseline = SCALE.topPad + Math.max(span, heights.at(-1)!);
  return {
    height: baseline + SCALE.basePad,
    baseline,
    markers: ordered.map((item, i) => ({ ...item, y: baseline - heights[i] })),
  };
}
