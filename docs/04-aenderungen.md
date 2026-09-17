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
