/** Geometry for the Highscore scale: a vertical bar where height = time (faster = higher). */

export interface ScaleInput {
  ms: number;
  /** Place in the best-20 list, or null for a last attempt that did not make the list. */
  rank: number | null;
  last: boolean;
}

export interface ScaleMarker extends ScaleInput {
  /** Where the marker line hits the bar. */
  y: number;
  /** Where its label sits; pushed down when markers are too close to read. */
  labelY: number;
}

export interface ScaleLayout {
  height: number;
  markers: ScaleMarker[];
}

export const SCALE = {
  top: 96,
  bottom: 96,
  minSpan: 320,
  perEntry: 40,
  labelGap: 36,
  lastExtra: 24,
};

export function layoutScale(items: ScaleInput[]): ScaleLayout {
  if (!items.length) return { height: 0, markers: [] };

  const ranked = items.filter((i) => i.rank !== null).sort((a, b) => a.rank! - b.rank!);
  const unranked = items.filter((i) => i.rank === null);

  // Rank order and height must agree. In the 10-second variant a better rank can have
  // a longer time (more tasks in time wins), so positions are made monotone along the ranks.
  const values: number[] = [];
  for (const item of ranked) values.push(Math.max(item.ms, values.at(-1) ?? -Infinity));
  // A last attempt outside the best 20 ranks below all of them.
  const floor = values.at(-1) ?? -Infinity;
  for (const item of unranked) values.push(Math.max(item.ms, floor));

  const ordered = [...ranked, ...unranked];
  const vmin = Math.min(...values);
  const vmax = Math.max(...values);
  const span = Math.max(SCALE.minSpan, ordered.length * SCALE.perEntry);

  const markers: ScaleMarker[] = [];
  ordered.forEach((item, i) => {
    const y = SCALE.top + (vmax === vmin ? 0 : ((values[i] - vmin) / (vmax - vmin)) * span);
    const prev = markers.at(-1);
    const minLabel = prev ? prev.labelY + SCALE.labelGap + (prev.last ? SCALE.lastExtra : 0) : -Infinity;
    markers.push({ ...item, y, labelY: Math.max(y, minLabel) });
  });

  const lowest = markers.at(-1)!;
  const height = Math.max(SCALE.top + span, lowest.labelY + (lowest.last ? SCALE.lastExtra : 0)) + SCALE.bottom;
  return { height, markers };
}
