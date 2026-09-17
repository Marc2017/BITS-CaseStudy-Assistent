# CLAUDE.md — BITS Erfolgsgeschichte-Assistent

Hinweise für die Arbeit an diesem Projekt. Es gilt zusätzlich die `CLAUDE.md`
im übergeordneten Verzeichnis (Arbeitssprache Deutsch, keine ASCII-Ersatz­
schreibung für Umlaute in Texten).

## Vor der Arbeit lesen

`docs/` ist die Akte des Projekts — dort steht, **warum** etwas so gebaut ist:

- `docs/00-konzept.md` — worum es überhaupt geht
- `docs/01-entscheidungen.md` — Festlegungen mit Begründung (`E-01 …`)
- `docs/02-datenmodell.md` — Tabellen, Migrationen, **Invarianten** (`I-…`)
- `docs/03-annahmen.md` — Annahmen (`A-…`), offene Punkte (`O-…`)
- `docs/04-aenderungen.md` — Änderungs- und Fehlerjournal
- `docs/05-interview-und-prompts.md` — Interviewführung, Prompt-Aufbau, Lernmodus
- `docs/06-referenz-website.md` — die kanonische Struktur auf mybits.de

**Pflicht vor jedem Eingriff in die Faktenfilterung oder ins Schema:** die
Invarianten in `02-datenmodell.md`.

Die gefährlichste davon ist **I-04**: `fakten.ts → faktenFuerZiel()` ist der
einzige Weg, auf dem Fakten in einen Formulierungs-Prompt gelangen. Wer diese
Filterung an einer zweiten Stelle nachbaut, hat sie an einer Stelle vergessen —
und dann steht ein Kundenname auf der Website. Ein Prompt-Verbot („lass
Internas weg") ist kein Ersatz: Das ist eine Bitte, ein fehlender Kontext ist
eine Tatsache.

Die zweite Falle ist **I-05**: Stufen werden über `STUFEN_RANG` (eine Zahl)
verglichen, nie über Text. Alphabetisch steht `intern` vor `oeffentlich` — ein
Zeichenkettenvergleich würde interne Fakten durchlassen.

## Nach der Arbeit nachtragen

Am Ende jeder Sitzung, in der etwas Inhaltliches passiert ist:

1. Neue Festlegung → Eintrag in `01-entscheidungen.md` mit der nächsten freien
   Nummer. Nummern nie neu vergeben; überholte Einträge bleiben mit
   `Status: überholt durch E-nn` stehen.
2. Datenmodell berührt → Tabelle und Migration in `02-datenmodell.md`; neue
   Falle → neue Invariante **plus Test** in `server/test/kern.test.ts`.
3. Annahme bestätigt oder gefallen → `03-annahmen.md` anpassen, nicht löschen.
4. **Immer** eine Zeile in `04-aenderungen.md` — mit Datum und dem Warum. Auch
   bei behobenen Fehlern: die Ursache ist der Teil, der später zählt.
5. Prompt oder Interviewführung geändert → `05-interview-und-prompts.md`
   mitziehen. Der Prompt **ist** hier das Produkt.
6. Benutzersichtbare Funktion neu oder geändert → `README.md` mitziehen,
   inklusive der Stand-Zeile im Kopf.

## Arbeitsweise

- Node 24 führt TypeScript direkt aus; im Backend gibt es **keinen Build** —
  und damit nichts, was einen Typfehler bemerkt. `npm run typen` ist deshalb
  Pflicht vor dem Commit (`npm test` führt es mit).
- Struktur nur über Migrationen ändern (`db/migration.ts`,
  `PRAGMA user_version`). `schema.sql` erreicht bestehende Datenbanken nie —
  eine neue Spalte muss **an beiden Stellen** stehen.
- Nach einer Migration den Server neu starten: Sie läuft nur beim Start. Läuft
  er über `npm start` (ohne `--watch`), merkt er Codeänderungen gar nicht.
- Tests laufen auf einer eigenen Datenbank (`BITS_EG_DB`). Keine Testdaten in
  `server/data/erfolgsgeschichten.db` hinterlassen — das ist der echte Bestand
  des Benutzers.
- **Zugangsdaten werden nicht eingegeben.** Kein API-Schlüssel, kein Passwort.
  Was ohne Schlüssel nicht messbar ist, wird als ungemessen benannt, nicht als
  „funktioniert" verkauft.

## Prompts ändern

Die festen Prompt-Teile stehen in `server/src/ki/prompts.ts`, die editierbaren
in der Datenbank (`ziel.prompt`, `projektart.hinweise`). Zwei Regeln:

- **`systemStabil` darf nichts Wechselndes enthalten** — kein Zeitstempel,
  keine Story-Daten. Dieser Block wird mit `cache_control` zwischengespeichert;
  ein einziges wechselndes Zeichen macht den Cache wertlos. Zu prüfen an
  `usage.cache_read_input_tokens`.
- **Nichts erfinden lassen.** Der Redaktionsleitfaden von `mybits.de` führt
  erfundene Zahlen als Klasse A („muss weg"). Sichtbare Lücken
  (`<p class="fehlt">`) sind deshalb gewollt: Eine sichtbare Lücke wird
  gefüllt, eine kaschierte bleibt für immer falsch.

## Was hier nicht hingehört

Vertrauliches: Kundenlisten mit Umsätzen, Preise, Personalthemen,
Zugangsdaten. Das gilt für die Doku, die Commit-Nachrichten und die
Erstausstattung in `server/src/seed/` — die wird mit dem Repository verteilt.
