# Konzept — BITS Erfolgsgeschichte-Assistent

Stand: 17.09.2026 · Version des Konzepts: 1.0

## Das Problem

BITS hat über 500 Projekte gemacht; 40 davon stehen als Erfolgsgeschichte auf
`mybits.de`. Der Engpass ist nicht die Website, sondern **das Einsammeln**: Die
Menschen, die ein Projekt kennen, sind Projektleiter, Entwickler und Berater —
keine Texter. Sie wissen alles Nötige, aber

- sie wissen nicht, **was** für eine Erfolgsgeschichte gebraucht wird,
- sie denken sehr unterschiedlich (einer erzählt Technik, einer Nutzen, einer Ablauf),
- und wenn sie einen Text abliefern sollen, kommt entweder nichts oder ein
  Statusbericht.

Gleichzeitig wird dieselbe Projektgeschichte an **mehreren Stellen** gebraucht,
jeweils anders zugeschnitten: als Vertriebstext auf der Website, als interne
Referenz beim selben Kunden, als Absatz in einem Mitarbeiter-CV, als Folie in
einem Angebot. Heute schreibt jeder seine Fassung neu — aus dem Gedächtnis.

## Die Idee

Ein Werkzeug, das **interviewt statt Formulare zeigt**. Der Assistent stellt
Fragen wie ein Journalist, der ein Projekt versteht; im Hintergrund entsteht
daraus ein **Faktenbestand**, und aus dem Faktenbestand werden **beliebig viele
Fassungen** für unterschiedliche Ziele erzeugt.

Der zentrale Satz des Konzepts:

> **Fakten sind die Wahrheit, Fassungen sind Ableitungen.**

Deshalb wird nie ein Text gesammelt, sondern immer ein Fakt — mit Quelle und
Vertraulichkeitsstufe. Ein Text, der einmal formuliert wurde, ist nur eine
Sicht auf diesen Bestand und jederzeit neu erzeugbar. Das macht den Unterschied
zwischen „Website-Fassung" und „interne Kundenreferenz" zu einer
**Filterfrage**, nicht zu einer Schreibaufgabe:

| Ziel | Vertraulichkeit | Ton |
|---|---|---|
| Website (`mybits.de`) | nur `oeffentlich` | vertrieblich, Kunde anonym (nur Branche) |
| Interne Kundenreferenz | `oeffentlich` + `intern` | sachlich, Namen und Abteilungen erwünscht |
| Mitarbeiter-CV | `oeffentlich` + `intern` (ohne Kundennamen) | kurz, Leistung der Person im Vordergrund |
| Angebot / Pitch | `oeffentlich` + `intern` | argumentierend, auf den Adressaten zugeschnitten |

## Die drei Ansichten

Der Arbeitsbereich ist geteilt. Links die **Entwicklung**, rechts das
**Ergebnis**:

```
┌─────────────────────────────┬─────────────────────────────┐
│ [ Gespräch ] [ Fakten ]     │ Erfolgsgeschichte           │
│                             │ Ziel: ▾ Website             │
│ Assistent: Wer war der      │ ─────────────────────────── │
│ Auftraggeber, und was war   │ # KI im IT-Support          │
│ dort vorher das Problem?    │                             │
│                             │ Ein mittelständisches       │
│ > [Eingabe]                 │ E-Commerce-Unternehmen …    │
│                             │ (WYSIWYG, editierbar)       │
└─────────────────────────────┴─────────────────────────────┘
```

1. **Gespräch** — das Interview. Der Assistent fragt, der Nutzer antwortet in
   ganzen Sätzen oder Stichpunkten. Nach jeder Antwort werden Fakten
   extrahiert.
2. **Fakten** — der Bestand, sichtbar und korrigierbar. Jeder Fakt zeigt
   Rubrik, Wert, Quelle und Vertraulichkeitsstufe. Hier sieht der Nutzer auch,
   **was noch fehlt** (Pflichtfakten des Faktenkatalogs).
3. **Erfolgsgeschichte** — die Fassung zum gewählten Ziel, im WYSIWYG-Editor
   überschreibbar. Wer hier von Hand schreibt, wird nicht überschrieben (I-02).

## Warum ein Interview und kein Formular

Ein Formular mit 30 Feldern wird nicht ausgefüllt — gemessen an jedem
Intranet-Formular, das es je gab. Ein Interview funktioniert, weil

- es **eine** Frage zeigt statt dreißig,
- es **nachfragen** kann („Sie sagen ‚schneller' — von was auf was?"),
- es die Fragen an der Projektart ausrichten kann (ein Infrastrukturprojekt
  wird anders befragt als ein KI-Projekt),
- und weil es die Belegpflicht des Redaktionsleitfadens **im Gespräch**
  einlösen kann: Wer eine Zahl nennt, wird gefragt, woher sie kommt.

## Projektarten als Interview-Gedächtnis

Eine Projektart (`KI-Projekt`, `Infrastruktur/Cloud`, `Individualentwicklung`,
`Beratung/Prozesse`, `Internes Projekt`, `Projekt bei MAN`) trägt Hinweise, die
der Assistent zusätzlich bekommt: welche Fragen sich bei dieser Art gelohnt
haben, welche Fallen es gibt, welche Begriffe der Kunde benutzt.

Der Punkt ist das **Sammeln über Zeit**: Nach dem zehnten MAN-Projekt weiß die
Projektart „Projekt bei MAN", dass dort nach dem Werk, dem Lastenheft-Stand und
der TISAX-Anforderung gefragt werden muss. Diese Hinweise entstehen im
Lernmodus (siehe `docs/05-interview-und-prompts.md`).

## Ziele als Vorlagen

Ein Ziel ist ein Datensatz mit vier Teilen:

1. **Prompt** — wie formuliert wird (Ton, Anrede, Länge, Verbote),
2. **Abschnittsstruktur** — welche Abschnitte die Fassung hat,
3. **Vertraulichkeitsgrenze** — welche Fakten überhaupt hinein dürfen,
4. **Lernmodus** — ob Beobachtungen zu dieser Vorlage gesammelt werden.

Ziele sind damit editierbare Prompts und kein Code. Wer eine neue Textsorte
braucht („Messe-Onepager"), legt ein Ziel an und muss nichts programmieren.

## Bestehende Erfolgsgeschichten aufnehmen

Die 40 Geschichten auf der Website sind vorhandene Arbeit. Sie werden importiert
(Text einfügen oder URL abrufen), und die KI zieht daraus Fakten. Damit ist eine
bestehende Geschichte sofort weiterverwendbar — etwa als Grundlage für eine
CV-Fassung oder eine interne Referenz.

**Kein erfundener Gesprächsverlauf** (E-08): Ein rekonstruierter Dialog würde
Aussagen in den Mund von Menschen legen, die sie nie gesagt haben — und der
Faktenbestand würde „belegt" aussehen, obwohl nur ein Text abgeschrieben wurde.
Stattdessen: ein Import-Eintrag im Verlauf, Fakten mit Quelle `import`, und der
Assistent fragt anschließend gezielt die Lücken ab.

## Was das Werkzeug nicht ist

- **Kein CMS.** Es schreibt nicht nach WordPress. Der Ausgang ist Text zum
  Kopieren (und später ein Export).
- **Kein Textgenerator auf Knopfdruck.** Ohne Fakten entsteht nichts; das ist
  Absicht. Der Redaktionsleitfaden verbietet erfundene Zahlen — das Werkzeug
  darf sie deshalb nicht erfinden können.
- **Keine Freigabe-Instanz.** Wer den Text verantwortet, entscheidet; das
  Werkzeug liefert einen Entwurf und die Fakten, an denen er hängt.

## Umsetzungsstufen

**Stufe 1 (Proof of Concept, dieser Stand)** — Start/Weiterarbeiten/Import,
Interview mit Faktenextraktion, Faktenansicht, Zielfassungen mit WYSIWYG,
Verwaltung für Projektarten/Ziele/Faktenkatalog, KI-Einstellungen mit Anthropic
und vorbereitetem Azure, Lernnotizen.

**Stufe 2** — Mehrbenutzerbetrieb (heute ein lokaler Einzelplatz, O-01),
Export (DOCX/Markdown), Bild- und Medienverwaltung, Anbindung an die
WordPress-Felder aus `mybits-core`.

**Stufe 3** — Faktenbestand über Projekte hinweg durchsuchbar („Wo haben wir
schon mal Zendesk angebunden?"), Vorschlag von Kundenstimmen-Anfragen.
