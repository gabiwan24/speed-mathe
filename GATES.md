# Gates: Speed-Mathe app (v1)

OWNS: src/**, tests/**, public/**, scripts/**, index.html, sprachtest.html, vite.config.ts, package.json, package-lock.json, pwa-assets.config.ts, tsconfig.json, CLAUDE.md, README.md, docs/**, GATES.md, .gitignore

Scope: playable speed-math PWA with 4 modes, boosters, 20/30 tasks, 10-s and stopwatch variants, records, Knackpunkte analysis and practice round, per the Regelbuch in CLAUDE.md.

- [x] G1: task generator honours ranges, no negatives, no +0, rare 1s, no direct repeats, ~40 % Zehnerübergang, focus weighting
  CHECK: npx vitest run tests/tasks.test.ts
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\Gabriel Weiss\Documents\Claude_Vibecoding\speed-mathe; path=5aafc0a57e72/43 entries; output=Start at  17:00:33 | Duration  913ms (tests 88%, transform 8%, import 3%, worker 1%)

- [x] G2: round engine: timeout counts "zu langsam" and continues, wrong answer keeps clock running, pause excludes time, record comparison
  CHECK: npx vitest run tests/round.test.ts tests/records.test.ts
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\Gabriel Weiss\Documents\Claude_Vibecoding\speed-mathe; path=5aafc0a57e72/43 entries; output=Start at  17:00:35 | Duration  311ms (transform 62%, import 22%, tests 8%, worker 8%)

- [x] G3: Knackpunkte analysis and fact stats
  CHECK: npx vitest run tests/stats.test.ts
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\Gabriel Weiss\Documents\Claude_Vibecoding\speed-mathe; path=5aafc0a57e72/43 entries; output=Start at  17:00:37 | Duration  285ms (transform 66%, import 19%, tests 9%, worker 6%)

- [x] G4: whole test suite green
  CHECK: npm test
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\Gabriel Weiss\Documents\Claude_Vibecoding\speed-mathe; path=5aafc0a57e72/43 entries; output=Start at  17:00:39 | Duration  956ms (tests 57%, transform 27%, import 12%, worker 4%)

- [x] G5: type check clean
  CHECK: npx tsc --noEmit && echo TSC_OK
  EXPECT: TSC_OK
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\Gabriel Weiss\Documents\Claude_Vibecoding\speed-mathe; path=5aafc0a57e72/43 entries; output=TSC_OK

- [x] G6: production build contains app, speech test page, manifest, service worker and icons
  CHECK: npm run build && node scripts/verify-build.mjs
  EXPECT: build verification passed
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\Gabriel Weiss\Documents\Claude_Vibecoding\speed-mathe; path=5aafc0a57e72/43 entries; output=dist/workbox-2ff6bd68.js | build verification passed

- [x] G7: end-to-end in the browser: home → countdown → full round (incl. wrong answer and timeout) → result with record + Knackpunkte → practice round → quit confirm; no console errors; phone width without horizontal scroll
  EVIDENCE: manual, Browser pane 375x812 (http mode): love/limit round – wrong answer → "Nochmal!" + slot reset, 2 timeouts → round continued, result 18/20 · 32,7 s, "Erster Rekord!", 3 Knackpunkte; record persisted after reload; practice round (focus fact 5/20, "zählt nicht", no record); mixed+booster/30/stopwatch round max 30, 16 plus/14 minus; quit confirm blocks input, Weiterrechnen resumes, Beenden discards; love round 10/20 in "? + a" form; booster row hidden for plus/minus; scrollWidth 375 on home/play/result; no console errors except one stale 404 from the index.html move; design audit clean except tokens.css R4 (dev-injected, expected)

- [x] G8: docs updated (CLAUDE.md run/structure, STATUS.md, DECISIONS.md)
  EVIDENCE: manual – CLAUDE.md Run/Structure/Regelbuch/Gotchas, STATUS.md rewritten 2026-10-10, DECISIONS.md +10 lines incl. both owner rules from mid-build feedback
