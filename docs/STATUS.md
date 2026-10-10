# Status
_Updated: 2026-10-10_

## Now
v1 live: https://gabiwan24.github.io/speed-mathe/ – wartet auf Test mit dem Kind am Handy.

## Works
- 4 Modi (Verliebte Zahlen in beiden Formen ±Booster 20, Plus 20, Minus 20, Gemischt ±Booster 30), 20/30 Aufgaben
- Varianten 10 s pro Aufgabe (Timeout = „zu langsam“, Runde läuft weiter) und Stoppuhr
- Falsche Antwort: Feld wackelt, neu eingeben, Uhr läuft weiter; OK-Taste
- 3-2-1-Countdown, Pause bei App-Wechsel, Beenden mit Rückfrage
- Rekorde je Modus/Booster/Länge/Variante, „Neuer Rekord!“ mit Abstand
- Highscore-Seite: beste 20 Runden je Einstellung als senkrechte Skala (Höhe = Zeit), „Letzter Versuch“, „Platz n“ im Ergebnis
- Knackpunkte je Runde + „Knackpunkte üben“ (Übungsrunde, kein Rekord)
- PWA (installierbar, offline), Sprachtest unter /sprachtest.html
- Darstellung „Kugeln“: Aufgaben als rote/blaue Kugeln in Zehnerreihen, Fünferblöcke hell/dunkel, eigene Rekorde
- Sterne: 1 je abgeschlossene Einheit, +2 neuer Highscore, +1 fehlerfrei; Summe auf der Highscore-Seite
- Jeder Bildschirm passt ohne senkrechtes Scrollen (geprüft bis 320x568)
- Call-to-Action-Blau, aktive Auswahl gelb (Design-System aktualisiert)
- Übungsrunde ohne Zeitanzeige (nur 10-Sekunden-Leiste)
- Deploy: push auf main → GitHub Pages
- 142 Unit-Tests, Build-Check `scripts/verify-build.mjs`

## Next
1. Am Handy https://gabiwan24.github.io/speed-mathe/ öffnen, App installieren
2. Sprachtest machen → Sprache als Option ja/nein
3. Optional: Knackpunkte-Übersicht

## Known issues
- Spracherkennung nur auf echtem Gerät testbar
