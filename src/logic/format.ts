/** German time, unit written out (owner rule: no "s"): "8,4" Sekunden below a minute, "1:05,3" Minuten above. */
export function formatTime(ms: number): { value: string; unit: 'Sekunden' | 'Minuten' } {
  const tenths = Math.round(Math.max(0, ms) / 100);
  if (tenths < 600) return { value: `${Math.floor(tenths / 10)},${tenths % 10}`, unit: 'Sekunden' };
  const min = Math.floor(tenths / 600);
  const sec = Math.floor((tenths % 600) / 10);
  return { value: `${min}:${String(sec).padStart(2, '0')},${tenths % 10}`, unit: 'Minuten' };
}

export function formatMs(ms: number): string {
  const { value, unit } = formatTime(ms);
  return `${value} ${unit}`;
}
