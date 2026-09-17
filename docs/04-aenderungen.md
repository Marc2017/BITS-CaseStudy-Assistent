# Änderungs- und Fehlerjournal

Eine Zeile je Sitzung, in der etwas Inhaltliches passiert ist — mit Datum und
dem **Warum**. Bei behobenen Fehlern ist die Ursache der Teil, der später
zählt.

---

## 17.09.2026 — Projekt aufgesetzt

- Verzeichnis, Git-Repository und Doku-Systematik angelegt (analog BITS Machine,
  E-02).
- Referenzmaterial erhoben: kanonische Abschnitts- und Feldstruktur der
  Erfolgsgeschichten aus `mybits-core/acf-json/group_mybits_cs_*.json`,
  Tonalität und Belegpflicht aus `mybits_plugin/REDAKTIONSLEITFADEN.md`, eine
  vollständige Beispielgeschichte von `mybits.de`. Festgehalten in
  `06-referenz-website.md`.
- Konzept festgelegt: Fakten als Bestand, Fassungen als Ableitung (E-03), und
  die Vertraulichkeitsstufe je Fakt als technische Grenze zwischen
  Website-Fassung und interner Referenz (E-04).
- Proof of Concept gebaut: Backend (Datenmodell, API, KI-Schicht mit Anthropic
  und vorbereitetem Azure), Oberfläche (Splitscreen, drei Ansichten,
  WYSIWYG-Editor, Verwaltung), Erstausstattung (30 Faktenrubriken, 4 Ziele,
  7 Projektarten), 14 Tests auf die Invarianten.

### Befunde dieser Sitzung

**`textAus()` löste benannte HTML-Entities nicht auf.** Der Import kannte nur
`&nbsp;`, `&amp;`, `&lt;`, `&gt;`, `&quot;` und die numerischen Formen. Aus
`&auml;` wurde damit wortwörtlich „&auml;" — ein importierter Text hätte
„mittelstauml;ndisch" in die Fakten getragen, und das Modell hätte es als
Tatsache übernommen. Gefunden durch den Import-Test, nicht durch Lesen.
Behoben mit einer Tabelle der Entities, die auf deutschen Seiten wirklich
vorkommen, und in der richtigen Reihenfolge: numerisch zuerst, dann benannt.

**Die Erstausstattung war in ASCII-Ersatzschreibung geschrieben.** Im Browser
stand „Groesse des Vorhabens" und „Du schreibst fuer die oeffentliche
Website". Das ist nicht nur gegen die Hausregel: Die Vorlagen **sind** die
Prompts, und ein Prompt in kaputter Orthografie erzeugt Texte in kaputter
Orthografie — die dann jemand von Hand nachziehen müsste. `katalog.ts`,
`ziele.ts` und `prompts.ts` neu geschrieben, die Meldungen im Backend
korrigiert (41 Stellen), Datenbank mit `npm run seed:ersetzen` nachgezogen.
Bezeichner bleiben ASCII: `schluessel`, `stufe: 'oeffentlich'` und die
SQL-Spalten sind Datenbankwerte, keine Prosa.

**Das leere Blatt war nicht beschreibbar.** Ein `contenteditable` ohne Inhalt
hat Höhe 0; gemessen im Browser blieb `document.activeElement` auf `BODY`, und
ein Klick in das Blatt tat nichts. Wer ohne KI-Fassung selbst anfangen wollte,
konnte den Cursor nicht setzen. Drei Ursachen, alle behoben: `min-height` für
den Editor, ein leerer Absatz als Startinhalt (ein Cursor braucht einen Platz),
und ein Klick-Handler am ganzen Blatt, der bei fehlendem Fokus den Cursor ans
Ende setzt. Damit das leere Blatt trotzdem als „ohne Text" gilt, wird beim
Speichern auf Leerraum geprüft.

**Die Farben des Arbeitsbereichs standen auf dem Papier.** `--muted` auf
`--papier` ergibt einen Kontrast von etwa 1,4:1 — die Erklärung „Noch kein
Text für dieses Ziel" war praktisch unsichtbar. Das Blatt setzt seine
Textfarben jetzt selbst (`--tinte`, `--tinte-2`).

**„Genug Fakten sind da" war eine falsche Auskunft.** Die Oberfläche zählte
erfüllte Pflichtfakten, die Grenze im Server (I-06) zählt aber die für **dieses
Ziel freigegebenen** Fakten. Bei 5 von 13 Pflichtfakten und nur 4 öffentlichen
hätte die Anzeige zum Formulieren eingeladen, das der Server abweist. Der
Server liefert die Freigabezahl jetzt je Ziel mit (`ziele[].freigegeben`) —
eine Rechnung, nicht zwei (I-04).

### Was gemessen ist und was nicht

Gemessen: 14 Tests grün, Typprüfung Backend und Frontend ohne Befund, Frontend
baut, Erstausstattung über die API gelesen, Faktenfilterung je Ziel an echten
Daten (7 Fakten → Website 5, interne Ziele 6, der vertrauliche überall
draußen), Speichern einer handgeschriebenen Fassung inklusive `handisch = 1`
in der Datenbank, Löschen einer Geschichte samt Fakten und Fassungen
(`ON DELETE CASCADE`).

Nicht gemessen: **kein einziger Lauf mit echter KI** — es ist kein Schlüssel
hinterlegt, und Zugangsdaten werden hier nicht eingegeben. Ebenfalls offen:
vollständige Tastatureingabe und die Werkzeugleiste des Editors im Browser; die
Testautomatisierung erreicht ein `contenteditable` nicht (die synthetische
Eingabe kam nur teilweise an, der Weg über `execCommand` wurde vom
Sicherheitsfilter der Browsersteuerung abgelehnt). Das ist in einer Minute von
Hand geprüft.

---

## 17.09.2026, später — Fortschrittsanzeige, Kunden, Eingabehilfen

Erster Betrieb mit echtem Schlüssel, und drei Wünsche von Marc.

### Der erste echte Durchlauf

Gemessen an der Zendesk-Erfolgsgeschichte von mybits.de:

| Schritt | Dauer | Ergebnis |
|---|---|---|
| Import per URL | 87 s | 75 Fakten erkannt, 70 gespeichert (5 Dubletten abgefangen) |
| Fassung „Website" | 61 s | 5724 Zeichen aus 65 freigegebenen Fakten |
| Fassung „Interne Kundenreferenz" | 61 s | 7231 Zeichen aus 72 Fakten |
| Interviewschritt | 10–13 s | 6 Fakten aus einer Antwort, 13/13 Pflichtfakten |
| Frage zerlegen | 5 s | 3 Teilfragen, darunter die Belegfrage |
| Antwort vorschlagen | 6 s | 5 geratene Angaben, alle in Klammern |

**Der Kern des Konzepts hält:** Dieselben Fakten, zwei Ziele — „LuckyChef
GmbH" steht in der internen Fassung im Titel und fehlt in der
Website-Fassung vollständig. Ebenso die interne Abteilungsangabe. Nicht weil
der Prompt es verbietet, sondern weil die Fakten gar nicht mitgeschickt wurden
(I-04).

**Ein Nebenbefund über die Website:** Die Lückenanalyse des Imports meldete
einen Widerspruch in der Live-Geschichte — die Einleitung nennt ein
E-Commerce-Unternehmen, Metazeile und Kicker nennen „Hotellerie & Reisen".
Beides kann nicht stimmen. Das Werkzeug hat also bei seinem ersten echten Lauf
einen Fehler im Bestand gefunden, den es nicht gesucht hat.

### F-01 — Opus 5 lehnt einen Verlauf ab, der mit dem Assistenten endet

`400 invalid_request_error: This model does not support assistant message
prefill.` Der Fall tritt regelmäßig auf: Nach einem Import steht die
Lückenfrage des Assistenten am Ende, und der nächste Interviewschritt läuft
ohne neue Nutzerantwort.

`nachrichten()` in `ki/anbieter.ts` stellte nur sicher, dass die **erste**
Nachricht vom Nutzer kommt. Jetzt auch die letzte. Ein Typfehler war das
nicht, und ohne echten Aufruf fällt es nicht auf — deshalb steht die
Begründung im Code.

### Fortschrittsanzeige (E-16)

Alle fünf KI-Endpunkte antworten als Ereignisstrom und melden Schritte, die
Denkschritte des Modells und die Länge der Antwort. Gemessen: 14 Ereignisse in
einem Interviewschritt, erste Meldung nach 0,0 s, Gedanken nach etwa 3 s.

Zwei Fallen dabei: `messages.parse()` kann nicht streamen (Weg:
`messages.stream()` mit `output_config.format`, `finalMessage()` liefert
trotzdem `parsed_output`), und bei Opus 5 ist `thinking.display` per Vorgabe
`omitted` — ohne `'summarized'` kommen leere Denkblöcke an.

**Befund:** Das Modell dachte auf Englisch. Da die Gedanken angezeigt werden,
steht die Bitte um Deutsch jetzt in `REDAKTION` und gilt für jeden Prompt.

### Kunden als Stammdaten (E-14, Migration M-2)

„Projekt bei MAN" war als Projektart falsch modelliert. Neue Tabelle `kunde`
mit eigenen Hinweisen; der Interview-Kontext ist die Kombination aus
Projektart und Kunde. Die Migration lief an einer Datenbank mit 75 Fakten und
zwei Fassungen von Stand 1 auf 2, ohne Verlust — das MAN-Wissen zog in den
Kundendatensatz um, statt gelöscht zu werden.

### Eingabehilfen (E-15)

„Eins nach dem anderen abfragen" und „Antwort vorschlagen". Der Unterschied
ist dokumentiert, weil er zählt: Zerlegen erfindet nichts, Vorschlagen rät —
und markiert deshalb jede geratene Angabe in eckigen Klammern, listet sie
zusätzlich im Klartext und landet im Eingabefeld statt im Gespräch.

### Benannte Versionen (E-17, Migration M-3)

„Version speichern" legt den aktuellen Stand unter einem Namen ab, mit
Kommentar und einem Haken „Fertige Fassung". Der Verlauf filtert darauf und
zeigt die Vertraulichkeitsstufe als eigene Spalte. Gemessen: abgelegt,
gefiltert (1 von 1 fertig), Stufe `oeffentlich` korrekt mitgeschrieben.

### F-02 — `schema.sql` brach den Start ab: „no such column: fertig"

Der Index auf die neue Spalte `fertig` stand in `schema.sql`, und diese Datei
läuft **vor** den Migrationen. Auf einer Datenbank von Stand 2 gab es die
Spalte noch nicht: `CREATE INDEX IF NOT EXISTS` fand keinen Index, legte ihn
an — und scheiterte an der fehlenden Spalte. `IF NOT EXISTS` schützt vor dem
zweiten Anlegen, nicht vor einer fehlenden Spalte.

Zwei Änderungen, beide in `I-07` festgehalten: Indizes auf per Migration
ergänzte Spalten stehen nur noch in der Migration, und die Migrationen laufen
jetzt **auch auf einer frischen Datenbank** (jeder Schritt ist idempotent).
Vorher hing die Gleichheit beider Wege daran, dass jemand zwei Dateien gleich
pflegt — das ist keine Garantie, sondern eine Hoffnung.

### F-03 — Zwei verschiedene Zahlen unter demselben Namen

Die Faktenspur meldete „26 gesamt", während der Reiter „Fakten 76" zeigte —
für denselben Bestand. `fortschritt.gesamt` zählte die verschiedenen
Faktenarten, nicht die Fakten. Jetzt sind es zwei Felder (`gesamt`, `arten`),
und die Spur sagt „76 Fakten in 26 Rubriken".
