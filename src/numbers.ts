export const MAX_NUMBER = 30;

const UNITS: Record<string, number> = {
  null: 0, eins: 1, ein: 1, eine: 1, zwei: 2, zwo: 2, drei: 3, vier: 4, fuenf: 5,
  sechs: 6, sieben: 7, acht: 8, neun: 9,
};

const WORDS: Record<string, number> = {
  ...UNITS,
  zehn: 10, elf: 11, zwoelf: 12, dreizehn: 13, vierzehn: 14, fuenfzehn: 15,
  sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19, zwanzig: 20, dreissig: 30,
};
for (const [word, n] of Object.entries(UNITS)) {
  if (n >= 1) WORDS[`${word}undzwanzig`] = 20 + n;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const inRange = (n: number) => (n >= 0 && n <= MAX_NUMBER ? n : null);

/** Number 0–30 from a speech transcript ("12", "zwölf", "ein und zwanzig"), else null. */
export function parseGermanNumber(transcript: string): number | null {
  const text = normalize(transcript);
  const digits = text.match(/\d+/);
  if (digits) return inRange(Number(digits[0]));

  // The recognizer sometimes splits compounds ("ein und zwanzig"), so try the joined form first.
  const joined = text.replace(/ /g, '');
  if (joined in WORDS) return WORDS[joined];
  for (const token of text.split(' ')) {
    if (token in WORDS) return WORDS[token];
  }
  return null;
}

/**
 * first = what the recognizer ranked highest; best = the expected answer if any alternative
 * contains it (lenient scoring for near-homophones like "ach"/"acht"). Logged side by side so the
 * speech test shows how often leniency changes the outcome.
 */
export function pickAnswer(alternatives: string[], expected: number) {
  const parsed = alternatives.map(parseGermanNumber).filter((n): n is number => n !== null);
  const first = parsed[0] ?? null;
  const best = parsed.includes(expected) ? expected : first;
  return { first, best };
}
