/**
 * German time, whole seconds only (owner rule: no tenths), unit written out (no "s"):
 * "8 Sekunden" below a minute, "1:05 Minuten" above.
 */
export function formatTime(ms: number): { value: string; unit: 'Sekunde' | 'Sekunden' | 'Minuten' } {
  const total = Math.round(Math.max(0, ms) / 1000);
  if (total < 60) return { value: String(total), unit: total === 1 ? 'Sekunde' : 'Sekunden' };
  return { value: `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`, unit: 'Minuten' };
}

export function formatMs(ms: number): string {
  const { value, unit } = formatTime(ms);
  return `${value} ${unit}`;
}
