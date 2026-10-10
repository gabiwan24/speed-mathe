import { describe, expect, it } from 'vitest';
import { defaults, load, save } from '../src/logic/storage';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('storage', () => {
  it('round-trips data', () => {
    const s = memory();
    const data = defaults();
    data.settings.mode = 'mixed';
    data.history['x'] = [{ totalMs: 1, inTime: 1, count: 20, date: '2026-10-10T15:00:00.000Z' }];
    save(data, s);
    expect(load(s)).toEqual(data);
  });

  it('defaults to the stopwatch variant (owner rule); a saved choice is kept', () => {
    expect(defaults().settings.variant).toBe('clock');
    const s = memory();
    s.setItem('speed-mathe:v1', JSON.stringify({ v: 1, settings: { variant: 'limit' } }));
    expect(load(s).settings.variant).toBe('limit');
  });

  it('display defaults to numbers; old saves without it get numbers', () => {
    expect(defaults().settings.display).toBe('numbers');
    const s = memory();
    s.setItem('speed-mathe:v1', JSON.stringify({ v: 1, settings: { mode: 'plus' } }));
    expect(load(s).settings.display).toBe('numbers');
  });

  it('falls back to defaults on garbage, wrong version or throwing storage', () => {
    expect(load({ getItem: () => '{not json' })).toEqual(defaults());
    expect(load({ getItem: () => JSON.stringify({ v: 2 }) })).toEqual(defaults());
    expect(load({ getItem: () => { throw new Error('blocked'); } })).toEqual(defaults());
    expect(load(undefined)).toEqual(defaults());
  });

  it('fills settings added later', () => {
    const s = memory();
    s.setItem('speed-mathe:v1', JSON.stringify({ v: 1, settings: { mode: 'plus' } }));
    expect(load(s).settings).toEqual({ ...defaults().settings, mode: 'plus' });
  });

  it('migrates the old single record into history', () => {
    const s = memory();
    const rec = { totalMs: 5000, inTime: 20, count: 20, date: '2026-10-10' };
    s.setItem('speed-mathe:v1', JSON.stringify({ v: 1, records: { k: rec } }));
    expect(load(s).history).toEqual({ k: [rec] });
  });

  it('save swallows storage errors', () => {
    expect(() => save(defaults(), { setItem: () => { throw new Error('quota'); } })).not.toThrow();
  });
});
