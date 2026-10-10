# Speed-Mathe
Speed-Rechen-PWA für ein Kind der 2. Klasse (Android-Handy, Chrome). Eigene App, unabhängig von Garten-Mathe.

## Run
- Start: `start.bat` (free port from 5173, HTTPS, reachable in the LAN)
- Test: `npm test` · Type check: `npm run check`
- Build: `npm run build` then `node scripts/verify-build.mjs` (checks dist is a complete PWA with both pages)
- Pages: `index.html` = game (`src/main.ts`), `sprachtest.html` = speech recognition spike (`src/speech-test.ts`)
- Icons: `npx pwa-assets-generator` regenerates PNGs from `public/logo.svg` (config `pwa-assets.config.ts`)
- Acceptance ledger: `GATES.md`
- Deploy: push to main → GitHub Actions (`BASE_PATH=/speed-mathe/`) → https://gabiwan24.github.io/speed-mathe/

## Stack
Vite 8 + vanilla TypeScript 6, Vitest 5, @vitejs/plugin-basic-ssl, vite-plugin-pwa; no backend, localStorage only (`speed-mathe:v1`).

## Game rules (Regelbuch – do not break)
- Modes: Verliebte Zahlen (bis 10, Booster bis 20) · Plus bis 20 · Minus bis 20 · Gemischt bis 20 (Booster bis 30). No negative results.
- Verliebte Zahlen in both forms, mixed: `7 + ? = 10` and `? + 7 = 10`.
- Round lengths: 20 or 30 tasks. Two variants: 10 s per task, or total time stopped.
- 10 s limit expired → task counts as "zu langsam", round continues (no sudden death).
- Wrong answer → field shakes, child corrects it, clock keeps running (no penalty screen).
- Answer is submitted with an OK button (explicit owner decision, no auto-submit).
- Records only against oneself, per mode + length (+ input method). No profiles, no leaderboards.
- Track time + errors per fact → "Knackpunkte" + practice round that mixes slow facts in more often.
- 3-2-1 countdown before each round. Few +0/+1, no direct repeats, Zehnerübergang mixed in on purpose.

## Structure
- `src/logic/` pure, tested: `tasks.ts` (fact pools, generator), `round.ts` (round state machine, times passed in), `records.ts`, `stats.ts` (Knackpunkte), `storage.ts`, `format.ts`
- `src/main.ts` all DOM: views home → countdown → play → result, overlays pause/confirm

## Conventions
- Pure logic framework-free and unit-tested in `tests/`; DOM code stays thin.
- A task's timer runs only between `Round.begin()` and its result; feedback animations never count.
- Practice rounds (Knackpunkte üben) feed stats but never set records and show no running time (only the 10-s bar in the limit variant).
- UI text German; code/comments English.
- Unavailable options are hidden, not explained (owner rule), e.g. booster row for Plus/Minus.
- Units written out, never abbreviated (owner rule): "5,0 Sekunden", "1:05,3 Minuten" – use `formatMs`/`formatTime`. Look: design-system tokens in `src/styles/tokens.css`.

## Gotchas
- Microphone needs a secure context → dev server runs HTTPS; accept the certificate warning on the phone once.
- `vite --mode http` serves plain HTTP for local preview tools that reject the self-signed cert.
- vite.config.ts sets css.postcss to {} on purpose: a parent folder has a Tailwind/PostCSS config.
- Page goes to background mid-round → round pauses (visibilitychange); rAF is throttled in hidden tabs, so browser automation must fake `document.hidden`.
- Design-system audit flags `tokens.css` R4 in dev only (Vite injects it without href) – expected.
- `.limit` is a reserved state class in the design-system audit; the 10-s bar is `.timebar-*`.
- Web Speech API in Chrome sends audio to Google unless on-device recognition is available (`SpeechRecognition.available` / `install`, feature-detected).

## Compact instructions
Preserve: current goal, changed files + why, open TODOs, unresolved errors verbatim, start/port setup.
