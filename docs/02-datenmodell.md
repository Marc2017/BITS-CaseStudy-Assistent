# Datenmodell

Tabellen, Migrationen und **Invarianten**. Die Invarianten stehen hier, weil
ihre Verletzung entweder stille Falschaussagen in einem Text erzeugt oder
vertrauliche Angaben nach außen trägt. Vor jedem Eingriff ins Schema oder in
die Faktenfilterung: erst hier lesen.

---

## Invarianten

### I-01 — Ein neuer Fakt ist `intern`, solange niemand etwas anderes sagt

Die Vorgabestufe in `schema.sql` ist `intern`. Ein Fakt wird durch eine
Entscheidung öffentlich, nicht durch Vergessen. Die KI darf beim Extrahieren
eine Stufe **vorschlagen**; ein leerer oder unbekannter Wert wird in
`fakten.ts` auf `intern` gesetzt — nicht auf `oeffentlich`.

### I-02 — Handgeschriebener Text wird nie stillschweigend überschrieben

Trägt eine Fassung `handisch = 1`, wird sie vor einer Neuformulierung nach
`fassung_sicherung` kopiert, und die Oberfläche fragt vorher. Wer zwanzig
Minuten an einem Absatz gefeilt hat, verliert ihn nicht durch einen Klick auf
„Neu formulieren".

### I-03 — Inhalt steht als Fakt, nicht als Spalte

Kunde, Branche, Projektstand (läuft/abgeschlossen), Art des Projekts
(Kundenprojekt/intern), Zeitraum, Technologien: alles Fakten in `fakt`. In
`story` stehen nur Arbeitstitel, Zuordnung zur Projektart-Vorlage, Status und
Herkunft.

Grund: Zwei Wahrheiten für denselben Sachverhalt driften auseinander. Wäre der
Kunde eine Spalte **und** ein Fakt, würde die Fassung den einen und die
Übersicht den anderen zeigen — und niemand wüsste, welcher stimmt. Die
Übersicht liest den Kunden über einen Join auf `fakt.schluessel = 'kunde'`.

**Der Sonderfall `kunde_id` und `projektart_id`** (E-14): Beide sind
Zuordnungen zu einem Stammdatensatz und damit **Steuerung** — sie sagen,
welche Interview-Hinweise gelten. Der Kundenname als *Inhalt* bleibt ein Fakt.
Beim Zuordnen wird der Fakt einmal vorbelegt und danach nie wieder
angeglichen: Wer ihn im Gespräch korrigiert, hat das letzte Wort. Eine
laufende Synchronisation würde genau diese Korrektur zurücksetzen — das ist
der Unterschied zwischen Vorbelegen und Spiegeln.

### I-04 — Die Vertraulichkeitsfilterung liegt an genau einer Stelle

`fakten.ts` → `faktenFuerZiel(story_id, ziel)` ist der **einzige** Weg, auf dem
Fakten in einen Formulierungs-Prompt gelangen. Kein Handler baut die Liste
selbst zusammen, und der Prompt enthält keine Bitte „lass Internas weg".

Grund: Ein Prompt-Verbot ist eine Bitte, ein fehlender Kontext ist eine
Tatsache. Beim Ziel „Website" darf der Kundenname nicht erscheinen — er wird
deshalb gar nicht mitgeschickt (E-04). Existiert diese Filterung an zwei
Stellen, wird eine davon vergessen.

### I-05 — Stufen werden über eine Zahl verglichen, nie über Text

`STUFEN_RANG = { oeffentlich: 0, intern: 1, vertraulich: 2 }`. Ein
Textvergleich wäre falsch: alphabetisch steht `intern` vor `oeffentlich`, und
eine Filterung `stufe <= ziel.stufe` mit Zeichenketten würde interne Fakten auf
die Website lassen. Diese Zahl ist in `fakten.ts` definiert und wird nirgends
nachgebaut.

### I-06 — Ohne Fakten wird nicht formuliert

Eine Formulierung mit leerem oder fast leerem Faktenbestand wird abgewiesen,
nicht „so gut wie möglich" versucht. Grund: Das Modell füllt Lücken
plausibel — genau das verbietet der Redaktionsleitfaden (Klasse A: erfundene
Zahlen, Zusagen ohne Deckung).

---

## Tabellen

### `projektart` — Art des Vorhabens, trägt Interview-Wissen

| Spalte | Typ | Bemerkung |
|---|---|---|
| `id` | INTEGER PK | |
| `name` | TEXT UNIQUE | „KI-Projekt", „Cloud und Infrastruktur" |
| `beschreibung` | TEXT | wofür diese Art gilt |
| `hinweise` | TEXT | geht in den Interview-Prompt ein; wächst über Lernnotizen |
| `lernmodus` | INTEGER | 1 = Beobachtungen zu dieser Art sammeln |
| `sort`, `aktiv` | INTEGER | |

### `ziel` — Vorlage für eine Textsorte (E-06)

| Spalte | Typ | Bemerkung |
|---|---|---|
| `schluessel` | TEXT UNIQUE | `website`, `kundenreferenz`, `cv`, `angebot` |
| `name`, `beschreibung` | TEXT | |
| `prompt` | TEXT | die Formulierungsanweisung |
| `struktur` | TEXT (JSON) | Abschnitte als `[{schluessel,titel,hinweis}]` |
| `stufe` | TEXT | höchste erlaubte Vertraulichkeit (I-04) |
| `laenge` | TEXT | Richtwert, z. B. „2500–4000 Zeichen" |
| `lernmodus` | INTEGER | |

### `faktenrubrik` — der Katalog dessen, was gebraucht wird (E-11)

| Spalte | Typ | Bemerkung |
|---|---|---|
| `schluessel` | TEXT UNIQUE | `kunde`, `branche`, `ausgangslage`, … |
| `rubrik` | TEXT | Gruppierung in der Faktenansicht |
| `label` | TEXT | Anzeigename |
| `hinweis` | TEXT | für die KI: was gemeint ist, wie nachgefragt wird |
| `pflicht` | INTEGER | zählt in die Fortschrittsanzeige |
| `mehrfach` | INTEGER | 1 = mehrere Fakten unter diesem Schlüssel erlaubt |
| `stufe_vorschlag` | TEXT | Vorgabestufe für Fakten dieses Schlüssels |

### `kunde` — der Auftraggeber als Stammdatensatz (E-14)

| Spalte | Typ | Bemerkung |
|---|---|---|
| `name` | TEXT UNIQUE | der Klarname |
| `branche` | TEXT | eine der 15 Branchen der Website |
| `anonym` | TEXT | „ein internationaler Nutzfahrzeughersteller" |
| `hinweise` | TEXT | gilt bei diesem Kunden für **jede** Projektart |
| `lernmodus` | INTEGER | |

Beim Zuordnen an eine Geschichte werden daraus drei Fakten vorbelegt: Name
(intern), Branche und anonymisierte Beschreibung (beide öffentlich). Einmal,
nicht dauernd — siehe I-03.

### `story` — eine Erfolgsgeschichte in Arbeit

| Spalte | Typ | Bemerkung |
|---|---|---|
| `arbeitstitel` | TEXT | manuell eingegeben, umbenennbar |
| `projektart_id` | INTEGER FK | Steuergröße, kein Inhalt |
| `kunde_id` | INTEGER FK | Steuergröße, kein Inhalt (E-14) |
| `status` | TEXT | `aktiv` · `fertig` · `archiv` |
| `autor` | TEXT | wer daran arbeitet (Vorstufe zur Anmeldung, O-01) |
| `herkunft` | TEXT | `interview` · `import` |
| `quelle` | TEXT | bei Import: URL oder Dateiname |

### `fakt` — der Bestand (E-03)

| Spalte | Typ | Bemerkung |
|---|---|---|
| `story_id` | INTEGER FK | `ON DELETE CASCADE` |
| `schluessel` | TEXT | zeigt auf `faktenrubrik.schluessel`, ohne FK (freie Fakten erlaubt) |
| `wert` | TEXT | |
| `stufe` | TEXT | `oeffentlich` · `intern` · `vertraulich`, Vorgabe `intern` (I-01) |
| `quelle` | TEXT | `interview` · `import` · `manuell` |
| `beleg` | TEXT | woher die Angabe kommt (Belegpflicht des Leitfadens) |
| `sicher` | INTEGER | 0 = vom Nutzer unbestätigt |

### `nachricht` — der Gesprächsverlauf

`rolle`: `assistent` · `nutzer` · `notiz` (Systemereignisse wie „importiert
aus …"). Der Verlauf **ist** die Sitzung, die beim Weiterarbeiten
wiederhergestellt wird.

### `fassung` — die formulierte Erfolgsgeschichte je Ziel

`UNIQUE (story_id, ziel_id)`. `inhalt` ist HTML (WYSIWYG, E-10), `handisch`
merkt sich eine Änderung von Hand (I-02), `fakten_stand` die Anzahl Fakten zum
Zeitpunkt der Erzeugung — daraus entsteht der Hinweis „seit der Formulierung
sind 4 Fakten dazugekommen".

### `fassung_sicherung` — die vorige Version, wenn neu formuliert wird (I-02)

### `lernnotiz` — Beobachtungen im Lernmodus (E-07)

`bezug` (`ziel` · `projektart` · `kunde` · `katalog`), `bezug_id`, `text`,
`begruendung`, `status` (`offen` · `uebernommen` · `verworfen`).

### `setting` — Einstellungen zur Laufzeit

Schlüssel: `ki.anbieter`, `ki.modell`, `ki.effort`, `ki.api_key` (geheim,
Anthropic), `ki.azure_key` (geheim), `ki.azure_endpunkt`,
`ki.azure_deployment`, `ki.azure_version`, `ich.person`.

Der API-Schlüssel liegt damit in der Datenbankdatei und wandert in jede
Sicherung. Für ein lokal laufendes Werkzeug mit einem Nutzer ist das
vertretbar; bei Mehrbenutzerbetrieb (O-01) gehört er in einen
Schlüsselspeicher.

---

## Migrationen

| Nr. | Was | Datum |
|---|---|---|
| — | `schema.sql` legt Version 1 an (Erstausstattung) | 17.09.2026 |
| M-2 | Tabelle `kunde`, Spalte `story.kunde_id`, `lernnotiz.bezug` um `kunde` erweitert; die Projektart „Projekt bei MAN" entfernt und ihr Wissen als Kunde „MAN" übernommen (E-14) | 17.09.2026 |

Zu M-2 zwei Anmerkungen, die beim nächsten Mal Zeit sparen:

- Ein `CHECK` lässt sich in SQLite nicht ändern. Für `lernnotiz.bezug` wurde
  die Tabelle deshalb neu gebaut (anlegen, kopieren, löschen, umbenennen) —
  mit den vorhandenen Notizen.
- Die Migration lief gemessen von Stand 1 auf 2 an einer Datenbank mit
  75 Fakten und zwei Fassungen, ohne Verlust.

`schema.sql` erreicht **bestehende** Datenbanken nie. Ab dem Moment, in dem
echte Geschichten in der Datei stehen, ist `db/migration.ts` der einzige
erlaubte Weg, das Schema zu ändern.
