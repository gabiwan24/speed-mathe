import { describe, expect, it } from 'vitest';
import { parseGermanNumber, pickAnswer } from '../src/numbers';

describe('parseGermanNumber', () => {
  it.each([
    ['12', 12],
    ['12.', 12],
    ['die 7', 7],
    ['null', 0],
    ['eins', 1],
    ['ein', 1],
    ['zwo', 2],
    ['Fünf', 5],
    ['fuenf', 5],
    ['zwölf', 12],
    ['siebzehn', 17],
    ['sechzehn', 16],
    ['zwanzig', 20],
    ['einundzwanzig', 21],
    ['ein und zwanzig', 21],
    ['achtundzwanzig', 28],
    ['dreißig', 30],
    ['dreissig', 30],
    ['ähm acht', 8],
  ])('%s → %i', (input, expected) => {
    expect(parseGermanNumber(input)).toBe(expected);
  });

  it.each(['', 'hallo', 'hundert', '45'])('%s → null (out of range or no number)', (input) => {
    expect(parseGermanNumber(input)).toBeNull();
  });
});

describe('pickAnswer', () => {
  it('takes the first alternative that is a number', () => {
    expect(pickAnswer(['hallo', 'acht', 'sieben'], 7)).toEqual({ first: 8, best: 7 });
  });

  it('best prefers the expected answer if any alternative has it', () => {
    expect(pickAnswer(['ach', 'acht'], 8)).toEqual({ first: 8, best: 8 });
  });

  it('returns nulls when nothing parses', () => {
    expect(pickAnswer(['hallo'], 3)).toEqual({ first: null, best: null });
  });
});
