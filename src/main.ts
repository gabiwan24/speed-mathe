import './styles/tokens.css';
import './styles/app.css';
import './styles/game.css';
import { formatMs, formatTime } from './logic/format';
import { addSlidingMarker, syncMarkers } from './markers';
import { hideAnimated, showAnimated } from './motion.js';
import { ballPlan, ballShades, type BallGroup } from './logic/balls';
import { layoutTrack, spreadLabels } from './logic/scale';
import { starsFor, starsText } from './logic/stars';
import { addToHistory, improvement, recordKey, type BestRound, type Improvement, type RoundConfig } from './logic/records';
import { Round, TASK_LIMIT_MS, type TaskResult } from './logic/round';
import { addResults, focusFacts, roundKnackpunkte } from './logic/stats';
import { load, save } from './logic/storage';
import { factPool, generateTasks, MODES, solvedText, type Fact, type Mode } from './logic/tasks';

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
  // Markers of a view that was hidden are placed directly (no slide from a stale position).
  syncMarkers(false);
}

// ---------- home ----------

const rangeOf = (mode: Mode, booster: boolean) => {
  const info = MODES[mode];
  return booster && info.boosterRange ? info.boosterRange : info.range;
};

/**
 * Show or hide an element of the home screen. While the home screen is on view the change is animated
 * (design-system rule: nothing snaps – the row fades out and the rest glides up, or the reverse);
 * otherwise (first render, coming back from another screen) it is set directly.
 */
function setShown(el: HTMLElement, shown: boolean) {
  if (currentView !== 'home') {
    el.hidden = !shown;
    return;
  }
  // showAnimated also cancels a fade-out that is still running, so quick toggling stays consistent.
  if (shown) showAnimated(el);
  else void hideAnimated(el);
}

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
  setShown($('booster-row'), info.boosterRange !== null);
  $('booster-range').textContent = info.boosterRange ? `bis ${info.boosterRange}` : '';
  $('booster').setAttribute('aria-checked', String(boosterOn));

  document.querySelectorAll<HTMLElement>('[data-setting]').forEach((group) => {
    const key = group.dataset.setting as 'length' | 'variant' | 'display';
    group.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.value === String(s[key] ?? 'numbers')));
    });
  });

  const cfg = effectiveConfig();
  const best = data.history[recordKey(cfg)]?.[0];
  // Always two lines (label above, value below, value never wraps) so the height never changes and
  // nothing below it jumps when mode or variant change.
  $('record-line').innerHTML = best
    ? `<span class="record-label">Rekord</span><strong>${cfg.variant === 'limit' ? `${best.inTime}/${best.count} rechtzeitig · ` : ''}${formatMs(best.totalMs)}</strong>`
    : '<span class="record-label">Rekord</span><span class="record-none">Noch keiner – leg los!</span>';

  const focus = currentFocus(cfg);
  const practice = $<HTMLButtonElement>('practice-home');
  setShown(practice, focus.length > 0);
  practice.textContent = `Knackpunkte üben (${focus.length})`;
  // The yellow selection fill / frame slides to the newly selected option.
  syncMarkers(currentView === 'home');
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
      const key = group.dataset.setting as 'length' | 'variant' | 'display';
      updateSettings(key === 'length' ? { length: Number(v) as 20 | 30 } : { [key]: v });
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
  renderBalls(fact, s.cfg.display === 'balls');
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

/** Picture of the task: first number red, second blue, rows of ten with alternating bright/deep fives. */
function renderBalls(fact: Fact, on: boolean) {
  const box = $('balls');
  $('task-area').classList.toggle('with-balls', on);
  box.hidden = !on;
  if (!on) return;
  const plan = ballPlan(fact);
  const field = (g: BallGroup) =>
    `<div class="ball-field" data-round>${ballShades(g)
      .map((shade) => `<i class="ball ${shade === 'empty' ? 'empty' : `${g.color} ${shade}`}"></i>`)
      .join('')}</div>`;
  const [first, second] = plan.groups;
  // Row count drives the ball size in CSS so even six rows fit above the keypad on a small phone.
  box.style.setProperty('--rows', String(plan.groups.reduce((n, g) => n + g.slots / 10, 0)));
  box.innerHTML = field(first) + (second ? `<span class="ball-op">${plan.operator}</span>${field(second)}` : '');
  box.classList.remove('enter');
  void box.offsetWidth;
  box.classList.add('enter');
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
    scoreAnim = { key, prev: data.last[key] };
    data.last[key] = entry;
  }
  // Stars: 1 per finished unit, +2 new highscore, +1 flawless (timeouts count as mistakes).
  const earned = starsFor({ practice: s.practice, record: !!imp, wrong: summary.wrong, tooSlow: summary.count - summary.inTime });
  data.stars += earned.total;
  save(data);

  const range = rangeOf(s.cfg.mode, s.cfg.booster);
  $('result-mode').textContent =
    `${MODES[s.cfg.mode].label} bis ${range} · ${summary.count} Aufgaben · ${s.cfg.variant === 'limit' ? '10 Sekunden pro Aufgabe' : 'Stoppuhr'}${s.cfg.display === 'balls' ? ' · Kugeln' : ''}` +
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
  if (s.cfg.variant === 'limit') rows.push(['Rechtzeitig', `${summary.inTime}/${summary.count}`]);
  rows.push(['Fehler', String(summary.wrong)], ['Pro Aufgabe', time(summary.totalMs / summary.count)]);
  const stats = $('result-stats');
  stats.style.setProperty('--cols', String(rows.length));
  stats.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

  $('stars-gain').textContent = `+${earned.total}`;
  $('stars-row').innerHTML = Array.from({ length: earned.total }, (_, i) => starSvg(i)).join('');
  $('stars-why').innerHTML = earned.parts
    .map((p) => `<li><span>${p.label}</span><span class="stars-plus">+${p.stars}</span></li>`)
    .join('');

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

/** Five-point star; fill and edge come from the accent tokens, --i staggers the pop-in. */
const starSvg = (i: number) =>
  `<svg class="star" style="--i:${i}" viewBox="0 0 24 24"><polygon points="12,2 15,9 22,9.3 16.5,14 18.2,21 12,17.3 5.8,21 7.5,14 2,9.3 9,9"/></svg>`;

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
  $('stars-total').innerHTML = `${starSvg(0).replace('class="star"', 'class="star star-sm"')}<span>${starsText(data.stars)}</span>`;
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
  syncMarkers(currentView === 'scores');
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
  // Only the first look at a freshly played setting animates; later filter changes render still.
  const anim = scoreAnim?.key === key ? scoreAnim : null;
  if (anim) scoreAnim = null;
  // Hero (fixed height, so the track never jumps) + track, which gets exactly the height that is left on screen.
  box.innerHTML = '<div class="hs-hero" id="hs-hero"></div><div class="hs-track" id="hs-track"></div>';
  buildTrack(key, data.history[key], data.last[key], f.variant === 'limit', anim);
}

/** Set when a round finishes: the scale then shows the new value appearing and the marker travelling. */
let scoreAnim: { key: string; prev: BestRound | undefined } | null = null;

/** Attempt selected on the track by tap or drag; the hero above it shows its time. Default: last attempt. */
let scoreSel: { key: string; idx: number } | null = null;

const BAR_W = 30;
/** The marker lines of the best and the last attempt stick out left and right of the bar. */
const MARK_PAD = 10;
const LABEL_H = 24;

const STAR_ICON = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M12 2l3 6.9 7.5.7-5.6 5 1.7 7.4L12 18l-6.6 4 1.7-7.4-5.6-5 7.5-.7z" fill="currentColor"/></svg>';

/**
 * Highscore track (owner design): one hero with the selected time, and a bar fitted to the saved times
 * (yellow = fast at the bottom, blue = slow on top). Only the best and the last attempt carry a marker line
 * and a chip, plus the slowest time as a bare value; every other attempt is a plain line you can tap or drag over.
 */
function buildTrack(
  key: string,
  list: BestRound[],
  last: BestRound | undefined,
  limit: boolean,
  anim: { prev: BestRound | undefined } | null,
) {
  const track = $('hs-track');
  const H = Math.floor(track.clientHeight);
  const W = Math.floor(track.clientWidth);
  const lastInList = !!last && list.some((r) => r.date === last.date);
  const rounds = list.map((r, i) => ({ r, ms: r.totalMs, rank: (i + 1) as number | null, last: lastInList && r.date === last!.date }));
  if (last && !lastInList) rounds.push({ r: last, ms: last.totalMs, rank: null, last: true });
  const { ys, ground } = layoutTrack(rounds, H);
  const bestI = 0;
  const lastI = rounds.findIndex((x) => x.last);
  const slowI = ys.indexOf(Math.min(...ys));
  const topRanked = Math.min(...ys.filter((_, i) => rounds[i].rank !== null));

  const bl = Math.round((W - BAR_W) / 2);
  const markLeft = bl - MARK_PAD;
  const timeLeft = bl + BAR_W + MARK_PAD + 6;

  const parts: string[] = [];
  parts.push(`<div class="hs-bar" style="left:${bl}px;width:${BAR_W}px"></div>`);
  const reach = Math.max(1, ground - topRanked);
  let from = ground;
  rounds.forEach((m, i) => {
    if (m.rank === null) return;
    // Yellow at the ground (fast), blue at the top (slow): design-system data scale, interpolated in OKLCH.
    const mid = (from + ys[i]) / 2;
    const p = Math.round((1 - Math.min(1, Math.max(0, (ground - mid) / reach))) * 100);
    parts.push(
      `<div class="hs-band" data-scale style="left:${bl}px;width:${BAR_W}px;top:${ys[i].toFixed(1)}px;height:${(from - ys[i]).toFixed(1)}px;background:color-mix(in oklch, var(--scale-low), var(--accent) ${p}%)"></div>`,
    );
    from = ys[i];
  });
  parts.push(`<div class="hs-bar-edge" style="left:${bl}px;width:${BAR_W}px;top:${topRanked.toFixed(1)}px;height:${reach.toFixed(1)}px"></div>`);

  // Where the last attempt stood before: the previous round's line, or the top if it left the list.
  let fromY: number | null = null;
  if (anim?.prev) {
    const pi = rounds.findIndex((x) => x.r.date === anim.prev!.date);
    fromY = pi >= 0 ? ys[pi] : 0;
  }
  const travels = fromY !== null && lastI >= 0 && Math.abs(fromY - ys[lastI]) > 0.5;
  const travel = (i: number) => (travels && i === lastI ? { cls: ' last-marker travel', style: `--from:${(fromY! - ys[i]).toFixed(1)}px;` } : { cls: '', style: '' });

  rounds.forEach((m, i) => {
    const marked = i === bestI || i === lastI;
    const t = travel(i);
    const left = marked ? markLeft : bl;
    const width = marked ? BAR_W + 2 * MARK_PAD : BAR_W;
    parts.push(
      `<div class="hs-tick${marked ? ' mark' : ''}${m.rank === null ? ' outside' : ''}${t.cls}" style="${t.style}top:${ys[i].toFixed(1)}px;left:${left}px;width:${width}px"></div>`,
    );
  });

  // Labels: best + last carry a chip and their time, the slowest only its time. They are pushed apart
  // so they never overlap; the marker lines keep their exact height.
  const rows: { kind: 'best' | 'last' | 'slow'; i: number }[] = [{ kind: 'best', i: bestI }];
  if (lastI >= 0) rows.push({ kind: 'last', i: lastI });
  if (slowI !== bestI && slowI !== lastI) rows.push({ kind: 'slow', i: slowI });
  const rowY = spreadLabels(rows.map((r) => ys[r.i]), LABEL_H, LABEL_H / 2, H - LABEL_H / 2);
  rows.forEach((row, k) => {
    const y = rowY[k].toFixed(1);
    const isLast = row.kind === 'last';
    const fresh = anim && isLast ? ' is-new' : '';
    if (row.kind !== 'slow') {
      const text = row.kind === 'best' ? `${STAR_ICON}Dein bester Versuch` : 'Dein letzter Versuch';
      const t = isLast ? travel(row.i) : { cls: '', style: '' };
      parts.push(`<div class="hs-chip${t.cls}" style="${t.style}top:${y}px;right:${W - markLeft}px">${text}</div>`);
    }
    parts.push(`<div class="hs-time${row.kind === 'slow' ? '' : ' key'}${fresh}" style="top:${y}px;left:${timeLeft}px">${formatMs(rounds[row.i].ms)}</div>`);
  });
  track.innerHTML = parts.join('');
  $('scale').classList.toggle('has-travel', travels);

  // Hero: the selected attempt (default: the last one, else the record).
  const sel = () => (scoreSel?.key === key && scoreSel.idx < rounds.length ? scoreSel.idx : lastI >= 0 ? lastI : bestI);
  const hero = $('hs-hero');
  const ticks = [...track.querySelectorAll<HTMLElement>('.hs-tick')];
  const paint = (fresh: boolean) => {
    const i = sel();
    const m = rounds[i];
    const isBest = i === bestI;
    const head =
      m.last && isBest
        ? 'Dein letzter Versuch · Rekord'
        : m.last
          ? `Dein letzter Versuch${m.rank ? ` · Platz ${m.rank}` : ''}`
          : isBest
            ? 'Dein bester Versuch'
            : `Platz ${m.rank}`;
    const sub = limit
      ? `${m.r.inTime} von ${m.r.count} richtig`
      : isBest
        ? 'Das ist dein Rekord.'
        : `${formatMs(m.ms - rounds[bestI].ms)} langsamer als der Rekord`;
    hero.innerHTML = `<p class="hs-label">${head}</p><p class="hs-value">${formatMs(m.ms)}</p><p class="hs-sub">${sub}</p>`;
    hero.classList.toggle('is-new', fresh);
    ticks.forEach((e, k) => e.classList.toggle('sel', k === i && !e.classList.contains('mark')));
  };
  paint(!!anim);

  const pick = (ev: PointerEvent) => {
    const py = ev.clientY - track.getBoundingClientRect().top;
    let b = 0;
    ys.forEach((y, i) => {
      if (Math.abs(y - py) < Math.abs(ys[b] - py)) b = i;
    });
    if (sel() === b) return;
    scoreSel = { key, idx: b };
    paint(false);
  };
  let down = false;
  track.onpointerdown = (e) => {
    down = true;
    track.setPointerCapture?.(e.pointerId);
    pick(e);
  };
  track.onpointermove = (e) => {
    if (down || e.pointerType === 'mouse') pick(e);
  };
  track.onpointerup = track.onpointercancel = () => {
    down = false;
  };
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
  [
    c.display === 'balls' ? 'Kugeln' : '',
    c.booster ? `Booster bis ${MODES[c.mode].boosterRange}` : '',
    `${c.length} Aufgaben`,
    c.variant === 'limit' ? '10 Sekunden pro Aufgabe' : 'Stoppuhr',
  ]
    .filter(Boolean)
    .join(' · ');

function optionsFor(mode: Mode): RoundConfig[] {
  const boosters = MODES[mode].boosterRange === null ? [false] : [false, true];
  const out: RoundConfig[] = [];
  for (const display of ['numbers', 'balls'] as const)
    for (const booster of boosters)
      for (const length of [20, 30] as const)
        for (const variant of ['limit', 'clock'] as const) out.push({ mode, booster, length, variant, display });
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
  scoreSel = null;
  setDropdown(false);
  // Show first: the scale measures the height that is left on screen.
  show('scores');
  renderScores();
}
window.addEventListener('resize', () => {
  syncMarkers(false);
  if (currentView === 'scores') renderScores();
});
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

document.querySelectorAll<HTMLElement>('#home .segmented').forEach((g) => addSlidingMarker(g, '[aria-pressed="true"]'));
void document.fonts?.ready.then(() => syncMarkers(false));

renderHome();
show('home');
