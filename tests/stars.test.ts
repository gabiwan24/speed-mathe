import { describe, expect, it } from 'vitest';
import { starsFor, starsText } from '../src/logic/stars';

const round = (over: Partial<Parameters<typeof starsFor>[0]> = {}) =>
  starsFor({ practice: false, record: false, wrong: 1, tooSlow: 0, ...over });

describe('starsFor', () => {
  it('every finished unit gives one star', () => {
    expect(round().total).toBe(1);
    expect(round().parts).toEqual([{ label: 'Einheit geschafft', stars: 1 }]);
  });

  it('a new highscore adds two stars', () => {
    expect(round({ record: true }).total).toBe(3);
  });

  it('a flawless unit adds one star', () => {
    expect(round({ wrong: 0 }).total).toBe(2);
  });

  it('record and flawless together: 1 + 2 + 1', () => {
    const r = round({ record: true, wrong: 0 });
    expect(r.total).toBe(4);
    expect(r.parts.map((p) => p.stars)).toEqual([1, 2, 1]);
  });

  it('a practice unit gets the unit and flawless stars, never the record bonus', () => {
    expect(round({ practice: true, wrong: 0 }).total).toBe(2);
    expect(round({ practice: true }).total).toBe(1);
    expect(round({ practice: true, record: true, wrong: 0 }).total).toBe(2);
  });

  it('a timeout breaks flawless, even without a wrong answer', () => {
    expect(round({ wrong: 0, tooSlow: 1 }).total).toBe(1);
  });

  it('total always equals the sum of the parts', () => {
    for (const practice of [false, true])
      for (const record of [false, true])
        for (const wrong of [0, 3])
          for (const tooSlow of [0, 2]) {
            const r = starsFor({ practice, record, wrong, tooSlow });
            expect(r.total).toBe(r.parts.reduce((n, p) => n + p.stars, 0));
          }
  });
});

describe('starsText', () => {
  it('singular and plural', () => {
    expect(starsText(0)).toBe('0 Sterne');
    expect(starsText(1)).toBe('1 Stern');
    expect(starsText(12)).toBe('12 Sterne');
  });
});
