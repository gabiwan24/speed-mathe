import type { BestRound, RoundConfig } from './records';
import type { FactStats } from './stats';

export interface SaveData {
  v: 1;
  settings: RoundConfig;
  /** recordKey → best rounds, best first (max HISTORY_SIZE). history[key][0] is the record. */
  history: Record<string, BestRound[]>;
  /** recordKey → most recent finished round, shown as "Letzter Versuch" even outside the best 20. */
  last: Record<string, BestRound>;
  /** Setting of the most recently played round; the Highscore page opens on it. */
  lastCfg: RoundConfig | null;
  stats: FactStats;
}

const KEY = 'speed-mathe:v1';

export const defaults = (): SaveData => ({
  v: 1,
  settings: { mode: 'love', booster: false, length: 20, variant: 'clock' },
  history: {},
  last: {},
  lastCfg: null,
  stats: {},
});

/** Storage can be missing or throw (private mode, blocked site data) – the game must still run. */
export function load(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): SaveData {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return defaults();
    const data = JSON.parse(raw) as Partial<SaveData> & { records?: Record<string, BestRound> };
    if (data.v !== 1) return defaults();
    const base = defaults();
    return {
      v: 1,
      settings: { ...base.settings, ...data.settings },
      // Early builds stored only the single record per setting; it becomes the first history entry.
      history: data.history ?? Object.fromEntries(Object.entries(data.records ?? {}).map(([k, r]) => [k, [r]])),
      last: data.last ?? {},
      lastCfg: data.lastCfg ?? null,
      stats: data.stats ?? {},
    };
  } catch {
    return defaults();
  }
}

export function save(data: SaveData, storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, JSON.stringify(data));
  } catch {
    // Quota or blocked storage: progress is lost for this session only.
  }
}
