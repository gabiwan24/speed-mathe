/**
 * Geometry for the Highscore scale: a vertical bar that grows with time, like a stopwatch column.
 * Less time is better, so the best round sits at the bottom and slower rounds stack above it.
 */

export interface ScaleInput {
  ms: number;
  /** Place in the best-20 list, or null for a last attempt that did not make the list. */
  rank: number | null;
  last: boolean;
}

export interface ScaleMarker extends ScaleInput {
  /** Height of the straight marker line and its labels. */
  y: number;
}

export interface ScaleLayout {
  height: number;
  markers: ScaleMarker[];
}

export const SCALE = {
  /** Grey room below the best round: the way still open towards 0. */
  bestPad: 96,
  /** Room above the slowest round. */
  slowPad: 96,
  minSpan: 320,
  perEntry: 40,
  /** Minimum distance between two lines so their labels stay readable. */
  gap: 36,
};

export function layoutScale(items: ScaleInput[]): ScaleLayout {
  if (!items.length) return { height: 0, markers: [] };

  const ranked = items.filter((i) => i.rank !== null).sort((a, b) => a.rank! - b.rank!);
  const unranked = items.filter((i) => i.rank === null);

  // Rank order and height must agree. In the 10-second variant a better rank can have
  // a longer time (more tasks in time wins), so values are made monotone along the ranks.
  const values: number[] = [];
  for (const item of ranked) values.push(Math.max(item.ms, values.at(-1) ?? -Infinity));
  // A last attempt outside the best 20 ranks below all of them.
  const floor = values.at(-1) ?? -Infinity;
  for (const item of unranked) values.push(Math.max(item.ms, floor));

  const ordered = [...ranked, ...unranked];
  const vmin = Math.min(...values);
  const vmax = Math.max(...values);
  const span = Math.max(SCALE.minSpan, ordered.length * SCALE.perEntry);

  // Proportional to time, but lines never closer than SCALE.gap (owner rule: no bent lines,
  // so a crowded line moves down itself instead of only its label).
  const markers: ScaleMarker[] = [];
  ordered.forEach((item, i) => {
    const linear = SCALE.bestPad + (vmax === vmin ? 0 : ((values[i] - vmin) / (vmax - vmin)) * span);
    const prev = markers.at(-1);
    markers.push({ ...item, y: prev ? Math.max(linear, prev.y + SCALE.gap) : linear });
  });

  const height = Math.max(SCALE.bestPad + span, markers.at(-1)!.y) + SCALE.slowPad;
  // Laid out best-first from the top, then mirrored: best at the bottom, slower rounds higher up.
  return { height, markers: markers.map((m) => ({ ...m, y: height - m.y })) };
}
