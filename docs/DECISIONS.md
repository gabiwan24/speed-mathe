# Decisions
<!-- one line each: YYYY-MM-DD – decision – why. Append only. -->
2026-10-10 – Vite + vanilla TypeScript, no framework – app is a few screens; keeps it small and fast on the phone.
2026-10-10 – HTTPS dev server (plugin-basic-ssl) – microphone needs a secure context on the LAN.
2026-10-10 – Timeout does not end the round; task counts as "zu langsam" – sudden death frustrates 7–8-year-olds.
2026-10-10 – Explicit OK button, no auto-submit – owner decision.
2026-10-10 – Speech input only after a spike on the real phone; if adopted, as option with separate records – recognizer latency makes times incomparable.
2026-10-10 – Design system v1 tokens for the spike page; game look still open.
2026-10-10 – Speech input not in v1; speech test stays at /sprachtest.html – decide after the phone spike.
2026-10-10 – Love-mode booster mixes partners of 10 and 20 – keeps easy facts in the mix while adding 20.
2026-10-10 – Zehnerübergang drawn at 40 %, operand 1 and x−x at 0.3 weight, no 0 operands, no fact repeat within 3 tasks – Regelbuch "gute Mischung".
2026-10-10 – Task timer pauses between tasks and when the app is hidden – times measure only thinking, records stay fair.
2026-10-10 – Practice focus = this round's Knackpunkte ∪ facts hard across rounds (median cost ≥ 2.5 s, cleared after 3 quick clean solves) – the child practises exactly what the result screen showed.
2026-10-10 – vite-plugin-pwa, fullscreen portrait – used like an app on the Android phone, works offline.
2026-10-10 – Verliebte Zahlen asked in both forms (a + ? and ? + a), 50/50 – owner request.
2026-10-10 – Options a mode does not support are hidden instead of explained – owner rule, less reading for the child.
2026-10-10 – Time units written out ("5,0 Sekunden", "1:05,3 Minuten", "10 Sekunden pro Aufgabe") – owner rule, no abbreviations for the child.
2026-10-10 – Practice rounds show no clock, only the 10-s bar where the variant needs it – owner rule, practice without time pressure display.
2026-10-10 – Public repo gabiwan24/speed-mathe, GitHub Pages via Actions – owner request, fixed URL for the phone.
2026-10-10 – Highscore page keeps the best 20 rounds per setting, shown chronologically (newest on top) with speed bars – owner request: see the development; replaces the single record (migrated on load).
2026-10-10 – Mode buttons read "+ Plus rechnen" and "− Minus rechnen" – owner request.
2026-10-10 – Highscores drawn as a vertical scale per owner mockup (height = time, place lines, 4 coloured bands, grey headroom) instead of cards – owner design overrides the single-accent design system here.
2026-10-10 – Scale shows times as 00:34,12 (owner mockup); everywhere else units stay written out.
2026-10-10 – Last attempt per setting stored separately and shown as "Letzter Versuch" (dashed when outside the best 20) – the child sees where today's round landed.
2026-10-10 – Highscore filters as small quiet chips instead of mode tiles/segmented controls – owner: buttons were far too prominent; the scale is the content.
2026-10-10 – Mode "Gemischt" renamed "Bunt gemischt" everywhere – owner request.
2026-10-10 – Highscore page: only the 4 mode buttons visible, length/variant/booster in one custom dropdown listing all combinations (empty ones muted) – owner request, calmer page.
2026-10-10 – Highscore page always opens on the last played setting (persisted lastCfg); result screen gets a Highscores button – owner: no choosing after a game.
2026-10-10 – Highscore dropdown lists only combinations with rounds (unplayed hidden, not greyed); a mode without rounds hides the dropdown; scale centred – owner request.
2026-10-10 – Scale lines never bend: a line closer than 36 px to the one above moves down itself (proportional otherwise); "Letzter Versuch" left of the bar in two lines; 10-second extra shortened to "18/20" – owner mockup feedback, fits a phone width.
2026-10-10 – After a round the Highscore scale animates once: new value appears, then the "Letzter Versuch" marker travels from the previous attempt to the new one – owner request: see at a glance whether it got better or worse.
2026-10-10 – Animation order: marker travels first, new value appears after it arrives – owner request.
2026-10-10 – Scale mirrored: bar grows with time, best (least time) at the bottom, grey room below it, marker moves down when better – owner: less time = better must read as lower.
2026-10-10 – Colour bar starts at the ground (0 s), line height above it proportional to time; best is the shortest stretch, marker moves down when better – owner: bar must start at the bottom and be shorter for less time.
2026-10-10 – Default time variant is Stoppuhr, not 10 Sekunden pro Aufgabe – owner request; saved choices stay.
2026-10-10 – Highscore rows (line, place, time) fade with the time, best 1.0 down to 0.4 for the slowest; last attempt stays fully visible; fade follows time, not line position – owner request; floor 0.4 keeps it readable.
2026-10-10 – New setting Darstellung (Zahlen / Kugeln) on the home screen instead of a fifth mode; works with all four modes – owner asked for balls "auch" as a way to show the tasks.
2026-10-10 – Balls: first number red, second blue, rows of ten, bright/deep per block of five; Verliebte Zahlen show one field of the whole – follows the owner mockup.
2026-10-10 – Ball colours are new project tokens (--ball-a/-b, -deep, -empty), re-tuned for dark theme; the design system had no red/blue pair (--danger is a status colour, --scale-low is not for chrome).
2026-10-10 – Balls are round (border-radius 50%) – owner mockup overrides the no-radius rule for this element only.
2026-10-10 – Balls keep their own records and Highscore entries (key suffix |balls) – they make a task easier, times are not comparable.
2026-10-10 – Bright/deep contrast of the five-blocks raised (red 2.6x, blue 3.5x luminance ratio on light) after owner feedback "difference too small".
2026-10-10 – Highscore bar centred on the screen (x-axis), labels left and right of it; the 10-second "18/20" moved under the time to fit the right side – owner request.
2026-10-10 – Stars: 1 per finished unit (also Knackpunkte practice), +2 new highscore (first record of a setting counts, practice never), +1 flawless (no wrong answer and no timeout) – owner rules.
2026-10-10 – Every screen fits the viewport height without vertical scrolling; compact result screen (3 tiles in one row, stars inline, buttons in one row), highscore scale fits its area, rem base shrinks on short screens – owner rule.
2026-10-10 – Highscore bar colours come from the design-system data scale (--scale-low blue → --accent yellow, OKLCH), replacing the mockup colours – owner request.
2026-10-10 – Design system: active option among peers = yellow signal, inactive recedes; black-vs-white pairs are forbidden (unclear which is active) – owner request.
2026-10-10 – Design system: new call-to-action colour --cta (electric blue; dark theme lighter blue with black text) replaces yellow as the primary button, because yellow now marks active states – owner request.
2026-10-10 – Two-line tiles centre their whole text block vertically – owner request.
2026-10-10 – "Letzter Versuch" is one line and highlighted (yellow chip = active signal, heavy marker line, bold place/time) – owner request.
