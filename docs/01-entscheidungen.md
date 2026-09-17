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
