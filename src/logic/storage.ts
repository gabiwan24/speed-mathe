import type { BestRound, RoundConfig } from './records';
import type { FactStats } from './stats';

export interface SaveData {
  v: 1;
  settings: RoundConfig;
  records: Record<string, BestRound>;
  stats: FactStats;
}

const KEY = 'speed-mathe:v1';

export const defaults = (): SaveData => ({
  v: 1,
  settings: { mode: 'love', booster: false, length: 20, variant: 'limit' },
  records: {},
  stats: {},
});

/** Storage can be missing or throw (private mode, blocked site data) – the game must still run. */
export function load(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): SaveData {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return defaults();
    const data = JSON.parse(raw) as Partial<SaveData>;
    if (data.v !== 1) return defaults();
    const base = defaults();
    return {
      v: 1,
      settings: { ...base.settings, ...data.settings },
      records: data.records ?? {},
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
