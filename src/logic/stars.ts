/** Stars for a finished round (owner rules): 1 for every finished unit, +2 for a new highscore, +1 for a flawless unit. */
export const STAR_FINISHED = 1;
export const STAR_RECORD = 2;
export const STAR_FLAWLESS = 1;

export interface StarInput {
  /** Knackpunkte practice round; it can never set a record. */
  practice: boolean;
  /** The round beat the record of its setting (the first round of a setting counts). */
  record: boolean;
  /** Wrong answers during the round. */
  wrong: number;
  /** Tasks that ran out of time ("zu langsam"). */
  tooSlow: number;
}

export interface StarPart {
  label: string;
  stars: number;
}

export interface StarResult {
  total: number;
  parts: StarPart[];
}

export function starsFor({ practice, record, wrong, tooSlow }: StarInput): StarResult {
  const parts: StarPart[] = [{ label: 'Einheit geschafft', stars: STAR_FINISHED }];
  if (record && !practice) parts.push({ label: 'Neuer Highscore', stars: STAR_RECORD });
  // A timeout is an unanswered task, so it breaks "flawless" just like a wrong answer does.
  if (wrong === 0 && tooSlow === 0) parts.push({ label: 'Fehlerfrei', stars: STAR_FLAWLESS });
  return { total: parts.reduce((n, p) => n + p.stars, 0), parts };
}

export const starsText = (n: number) => `${n} ${n === 1 ? 'Stern' : 'Sterne'}`;
