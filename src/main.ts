import './styles/tokens.css';
import './styles/app.css';
import './styles/game.css';
import { formatClock, formatMs, formatTime } from './logic/format';
import { layoutScale } from './logic/scale';
import { addToHistory, improvement, recordKey, type BestRound, type Improvement, type RoundConfig } from './logic/records';
import { Round, TASK_LIMIT_MS, type TaskResult } from './logic/round';
import { addResults, focusFacts, roundKnackpunkte } from './logic/stats';
import { load, save } from './logic/storage';
import { factPool, generateTasks, MODES, solvedText, type Mode } from './logic/tasks';

const FEEDBACK_OK_MS = 260;
const FEEDBACK_WRONG_MS = 420;
const FEEDBACK_SLOW_MS = 1500;
const COUNTDOWN_STEP_MS = 700;
const MAX_DIGITS = 2;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const data = load();

// ---------- views ----------

type ViewId = 'home' | 'countdown' | 'play' | 'result' | 'scores';
let currentView: ViewId | null = null;

function show(id: ViewId) {
  if (currentView) $(currentView).hidden = true;
  const el = $(id);
  el.hidden = false;
  // Restart the glide-in animation even when re-entering the same view.
  el.classList.remove('enter');
  void el.offsetWidth;
  el.classList.add('enter');
  currentView = id;
  window.scrollTo(0, 0);
}

// ---------- home ----------

const rangeOf = (mode: Mode, booster: boolean) => {
  const info = MODES[mode];
  return booster && info.boosterRange ? info.boosterRange : info.range;
};

function renderHome() {
  const s = data.settings;
  const info = MODES[s.mode];
  const boosterOn = s.booster && info.boosterRange !== null;

  document.querySelectorAll<HTMLButtonElement>('.mode').forEach((btn) => {
    const mode = btn.dataset.mode as Mode;
    btn.setAttribute('aria-checked', String(mode === s.mode));
  });
  document.querySelectorAll<HTMLElement>('[data-range]').forEach((el) => {
    const mode = el.dataset.range as Mode;
    el.textContent = `bis ${rangeOf(mode, mode === s.mode && boosterOn)}`;
  });

  // Modes without a booster simply do not show the switch.
  $('booster-row').hidden = info.boosterRange === null;
  $('booster-range').textContent = info.boosterRange ? `bis ${info.boosterRange}` : '';
  $('booster').setAttribute('aria-checked', String(boosterOn));

  document.querySelectorAll<HTMLElement>('[data-setting]').forEach((group) => {
    const key = group.dataset.setting as 'length' | 'variant';
    group.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.value === String(s[key])));
    });
  });

  const cfg = effectiveConfig();
  const best = data.history[recordKey(cfg)]?.[0];
  $('record-line').innerHTML = best
    ? `Rekord: <strong>${cfg.variant === 'limit' ? `${best.inTime}/${best.count} rechtzeitig · ` : ''}${formatMs(best.totalMs)}</strong>`
    : 'Noch kein Rekord – leg los!';

  const focus = currentFocus(cfg);
  const practice = $<HTMLButtonElement>('practice-home');
  practice.hidden = focus.length === 0;
  practice.textContent = `Knackpunkte üben (${focus.length})`;
}

/** Booster is stored per user choice but only applies to modes that have one. */
const withBooster = (c: RoundConfig): RoundConfig => ({ ...c, booster: c.booster && MODES[c.mode].boosterRange !== null });
const effectiveConfig = () => withBooster(data.settings);

function currentFocus(cfg: RoundConfig): string[] {
  return focusFacts(data.stats, factPool(cfg.mode, cfg.booster).map((f) => f.key));
}

function updateSettings(patch: Partial<RoundConfig>) {
  data.settings = { ...data.settings, ...patch };
  save(data);
  renderHome();
}

document.querySelectorAll<HTMLButtonElement>('.mode').forEach((btn) => {
  btn.addEventListener('click', () => updateSettings({ mode: btn.dataset.mode as Mode }));
});
$('booster').addEventListener('click', () => updateSettings({ booster: !effectiveConfig().booster }));
document.querySelectorAll<HTMLElement>('[data-setting]').forEach((group) => {
  group.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
    b.addEventListener('click', () => {
      const v = b.dataset.value!;
      updateSettings(group.dataset.setting === 'length' ? { length: Number(v) as 20 | 30 } : { variant: v as RoundConfig['variant'] });
    });
  });
});
$('go').addEventListener('click', () => startRound(false));
$('practice-home').addEventListener('click', () => startRound(true));

// ---------- round ----------

interface Session {
  cfg: RoundConfig;
  practice: boolean;
  round: Round;
  input: string;
  locked: boolean;
  /** An overlay (pause, quit confirm) is open; the next task must not start its timer. */
  held: boolean;
  pendingBegin: boolean;
  frame: number;
}

let session: Session | null = null;

function startRound(practice: boolean, focusOverride?: string[]) {
  const cfg = effectiveConfig();
  const focus = practice ? (focusOverride ?? currentFocus(cfg)) : [];
  const tasks = generateTasks({ mode: cfg.mode, booster: cfg.booster, count: cfg.length, focus });
  session = { cfg, practice, round: new Round(tasks, cfg.variant), input: '', locked: true, held: false, pendingBegin: false, frame: 0 };

  $('practice-tag').hidden = !practice;
  $('timebar-track').hidden = cfg.variant !== 'limit';
  // Practice shows no running time at all; only the 10-s bar where the variant needs it.
  $('clock').hidden = cfg.variant !== 'clock' || practice;
  const s = session;
  runCountdown(() => {
    if (session !== s) return;
    show('play');
    nextTask();
    loop();
    if (document.hidden && pauseRound()) $('pause').hidden = false;
  });
}

function runCountdown(done: () => void) {
  show('countdown');
  const num = $('countdown-num');
  const steps = ['3', '2', '1', 'Los!'];
  steps.forEach((label, i) => {
    setTimeout(() => {
      num.textContent = label;
      num.classList.remove('pop');
      void num.offsetWidth;
      num.classList.add('pop');
    }, i * COUNTDOWN_STEP_MS);
  });
  setTimeout(done, steps.length * COUNTDOWN_STEP_MS);
}

function renderTask() {
  const s = session!;
  const fact = s.round.current!;
  const task = $('task');
  task.innerHTML = fact.tokens
    .map((t) => (t === '?' ? '<span class="slot" id="slot"></span>' : `<span class="tok">${t}</span>`))
    .join('');
  task.classList.remove('enter');
  void task.offsetWidth;
  task.classList.add('enter');
  renderInput();

  const n = s.round.index + 1;
  $('progress').textContent = `${n} / ${s.round.tasks.length}`;
  $('progress-fill').style.transform = `scaleX(${s.round.index / s.round.tasks.length})`;
  if (s.cfg.variant === 'limit') {
    const fill = $('timebar-fill');
    fill.classList.remove('low');
    fill.classList.add('refill');
    fill.style.transform = 'scaleX(1)';
    later(s, () => fill.classList.remove('refill'), 250);
  }
}

function renderInput() {
  const slot = document.getElementById('slot');
  if (slot) slot.textContent = session!.input || '?';
  slot?.classList.toggle('empty', !session!.input);
  $<HTMLButtonElement>('keypad').querySelector<HTMLButtonElement>('.key-ok')!.disabled = !session!.input;
}

/** setTimeout that is dropped if the round was quit or replaced in the meantime. */
function later(s: Session, fn: () => void, ms: number) {
  setTimeout(() => {
    if (session === s) fn();
  }, ms);
}

function nextTask() {
  const s = session!;
  if (s.round.done) return finishRound();
  s.input = '';
  s.locked = false;
  setFeedback('');
  renderTask();
  if (s.held) s.pendingBegin = true;
  else s.round.begin(performance.now());
}

function setFeedback(text: string, kind: '' | 'ok' | 'bad' | 'slow' = '') {
  const fb = $('feedback');
  fb.textContent = text || ' ';
  fb.className = `feedback ${kind}`;
}

function press(key: string) {
  const s = session;
  if (!s || s.locked || s.held || currentView !== 'play') return;
  if (key === 'back') {
    s.input = s.input.slice(0, -1);
  } else if (key === 'ok') {
    if (s.input) submit();
    return;
  } else if (s.input.length < MAX_DIGITS) {
    s.input = s.input === '0' ? key : s.input + key;
  }
  renderInput();
}

function submit() {
  const s = session!;
  const outcome = s.round.answer(Number(s.input), performance.now());
  const slot = $('slot');
  if (outcome === 'correct') {
    s.locked = true;
    slot.classList.add('ok');
    later(s, nextTask, FEEDBACK_OK_MS);
  } else if (outcome === 'wrong') {
    s.locked = true;
    slot.classList.remove('bad');
    void slot.offsetWidth;
    slot.classList.add('bad');
    setFeedback('Nochmal!', 'bad');
    // The clock keeps running; the child just types again.
    later(s, () => {
      s.input = '';
      s.locked = false;
      slot.classList.remove('bad');
      renderInput();
    }, FEEDBACK_WRONG_MS);
  }
}

function onTimeout(result: TaskResult) {
  const s = session!;
  s.locked = true;
  s.input = String(result.fact.answer);
  renderInput();
  $('slot').classList.add('slow');
  setFeedback('Zu langsam – weiter geht’s', 'slow');
  $('timebar-fill').style.transform = 'scaleX(0)';
  later(s, nextTask, FEEDBACK_SLOW_MS);
}

function loop() {
  const s = session;
  if (!s || currentView !== 'play') return;
  const now = performance.now();
  if (s.cfg.variant === 'limit') {
    if (s.round.tick(now) === 'timeout') onTimeout(s.round.results[s.round.results.length - 1]);
    // Only a running task moves the bar; between tasks it keeps its last state.
    if (s.round.active) {
      const left = Math.max(0, 1 - s.round.elapsed(now) / TASK_LIMIT_MS);
      const fill = $('timebar-fill');
      fill.style.transform = `scaleX(${left})`;
      fill.classList.toggle('low', left < 0.3);
    }
  } else if (!s.practice) {
    $('clock').textContent = formatMs(s.round.totalElapsed(now));
  }
  s.frame = requestAnimationFrame(loop);
}

function stopLoop() {
  if (session) cancelAnimationFrame(session.frame);
}

// ---------- pause / quit ----------

function pauseRound() {
  if (!session || currentView !== 'play' || session.held) return false;
  session.held = true;
  session.round.pause(performance.now());
  return true;
}

function resumeRound() {
  const s = session;
  if (!s) return;
  s.held = false;
  const now = performance.now();
  if (s.pendingBegin) {
    s.pendingBegin = false;
    s.round.begin(now);
  } else {
    s.round.resume(now);
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && $('confirm').hidden && pauseRound()) $('pause').hidden = false;
});
$('resume').addEventListener('click', () => {
  $('pause').hidden = true;
  resumeRound();
});

$('quit').addEventListener('click', () => {
  if (pauseRound()) $('confirm').hidden = false;
});
$('confirm-no').addEventListener('click', () => {
  $('confirm').hidden = true;
  resumeRound();
});
$('confirm-yes').addEventListener('click', () => {
  $('confirm').hidden = true;
  stopLoop();
  session = null;
  renderHome();
  show('home');
});

// ---------- result ----------

let lastFocus: string[] = [];

function finishRound() {
  const s = session!;
  stopLoop();
  const summary = s.round.summary();
  data.lastCfg = s.cfg;
  data.stats = addResults(data.stats, s.round.results);

  let imp: Improvement | null = null;
  let rank: number | null = null;
  if (!s.practice) {
    const key = recordKey(s.cfg);
    const list = data.history[key] ?? [];
    imp = improvement(s.cfg.variant, summary, list[0]);
    const entry: BestRound = { totalMs: summary.totalMs, inTime: summary.inTime, count: summary.count, date: new Date().toISOString() };
    const added = addToHistory(list, entry, s.cfg.variant);
    data.history[key] = added.list;
    rank = added.rank;
    data.last[key] = entry;
  }
  save(data);

  const range = rangeOf(s.cfg.mode, s.cfg.booster);
  $('result-mode').textContent =
    `${MODES[s.cfg.mode].label} bis ${range} · ${summary.count} Aufgaben · ${s.cfg.variant === 'limit' ? '10 Sekunden pro Aufgabe' : 'Stoppuhr'}` +
    (s.practice ? ' · Übungsrunde, zählt nicht für den Rekord' : '');
  $('result-title').textContent = s.practice ? 'Übung geschafft!' : 'Geschafft!';

  const badge = $('record-badge');
  badge.hidden = !imp;
  if (imp) badge.textContent = improvementText(imp);
  // A record already has its badge; other top-20 rounds get their place on the Highscore page.
  const rankLine = $('result-rank');
  rankLine.hidden = !rank || !!imp;
  if (rank) rankLine.textContent = `Platz ${rank} in deinen Highscores`;

  // Times show the written-out unit small under the big number so the tiles do not wrap.
  const time = (ms: number) => {
    const t = formatTime(ms);
    return `${t.value}<span class="unit">${t.unit}</span>`;
  };
  const rows: [string, string][] = [['Zeit', time(summary.totalMs)]];
  if (s.cfg.variant === 'limit') rows.push(['Rechtzeitig', `${summary.inTime} / ${summary.count}`]);
  rows.push(['Fehler', String(summary.wrong)], ['Pro Aufgabe', time(summary.totalMs / summary.count)]);
  $('result-stats').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

  const knack = roundKnackpunkte(s.round.results);
  $('knack-list').innerHTML = knack.length
    ? knack.map((r) => `<li><span class="knack-fact">${solvedText(r.fact)}</span><span class="knack-why">${knackReason(r)}</span></li>`).join('')
    : '<li class="knack-none">Keine – alles flott gerechnet!</li>';

  // The Knackpunkte the child just saw always get practised, plus what stays hard across rounds.
  lastFocus = [...new Set([...knack.map((r) => r.fact.key), ...currentFocus(s.cfg)])];
  const practice = $<HTMLButtonElement>('practice');
  practice.hidden = lastFocus.length === 0;
  practice.textContent = `Knackpunkte üben (${lastFocus.length})`;

  show('result');
  if (imp) {
    badge.classList.remove('flash');
    void badge.offsetWidth;
    badge.classList.add('flash');
  }
}

function improvementText(imp: Improvement): string {
  switch (imp.kind) {
    case 'first':
      return 'Erster Rekord!';
    case 'inTime':
      return `Neuer Rekord! ${imp.more} mehr rechtzeitig`;
    case 'faster':
      return `Neuer Rekord! ${formatMs(imp.ms)} schneller`;
  }
}

function knackReason(r: TaskResult): string {
  if (r.tooSlow) return 'zu langsam';
  const time = formatMs(r.ms);
  return r.wrong ? `${r.wrong}× falsch · ${time}` : time;
}

$('again').addEventListener('click', () => startRound(session?.practice ?? false, session?.practice ? lastFocus : undefined));
$('practice').addEventListener('click', () => startRound(true, lastFocus));
$('menu').addEventListener('click', () => {
  session = null;
  renderHome();
  show('home');
});

// ---------- highscores ----------

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
let scoreFilter: RoundConfig = { ...data.settings };

/** Written out, no abbreviations: "10. Oktober 2026, 17:05 Uhr". Early entries only have a day. */
function formatDate(iso: string): string {
  if (!iso.includes('T')) {
    const [y, m, d] = iso.split('-').map(Number);
    return `${d}. ${MONTHS[m - 1]} ${y}`;
  }
  const t = new Date(iso);
  const hh = String(t.getHours()).padStart(2, '0');
  const mm = String(t.getMinutes()).padStart(2, '0');
  return `${t.getDate()}. ${MONTHS[t.getMonth()]} ${t.getFullYear()}, ${hh}:${mm} Uhr`;
}

const modeIds = Object.keys(MODES) as Mode[];
$('scores-modes').innerHTML = modeIds
  .map(
    (m) =>
      `<button type="button" class="chip" role="radio" data-score-mode="${m}">${MODES[m].label}</button>`,
  )
  .join('');

/** Only combinations that already have rounds; unplayed ones are not shown at all (owner rule). */
const playedOptions = (mode: Mode) => optionsFor(mode).filter((c) => data.history[recordKey(c)]?.length);

function renderScores() {
  let f = withBooster(scoreFilter);
  const options = playedOptions(f.mode);
  // Switching to a mode whose current combination was never played jumps to the one played last.
  if (options.length && !options.some((c) => recordKey(c) === recordKey(f))) {
    const lastPlayed = (c: RoundConfig) => data.last[recordKey(c)]?.date ?? '';
    f = scoreFilter = [...options].sort((a, b) => lastPlayed(b).localeCompare(lastPlayed(a)))[0];
  }

  document.querySelectorAll<HTMLButtonElement>('[data-score-mode]').forEach((b) => {
    b.setAttribute('aria-checked', String(b.dataset.scoreMode === f.mode));
  });
  $('scores-options').hidden = !options.length;
  $('scores-options-label').textContent = optionLabel(f);
  $('scores-options-menu').innerHTML = options
    .map((c, i) => {
      const selected = recordKey(c) === recordKey(f);
      return `<li><button type="button" class="dropdown-item" role="option" aria-selected="${selected}" data-option="${i}">${optionLabel(c)}</button></li>`;
    })
    .join('');

  const box = $('scale');
  if (!options.length) {
    box.innerHTML = '<p class="scale-empty">Noch keine Runde in diesem Modus.</p>';
    return;
  }
  const key = recordKey(f);
  box.innerHTML = scaleSvg(data.history[key], data.last[key], f.variant === 'limit');
}

// Scale geometry in SVG units (1:1 with CSS px; the SVG keeps a fixed width).
const SVG_W = 340;
const BAR_X = 16;
const BAR_W = 48;
const KNEE_X = BAR_X + BAR_W + 18;
const TICK_END = BAR_X + BAR_W + 44;
const NUM_X = TICK_END + 12;
const TIME_X = NUM_X + 40;

/** Vertical scale as in the owner's mockup: height = time, a line per place, coloured bands between. */
function scaleSvg(list: BestRound[], last: BestRound | undefined, limit: boolean): string {
  const lastInList = !!last && list.some((r) => r.date === last.date);
  const rounds = list.map((r, i) => ({ r, ms: r.totalMs, rank: i + 1 as number | null, last: lastInList && r.date === last!.date }));
  if (last && !lastInList) rounds.push({ r: last, ms: last.totalMs, rank: null, last: true });
  const { height, markers } = layoutScale(rounds);

  const parts: string[] = [];
  // Empty top = room to improve; below each place a band in the next colour, the last band runs to the bottom.
  parts.push(`<rect x="${BAR_X}" y="0" width="${BAR_W}" height="${height}" class="band-empty"/>`);
  const ranked = markers.filter((m) => m.rank !== null);
  ranked.forEach((m, k) => {
    const end = ranked[k + 1]?.y ?? height;
    parts.push(`<rect x="${BAR_X}" y="${m.y.toFixed(1)}" width="${BAR_W}" height="${(end - m.y).toFixed(1)}" class="band band-${(k % 4) + 1}"/>`);
  });

  markers.forEach((m, i) => {
    const r = rounds[i].r;
    const y = m.y.toFixed(1);
    const ly = m.labelY.toFixed(1);
    const bent = m.labelY - m.y > 0.5;
    const d = bent ? `M${BAR_X} ${y}H${KNEE_X}L${KNEE_X + 14} ${ly}H${TICK_END}` : `M${BAR_X} ${y}H${TICK_END}`;
    const cls = m.rank === 1 ? 'tick tick-best' : m.rank === null ? 'tick tick-outside' : 'tick';
    parts.push(`<path d="${d}" class="${cls}"/>`);
    if (m.rank !== null) parts.push(`<text x="${NUM_X}" y="${ly}" class="tick-rank">${m.rank}</text>`);
    const extra = limit ? `<tspan class="tick-extra"> · ${r.inTime} von ${r.count}</tspan>` : '';
    parts.push(`<text x="${TIME_X}" y="${ly}" class="tick-time">${formatClock(r.totalMs)}${extra}</text>`);
    if (m.last) parts.push(`<text x="${NUM_X}" y="${(m.labelY + 26).toFixed(1)}" class="tick-last">Letzter Versuch</text>`);
  });

  return `<svg class="scale-svg" width="${SVG_W}" height="${height.toFixed(0)}" viewBox="0 0 ${SVG_W} ${height.toFixed(0)}" role="img" aria-label="Highscore-Skala">${parts.join('')}</svg>`;
}

function updateScoreFilter(patch: Partial<RoundConfig>) {
  scoreFilter = { ...scoreFilter, ...patch };
  renderScores();
}

document.querySelectorAll<HTMLButtonElement>('[data-score-mode]').forEach((b) => {
  b.addEventListener('click', () => updateScoreFilter({ mode: b.dataset.scoreMode as Mode }));
});
// ---- options dropdown (length, time variant, booster) ----

const optionLabel = (c: RoundConfig) =>
  [c.booster ? `Booster bis ${MODES[c.mode].boosterRange}` : '', `${c.length} Aufgaben`, c.variant === 'limit' ? '10 Sekunden pro Aufgabe' : 'Stoppuhr']
    .filter(Boolean)
    .join(' · ');

function optionsFor(mode: Mode): RoundConfig[] {
  const boosters = MODES[mode].boosterRange === null ? [false] : [false, true];
  const out: RoundConfig[] = [];
  for (const booster of boosters)
    for (const length of [20, 30] as const)
      for (const variant of ['limit', 'clock'] as const) out.push({ mode, booster, length, variant });
  return out;
}

const dropdown = $('scores-options');
function setDropdown(open: boolean) {
  dropdown.classList.toggle('open', open);
  $('scores-options-btn').setAttribute('aria-expanded', String(open));
}
$('scores-options-btn').addEventListener('click', () => setDropdown(!dropdown.classList.contains('open')));
$('scores-options-menu').addEventListener('click', (e) => {
  const item = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-option]');
  if (!item) return;
  const c = playedOptions(withBooster(scoreFilter).mode)[Number(item.dataset.option)];
  setDropdown(false);
  updateScoreFilter(c);
});
document.addEventListener('click', (e) => {
  if (!dropdown.contains(e.target as Node)) setDropdown(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setDropdown(false);
});

/** Always opens on the setting of the last played round, so nothing has to be chosen first. */
function openScores() {
  scoreFilter = { ...(data.lastCfg ?? data.settings) };
  setDropdown(false);
  renderScores();
  show('scores');
}
$('scores-open').addEventListener('click', openScores);
$('result-scores').addEventListener('click', openScores);
$('scores-back').addEventListener('click', () => {
  renderHome();
  show('home');
});

// ---------- input ----------

$('keypad').addEventListener('pointerdown', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-key]');
  if (!btn || btn.disabled) return;
  // pointerdown instead of click: no 300 ms tap delay, no lost taps when fingers are fast.
  e.preventDefault();
  btn.classList.remove('tap');
  void btn.offsetWidth;
  btn.classList.add('tap');
  press(btn.dataset.key!);
});

document.addEventListener('keydown', (e) => {
  if (currentView !== 'play') return;
  if (/^[0-9]$/.test(e.key)) press(e.key);
  else if (e.key === 'Backspace') press('back');
  else if (e.key === 'Enter') press('ok');
  else return;
  e.preventDefault();
});

renderHome();
show('home');
