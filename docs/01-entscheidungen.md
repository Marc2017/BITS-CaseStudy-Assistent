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

## E-18 — Betrieb im Cluster: ein Image, SQLite auf einem Datenträger

*07.10.2026 — nach dem Rat von Florian Wenzel, Vorlage `BITS-GmbH/bits-burn`*

Das Werkzeug soll für alle Kollegen laufen, nicht auf einem Rechner. Florians
Weg: containerisieren, CI/CD über GitHub Actions nach Harbor, und bits-burn
als Muster nehmen. Das ist übernommen — mit drei begründeten Abweichungen:

**Ein Image statt zwei.** bits-burn trennt `web` (nginx) und `api` (NestJS).
Hier liefert der Node-Server das gebaute Frontend selbst aus; ein zweites
Image wäre ein zweites Deployment, ein zweiter Service und eine zweite Route
für dieselbe Sache.

**Node 24 statt 22.** Kein Geschmack: Das Backend führt TypeScript direkt aus
und nutzt `node:sqlite`. Unter Node 22 startet es nicht.

**SQLite auf einem `PersistentVolumeClaim` statt Postgres.** Das ist die
folgenreichste Abweichung, und sie erzwingt drei Dinge im Deployment:
`replicas: 1`, `strategy: Recreate` und `fsGroup: 1000`. Zwei Pods auf
derselben Datei sind der Weg, einen Bestand zu verlieren.

Der Wechsel auf Postgres wird fällig, sobald eines gilt: mehrere Pods, ein
punktgenaues Zurückspielen, oder mehr als eine Handvoll gleichzeitiger
Interviews. Der Umbau betrifft `server/src/db/` vollständig und ist ein
eigenes Vorhaben. Bis dahin ist die Entscheidung bewusst klein gehalten:
Ein Datenträger und eine Datei sind nachvollziehbar, ein zweiter Dienst wäre
eine zweite Sache, die jemand betreiben muss.

Einzelheiten und die Handgriffe für Marc und Florian: `docs/07-betrieb.md`.

## E-19 — Anmeldung über Keycloak, Rollen in zwei Stufen

*07.10.2026 — auf Wunsch von Marc („Single Sign On für die Kollegen, ggf. mit
Rollen")*

OpenID Connect gegen Keycloak (`id.mybits.dev`, Realm `master`), Authorization
Code mit PKCE, serverseitige Sitzung in einem signierten Cookie.

**Ohne Bibliothek.** bits-burn benutzt `openid-client`, weil es dort an
NestJS und Express hängt. Hier ist der Server `node:http` pur, und der
gebrauchte Teil des Protokolls sind drei HTTP-Aufrufe — eine Abhängigkeit
dafür wäre mehr Code, nicht weniger.

**Keine Signaturprüfung am Token, und warum das hier richtig ist.** Das Token
kommt nicht von einem Client, sondern direkt vom Token-Endpunkt — über eine
TLS-Verbindung, die dieser Prozess selbst aufgebaut und mit dem
Client-Secret authentisiert hat. Wer diese Antwort fälschen könnte, hätte
schon TLS gebrochen; ein über dieselbe Verbindung geholter JWKS-Schlüssel
fügt nichts hinzu. Geprüft werden die Angaben, die auch ein echtes Token
falsch haben kann: **Aussteller, Empfänger, Ablauf**. Käme ein Token je von
außen (ein Bearer-Header eines Kommandozeilenwerkzeugs), gilt das nicht mehr
— dann muss die Signatur geprüft werden. Einen solchen Weg gibt es hier
bewusst nicht.

**Sitzung serverseitig, nicht als JWT im Cookie.** Zwei Gründe: Abmelden
wirkt sofort (ein JWT bliebe bis zum Ablauf gültig), und die Rollen bleiben
nachlesbar, statt vom Browser mitgebracht zu werden. Das Cookie trägt nur
Kennung und HMAC darüber; `timingSafeEqual` beim Vergleich, damit die
Laufzeit nicht verrät, wie viele Zeichen schon stimmen.

**Zwei Rollenstufen, nicht mehr.** Wer angemeldet ist, darf
Erfolgsgeschichten schreiben — das ist der Zweck des Werkzeugs, und eine
feinere Abstufung wäre eine Hürde ohne Nutzen. Wer die Realm-Rolle
`erfolgsgeschichten-verwalter` hat, darf zusätzlich Vorlagen, Kunden,
Faktenkatalog und Einstellungen ändern. **Lesen bleibt frei:** Die
Verwaltung zu sehen hilft beim Verstehen, und ohne sie wäre die Seite leer.

Geprüft wird auf Methode **und** Pfad (`brauchtVerwalter()`): `GET` ist
immer frei, `PUT` auf `/api/verwaltung/*` und `/api/einstellungen` braucht die
Rolle.

## E-20 — Eigene Adresse, eigener Namespace: `stories.mybits.dev` in `stories`

*07.10.2026 — Adresse auf Wunsch von Marc („den Host würde ich kürzer"),
Namespace nach Florians Auskunft*

Die Anwendung erreicht man unter **`stories.mybits.dev`** und sie läuft im
Namespace **`stories`**. Beides war vorher `erfolgsgeschichten…` bzw.
`hackathon-vibe`.

**Warum die Adresse kürzer ist.** `erfolgsgeschichten.mybits.dev` sind 29
Zeichen, die jemand tippt, vorliest oder in eine Teams-Nachricht schreibt.
Es ist derselbe Fall wie auf der Website: Der Gattungsname bleibt
„Erfolgsgeschichte" — im Werkzeug, in der Oberfläche, in dieser Akte —, aber
der Pfad dort heißt `/case-studies/`. Eine technische Adresse ist kein
Sprachbekenntnis.

**Warum ein eigener Namespace.** Vorher lagen die Manifeste in
`hackathon-vibe`, dem Namespace von bits-burn, und der Grund dafür war
Unwissen: Dort waren Pull-Secret, Istio-Selector und ClusterIssuer schon
eingerichtet, und es war offen, was ein eigener Namespace davon neu braucht.
Florian hat das beantwortet: **Der Istio-Selector ist derselbe, der
ClusterIssuer gilt clusterweit, und das Harbor-Pull-Secret wird in alle
Namespaces übertragen.** Damit kostet ein eigener Namespace nichts und
trennt den Bestand von fremden Anwendungen — was bei einer Datei als
Datenbank mehr wert ist als bei einem Dienst mit eigenem Zugang.

Ungemessen bleibt eine Stelle: das Label für die Sidecar-Einbindung.
`k8s/namespace.yml` setzt `istio-injection: enabled`; eine revisionsbasierte
Istio-Installation will stattdessen `istio.io/rev`. Steht das falsche da,
bleibt der Sidecar **still** weg — die Anwendung läuft, mTLS im Cluster fehlt.
Prüfbar mit `kubectl get pod -n stories` (2/2 statt 1/1).

**Was ausdrücklich nicht umbenannt wurde**, weil es nicht die Adresse ist:

| Bleibt | Warum |
|---|---|
| Harbor-Projekt `harbor.mybits.dev/erfolgsgeschichten/app` | Florian legt es an; ein zweiter Name wäre eine zweite Absprache |
| Keycloak-Client-ID `erfolgsgeschichten` | derselbe Grund — Florian legt den Client an |
| Realm-Rolle `erfolgsgeschichten-verwalter` | steht in Keycloak, in `k8s/config.yml` und in den Tests (E-19) |
| Objektnamen im Cluster (`erfolgsgeschichten`, `-daten`, `-ingress-cert`, …) | benennen die **Anwendung**, nicht ihre Adresse. Im Namespace `stories` wäre `stories-daten` eine Tautologie |
| Datenbankdatei `erfolgsgeschichten.db` | eine Umbenennung hieße: Migration des Bestands, ohne Gegenwert |

## E-21 — Die Erstausstattung spielt der Server ein, nicht der Mensch

*07.10.2026 — Befund aus der Container-Abnahme*

Bis hierher war `npm run seed` ein Schritt in der Einrichtung. Im Container
fiel auf, dass das nicht trägt: Ein frisches Volume liefert `ok: false` an
`/api/gesund`, und im Cluster heißt das, dass der Pod nie bereit wird. Der
Seed läuft jetzt beim Start, wenn die Datenbank leer ist (I-09).

**Drei Wege standen zur Wahl:**

| Weg | Warum nicht |
|---|---|
| Init-Container | braucht dasselbe Image und dieselbe Umgebung ein zweites Mal — zwei Stellen, die auseinanderlaufen können |
| Job nach dem Ausrollen | eine Reihenfolge, die jemand kennen und einhalten muss; beim zweiten Cluster vergisst man sie |
| **beim Start, wenn leer** | eine Stelle, kein Handgriff, und im Einzelplatz genauso richtig |

Der dritte Weg hat einen Preis: Der Start schreibt in die Datenbank. Das ist
vertretbar, weil er es nur in eine **leere** tut — die Bedingung ist dieselbe,
die der Gesundheitsendpunkt prüft, und damit gibt es keinen Zustand, in dem
der Server etwas einspielt, das jemand bewusst entfernt hat.

`npm run seed` bleibt als Befehl bestehen, für `--ersetzen` und für den Fall,
dass jemand den Lieferstand zurückholen will.

## E-22 — Hell ist die Vorgabe, dunkel bleibt, die Wahl gehört der Person

*08.10.2026 — auf Wunsch von Marc („das Layout bitte auf einen hellen Modus
umstellen, gerne ein Darkmode-Umschalter — individuell für jeden User")*

Das Werkzeug startet **hell**. Ein Umschalter in jeder Kopfzeile wechselt zu
dunkel, und die Wahl gilt **pro Person und Gerät**.

**Warum nicht in der Datenbank.** Die Wahl liegt in `localStorage`. Sie in
`setting` zu schreiben hieße: eine Migration, ein Feld je Benutzer, ein
API-Aufruf bei jedem Klick — für eine Angabe, die niemand vermisst, wenn sie
verloren geht. Im Einzelplatzbetrieb gibt es zudem keinen Benutzer, an dem
sie hängen könnte. Der Preis ist bekannt und klein: Wer den Browser wechselt,
wählt neu.

**Warum der Startwert aus dem System kommt.** Ohne eigene Wahl entscheidet
`prefers-color-scheme`. Wer seinen Rechner dunkel gestellt hat, bekommt
dunkel — und wer hier klickt, überschreibt das dauerhaft.

**Eine Palette, ein Ort.** `:root` trägt hell, `:root[data-theme="dark"]`
dunkel. Ein `@media (prefers-color-scheme: dark)` im CSS gibt es
**ausdrücklich nicht**: Dann stünde die dunkle Palette zweimal da, und zwei
Blöcke, die man synchron halten muss, laufen auseinander. Stattdessen setzt
ein Skript in `index.html` das Attribut immer ausdrücklich — vor dem ersten
Rendern, damit nicht die falsche Farbe aufblitzt.

**Das Blatt bleibt Papier.** In beiden Themen. Eine Erfolgsgeschichte soll
aussehen wie das, was sie wird; ein dunkles Blatt wäre eine Programmfläche,
kein Text. Das kostete eine Anpassung: Im Hellmodus liegt warmes Papier auf
hellem Grund, und bei fast gleicher Helligkeit verschwimmt beides. Der Grund
ist darum **kühl** (`#EEF3F9`) und das Blatt hat einen Rahmen — der Farbton
trennt, wo die Helligkeit es nicht kann.

**Die Kontraste sind gemessen, nicht geschätzt**, und der Test rechnet sie
aus dem CSS nachträglich nachvollziehbar aus (`kern.test.ts`, „Thema").
Zwei Werte haben dabei nicht gereicht und wurden geändert: die Trennlinie
(1.26:1 → 1.36:1) und der Hinweis auf dem leeren Blatt (2.49:1 → 3.71:1).
Letzterer ist derselbe, dessen CSS-Regel am Vortag repariert wurde (F-05) —
die Regel wirkte danach, die Farbe trug trotzdem nicht.

## E-23 — Mehrere Personen an einer Erfolgsgeschichte

*08.10.2026 — auf Wunsch von Marc („jeder kann unterschiedliche Fragen
beantworten und oder zu gleichen Fragen unterschiedliche Blickwinkel
liefern")*

Eine Erfolgsgeschichte entsteht selten in einem Kopf. Wer sie anlegt, kennt
den Rahmen; die Technik weiß ein anderer, die Wirkung beim Kunden ein
Dritter. Drei Dinge bilden das ab:

**1. Anfragen.** Wer eine Geschichte anlegt, kann Kollegen bitten
mitzuarbeiten — mehrere gleichzeitig, und ein Gebetener kann selbst
weiterbitten. Eine Anfrage trägt die Adresse, einen Hinweis in eigenen Worten
und einen Status.

Die Adresse wird **nicht** gegen bekannte Anmeldungen geprüft. Der häufigste
Fall ist, jemanden hinzuzuholen, der die Anwendung noch nie geöffnet hat —
eine Prüfung würde genau das verhindern. Darum läuft die Zuordnung über die
E-Mail-Adresse und nicht über die Keycloak-Kennung: Die Bitte entsteht,
bevor es eine Kennung gibt.

**2. Überspringen — und zwar je Person.** Das ist der Kern, und es ist die
Stelle, an der man das Gegenteil bauen kann. Ein übersprungener Punkt
verstummt nur für **die Person, die ihn übersprungen hat**. Für alle anderen
bleibt er offen; genau dafür holt man jemanden dazu. Wer das „je Person"
weglässt, baut eine Funktion, die den Zweck zerstört: Die Frage wäre für
immer weg, und der hinzugeholte Kollege würde nie gefragt.

Der Interview-Prompt bekommt daraus drei Angaben: was diese Person
übersprungen hat (nicht wiederholen — sie hat nicht geschwiegen, sondern
gesagt, dass sie es nicht weiß), was **andere** übersprungen haben
(vielleicht weiß diese Person es), und die Anweisung, deutlich zu sagen, wenn
für diese Person nichts mehr zu holen ist.

Zur Auswahl stehen die offenen Punkte, nicht „die letzte Frage". Eine Frage
im Gespräch berührt oft mehrere Punkte, und welchen die Person nicht weiß,
weiß nur sie.

**3. Herkunft.** Jeder Fakt hält fest, von wem er stammt — im Interview wie
beim Eintragen von Hand. Das macht aus einem Bestand eine Spur: Wer etwas
nachfragen will, weiß, wen. Daraus folgt unmittelbar **I-10** — diese
Angaben dürfen in keinen Formulierungs-Prompt gelangen.

**Was es nicht gibt:** einen Schutz gegen widersprechende Angaben zweier
Personen bei Einzelrubriken. Dort gilt die letzte Angabe. Für zwei
Blickwinkel auf dieselbe Sache sind Mehrfach-Rubriken der Weg (`mehrfach`
im Katalog), und die gibt es für die Rubriken, bei denen es darauf ankommt.
Siehe O-08.

## E-24 — Mailversand ist optional, und optional heißt wirklich optional

*08.10.2026 — auf Marcs Entscheidung („1 und 2 — wenn in den Einstellungen
ein SMTP-Server eingetragen ist, kann dann mit Checkbox auch eine E-Mail
versendet werden")*

Ohne Mailserver funktioniert alles: Die Anfrage erscheint beim Gefragten auf
der Startseite unter „Für mich angefragt", und der Link zur Geschichte steht
zum Weitergeben da. Ist ein Server eingetragen, kommt ein Haken „Auch eine
E-Mail schicken" dazu.

**Der Link steht immer da, auch wenn eine Mail rausgeht.** Er ist der Weg,
der nicht scheitern kann — per Teams geschickt, in einen Termin gelegt,
vorgelesen. Eine Mail im Spam-Ordner ist unsichtbar; ein Link, den man selbst
verschickt, nicht.

**Die Anfrage wird zuerst gespeichert, die Mail danach versucht.** Scheitert
der Versand, bleibt die Bitte bestehen und der Grund steht an ihr. Der
umgekehrte Weg verliert bei jedem Netzproblem eine Bitte, ohne dass es
jemand merkt.

**Die Mail enthält Arbeitstitel und Hinweis — keinen Inhalt.** Sie verlässt
die Anwendung und landet in einem Postfach, das wir nicht kennen; Fakten
können intern oder vertraulich sein (I-04). Wer mitarbeiten soll, klickt den
Link und ist dann angemeldet.

**Das SMTP-Passwort fällt unter I-08**: im Mehrbenutzerbetrieb nur aus der
Umgebung. In der Datei wäre es für jeden lesbar, der an die Datei kommt, und
über die Oberfläche könnte jeder Angemeldete den Absender unseres Hauses
übernehmen. Host, Port und Absenderadresse sind keine Geheimnisse und bleiben
editierbar. Gemessen: `aenderbar('mail.passwort')` ist im
Mehrbenutzerbetrieb `false`, `aenderbar('mail.host')` ist `true`.

`nodemailer` als Abhängigkeit, gegen die Linie „keine Bibliothek, wo drei
Aufrufe genügen" (E-19). Bei SMTP genügen sie nicht: STARTTLS, AUTH,
Zeilenlängen, Punkt-Stuffing und MIME-Kodierung für Umlaute sind mehr
Fallen, als ein selbstgebauter Client wert ist.
