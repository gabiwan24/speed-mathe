import './styles/tokens.css';
import './styles/app.css';
import './styles/game.css';
import { formatMs, formatTime } from './logic/format';
import { improvement, recordKey, type Improvement, type RoundConfig } from './logic/records';
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

type ViewId = 'home' | 'countdown' | 'play' | 'result';
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
  const best = data.records[recordKey(cfg)];
  $('record-line').innerHTML = best
    ? `Rekord: <strong>${cfg.variant === 'limit' ? `${best.inTime}/${best.count} rechtzeitig · ` : ''}${formatMs(best.totalMs)}</strong>`
    : 'Noch kein Rekord – leg los!';

  const focus = currentFocus(cfg);
  const practice = $<HTMLButtonElement>('practice-home');
  practice.hidden = focus.length === 0;
  practice.textContent = `Knackpunkte üben (${focus.length})`;
}

/** Booster is stored per user choice but only applies to modes that have one. */
function effectiveConfig(): RoundConfig {
  const s = data.settings;
  return { ...s, booster: s.booster && MODES[s.mode].boosterRange !== null };
}

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
  data.stats = addResults(data.stats, s.round.results);

  let imp: Improvement | null = null;
  if (!s.practice) {
    const key = recordKey(s.cfg);
    imp = improvement(s.cfg.variant, summary, data.records[key]);
    if (imp) data.records[key] = { ...summary, date: new Date().toISOString().slice(0, 10) };
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
