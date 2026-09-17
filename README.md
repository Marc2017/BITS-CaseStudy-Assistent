# BITS Erfolgsgeschichte-Assistent

Ein Werkzeug, das Erfolgsgeschichten **interviewt statt abfragt**: Der Assistent
stellt Fragen zu einem Projekt, sammelt daraus einen Faktenbestand und
formuliert daraus so viele Fassungen, wie gebraucht werden — für die Website,
als interne Kundenreferenz, als Absatz in einem Profil, als Referenz in einem
Angebot.

**Stand: 17.09.2026** — Proof of Concept lauffähig. Backend, Oberfläche,
Erstausstattung und 14 Tests stehen; die KI-Funktionen sind gebaut, aber noch
nicht gegen einen echten Schlüssel gemessen (siehe „Offene Punkte").

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
  der Faktenspur oben leuchtet auf, was dazugekommen ist.
- **Fakten** — der Bestand, sichtbar und korrigierbar. Die Stufe jedes Fakts
  ist mit einem Klick änderbar. Darunter steht, was noch fehlt.
- **Erfolgsgeschichte** — die Fassung zum gewählten Ziel, als Blatt im
  WYSIWYG-Editor. Handgeschriebenes wird nie stillschweigend überschrieben.

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
| `server/src/ki/` | Anbieter, Prompts, Interview, Formulierung, Import, Lernmodus | aktuell |
| `server/src/api/` | HTTP-Server und Handler | aktuell |
| `server/src/seed/` | Faktenkatalog, Ziele, Projektarten (Erstausstattung) | aktuell |
| `server/test/kern.test.ts` | Tests der Invarianten | aktuell |
| `web/src/` | Oberfläche (React, Vite) | aktuell |

## Erstausstattung

Mitgeliefert und in der Verwaltung änderbar:

- **30 Faktenrubriken** in neun Gruppen, davon **13 Pflicht** — abgeleitet aus
  der Feldstruktur der Website (`docs/06-referenz-website.md`).
- **4 Ziele**: Website, Interne Kundenreferenz, Mitarbeiter-CV, Angebot/Pitch.
- **7 Projektarten**: KI-Projekt, Cloud und Infrastruktur,
  Individualentwicklung, Systemintegration und Daten, Beratung und Prozesse,
  Internes Projekt, Projekt bei MAN (als Beispiel für kundenspezifisches
  Wissen).

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

## Offene Punkte

- **Kein Durchlauf mit echter KI.** Es ist kein API-Schlüssel hinterlegt, und
  Zugangsdaten werden hier nicht eingegeben. Interview, Formulieren, Import und
  Lernmodus sind gebaut und typgeprüft, aber ungemessen — der erste echte Lauf
  ist eine Messung, kein Vertrauen.
- **Einzelplatz oder Server für alle?** (`O-01`) Heute lokal, ein Nutzer, der
  Schlüssel in der Datenbankdatei. Für „alle Kollegen" braucht es Anmeldung und
  einen Schlüsselspeicher. Das ist eine Entscheidung, keine Technikfrage.
- **Azure OpenAI ist vorbereitet, aber ungetestet** (`O-04`) — es gibt noch
  keinen Endpunkt.
- **Wohin der fertige Text geht** (`O-02`): heute kopieren. DOCX-Export oder
  direktes Schreiben in die WordPress-Felder von `mybits-core` wäre möglich.
- **Kundenstimmen und Fotos** (`O-03`): das Zitat lässt sich als Fakt
  aufnehmen, die Freigabe holt das Werkzeug nicht ein.
