export type Mode = 'love' | 'plus' | 'minus' | 'mixed';
export type Rng = () => number;

export interface Fact {
  /** Stable id used for stats, e.g. "8+7", "13-6", "7+?=10". */
  key: string;
  /** Display tokens; '?' marks where the answer goes. */
  tokens: string[];
  answer: number;
  /** Units cross a ten (8+7, 13-6) – the hard facts the Regelbuch wants mixed in on purpose. */
  crossing: boolean;
  /** Relative pick weight inside its pool (trivial facts are rarer). */
  weight: number;
}

export interface ModeInfo {
  label: string;
  range: number;
  boosterRange: number | null;
}

export const MODES: Record<Mode, ModeInfo> = {
  love: { label: 'Verliebte Zahlen', range: 10, boosterRange: 20 },
  plus: { label: '+ Plus rechnen', range: 20, boosterRange: null },
  minus: { label: '− Minus rechnen', range: 20, boosterRange: null },
  mixed: { label: 'Gemischt', range: 20, boosterRange: 30 },
};

export const CROSSING_SHARE = 0.4;
export const FOCUS_SHARE = 0.5;
const RECENT = 3;
const RARE = 0.3;

function plusFact(a: number, b: number): Fact {
  const crossing = b < 10 && (a % 10) + b > 10;
  const trivial = a === 1 || b === 1;
  const ten = a === 10 || b === 10;
  return {
    key: `${a}+${b}`,
    tokens: [String(a), '+', String(b), '=', '?'],
    answer: a + b,
    crossing,
    weight: trivial ? RARE : ten ? 0.5 : 1,
  };
}

function minusFact(a: number, b: number): Fact {
  const crossing = a > 10 && b < 10 && a % 10 < b;
  const trivial = b === 1 || b === a;
  const ten = b === 10 || a - b === 10;
  return {
    key: `${a}-${b}`,
    tokens: [String(a), '−', String(b), '=', '?'],
    answer: a - b,
    crossing,
    weight: trivial ? RARE : ten ? 0.5 : 1,
  };
}

/** Both forms on purpose: "7 + ? = 10" and "? + 7 = 10". */
function loveFact(a: number, total: number, blankFirst: boolean): Fact {
  return {
    key: blankFirst ? `?+${a}=${total}` : `${a}+?=${total}`,
    tokens: blankFirst ? ['?', '+', String(a), '=', String(total)] : [String(a), '+', '?', '=', String(total)],
    answer: total - a,
    crossing: false,
    weight: 1,
  };
}

const plusPool = (max: number) => {
  const out: Fact[] = [];
  for (let a = 1; a < max; a++) for (let b = 1; a + b <= max; b++) out.push(plusFact(a, b));
  return out;
};

const minusPool = (max: number) => {
  const out: Fact[] = [];
  for (let a = 2; a <= max; a++) for (let b = 1; b <= a; b++) out.push(minusFact(a, b));
  return out;
};

const lovePool = (total: number) => {
  const out: Fact[] = [];
  for (let a = 1; a < total; a++) out.push(loveFact(a, total, false), loveFact(a, total, true));
  return out;
};

/** All facts a round of this mode may contain. */
export function factPool(mode: Mode, booster: boolean): Fact[] {
  switch (mode) {
    case 'love':
      // Booster adds the partners of 20 on top of the partners of 10.
      return booster ? [...lovePool(10), ...lovePool(20)] : lovePool(10);
    case 'plus':
      return plusPool(20);
    case 'minus':
      return minusPool(20);
    case 'mixed': {
      const max = booster ? 30 : 20;
      return [...plusPool(max), ...minusPool(max)];
    }
  }
}

function weightedPick(facts: Fact[], rng: Rng): Fact | undefined {
  const total = facts.reduce((s, f) => s + f.weight, 0);
  let r = rng() * total;
  for (const f of facts) {
    r -= f.weight;
    if (r < 0) return f;
  }
  return facts[facts.length - 1];
}

export interface GenerateOptions {
  mode: Mode;
  booster: boolean;
  count: number;
  rng?: Rng;
  /** Fact keys to show more often (Knackpunkte practice). */
  focus?: string[];
}

export function generateTasks({ mode, booster, count, rng = Math.random, focus = [] }: GenerateOptions): Fact[] {
  const pool = factPool(mode, booster);
  const plusSide = pool.filter((f) => f.tokens[1] === '+' && !f.key.includes('?'));
  const minusSide = pool.filter((f) => f.tokens[1] === '−');
  const focusSet = new Set(focus);
  const focusFacts = pool.filter((f) => focusSet.has(f.key));
  const tasks: Fact[] = [];

  const candidates = (): Fact[] => {
    if (focusFacts.length && rng() < FOCUS_SHARE) return focusFacts;
    // Mixed mode picks the operation first so plus and minus stay balanced
    // even though the two pools differ in size.
    const side = mode === 'mixed' ? (rng() < 0.5 ? plusSide : minusSide) : pool;
    const crossing = side.filter((f) => f.crossing);
    if (crossing.length && rng() < CROSSING_SHARE) return crossing;
    const rest = side.filter((f) => !f.crossing);
    return rest.length ? rest : side;
  };

  while (tasks.length < count) {
    const recent = tasks.slice(-RECENT);
    const last = tasks[tasks.length - 1];
    let pick: Fact | undefined;
    for (let attempt = 0; attempt < 30; attempt++) {
      const fresh = candidates().filter(
        (f) => !recent.some((r) => r.key === f.key) && f.answer !== last?.answer,
      );
      pick = weightedPick(fresh, rng);
      if (pick) break;
    }
    // Tiny pools (e.g. a single focus fact) can exhaust the filter; fall back to anything new.
    pick ??= weightedPick(pool.filter((f) => f.key !== last?.key), rng)!;
    tasks.push(pick);
  }
  return tasks;
}

/** "8 + 7 = 15" – the fact with its answer filled in. */
export function solvedText(fact: Fact): string {
  return fact.tokens.map((t) => (t === '?' ? String(fact.answer) : t)).join(' ');
}
