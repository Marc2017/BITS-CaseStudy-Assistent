# BITS Erfolgsgeschichte-Assistent

Ein Werkzeug, das Erfolgsgeschichten **interviewt statt abfragt**: Der Assistent
stellt Fragen zu einem Projekt, sammelt daraus einen Faktenbestand und
formuliert daraus so viele Fassungen, wie gebraucht werden — für die Website,
als interne Kundenreferenz, als Absatz in einem Profil, als Referenz in einem
Angebot.

**Stand: 07.10.2026** — Mit echter KI durchgemessen (Import, Interview, beide
Fassungen, Eingabehilfen) und **betriebsfähig für alle Kollegen**: Container,
CI/CD nach Harbor, Cluster-Manifeste und Anmeldung über Keycloak mit zwei
Rollenstufen. Was noch nicht gemessen ist, steht unter „Offene Punkte".

## Zwei Betriebsarten

| | Einzelplatz (Vorgabe) | Mehrbenutzer |
|---|---|---|
| Wo | lokal, `npm run dev` | `https://stories.mybits.dev`, hinter Keycloak |
| Anmeldung | keine | Pflicht (OIDC, `id.mybits.dev`) |
| Rollen | keine — einer darf alles | Schreiben für alle Angemeldeten, Verwalten mit Rolle |
| KI-Schlüssel | Verwaltung oder `.env` | **nur** aus der Umgebung (I-08) |

Umgeschaltet wird mit `BITS_EG_MEHRBENUTZER=1`. Die Handgriffe für den
Cluster stehen in `docs/07-betrieb.md`.

---

## Der Grundgedanke

> **Fakten sind die Wahrheit, Fassungen sind Ableitungen.**

Gesammelt wird nie ein Text, sondern immer ein einzelner Fakt — mit Quelle,
Beleg und **Vertraulichkeitsstufe**. Jedes Ziel (jede Textsorte) hat eine
Höchststufe, und in die Formulierung gehen nur Fakten bis zu dieser Stufe:

| Ziel | sieht | Beispiel |
|---|---|---|
| Website | nur `öffentlich` | „ein mittelständisches E-Commerce-Unternehmen" |
| Interne Kundenreferenz | `öffentlich` + `intern` | „LuckyChef GmbH, Abteilung Kundenservice" |
| Mitarbeiter-CV | `öffentlich` + `intern` | der eigene Beitrag der Person |
| Angebot / Pitch | `öffentlich` + `intern` | Anschlusspunkte, Entscheider |

Das ist keine Bitte im Prompt, sondern eine Grenze im Code: Was über der Stufe
liegt, wird der KI gar nicht mitgeschickt.

## Die drei Ansichten

Links die Entwicklung, rechts das Ergebnis:

- **Gespräch** — das Interview. Nach jeder Antwort werden Fakten extrahiert; in
  der Faktenspur oben leuchtet auf, was dazugekommen ist. Zwei Hilfen senken
  die Eingabehürde: **„Eins nach dem anderen abfragen"** zerlegt eine Frage in
  Teilfragen mit eigenen Feldern, **„Antwort vorschlagen"** entwirft eine
  Antwort zum Prüfen — mit jeder geratenen Angabe in eckigen Klammern.
- **Fakten** — der Bestand, sichtbar und korrigierbar. Die Stufe jedes Fakts
  ist mit einem Klick änderbar. Darunter steht, was noch fehlt.
- **Erfolgsgeschichte** — die Fassung zum gewählten Ziel, als Blatt im
  WYSIWYG-Editor. Handgeschriebenes wird nie stillschweigend überschrieben.
  **„Version speichern"** legt einen Stand unter einem Namen ab, mit Kommentar
  und dem Haken „Fertige Fassung"; im Verlauf lässt sich darauf filtern, und
  die Vertraulichkeitsstufe steht daneben.

Während die KI arbeitet, zeigt die Oberfläche, was sie tut: Arbeitsschritt,
verstrichene Zeit und die Zwischenüberlegungen des Modells.

## Projektart und Kunde

Zwei Achsen steuern das Interview, und der Assistent bekommt **beide**:

- Die **Projektart** sagt, was bei dieser Art Vorhaben zu fragen ist („bei
  Cloud-Projekten nach dem Wartungsfenster fragen").
- Der **Kunde** sagt, was bei diesem Auftraggeber gilt, unabhängig von der
  Projektart („bei MAN nach Gesellschaft und Werk fragen").

Ein Kundendatensatz trägt außerdem Branche und die anonymisierte Beschreibung.
Beim Zuordnen werden daraus drei Fakten vorbelegt — der Name intern, Branche
und Anonymisierung öffentlich.

## Starten

```bash
npm run setup     # einmalig: Abhängigkeiten und Erstausstattung
npm run dev       # Backend (Port 4700) und Vite (Port 5273) zusammen
```

Dann http://localhost:5273 öffnen. Für den Einzelbetrieb ohne Vite:

```bash
npm run build && npm start   # http://localhost:4700
```

**KI-Zugang** eintragen unter *Verwaltung → Einstellungen* (wirkt sofort) oder
in einer Datei `.env` (Vorlage: `.env.example`, danach Neustart). Ohne Zugang
läuft alles außer Interview, Formulieren, Import und Lernmodus.

## Befehle

| Befehl | Was er tut |
|---|---|
| `npm run dev` | Entwicklungsbetrieb, beides in einem Terminal |
| `npm start` | nur das Backend, liefert das gebaute Frontend mit aus |
| `npm run seed` | Erstausstattung einspielen — schreibt nur, was fehlt |
| `npm run seed:ersetzen` | Vorlagen auf den Lieferstand zurücksetzen |
| `npm run typen` | Typprüfung des Backends (es gibt dort keinen Build) |
| `npm test` | Typprüfung und die Invariantentests |
| `npm run build` | Frontend nach `web/dist` bauen |

## Dateien in diesem Ordner

| Datei / Ordner | Was drinsteht | Status |
|---|---|---|
| `docs/00-konzept.md` | das Produktkonzept: Problem, Idee, Umsetzungsstufen | aktuell |
| `docs/01-entscheidungen.md` | Festlegungen mit Begründung (`E-01` …) | aktuell |
| `docs/02-datenmodell.md` | Tabellen und **Invarianten** (`I-01` …) | aktuell |
| `docs/03-annahmen.md` | Annahmen (`A-…`) und offene Punkte (`O-…`) | aktuell |
| `docs/04-aenderungen.md` | Änderungs- und Fehlerjournal | aktuell |
| `docs/05-interview-und-prompts.md` | Interviewführung, Prompt-Aufbau, Lernmodus | aktuell |
| `docs/06-referenz-website.md` | wie eine Erfolgsgeschichte auf mybits.de aussieht | aktuell |
| `server/src/db/` | Datenbank, Fakten, Fassungen, Vorlagen | aktuell |
| `server/src/ki/` | Anbieter, Prompts, Interview, Formulierung, Import, Lernmodus, Eingabehilfen | aktuell |
| `server/src/api/strom.ts` | Ereignisstrom für die Fortschrittsanzeige | aktuell |
| `server/src/api/` | HTTP-Server und Handler | aktuell |
| `server/src/seed/` | Faktenkatalog, Ziele, Projektarten (Erstausstattung) | aktuell |
| `server/test/kern.test.ts` | Tests der Invarianten | aktuell |
| `web/src/` | Oberfläche (React, Vite) | aktuell |
| `server/src/auth/` | OIDC, Sitzungen, Wächter (E-19) | aktuell |
| `docs/07-betrieb.md` | Container, Harbor, Cluster, Anmeldung | aktuell |
| `Dockerfile`, `docker-compose.yaml` | ein Image; lokaler Betrieb mit Keycloak | aktuell |
| `k8s/` | Deployment, Datenträger, Gateway, Konfiguration | aktuell |
| `.github/workflows/` | Bauen und nach Harbor schieben | aktuell |

## Erstausstattung

Mitgeliefert und in der Verwaltung änderbar:

- **30 Faktenrubriken** in neun Gruppen, davon **13 Pflicht** — abgeleitet aus
  der Feldstruktur der Website (`docs/06-referenz-website.md`).
- **4 Ziele**: Website, Interne Kundenreferenz, Mitarbeiter-CV, Angebot/Pitch.
- **6 Projektarten**: KI-Projekt, Cloud und Infrastruktur,
  Individualentwicklung, Systemintegration und Daten, Beratung und Prozesse,
  Internes Projekt.
- **1 Kunde als Muster**: MAN — er zeigt, welche Art von Wissen in einen
  Kundendatensatz gehört. Die echten Kunden trägt ein, wer mit ihnen
  arbeitet.

## Was gemessen ist

- `npm test` — 14 Tests, alle grün: die Vertraulichkeitsgrenze je Ziel (I-04),
  die Rangfolge der Stufen als Zahl statt als Text (I-05), die konservative
  Vorgabestufe (I-01), die Sicherung handgeschriebener Fassungen (I-02), die
  Weigerung, ohne Grundlage zu formulieren (I-06), Anlegen und Ersetzen von
  Fakten, und das Entfernen von Markup beim Import.
- Typprüfung Backend und Frontend ohne Befund; das Frontend baut
  (268 KB JS, 14 KB CSS).
- Erstausstattung eingespielt und über die API gelesen: 30 Rubriken, 4 Ziele,
  7 Projektarten.
- **Die Faktenfilterung an echten Daten:** sieben Fakten (fünf öffentlich, einer
  intern, einer vertraulich) → die Website-Fassung sieht fünf, die drei internen
  Ziele sechs, der vertrauliche bleibt überall draußen.
- Eine von Hand geschriebene Fassung wird gespeichert und trägt `handisch = 1`;
  eine gelöschte Geschichte nimmt Fakten, Verlauf und Fassungen mit
  (`ON DELETE CASCADE`).
- Im Browser durchgesehen: Startseite, Arbeitsbereich mit beiden Reitern,
  Verwaltung. Fünf Befunde gefunden und behoben (`docs/04-aenderungen.md`).

### Mit echter KI gemessen (17.09.2026)

An der Zendesk-Erfolgsgeschichte von mybits.de:

| Schritt | Dauer | Ergebnis |
|---|---|---|
| Import per URL | 87 s | 75 Fakten erkannt, 70 gespeichert |
| Fassung „Website" | 61 s | 5724 Zeichen aus 65 freigegebenen Fakten |
| Fassung „Interne Kundenreferenz" | 61 s | 7231 Zeichen aus 72 Fakten |
| Interviewschritt | 10–13 s | 6 Fakten aus einer Antwort |
| Frage zerlegen | 5 s | 3 Teilfragen, darunter die Belegfrage |
| Antwort vorschlagen | 6 s | 5 geratene Angaben, alle markiert |

**Der Kern hält:** Derselbe Bestand, zwei Ziele — der Kundenname „LuckyChef
GmbH" steht in der internen Fassung im Titel und fehlt in der Website-Fassung
vollständig. Nicht weil der Prompt es verbietet, sondern weil der Fakt nicht
mitgeschickt wurde.

Nebenbei fand die Lückenanalyse einen **Widerspruch in der Live-Website**: Die
Einleitung der Geschichte nennt ein E-Commerce-Unternehmen, Metazeile und
Kicker nennen „Hotellerie & Reisen".

## Offene Punkte

- **Ein Interview von Anfang bis Ende** ist noch nicht durchgespielt — gemessen
  sind einzelne Schritte auf einem importierten Bestand. Der Durchlauf mit
  einem Kollegen und einem Projekt, das nur er kennt, ist der nächste (A-01).
- **Editor-Werkzeugleiste** (fett, Überschrift, Liste, Lücke) im Browser nicht
  verifiziert: Die Browsersteuerung erreicht ein `contenteditable` nicht
  zuverlässig (A-03). Von Hand in einer Minute geprüft.
- **Der Lernmodus** ist gebaut und typgeprüft, aber noch nicht mit echter KI
  gelaufen.
- **Das Image wurde nie gebaut und die Manifeste nie angewandt.** Auf dem
  Entwicklungsrechner ist kein Docker; geprüft sind Pfade, Syntax und Struktur,
  nicht der Lauf. Der erste echte Build passiert im Runner.
- **Der Token-Tausch mit Keycloak ist ungemessen.** Der halbe Weg steht: Die
  Authorization-URL stimmt (mit PKCE), ein Rücksprung mit falschem `state`
  oder gefälschtem Cookie wird abgewiesen. Ein echtes Token wurde nie
  eingelöst.
- **Das Repository liegt im falschen Account** (`O-07`): Die on-prem-Runner
  gehören der Organisation `BITS-GmbH`, nicht `Marc2017`. Bis zum Umzug
  schlägt der Workflow fehl.
- **Es gibt keine Sicherung** (`O-06`): Die Datenbank liegt auf einem
  Datenträger im Cluster und wird nirgends hinkopiert.
- **Das Istio-Injection-Label ist geraten** (`E-20`): `k8s/namespace.yml`
  setzt `istio-injection: enabled`; eine revisionsbasierte Installation will
  `istio.io/rev`. Steht das falsche da, fehlt der Sidecar still — die
  Anwendung läuft, mTLS im Cluster nicht.
- **Liegen vertrauliche Fakten sicher?** (`O-05`) Ist der Cluster-Storage
  verschlüsselt, und wer kommt an ein PVC? Eine Frage an Florian.
- **Azure OpenAI ist vorbereitet, aber ungetestet** (`O-04`) — es gibt noch
  keinen Endpunkt.
- **Wohin der fertige Text geht** (`O-02`): heute kopieren. DOCX-Export oder
  direktes Schreiben in die WordPress-Felder von `mybits-core` wäre möglich.
- **Kundenstimmen und Fotos** (`O-03`): das Zitat lässt sich als Fakt
  aufnehmen, die Freigabe holt das Werkzeug nicht ein.
