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
- Modes: Verliebte Zahlen (bis 10, Booster bis 20) · Plus bis 20 · Minus bis 20 · Bunt gemischt bis 20 (Booster bis 30). No negative results.
- Verliebte Zahlen in both forms, mixed: `7 + ? = 10` and `? + 7 = 10`.
- Darstellung: Zahlen or Kugeln (balls). Balls: first number red, second blue (Verliebte Zahlen: one field for the whole, known part filled, rest grey), rows of ten, each row's first five bright and second five deep (`src/logic/balls.ts`, tokens `--ball-*`). Balls keep their own records (`recordKey` suffix `|balls`).
- Round lengths: 20 or 30 tasks. Two variants: 10 s per task, or total time stopped. Default = Stoppuhr.
- 10 s limit expired → task counts as "zu langsam", round continues (no sudden death).
- Wrong answer → field shakes, child corrects it, clock keeps running (no penalty screen).
- Answer is submitted with an OK button (explicit owner decision, no auto-submit).
- Records only against oneself, per mode + length (+ input method). No profiles, no leaderboards.
- Highscores: best 20 rounds per setting (`data.history[recordKey]`, best first; [0] = record), drawn as a vertical scale (owner mockup, `src/logic/scale.ts`): the colour bar starts at the ground (0 s) and grows with time – best = shortest stretch above the ground, slowest at the top, grey track above it, straight lines only (crowded lines move up to a min gap, never bend), coloured bands `--band-1..4` between, "Letzter Versuch" as ONE-line yellow chip left of the bar (heavy line across the bar, place and time bold) from `data.last`; the bar itself is centred on the screen (SVG is symmetric around it, 10-second result "18/20" sits below the time); times as `00:34,12` (`formatClock`) on the scale only. Rows fade with time (best 1.0 → slowest 0.4, `SCALE.fadeMin`); the last attempt row is never faded. Page shows only the 4 mode chips + one options dropdown (length · variant · booster); it always opens on `data.lastCfg` (last played round). First view after a round animates once (`scoreAnim`): the "Letzter Versuch" marker travels from the previous attempt's height first (down = better), then the new value draws in.
- Track time + errors per fact → "Knackpunkte" + practice round that mixes slow facts in more often.
- 3-2-1 countdown before each round. Few +0/+1, no direct repeats, Zehnerübergang mixed in on purpose.

## Structure
- `src/logic/` pure, tested: `tasks.ts` (fact pools, generator), `round.ts` (round state machine, times passed in), `records.ts`, `stats.ts` (Knackpunkte), `storage.ts`, `format.ts`
- `src/main.ts` all DOM: views home → countdown → play → result, scores (Highscores), overlays pause/confirm

## Layout & colour rules (owner)
- **Every screen fits the viewport height, no vertical scrolling** (`.page` = 100dvh grid, sizes via `clamp(… dvh …)`, rem base shrinks below 620px height). Verified at 375x812, 360x740, 360x640, 320x568. Highscore scale gets exactly the free height (`layoutScale(items, avail)`). Only the speech-test page may scroll (`.page-scroll`).
- **Nothing snaps, nothing is tinted:** showing/hiding elements goes through `showAnimated`/`hideAnimated` (`src/motion.js`, copy of the design-system helpers): the row fades out, the rest glides up (and the reverse), 200 ms. No yellow flash/tint on appearing elements. Never set `el.hidden` directly on a visible screen. Fixed-height blocks (e.g. the record line is always 2 lines) prevent unplanned jumps.
- **Call to action = blue** (`--cta`, design system): the single big button per screen ("Los", "Nochmal", OK key). **Yellow = active/selected** (segmented control, switch ON, selected tile, focus) – never black-vs-white pairs.
- Highscore bar uses the design-system data scale: `color-mix(in oklch, var(--scale-low), var(--accent) P%)`, bands marked `data-scale`, 1px `--fill-edge` outline.
- Stars (`src/logic/stars.ts`): 1 per finished unit (also practice), +2 new highscore (never practice), +1 flawless (no wrong answer, no timeout). Total in `data.stars`, shown on the Highscore page and itemised on the result screen.
- Design-system audit: copy `~/.claude/skills/design-system/audit.js` to `node_modules/ds-audit.js`, set `window.AUDIT_EXTRA_TOKENS=['--ball-a','--ball-a-deep','--ball-b','--ball-b-deep','--ball-empty']`, load it with a cache-busting `?v=` and run `runAudit('body')`; remove the file afterwards. Token-file (`:root`) and `.sr-only` findings are expected.

## Conventions
- Pure logic framework-free and unit-tested in `tests/`; DOM code stays thin.
- A task's timer runs only between `Round.begin()` and its result; feedback animations never count.
- Practice rounds (Knackpunkte üben) feed stats but never set records and show no running time (only the 10-s bar in the limit variant).
- UI text German; code/comments English.
- Unavailable options are hidden, not explained (owner rule), e.g. booster row for Plus/Minus.
- Units written out, never abbreviated (owner rule): "5,0 Sekunden", "1:05,3 Minuten" – use `formatMs`/`formatTime`. Look: design-system tokens in `src/styles/tokens.css`.

## Gotchas
- `.task-area` is a size container (`container-type: size`, `overflow: clip`): ball size is computed from `100cqh` and `--rows`, so six rows still fit above the keypad; do not make its height depend on content.
- app.css styles `.task` as the speech-test card; game.css resets that padding for `.task-area .task`.
- Microphone needs a secure context → dev server runs HTTPS; accept the certificate warning on the phone once.
- `vite --mode http` serves plain HTTP for local preview tools that reject the self-signed cert.
- vite.config.ts sets css.postcss to {} on purpose: a parent folder has a Tailwind/PostCSS config.
- Page goes to background mid-round → round pauses (visibilitychange); rAF is throttled in hidden tabs, so browser automation must fake `document.hidden`.
- Design-system audit flags `tokens.css` R4 in dev only (Vite injects it without href) – expected.
- `.limit` is a reserved state class in the design-system audit; the 10-s bar is `.timebar-*`.
- Web Speech API in Chrome sends audio to Google unless on-device recognition is available (`SpeechRecognition.available` / `install`, feature-detected).

## Compact instructions
Preserve: current goal, changed files + why, open TODOs, unresolved errors verbatim, start/port setup.
