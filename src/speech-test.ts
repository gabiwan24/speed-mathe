import './styles/tokens.css';
import './styles/app.css';
import { parseGermanNumber, pickAnswer } from './numbers';

// Minimal typing: the Web Speech API is not in every TS DOM lib, and the on-device
// extensions (processLocally / available / install) are Chrome-only and still moving.
interface Recognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  processLocally?: boolean;
  start(): void;
  abort(): void;
}
interface RecognitionCtor {
  new (): Recognition;
  available?(opts: { langs: string[]; processLocally: boolean }): Promise<string>;
  install?(opts: { langs: string[]; processLocally: boolean }): Promise<boolean>;
}

const w = window as unknown as Record<string, RecognitionCtor | undefined>;
const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
const LANG = 'de-DE';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const ui = {
  support: $('support'), ondevice: $('ondevice'), prompt: $('prompt'), heard: $('heard'),
  state: $('state'), start: $<HTMLButtonElement>('start'), stop: $<HTMLButtonElement>('stop'),
  local: $<HTMLButtonElement>('local'), summary: $('summary'), log: $('log'),
};

type Mode = 'read' | 'calc';
interface Attempt {
  expected: number;
  transcript: string;
  first: number | null;
  best: number | null;
  delay: number | null; // speech end → final result
  early: number | null; // speech end → first number in an interim result (negative = before end)
}

let mode: Mode = 'read';
let running = false;
let useLocal = false;
let rec: Recognition | null = null;
const attempts: Attempt[] = [];

const rand = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

function nextTask(): { text: string; answer: number } {
  if (mode === 'read') {
    const n = rand(0, 30);
    return { text: `Sag: ${n}`, answer: n };
  }
  const a = rand(2, 12);
  const b = rand(2, 20 - a);
  return Math.random() < 0.5
    ? { text: `${a} + ${b}`, answer: a + b }
    : { text: `${a + b} − ${b}`, answer: a };
}

function ask() {
  if (!running || !SR) return;
  const task = nextTask();
  ui.prompt.textContent = task.text;
  ui.heard.innerHTML = '&nbsp;';
  ui.heard.className = 'heard';
  listen(task.answer);
}

function listen(expected: number) {
  if (!SR) return;
  const r = new SR();
  rec = r;
  r.lang = LANG;
  r.interimResults = true;
  r.maxAlternatives = 5;
  r.continuous = false;
  if (useLocal) r.processLocally = true;

  let speechEnd: number | null = null;
  let firstNumberAt: number | null = null;
  let done = false;

  r.addEventListener('start', () => setState('Höre zu …', true));
  r.addEventListener('speechend', () => { speechEnd = performance.now(); });
  r.addEventListener('result', (ev) => {
    const e = ev as unknown as { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> };
    const res = e.results[e.results.length - 1];
    const alts = Array.from({ length: res.length }, (_, i) => res[i].transcript);
    ui.heard.textContent = alts[0];
    if (firstNumberAt === null && parseGermanNumber(alts[0]) !== null) firstNumberAt = performance.now();
    if (!res.isFinal) return;

    done = true;
    const now = performance.now();
    const { first, best } = pickAnswer(alts, expected);
    const end = speechEnd ?? now;
    record({
      expected, transcript: alts.join(' | '), first, best,
      delay: Math.round(now - end),
      early: firstNumberAt === null ? null : Math.round(firstNumberAt - end),
    });
    ui.heard.className = `heard ${best === expected ? 'ok' : 'bad'}`;
    setTimeout(ask, 900);
  });
  r.addEventListener('error', (ev) => {
    const code = (ev as unknown as { error: string }).error;
    done = true;
    if (code === 'no-speech' || code === 'aborted') {
      if (running && code === 'no-speech') listen(expected);
      return;
    }
    setState(`Fehler: ${code}`, false);
    stop();
  });
  r.addEventListener('end', () => {
    // Android sometimes ends the session without result or error; keep the same task going.
    if (!done && running) listen(expected);
  });
  r.start();
}

function record(a: Attempt) {
  attempts.push(a);
  const row = document.createElement('tr');
  const cell = (v: string, cls = '') => `<td class="${cls}">${v}</td>`;
  const fmt = (n: number | null) => (n === null ? '–' : String(n));
  row.innerHTML =
    cell(String(a.expected), 'num') +
    cell(escapeHtml(a.transcript), 'transcript') +
    cell(fmt(a.first), `num ${a.first === a.expected ? 'ok' : 'bad'}`) +
    cell(fmt(a.best), `num ${a.best === a.expected ? 'ok' : 'bad'}`) +
    cell(fmt(a.delay), 'num') +
    cell(fmt(a.early), 'num');
  ui.log.prepend(row);
  renderSummary();
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
}

function renderSummary() {
  const n = attempts.length;
  const pct = (k: number) => (n ? `${Math.round((k / n) * 100)} %` : '–');
  const ms = (v: number | null) => (v === null ? '–' : `${v} ms`);
  const rows: [string, string][] = [
    ['Versuche', String(n)],
    ['Richtig erkannt', pct(attempts.filter((a) => a.first === a.expected).length)],
    ['Mit Toleranz', pct(attempts.filter((a) => a.best === a.expected).length)],
    ['Verzögerung (Median)', ms(median(attempts.flatMap((a) => (a.delay === null ? [] : [a.delay]))))],
    ['Frühe Zahl (Median)', ms(median(attempts.flatMap((a) => (a.early === null ? [] : [a.early]))))],
  ];
  ui.summary.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}

function setState(text: string, live: boolean) {
  ui.state.textContent = text;
  ui.state.classList.toggle('live', live);
}

function start() {
  running = true;
  ui.start.disabled = true;
  ui.stop.disabled = false;
  ask();
}

function stop() {
  running = false;
  rec?.abort();
  ui.start.disabled = false;
  ui.stop.disabled = true;
  if (!ui.state.textContent?.startsWith('Fehler')) setState('Gestoppt', false);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

async function checkOnDevice() {
  if (!SR?.available) {
    ui.ondevice.textContent = 'Offline-Erkennung: nicht unterstützt (Audio geht an Google).';
    return;
  }
  try {
    const status = await SR.available({ langs: [LANG], processLocally: true });
    useLocal = status === 'available';
    ui.ondevice.textContent = `Offline-Erkennung: ${status}${useLocal ? ' – wird genutzt' : ''}`;
    ui.local.hidden = status !== 'downloadable';
  } catch (err) {
    ui.ondevice.textContent = `Offline-Erkennung: Prüfung fehlgeschlagen (${String(err)})`;
  }
}

ui.local.addEventListener('click', async () => {
  ui.local.disabled = true;
  ui.ondevice.textContent = 'Offline-Erkennung: lädt …';
  try {
    await SR?.install?.({ langs: [LANG], processLocally: true });
  } catch (err) {
    ui.ondevice.textContent = `Offline-Erkennung: Laden fehlgeschlagen (${String(err)})`;
  }
  ui.local.disabled = false;
  await checkOnDevice();
});

document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((btn) => {
  btn.addEventListener('click', () => {
    mode = btn.dataset.mode as Mode;
    document.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  });
});
ui.start.addEventListener('click', start);
ui.stop.addEventListener('click', stop);

if (SR) {
  ui.support.textContent = `Spracherkennung verfügbar (${LANG}).`;
  void checkOnDevice();
} else {
  ui.support.textContent = 'Spracherkennung wird von diesem Browser nicht unterstützt. Bitte Chrome nutzen.';
  ui.start.disabled = true;
}
renderSummary();
