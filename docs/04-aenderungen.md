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

---

## 07.10.2026 — Betriebsfähig für alle Kollegen

Anlass: Marcs Frage an Florian Wenzel („Wie bekomme ich die Tools bei uns zum
Laufen? Single Sign On für die Kollegen, ggf. mit Rollen") und dessen Antwort —
containerisieren, CI/CD über GitHub Actions nach Harbor, `BITS-GmbH/bits-burn`
als Vorlage.

### Was dazugekommen ist

| Datei | Was |
|---|---|
| `Dockerfile` | ein Image: Frontend bauen, Backend liefert es aus |
| `.github/workflows/build-and-push.yml` | Harbor-Push bei Push auf `main` |
| `k8s/*.yml` | Deployment mit Datenträger, Service, Gateway, Konfiguration |
| `docker-compose.yaml` | lokaler Betrieb **mit** Keycloak und zwei Testbenutzern |
| `server/src/auth/` | OIDC, Sitzungen, Wächter |
| `server/src/db/betrieb.ts` | die Betriebsart als Umgebungsvariable |
| `docs/07-betrieb.md` | die Anleitung — wer was tun muss |

Entscheidungen: E-18 (Cluster), E-19 (Anmeldung). Neue Invariante: I-08
(KI-Zugang nur aus der Umgebung). Migration M-4 (Tabelle `sitzung`).
O-01 ist entschieden; O-05 ist von einer theoretischen zu einer konkreten
Frage geworden; O-06 (Sicherung) und O-07 (Repository im falschen Account)
sind neu.

### Gemessen

22 Tests grün (fünf neue zur Anmeldung, drei zu I-08). Beide Typprüfungen
ohne Befund. Alle YAML-Dateien gültig geparst, Dockerfile-Pfade geprüft
(jede `COPY`-Quelle existiert, das `CMD`-Ziel auch).

Im echten HTTP-Lauf, gegen eine **Kopie** des Bestands:

| Aufruf | Erwartet | Gemessen |
|---|---|---|
| `GET /api/gesund` | offen für die Probes | 200 |
| `GET /api/start` ohne Sitzung | 401 mit Anmeldeweg | `{"fehler":"Nicht angemeldet.","anmelden":"/auth/login"}` |
| `GET /` ohne Sitzung | zur Anmeldung | 302 → `/auth/login` |
| `GET /auth/login` | zu Keycloak, mit PKCE | 302 mit `code_challenge_method=S256` |
| Cookie mit erfundener Signatur | abgewiesen | 401 |
| Kennung ohne Signatur | abgewiesen | 401 |
| Rücksprung ohne Anmeldeversuch | abgewiesen | „Der Anmeldeversuch ist abgelaufen …" |
| Rücksprung mit falschem `state` | abgewiesen | „Der Rücksprung gehört nicht zu diesem Anmeldeversuch." |
| I-08: Schlüssel in der DB, Flag an | zählt nicht | `zugang: false` |
| I-08: Schlüssel über die API setzen | abgewiesen | `abgewiesen: ["ki.api_key"]`, `ki.modell` im selben Aufruf gesetzt |

### Nicht gemessen

- **Das Image wurde nie gebaut** — auf diesem Rechner ist kein Docker.
  Geprüft sind Pfade und Syntax, nicht der Lauf.
- **Die Manifeste wurden nie angewandt** — dafür braucht es einen Cluster.
- **Der Token-Tausch mit Keycloak** — der halbe Weg ist gemessen (die
  Authorization-URL stimmt, der Rücksprung wird korrekt geprüft), aber kein
  echtes Token wurde eingelöst. Dafür braucht es die Keycloak-Instanz aus
  `docker-compose.yaml` oder `id.mybits.dev`.

Das sind drei Messungen, die alle am fehlenden Docker hängen — und die erste
davon passiert ohnehin im Runner.

---

## 07.10.2026 — Adresse `stories.mybits.dev`, eigener Namespace `stories`

**Warum.** Zwei Anlässe am selben Tag. Marc wollte die Adresse kürzer —
`erfolgsgeschichten.mybits.dev` sind 29 Zeichen, die jemand vorliest oder in
eine Teams-Nachricht tippt. Und Florian hat die Frage beantwortet, die bis
dahin als Punkt 2 in `07-betrieb.md` an ihn gerichtet war: **Istio-Selector
derselbe, ClusterIssuer clusterweit, Harbor-Pull-Secret wird in alle
Namespaces übertragen.** Damit fiel der Grund weg, im fremden Namespace
`hackathon-vibe` (dem von bits-burn) mitzuwohnen — das war Vorsicht aus
Unwissen, keine Entscheidung.

| Was | Vorher | Jetzt |
|---|---|---|
| Adresse | `erfolgsgeschichten.mybits.dev` | `stories.mybits.dev` |
| Namespace | `hackathon-vibe` | `stories` |
| Service-FQDN | `…hackathon-vibe.svc.cluster.local` | `erfolgsgeschichten.stories.svc.cluster.local` |

Nicht umbenannt — und das ist der Teil, der später zählt: Harbor-Projekt,
Keycloak-Client-ID, Realm-Rolle, die Objektnamen im Cluster und die
Datenbankdatei heißen weiter `erfolgsgeschichten…`. Die ersten drei legt
Florian an (ein zweiter Name wäre eine zweite Absprache), die Objektnamen
benennen die Anwendung statt ihrer Adresse, und eine Umbenennung der Datei
wäre eine Migration ohne Gegenwert. Begründung und Liste: E-20.

**Neu:** `k8s/namespace.yml` bringt den Namespace mit, samt
`istio-injection: enabled`.

**Gemessen** (`k8s/*.yml` nach PyYAML geladen und gegeneinander geprüft,
16 Prüfungen): Alle Anwendungsobjekte liegen in `stories`, das Zertifikat
weiterhin in `istio-system` (dort sucht das Ingress-Gateway seine Secrets);
Gateway, Certificate und VirtualService nennen **genau einen** Host
(`stories.mybits.dev`); `credentialName` des Gateways entspricht
`secretName` des Zertifikats; der VirtualService zeigt auf den FQDN, der sich
aus Service- und Namespace-Namen ergibt; `AUTH_URL` und `FRONTEND_URL`
tragen denselben Host.

**Ungemessen bleibt** das Injection-Label: Eine revisionsbasierte
Istio-Installation will `istio.io/rev` statt `istio-injection: enabled`, und
steht das falsche da, bleibt der Sidecar **still** weg. Die Anwendung läuft
dann trotzdem — es fehlt mTLS, nicht die Funktion. Prüfbar am ersten Pod
(`2/2` statt `1/1`); welches Label `hackathon-vibe` trägt, ist die Frage an
Florian.

---

## 07.10.2026 — Container-Abnahme: vier Befunde, drei behoben

Docker Engine 29.8.2 mit Compose v5.6.0 in WSL2/Ubuntu 24.04 (kein Docker
Desktop) steht jetzt auf dem Rechner. Damit ist nachgeholt, was bis gestern
als „nicht gemessen" in dieser Akte stand — und die Abnahme hat vier Dinge
gefunden.

### F-04 — Ein frisches Volume wurde nie gesund (behoben)

**Der Befund.** `/api/gesund` meldet in einem frischen Volume `ok: false`.
`ok` ist `COUNT(*) FROM faktenrubrik > 0`, und die Erstausstattung lief im
Container nicht von selbst — erst `docker compose exec app npm run seed`
machte den Dienst gesund.

**Warum das mehr ist als ein Handgriff.** Im Einzelplatz merkt man es und
tippt den Befehl. Im Cluster ist es ein Deadlock: Die Readiness-Probe fragt
`/api/gesund`, der Pod wird nie bereit, der Dienst nimmt keine Anfragen an —
und die Oberfläche, über die man seeden könnte, ist genau dieser Dienst. Das
Deployment wäre beim ersten Ausrollen hängen geblieben, ohne dass das YAML
einen Fehler hat.

**Die Ursache** ist eine Annahme aus der Einzelplatzzeit: `npm run setup`
führte `npm install && npm run seed` zusammen aus, also war die
Erstausstattung Teil der *Einrichtung*. Im Container gibt es keine
Einrichtung — es gibt einen Start.

**Behoben** über `erstausstattungFallsLeer()`, aufgerufen in `server.ts` nach
`datenbank()`. Neue Invariante I-09, Entscheidung E-21, zwei Tests.

**Gemessen**, dreimal:

| Lage | Erwartet | Gemessen |
|---|---|---|
| lokal, Datenbankdatei existiert nicht | Erstausstattung, `ok: true` | 30 Rubriken, 4 Ziele, 6 Projektarten, 1 Kunde; `{"ok":true,"schema":4}` |
| lokal, ein Ziel von Hand gelöscht, Neustart | bleibt gelöscht | 3 Ziele statt 4, keine Einspielmeldung |
| Container, frisches Volume, kein Seed von Hand | `ok: true`, Probe grün | `{"ok":true,"erstausstattung":true}`, Docker-Status `healthy` nach **einem** Versuch |

### F-05 — Ein gerades Anführungszeichen hat eine CSS-Regel zerlegt (behoben)

**Der Befund.** Der Vite-Build meldet `Unterminated string token
[css-syntax-error]`. Keine Fehlermeldung, nur eine Warnung — der Build läuft
durch, also fiel es wochenlang niemandem auf.

**Die Ursache**, `web/src/stil.css:521`:

```
content: "Hier schreiben — oder oben „Formulieren" drücken.";
                                                 ^ U+0022 statt U+201C
```

Das deutsche Zitat öffnet typografisch (`„`, U+201E) und schließt **gerade**
(`"`, U+0022). Für den CSS-Parser endet die Zeichenkette dort; der Rest
(` drücken.";`) ist Müll, und die Deklaration wird verworfen. Betroffen war
`.dok:empty:before` — der Platzhalter auf dem **leeren Blatt**, also genau der
Hinweis, der einem neuen Benutzer sagt, was er tun soll. Im gebauten CSS ließ
sich das sehen: Der Minifier gab auf und ließ einen rohen Zeilenumbruch
mitten in der Regel stehen (`";\ncolor: #A9A093;`); nach der Korrektur steht
dort sauber `";color:#a9a093;`.

**Der Grund, warum es durchging:** `npm test` prüft TypeScript und das
Backend, nie das CSS. Dagegen jetzt ein Test in `kern.test.ts`, der jede
`content:`-Deklaration auf eine gerade Zahl gerader Anführungszeichen prüft.
Gegenprobe gemacht: Fehler wieder eingebaut → 24 Tests grün, 1 rot; Datei
zurückgesetzt → 25 grün.

### F-06 — Die Akte behauptete, es sei nichts gebaut worden (behoben)

`README.md` und `07-betrieb.md` führten „Das Image wurde nie gebaut" als
offenen Punkt. Das stimmte bis zur Abnahme und stimmt jetzt nicht mehr;
beide Stellen sind auf den gemessenen Stand gebracht. Eine Akte, die
Gemessenes als ungemessen führt, ist genauso falsch wie umgekehrt — nur
ungefährlicher.

### Offen: der Port unter WSL2

Kein Fehler, aber eine Falle für den nächsten Durchgang. WSL2 läuft im
NAT-Modus: Ein Container auf 4700 **kollidiert nicht** mit einem Node-Server
auf Windows-Port 4700 — aber der Windows-Browser sieht dann den lokalen
Server, nicht den Container. Für einen Anmeldetest im Browser muss der
lokale Server aus sein; ein anderer Port hilft nicht, weil der lokale Realm
nur Rücksprünge auf `localhost:4700` und `:5273` erlaubt. Steht jetzt in
`07-betrieb.md`.

### Was weiterhin ungemessen ist

Der Token-Tausch mit Keycloak. Der Weg ist bis zum Anmeldeformular geprüft
(`/auth/login` → 302 auf `localhost:8080/.../openid-connect/auth`, mit
`redirect_uri=http://localhost:4700/auth/callback` und
`client_id=erfolgsgeschichten`), aber eine Anmeldung einzutippen ist
Zugangsdatenarbeit und bleibt bei Marc. Ebenso die Manifeste: Dafür braucht
es den Cluster.

---

## 08.10.2026 — F-07: Anmelden ging, Abmelden nicht

**Der Befund** (Marc, im Browser): Die Anmeldung funktioniert, der Klick auf
„Abmelden" landet auf Keycloaks Seite „We are sorry… Invalid redirect uri".

**Im Keycloak-Log** stand es wörtlich:

```
type="LOGOUT_ERROR" error="invalid_redirect_uri"
redirect_uri="http://localhost:4700/"
```

**Die Ursache** ist eine Trennregel, die nur für dieses eine Feld gilt. Im
Realm-Import stand

```json
"post.logout.redirect.uris": "http://localhost:4700/* http://localhost:5273/*"
```

Keycloak trennt diese Liste mit `##`, nicht mit Leerzeichen. Mit Leerzeichen
ist es **eine** Adresse — eine, die keine gültige URL ist und darum nie
passt. Der Anmeldeweg war deshalb in Ordnung: `redirectUris` ist ein echtes
JSON-Array, und nur diese zweite Liste ist eine Zeichenkette mit eigener
Regel. Der Fehler sieht nach einem Problem der Anmeldung aus und sitzt in
einem Feld daneben.

**Gemessen** am Logout-Endpunkt, ohne Admin-Anmeldung (die Seite „Invalid
redirect uri" gegen eine 302 unterscheiden genügt):

| `post_logout_redirect_uri` | vor der Korrektur | danach |
|---|---|---|
| `http://localhost:4700/` | ABGELEHNT | **302 → `http://localhost:4700/`** |
| `http://localhost:4700` | ABGELEHNT | 302 |
| `http://localhost:5273/` | ABGELEHNT | 302 |
| `http://boeswillig.example/` | ABGELEHNT | **ABGELEHNT** |

Die letzte Zeile ist die wichtige: Die Korrektur macht das Feld nicht
durchlässig, sie macht es wirksam. Der Anmeldeweg bleibt unverändert streng
(`/auth/callback` akzeptiert, `/` abgelehnt).

**Eine Fehlmessung unterwegs,** die hier stehen bleibt, weil sie lehrreich
ist: Um die Hypothese zu prüfen, habe ich die wörtliche Zeichenkette
`http://localhost:4700/* http://localhost:5273/*` als `post_logout_redirect_uri`
geschickt — in der Erwartung, dass Keycloak sie als „die eine Adresse"
akzeptiert. Sie wurde abgelehnt, was die Hypothese zu widerlegen schien. Der
Grund: `curl` kodiert das Leerzeichen als `%20`, und damit war es nicht mehr
dieselbe Zeichenkette. Bestätigt hat die Hypothese erst die Korrektur selbst.

**Zwei Dinge dagegen:**

- Ein Test prüft den Realm-Import auf Leerzeichen in dieser Liste
  (`kern.test.ts`). Billig, und er fängt genau die Falle.
- `07-betrieb.md` warnt bei Florians Keycloak-Aufgabe ausdrücklich: Bleibt
  das Feld leer, meldet sich jeder an und niemand ab. Der empfohlene Wert
  ist jetzt `https://stories.mybits.dev/*` mit Sternchen.

**Nebenbefund zum Betrieb:** `id_token_hint` ist nicht nötig — Keycloak
leitet mit 302 direkt zurück, ohne Bestätigungsseite. Gemessen am
`Location`-Kopf.

**Nebenbefund zu WSL2:** Die Container sterben, wenn keine WSL-Sitzung mehr
offen ist (`Exited (143)` = SIGTERM, Keycloak nach sieben Sekunden). Für eine
Messreihe muss eine Sitzung offenbleiben; für Marc heißt das, ein Terminal
offen zu lassen. Steht in `07-betrieb.md`.

---

## 08.10.2026 — Helles Thema als Vorgabe, Umschalter in jeder Kopfzeile

Auf Wunsch von Marc. Entscheidung und Begründungen: E-22.

**Was dafür nötig war.** `:root` trug die dunkle Palette, und 19 Farbwerte
standen hart im CSS — Fehlerbalken, Kopfzeilenverlauf, Hauptknopf,
Dialogschatten. Genau solche Stellen wären im Hellmodus Löcher geblieben:
Keiner davon fällt beim Durchklicken auf, jeder einzelne sieht falsch aus,
wenn man ihn trifft. Alle 19 sind jetzt Variablen, die in beiden Themen
definiert sind.

**Zwei Tests**, beide lesen die Farben **aus** `stil.css`:

- *Vollständigkeit:* Jede themenabhängige Farbe muss in beiden Blöcken
  stehen. Wer eine nur oben ergänzt, hat sie im Dunkelmodus in ihrem hellen
  Wert — der Build merkt das nicht, und wer nur im Hellmodus arbeitet, sieht
  es nie.
- *Kontrast:* 16 Paare je Thema plus 6 auf dem Blatt, nach WCAG 2.1
  (4.5:1 für Text, 3.0:1 für große Schrift und Bedienelemente).

Gegenprobe zu beiden: Das Original-Cyan `#1FC5FF` in den Hellmodus gesetzt →
der Test nennt `--accent auf --bg = 1.79:1`, `--accent auf --bg-2 = 2.00:1`
und `--auf-accent auf --accent = 2.00:1`. Eine Farbe nur im Hell-Block
ergänzt → „im Dunkelmodus nicht definiert". Zurückgesetzt: 31 Tests grün.

**Im Browser nachgesehen** (Vite-Entwicklungsbetrieb, eigene Datenbank im
Scratchpad — der echte Bestand blieb unberührt), und das hat zwei Dinge
gefunden, die kein Test findet:

| Befund | Ursache | Behoben |
|---|---|---|
| Der Umschalter sah wie ein „C" aus | U+263E (☾) rendert unter Windows als dünner Strich | zwei Inline-SVG-Pfade statt Zeichen |
| Die leere Faktenspur war ein graues Band | die Marken nutzten `--line`; dreizehn davon nebeneinander wirken gefüllt | eigene Variable `--spur-leer`, im Hellmodus deutlich heller |

Der zweite ist der interessantere: Die Spur zeigt den Fortschritt, und eine
leere Spur, die gefüllt aussieht, sagt das Gegenteil von dem, was sie soll.
Auf dunklem Grund war `--line` dafür genau richtig — eine Farbe kann in
einem Thema stimmen und im anderen die Aussage verdrehen.

**Nachgemessen am Verhalten:** Nach dem Umschalten auf dunkel und einem
Neuladen der Seite war dunkel noch aktiv — die Wahl übersteht das Neuladen.
Beide Symbole im Zoom geprüft, Sonne und Mond sind erkennbar.

---

## 08.10.2026 — Mehrere Personen an einer Erfolgsgeschichte

Auf Wunsch von Marc. Entscheidungen: E-23 (Mitarbeit), E-24 (Mailversand).
Neue Invariante: I-10. Migration M-5.

**Vorher gab es die Funktion nicht** — belegt, nicht vermutet: `story.autor`
war ein reines Textfeld, es gab keine Zuweisung, keine Einladung, kein
Überspringen, und `fakt` hielt nicht fest, von wem eine Angabe kam. Was
schon trug: Mehrere Angemeldete konnten dieselbe Geschichte öffnen, und
Rubriken mit `mehrfach` nehmen beliebig viele Werte.

**Was gebaut wurde**

| Teil | Wo |
|---|---|
| Anfragen, Überspringen, Herkunft | `db/mitarbeit.ts` (neu), Migration 5 |
| Interview je Person | `ki/interview.ts`, `INTERVIEWER` in `ki/prompts.ts` |
| Mailversand, optional | `mail.ts` (neu), sechs Einstellungen |
| Vier Endpunkte | `api/routen.ts`, `api/server.ts` |
| Oberfläche | `components/Mitarbeit.tsx` (neu), Einbau in Start, Arbeit, Gespräch, Fakten |

**Gemessen**

Schema (I-07): Frische Datenbank und eine Kopie des echten Bestands (Stand 3
→ 5) landen auf identischem Schema — gleiche Tabellen, Spalten, Indexe.

I-08 für das SMTP-Passwort: `aenderbar('mail.passwort')` ist im
Mehrbenutzerbetrieb `false`, `aenderbar('mail.host')` ist `true`. Ein
Passwort ist ein Zugang, ein Rechnername nicht.

I-10 mit Gegenprobe: Name in `faktenText()` mitausgegeben → 40 grün, 1 rot,
mit der genauen Stelle; zurückgesetzt → 41/0.

Im Browser durchgeklickt (eigene Datenbank im Scratchpad, der echte Bestand
blieb unberührt): Anfrage an `oliver.kollege@mybits.de` angelegt, Hinweis
übernommen, Link zum Weitergeben erschienen, Zähler in der Kopfzeile auf
„Kollegen fragen (1)". Zwei Punkte als „kann ich nicht beantworten" vermerkt
— in der Datenbank stehen sie mit Kennung, Namen und Grund, und die
Faktenansicht zeigt unten „Übersprungen: Technologie oder Werkzeug
(Marc Schallehn: war nur in der Konzeptphase dabei) · Projektrolle (…)".

**Zwei Befunde aus dem Durchklicken**, die kein Test gefunden hätte:

- Die Felder im Dialog waren **so schmal wie ihr Platzhalter**. `label.zeile`
  gibt nur `display: block` vor; im Kasten fehlte die Breitenangabe. Ein
  dreizeiliges Textfeld von 70 Pixeln Breite ist keine Eingabe, sondern eine
  Zumutung.
- Von Hand eingetragene Fakten bekamen **keine Herkunft** — `faktNeu()`
  setzte sie nicht. In der Faktenansicht hätte eine Herkunft dann nur an
  Interview-Fakten gestanden, was wie ein Fehler aussieht.

### F-08 — Die API verbot das Zwischenspeichern nicht (behoben)

**Der Befund** fiel beim Durchklicken auf: Die API lieferte vier Fakten, die
Oberfläche zeigte nach einem vollen Neuladen drei.

**Die Ursache:** Die JSON-Antworten trugen keinen `Cache-Control`-Kopf. Ohne
ihn darf ein Browser eine GET-Antwort nach eigenem Ermessen
zwischenspeichern (RFC 9111, „heuristic freshness") — und genau das war
passiert. Nur der Ereignisstrom hatte einen Kopf.

**Warum das mit E-23 wichtig wird:** Im Einzelplatz merkt man es kaum, weil
man seine eigenen Änderungen über die Antwort des eigenen Aufrufs
zurückbekommt. Sobald zwei Kollegen an derselben Geschichte arbeiten, sieht
einer von beiden einen veralteten Stand — und hält ihn für den aktuellen.

**Behoben:** Ein `JSON_KOPF` mit `Cache-Control: no-store` für alle vier
JSON-Antwortstellen in `server.ts`, und derselbe Kopf an den beiden
401-Antworten des Wächters. Eine zwischengespeicherte 401 ist besonders
tückisch: Sie bliebe bestehen, nachdem die Anmeldung geklappt hat.

**Gemessen:** `/api/gesund`, `/api/storys/1` und `/api/start` antworten mit
`Cache-Control: no-store`; die 401 im Mehrbenutzerbetrieb ebenfalls. Und der
Nachweis der Ursache: Ein hartes Neuladen im Browser zeigte sofort „Fakten 4"
— der alte Stand kam aus dem Zwischenspeicher, den es vorher geben durfte.

### Was offen bleibt

- **Die Liste „Für mich angefragt" ist im Browser ungemessen.** Sie zeigt
  Anfragen an die eigene Adresse, und im Einzelplatzbetrieb hat die Person
  keine. Dafür bräuchte es zwei angemeldete Kollegen — also Zugangsdaten, die
  ich nicht eingebe. Durch Tests gedeckt (`anfragenFuer()`), nicht durch
  einen Klick.
- **Der Mailversand ist ungemessen.** Es gibt keinen SMTP-Zugang; gemessen
  ist nur, dass `mailMoeglich()` ohne Server `false` liefert und der Haken
  dann verborgen bleibt.
- **Dass die drei Mitarbeits-Angaben im Interview-Prompt landen**, ist durch
  Lesen geprüft, nicht durch einen Lauf mit echter KI (siehe
  `05-interview-und-prompts.md`).
- O-08 (zwei Angaben zu einer Einzelrubrik) und O-09 (Benachrichtigung ohne
  Mail, etwa über Teams) sind benannt, nicht gelöst.

**Nachtrag zur WSL-Falle:** Der Befund vom Vortag hat heute zweimal
zugeschlagen — die Container waren beim Weiterarbeiten jedes Mal beendet
(`Exited (143)` bei Keycloak, `Exited (255)` bei der Anwendung). Ursache ist
nicht Docker, sondern WSL2 selbst: Ohne aktiven Prozess fährt Windows die
Distribution herunter und nimmt den Daemon mit. `restart: unless-stopped`
greift dagegen nicht, weil die Regel einen laufenden Daemon voraussetzt. Die
Abhilfe (ein Terminal offen lassen, oder ein unsichtbarer Autostart-Eintrag
mit `wsl -d Ubuntu-24.04 -- tail -f /dev/null`) steht jetzt in
`07-betrieb.md` — bisher stand dort nur der Befund, nicht der Ausweg.
