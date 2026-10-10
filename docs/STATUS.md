# Status
_Updated: 2026-10-10_

## Now
v1 spielbar; wartet auf Test mit dem Kind am Handy.

## Works
- 4 Modi (Verliebte Zahlen in beiden Formen ±Booster 20, Plus 20, Minus 20, Gemischt ±Booster 30), 20/30 Aufgaben
- Varianten 10 s pro Aufgabe (Timeout = „zu langsam“, Runde läuft weiter) und Stoppuhr
- Falsche Antwort: Feld wackelt, neu eingeben, Uhr läuft weiter; OK-Taste
- 3-2-1-Countdown, Pause bei App-Wechsel, Beenden mit Rückfrage
- Rekorde je Modus/Booster/Länge/Variante, „Neuer Rekord!“ mit Abstand
- Knackpunkte je Runde + „Knackpunkte üben“ (Übungsrunde, kein Rekord)
- PWA (installierbar, offline), Sprachtest unter /sprachtest.html
- 86 Unit-Tests, Build-Check `scripts/verify-build.mjs`

## Next
1. Am Handy testen (start.bat → https://<PC-IP>:<Port>), App installieren
2. Sprachtest machen → Sprache als Option ja/nein
3. Optional: Veröffentlichen (z. B. GitHub Pages, `BASE_PATH` ist vorbereitet)

## Known issues
- Spracherkennung nur auf echtem Gerät testbar
