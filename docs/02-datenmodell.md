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

### I-07 — `schema.sql` und die Migrationen müssen beide auf jeder Datenbank laufen

`datenbank()` führt **erst** `schema.sql` aus, **dann** die Migrationen. Daraus
folgt: In `schema.sql` darf keine Anweisung stehen, die auf einer alten
Datenbank scheitert.

Gemessen am 17.09.2026: Ein `CREATE INDEX IF NOT EXISTS … (fertig, id)` in
`schema.sql` brach den Start mit `no such column: fertig` ab — den Index gab es
nicht, also wurde er angelegt, und die Spalte kam erst mit Migration 3.
`IF NOT EXISTS` schützt vor dem zweiten Anlegen, nicht vor einer fehlenden
Spalte.

Zwei Konsequenzen, beide umgesetzt:

1. Ein Index auf eine per Migration ergänzte Spalte steht **nur** in der
   Migration.
2. Die Migrationen laufen **auch auf einer frischen Datenbank** — jeder
   Schritt ist idempotent (`IF NOT EXISTS`, `hatSpalte()`). Nur so haben neue
   und alte Datenbanken garantiert dasselbe Schema. Vorher übersprang
   `migrieren()` alle Schritte, wenn `user_version = 0` war; damit hing die
   Gleichheit beider Wege daran, dass jemand beide Dateien gleich pflegt.

### I-08 — Im Mehrbenutzerbetrieb kommt der KI-Zugang nur aus der Umgebung

Läuft die Anwendung mit `BITS_EG_MEHRBENUTZER=1`, wird die Tabelle `setting`
für den KI-Zugang **nicht einmal gefragt**. Der Schlüssel kommt aus
`ANTHROPIC_API_KEY` (im Cluster aus einem Sealed Secret), und ein Versuch, ihn
über die Oberfläche zu setzen, wird **sichtbar abgewiesen** —
`abgewiesen: ["ki.api_key"]` statt stillschweigend verworfen.

Zwei Gründe, und beide zählen:

- Ein Schlüssel in der Datenbankdatei ist für jeden lesbar, der an die Datei
  kommt — und er wandert in jede Sicherung.
- Über die Oberfläche könnte ihn **jeder angemeldete Kollege austauschen**.
  Die Kosten liefen weiter auf das BITS-Konto.

Der gefährliche Fall ist die Datei, die aus dem Einzelplatzbetrieb mit einem
Schlüssel darin in den Cluster wandert: Würde er stillschweigend
weiterverwendet, wüsste niemand, welcher der beiden gerade gilt. Gemessen am
07.10.2026 an einer Kopie des echten Bestands: Mit Flag und Schlüssel in der
Datenbank meldet `/api/start` `zugang: false`.

Betroffen sind `ki.api_key`, `ki.azure_key`, `ki.azure_endpunkt`,
`ki.azure_deployment`, `ki.azure_version` und `ki.anbieter`. Alles andere
(Modell, Effort, „Ich bin") bleibt änderbar — sonst wäre die Verwaltung tot.

### I-09 — Die Erstausstattung läuft nur in eine leere Datenbank

Der Server spielt Faktenkatalog, Ziele, Projektarten und Kunden beim Start
ein — aber **nur**, wenn `faktenrubrik` leer ist
(`erstausstattungFallsLeer()` in `server/src/seed/seed.ts`).

Beide Richtungen haben einen Grund, und beide sind gemessen:

**Warum überhaupt beim Start.** Ein frisches Volume hat nach der Migration
ein Schema, aber keine Vorlagen. `/api/gesund` meldet dann `ok: false`, weil
es die Faktenrubriken zählt — im Cluster wird die Readiness-Probe damit nie
grün, der Pod nimmt nie Anfragen an, und niemand erreicht eine Oberfläche,
über die er seeden könnte. Ein `docker compose exec app npm run seed` ist im
Einzelplatz ein Handgriff und im Cluster eine Falle.

**Warum nicht bei jedem Start.** `seed()` ohne `--ersetzen` schreibt nur, was
fehlt, und würde eine geänderte Vorlage nicht zurücksetzen — aber ein bewusst
**gelöschtes** Ziel käme beim nächsten Neustart wieder. Eine Erstausstattung,
die sich nicht abbestellen lässt, ist keine.

Die Bedingung ist dieselbe, die `/api/gesund` prüft. Wer alle Rubriken
entfernt, hat kein benutzbares Werkzeug mehr und bekommt den Lieferstand
zurück; das ist der gewollte Ausgang.

Test: `kern.test.ts`, „I-09" — ein gelöschtes Ziel bleibt gelöscht, eine
leere Datenbank wird gefüllt.

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

### `fassung_sicherung` — abgelegte Fassungen

Zwei Arten in einer Tabelle: die **automatische Sicherung** vor dem Ersetzen
(I-02) und die **benannte Version** von Hand (E-17).

| Spalte | Bemerkung |
|---|---|
| `inhalt`, `titel`, `handisch` | der abgelegte Stand |
| `grund` | warum sie entstand („ersetzt", „von Hand abgelegt") |
| `name` | von Hand gegeben; leer = automatische Sicherung |
| `kommentar` | was an diesem Stand besonders ist |
| `fertig` | 1 = fertige Fassung, im Verlauf filterbar |
| `stufe` | die Grenze des Ziels **zum Zeitpunkt des Ablegens** |

`stufe` wird mitgeschrieben und nicht nachgeschlagen: Ändert jemand später die
Grenze des Ziels, würde eine alte Fassung sonst eine Freigabe behaupten, die
sie nie hatte.

### `lernnotiz` — Beobachtungen im Lernmodus (E-07)

`bezug` (`ziel` · `projektart` · `kunde` · `katalog`), `bezug_id`, `text`,
`begruendung`, `status` (`offen` · `uebernommen` · `verworfen`).

### `sitzung` — wer ist angemeldet (E-19)

| Spalte | Bemerkung |
|---|---|
| `id` | Zufallskennung, 32 Byte; steht signiert im Cookie |
| `sub` | die unveränderliche Kennung des Benutzers bei Keycloak |
| `name`, `email`, `benutzername` | für die Anzeige |
| `rollen` | JSON-Liste der Realm-Rollen aus dem Zugriffstoken |
| `ablauf` | das Minimum aus Tokenablauf und zwölf Stunden |

Serverseitig, damit Abmelden sofort wirkt. Eine abgelaufene Sitzung wird beim
Lesen **gelöscht**, nicht nur ignoriert: Sonst wächst die Tabelle mit jeder
Anmeldung, und ein abgelaufener Eintrag sähe in der Datenbank wie ein
gültiger aus.

Im Einzelplatzbetrieb bleibt die Tabelle leer — dort gibt es keine Anmeldung.

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
| M-3 | `fassung_sicherung` um `name`, `kommentar`, `fertig` und `stufe` erweitert (E-17) | 17.09.2026 |
| M-4 | Tabelle `sitzung` für die Anmeldung (E-19) | 07.10.2026 |

Zu M-2 zwei Anmerkungen, die beim nächsten Mal Zeit sparen:

- Ein `CHECK` lässt sich in SQLite nicht ändern. Für `lernnotiz.bezug` wurde
  die Tabelle deshalb neu gebaut (anlegen, kopieren, löschen, umbenennen) —
  mit den vorhandenen Notizen.
- Die Migration lief gemessen von Stand 1 auf 2 an einer Datenbank mit
  75 Fakten und zwei Fassungen, ohne Verlust.

`schema.sql` erreicht **bestehende** Datenbanken nie. Ab dem Moment, in dem
echte Geschichten in der Datei stehen, ist `db/migration.ts` der einzige
erlaubte Weg, das Schema zu ändern.
