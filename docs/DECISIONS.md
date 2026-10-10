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
