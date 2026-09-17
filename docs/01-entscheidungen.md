# Entscheidungen

Festlegungen mit Begründung. Nummern werden **nie** neu vergeben; überholte
Einträge bleiben stehen mit `Status: überholt durch E-nn`.

---

## E-01 — Eigene Web-Anwendung, nicht ein Single-File-HTML-Deck

*17.09.2026*

Die anderen Arbeitsströme in `C:\Projekte\Claude\BITS` sind selbsttragende
HTML-Dateien. Hier geht das nicht: Das Werkzeug braucht Persistenz über
Sitzungen (Weiterarbeiten an einer Geschichte), editierbare Vorlagen und einen
**API-Schlüssel**. Ein Schlüssel im Browser-JavaScript ist bei einer Datei, die
per Doppelklick geöffnet und per Mail verschickt wird, nicht zu halten.

Also: Backend mit Datenbank, Frontend im Browser, Schlüssel bleibt auf dem
Server.

## E-02 — Architektur und Werkzeugkasten von der BITS Machine übernommen

*17.09.2026*

Node 24 führt TypeScript direkt aus (kein Build im Backend), SQLite ist in Node
eingebaut (`node:sqlite`), der HTTP-Server ist `node:http` ohne Framework, das
Frontend ist React 19 + Vite. Migrationen über `PRAGMA user_version`.

Grund: Marc betreibt die BITS Machine schon; derselbe Kasten heißt dieselben
Befehle, dieselben Fallen, dieselbe Doku-Systematik (`docs/0x-*.md`). Zwei
verschiedene Stacks im selben Verzeichnisbaum wären Selbstzweck.

## E-03 — Fakten sind die Wahrheit, Fassungen sind Ableitungen

*17.09.2026*

Eine Erfolgsgeschichte hat **einen** Faktenbestand und **mehrere** Fassungen
(je Ziel eine). Eine Fassung wird aus Fakten erzeugt und ist verwerfbar; ein
Fakt nicht.

Die Alternative — je Ziel einen eigenen Text pflegen — führt genau zu dem
Zustand, den das Werkzeug beheben soll: vier Fassungen desselben Projekts, die
sich in den Zahlen widersprechen.

## E-04 — Jeder Fakt trägt eine Vertraulichkeitsstufe; das Ziel setzt die Grenze

*17.09.2026*

Drei Stufen: `oeffentlich` · `intern` · `vertraulich`. Jedes Ziel hat eine
Höchststufe. Die Formulierung bekommt **nur** Fakten bis zu dieser Stufe zu
sehen — nicht „bitte weglassen" im Prompt, sondern gar nicht im Kontext.

Grund: Ein Prompt-Verbot ist eine Bitte. Beim Ziel „Website" darf der
Kundenname nicht durchrutschen; wenn er nie im Kontext steht, kann er nicht
durchrutschen. Das ist die einzige Stelle, an der das Werkzeug wirklich Schaden
anrichten könnte, und sie ist deshalb nicht dem Modell überlassen.

**Standardstufe eines neuen Fakts ist `intern`** (I-01) — die konservative
Richtung. Ein Fakt wird durch eine Entscheidung öffentlich, nicht durch
Vergessen.

## E-05 — KI-Anbieter hinter einer Schnittstelle, Anthropic zuerst

*17.09.2026*

`server/src/ki/anbieter.ts` hat eine Funktion `frage()`. Dahinter liegen zwei
Umsetzungen: Anthropic (Claude, über `@anthropic-ai/sdk`) und Azure OpenAI
(über `fetch`, Endpunkt + Deployment konfigurierbar). Umschaltbar in den
Einstellungen, ohne Codeänderung.

Grund: Für den Proof of Concept ist Claude das bessere Modell; für den
Regelbetrieb mit Kundendaten wird eine datenschutzkonforme API in europäischer
Azure-Region gebraucht. Wenn der Wechsel erst dann konstruiert wird, wird er
teuer.

## E-06 — Ein Ziel ist eine Vorlage aus Prompt, Struktur, Grenze und Lernflag

*17.09.2026*

Ziele liegen in der Datenbank, nicht im Code. Wer eine neue Textsorte braucht,
legt sie in der Verwaltung an. Vier mitgelieferte Ziele: Website, Interne
Kundenreferenz, Mitarbeiter-CV, Angebot/Pitch.

## E-07 — Gelernt wird über Vorschläge, nicht durch stille Selbstveränderung

*17.09.2026*

Im Lernmodus schreibt die KI keine Vorlage um. Sie legt **Lernnotizen** an
(„bei Infrastrukturprojekten fehlte dreimal die Frage nach dem Wartungsfenster"),
die in der Verwaltung sichtbar sind und per Knopf in die Vorlage übernommen
werden — oder verworfen.

Grund: Eine Vorlage, die sich selbst umschreibt, ist nach zwanzig Läufen
niemandes Entscheidung mehr. Und ein Prompt, der schlechter geworden ist, wäre
ohne Verlauf nicht mehr reparierbar.

## E-08 — Import extrahiert Fakten, erfindet aber keinen Gesprächsverlauf

*17.09.2026*

Beim Import einer bestehenden Erfolgsgeschichte (Text oder URL) werden Fakten
mit Quelle `import` angelegt und ein Verlaufseintrag „importiert aus …"
geschrieben. Der Assistent fragt danach die Lücken ab.

Grund: Ein rekonstruierter Dialog würde Menschen Aussagen zuschreiben, die sie
nie gemacht haben, und einen abgeschriebenen Text wie einen belegten Fakt
aussehen lassen. Die Herkunft eines Fakts ist im Redaktionsleitfaden (Klasse A:
„Belegen statt behaupten") der Unterschied zwischen zulässig und nicht.

## E-09 — In der Oberfläche heißt es „Erfolgsgeschichte"

*17.09.2026*

Der Redaktionsleitfaden von `mybits.de` legt „Erfolgsgeschichten" als
Gattungsnamen fest, nicht „Case Studies" (dort nur der Pfad `/case-studies/`).
Das Werkzeug folgt dem: Oberfläche, Doku und Feldnamen sagen
„Erfolgsgeschichte". Im Code heißt die Tabelle `story` — kurz, und der
Konflikt zwischen deutschen Fachbegriffen und SQL-Bezeichnern wird damit
einmal an einer Stelle entschieden.

## E-10 — WYSIWYG-Editor auf `contenteditable`, ohne Fremdbibliothek

*17.09.2026*

Der Editor ist ein `contenteditable`-Bereich mit einer Werkzeugleiste
(fett, kursiv, H2, H3, Liste, Zitat, Link, Format entfernen). Keine
Editor-Bibliothek.

Grund: Der gebrauchte Funktionsumfang ist klein und die Texte sind kurz. Eine
Editor-Bibliothek würde das Frontend um ein Vielfaches größer machen als die
gesamte übrige Anwendung. Nachteil, bewusst getragen: `document.execCommand`
ist abgekündigt (A-03) — funktioniert aber in allen aktuellen Browsern, und
der Ersatz wäre bei Bedarf ein lokaler Umbau.

## E-11 — Der Faktenkatalog ist Daten, keine Programmlogik

*17.09.2026*

Welche Fakten eine Erfolgsgeschichte braucht, steht in der Tabelle
`faktenrubrik` (Rubrik, Schlüssel, Label, Pflicht, Hinweis für die KI). Daraus
entstehen die Fortschrittsanzeige („7 von 12 Pflichtfakten"), die Reihenfolge
der Interviewfragen und der Prompt-Abschnitt „was noch fehlt".

Grund: Der Katalog wird sich ändern, sobald die ersten echten Geschichten durch
das Werkzeug laufen. Als Tabelle ist das eine Eingabe, als Code ein Release.

## E-12 — Ein Modellaufruf je Nutzerantwort, mit strukturierter Ausgabe

*17.09.2026*

Der Interviewschritt ist **ein** Aufruf mit einem Zod-Schema
(`client.messages.parse` + `zodOutputFormat`): Er liefert gleichzeitig die
extrahierten Fakten, die nächste Frage und eine Einschätzung der
Vollständigkeit. Die Formulierung der Fassung ist ein **eigener**, getrennter
Aufruf.

Grund: Zwei Aufrufe je Antwort (erst extrahieren, dann fragen) kosten das
Doppelte an Zeit und Geld, ohne dass der zweite mehr wüsste. Getrennt bleibt
nur die Formulierung — sie läuft auf einem anderen Faktenschnitt (E-04) und
soll nicht bei jeder Antwort neu laufen.

## E-13 — Modell: `claude-opus-5` mit adaptivem Denken

*17.09.2026*

Kein Herunterstufen auf ein kleineres Modell, um zu sparen — das ist eine
Entscheidung des Nutzers und steht in den Einstellungen. Effort-Stufe
`high` für das Interview, `xhigh` für die Formulierung.

## E-14 — Der Kunde ist ein Stammdatensatz, keine Projektart

*17.09.2026 — auf Wunsch von Marc*

Ursprünglich stand „Projekt bei MAN" als **Projektart** in der
Erstausstattung. Das war falsch modelliert: Eine Projektart beschreibt die
*Art des Vorhabens* (KI-Projekt, Cloud, Integration), ein Kunde die
*Gegenseite*. Beide Achsen kreuzen sich — dieselbe Projektart kommt bei vielen
Kunden vor, und was man bei einem bestimmten Auftraggeber fragen muss, gilt
dort für jede Projektart.

Deshalb: Tabelle `kunde` mit eigenen `hinweise`, und der Interview-Kontext ist
die **Kombination** aus Projektart-Hinweisen und Kundenhinweisen. Beide gehen
getrennt benannt in den Prompt, damit im Lernmodus zuzuordnen bleibt, woher
ein Hinweis kommt und wohin eine neue Beobachtung gehört (`lernnotiz.bezug`
kennt jetzt auch `kunde`).

Ein Kundendatensatz trägt außerdem `branche` und `anonym` („ein
internationaler Nutzfahrzeughersteller"). Beim Zuordnen werden daraus drei
Fakten vorbelegt: Name (intern), Branche und anonymisierte Beschreibung (beide
öffentlich). Das ist die häufigste Handarbeit, die damit entfällt — und der
Grund, warum die Website-Fassung den Kunden überhaupt beschreiben kann.

**Vorbelegt heißt einmal, nicht dauernd** (siehe I-03): Wer den Fakt später im
Gespräch korrigiert, hat das letzte Wort. Eine ständige Synchronisation würde
die Korrektur wieder überschreiben.

## E-15 — Zwei Hilfen bei der Eingabe: zerlegen und vorschlagen

*17.09.2026 — auf Wunsch von Marc*

Die Eingabehürde ist das eigentliche Risiko des Werkzeugs (A-01/A-02). Zwei
Knöpfe im Gespräch senken sie:

- **„Eins nach dem anderen abfragen"** zerlegt die letzte Frage in zwei bis
  fünf Teilfragen, jede mit einem eigenen Eingabefeld. Gesendet wird eine
  zusammengesetzte Antwort — ein Modellaufruf, nicht fünf.
- **„Antwort vorschlagen"** entwirft eine wahrscheinliche Antwort aus dem
  vorhandenen Bestand.

Der Unterschied zwischen den beiden ist der entscheidende Teil: **Zerlegen
erfindet nichts, es sortiert. Vorschlagen rät.** Ein geratener Wert, der
unbemerkt abgesendet wird, landet als Fakt im Bestand und ist später von einer
echten Angabe nicht mehr zu unterscheiden — das wäre der schlimmste Fehler,
den dieses Werkzeug machen kann.

Deshalb drei Sicherungen beim Vorschlag:

1. Der Prompt verlangt **eckige Klammern** um jede geratene Angabe
   (`[X Stunden]`).
2. Das Modell liefert zusätzlich eine Liste `geraten` im Klartext, die über
   dem Eingabefeld erscheint.
3. Der Vorschlag wird **ins Eingabefeld gelegt, nicht gesendet**. Absenden
   bleibt eine Handlung des Nutzers.

Gemessen am 17.09.2026: Zerlegen 5 Sekunden, Vorschlag 6 Sekunden; der
Vorschlag markierte alle fünf unbekannten Angaben und ergänzte von sich aus
den Freigabevorbehalt des Kunden.

## E-16 — Fortschritt als Ereignisstrom, mit den Denkschritten des Modells

*17.09.2026 — auf Wunsch von Marc*

Gemessen dauert ein Import 87 Sekunden, eine Formulierung 61, ein
Interviewschritt 10 bis 13. Ein ausgegrauter Knopf sagt in dieser Zeit nur
„irgendwas passiert".

Alle fünf KI-Endpunkte antworten deshalb als Server-Sent-Events und melden
Arbeitsschritte, die Zwischenüberlegungen des Modells (`thinking` mit
`display: 'summarized'`) und die Länge der entstehenden Antwort. Übernommen
aus der BITS Machine, wo es für den KI-Assistenten gebaut wurde (E-02).

Zwei Dinge, die dabei nicht selbstverständlich sind:

- **Streaming und strukturierte Ausgabe gehen zusammen**, aber nicht über
  `messages.parse()` — das kann nicht streamen. Der Weg ist
  `messages.stream()` mit `output_config.format`; `finalMessage()` liefert
  dann trotzdem ein `parsed_output`.
- **`display: 'summarized'` ist Pflicht.** Bei Claude Opus 5 ist die Vorgabe
  `omitted`, und dann kommen leere Denkblöcke an — die Anzeige wäre eine lange
  Pause statt einer Meldung.

Ohne Melder läuft alles unverändert, nur stumm (`STILL`): Tests und künftige
Batchläufe müssen nichts davon wissen.

## E-17 — Benannte Versionen einer Fassung

*17.09.2026 — auf Wunsch von Marc*

Bisher entstand eine abgelegte Fassung nur als **Nebenprodukt**: Sie wurde
gesichert, weil etwas sie ersetzte (I-02). Was fehlte, war das Gegenteil —
jemand entscheidet, dass *dieser* Stand einen Namen verdient: „Website-Fassung
v1, nach Freigabe durch den Kunden".

Der Knopf „Version speichern" fragt nach Name, Kommentar und einem Haken
**„Fertige Fassung"**. Im Verlauf lässt sich darauf filtern, und die
Vertraulichkeitsstufe steht als eigene Spalte daneben.

Beides liegt in derselben Tabelle (`fassung_sicherung`), weil beides eine
abgelegte Fassung ist; `name` und `fertig` unterscheiden sie. Eine zweite
Tabelle hätte dieselben Spalten, dieselbe Zurückhol-Logik und eine zweite
Stelle, die man beim Zurückholen vergisst.

**Die Stufe wird mitgeschrieben, nicht nachgeschlagen.** Wird die Grenze eines
Ziels später geändert, muss an der Version stehen, unter welcher Grenze sie
entstanden ist — sonst behauptet eine alte Fassung eine Freigabe, die sie nie
hatte. Aus demselben Grund ist die Stufe im Dialog sichtbar, aber **nicht
eingebbar**: Eine Fassung, die aus öffentlichen Fakten entstanden ist, wird
nicht dadurch intern, dass jemand es behauptet (I-04).
