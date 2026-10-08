# Interview, Prompts und Lernmodus

Wie der Assistent fragt, wie aus Antworten Fakten werden, wie eine Fassung
entsteht — und wie die Vorlagen besser werden, ohne sich selbst umzuschreiben.

---

## 1. Der Interviewschritt

**Ein** Modellaufruf je Nutzerantwort (E-12), mit strukturierter Ausgabe über
ein Zod-Schema. Er liefert vier Dinge auf einmal:

```
{
  fakten:   [{ schluessel, rubrik, wert, stufe, beleg, sicher }],
  frage:    "die nächste Frage an den Nutzer",
  hinweis:  "optionale Bemerkung, z. B. warum nachgefragt wird",
  luecken:  ["schluessel", ...],    // was noch fehlt
  reif:     false                    // reicht der Bestand für eine Fassung?
}
```

### Was der Aufruf an Kontext bekommt

In dieser Reihenfolge — stabile Teile zuerst, damit der Prompt-Cache greift:

1. **Rollenanweisung** (fest, `ki/prompts.ts`): wer der Assistent ist, wie er
   fragt, die Belegpflicht, die Klassen A/B/C aus dem Redaktionsleitfaden.
2. **Faktenkatalog** (aus `faktenrubrik`): Schlüssel, Label, Hinweis, Pflicht.
3. **Hinweise der Projektart** (aus `projektart.hinweise`) **und des Kunden**
   (aus `kunde.hinweise`) — die Teile, die über Zeit wachsen. Beide getrennt
   benannt: Die Projektart sagt, was bei dieser Art Vorhaben zu fragen ist,
   der Kunde, was bei diesem Auftraggeber gilt (E-14). Die Trennung ist nicht
   Kosmetik — im Lernmodus muss zuzuordnen sein, wohin eine neue Beobachtung
   gehört.
4. **Der Faktenbestand** dieser Geschichte, vollständig (hier gibt es keine
   Vertraulichkeitsfilterung — der Nutzer arbeitet an seinem eigenen Projekt).
5. **Der Gesprächsverlauf** als `messages`.

### Die sieben Regeln der Interviewführung

Sie stehen im System-Prompt und sind der eigentliche Wert des Werkzeugs:

1. **Eine Frage auf einmal.** Zwei Fragen in einem Absatz werden halb
   beantwortet.
2. **Nachfragen, wo es unscharf ist.** „Schneller" ist kein Fakt. „Von vier
   Tagen auf vier Stunden" ist einer.
3. **Nach dem Beleg fragen, wenn eine Zahl fällt** — aber nur einmal und
   freundlich. Ohne Beleg wird der Fakt mit `sicher = 0` aufgenommen, nicht
   verworfen.
4. **Die Sprache des Nutzers übernehmen.** Wer „Ticketsystem" sagt, wird nicht
   nach seinem „Incident-Management-Tool" gefragt.
5. **Nicht nach dem fragen, was schon im Bestand steht.** Der Bestand ist im
   Kontext; eine Wiederholungsfrage ist ein Fehler des Assistenten, nicht des
   Nutzers.
6. **Interessantes verfolgen, auch wenn es nicht im Katalog steht.** Der
   Katalog ist die Untergrenze, nicht die Obergrenze. Freie Fakten sind
   erlaubt (`fakt.schluessel` hat keinen Fremdschlüssel).
7. **Wissen, wann es genug ist.** Bei `reif = true` schlägt der Assistent vor,
   eine Fassung zu erzeugen, statt weiterzufragen.

### Reihenfolge der Themen

Nicht die Katalogreihenfolge, sondern die Erzählreihenfolge:

**Rahmen** (Kunde, Branche, intern/extern, Zeitraum, Stand) → **Ausgangslage**
(was war das Problem, wer litt darunter) → **Auftrag** (was sollten wir tun)
→ **Herausforderungen** (was war schwierig, und warum) → **Lösung** (was wurde
gebaut, in welchen Schritten) → **Technik** (Werkzeuge, Architektur) →
**Rollen** (wer war beteiligt, wie viele, wie lange) → **Wirkung** (was ist
heute anders) → **Belege** (Zahlen, Zitate, Nachweise) → **Besonderes** (was
war ungewöhnlich an diesem Projekt).

Der Rahmen zuerst, weil er das Tempus der ganzen Fassung bestimmt: Ein
laufendes Projekt wird im Präsens beschrieben, ein abgeschlossenes im
Präteritum. Wer das am Ende erfährt, muss alles umschreiben.

---

## 2. Die Formulierung

Ein eigener Aufruf (E-12), höhere Effort-Stufe, mit:

1. **Rollenanweisung Formulierung** (fest): Ton, Anrede, Belegpflicht,
   Verbot zu erfinden, Begriffsdisziplin (Erfolgsgeschichte/Leistungen/KI).
2. **Der Zielprompt** aus `ziel.prompt` — der editierbare Teil.
3. **Die Abschnittsstruktur** aus `ziel.struktur`.
4. **Die Fakten, gefiltert** über `faktenFuerZiel()` (I-04). Nur diese.
5. **Die bestehende Fassung**, falls vorhanden, als Ausgangspunkt.

Die Ausgabe ist HTML mit `<h2>`, `<p>`, `<ul>`, `<blockquote>` — dieselben
Bausteine, die der WYSIWYG-Editor erzeugt. Kein Markdown, weil der Editor
sonst zweimal umwandeln müsste.

### Was die Formulierung nicht darf

- **Keine Zahl, die nicht als Fakt vorliegt.** Kein „rund 30 %", wenn niemand
  30 % gesagt hat. Fehlt eine Zahl, wird der Satz ohne sie geschrieben oder
  weggelassen.
- **Kein Kundenname beim Ziel Website** — er ist gar nicht im Kontext.
- **Keine Kundenstimme ohne Namen.** Ein Zitat ohne Person ist kein Zitat.
- **Keine Lücke kaschieren.** Fehlt ein Abschnitt an Fakten, wird er als
  Platzhalter markiert: `<p class="fehlt">Hier fehlt noch: …</p>`. Sichtbare
  Lücken werden gefüllt, kaschierte bleiben für immer falsch.

---

## 3. Faktenextraktion beim Import (E-08)

Eingang ist Text (eingefügt) oder eine URL (der Server holt die Seite und
entfernt das Markup). Der Aufruf liefert dasselbe Faktenschema wie das
Interview, mit `quelle = 'import'` und `sicher = 0` für alles, was im Text
behauptet statt belegt wird.

Zusätzlich wird die Vertraulichkeit **geschätzt**: Was in einem öffentlichen
Webtext steht, ist `oeffentlich`. Das ist die einzige Stelle, an der ein Fakt
ohne Nutzerentscheidung `oeffentlich` wird — und sie ist zulässig, weil der
Text bereits öffentlich ist.

Danach ein Verlaufseintrag (`rolle = 'notiz'`): „Importiert aus <Quelle>,
N Fakten übernommen." Und die erste Assistentenfrage richtet sich auf die
größte Lücke.

---

## 4. Der Lernmodus (E-07)

Trägt ein Ziel oder eine Projektart `lernmodus = 1`, läuft nach einer Sitzung
ein zusätzlicher Aufruf: **was hat hier gefehlt?**

Er bekommt den Gesprächsverlauf, den Faktenbestand und die aktuellen Hinweise
der Projektart — und liefert Lernnotizen:

```
{ bezug: "projektart" | "ziel" | "katalog",
  text: "Vorschlag, wie die Vorlage ergänzt werden sollte",
  begruendung: "woran im Gespräch das aufgefallen ist" }
```

Die Notizen landen mit `status = 'offen'` in `lernnotiz` und erscheinen in der
Verwaltung. Ein Knopf übernimmt den Text in `projektart.hinweise` bzw.
`ziel.prompt` und setzt `status = 'uebernommen'`. Verwerfen ist gleichwertig.

**Was der Lernmodus nicht tut:** Er schreibt nichts von selbst. Eine Vorlage,
die sich zwanzig Mal selbst ergänzt hat, ist niemandes Entscheidung mehr — und
ohne Verlauf nicht mehr reparierbar.

### Woran man erkennt, dass eine Lernnotiz gut ist

Sie nennt eine **Frage**, die gestellt werden sollte, nicht eine Eigenschaft
des Textes. „Bei Infrastrukturprojekten nach dem Wartungsfenster fragen" ist
brauchbar. „Mehr auf den Kundennutzen achten" ist Rauschen.

---

## 5. Modell und Kosten

`claude-opus-5`, adaptives Denken, `effort: high` im Interview und `xhigh` in
der Formulierung (E-13). Streaming für die Formulierung, weil sie lang wird.

Der stabile Teil des Prompts (Rollenanweisung + Faktenkatalog) steht vorn und
wird mit `cache_control` markiert. Er ist bei jedem Interviewschritt derselbe;
ohne Cache wäre er der größte Kostenblock. Zu prüfen ist
`usage.cache_read_input_tokens` — steht der bei null, invalidiert irgendetwas
im Prompt still den Cache (typisch: ein Zeitstempel).


---

## 6. Zwei Hilfen bei der Eingabe (E-15)

Beide sitzen unter dem Eingabefeld und beziehen sich auf die **letzte Frage**
des Assistenten.

### „Eins nach dem anderen abfragen"

Ein Aufruf (`ki/hilfe.ts → zerlegen`) liefert zwei bis fünf Teilfragen, jede
mit optionalem Hinweis. Die Oberfläche zeigt sie als Liste mit je einem Feld;
gesendet wird eine zusammengesetzte Antwort im Format `Frage Antwort` je
Zeile — so bleibt für den Assistenten zuordenbar, was worauf antwortet.

Der Prompt darf **nichts Neues** einführen: Er zerlegt die vorhandene Frage,
er erweitert sie nicht um Themen, die der Assistent nicht gefragt hat.

### „Antwort vorschlagen"

Ein Aufruf (`ki/hilfe.ts → beispielantwort`) entwirft die wahrscheinlichste
Antwort aus dem Bestand. **Hier wird geraten**, und deshalb gilt:

- Jede geratene Angabe steht in eckigen Klammern: `[X Stunden]`.
- Das Modell liefert zusätzlich `geraten` — eine Klartextliste, die über dem
  Eingabefeld erscheint.
- Der Vorschlag landet **im Eingabefeld, nicht im Gespräch**. Absenden bleibt
  eine Handlung des Nutzers.

Ohne diese drei Sicherungen wäre die Funktion gefährlich: Ein geratener Wert,
der unbemerkt abgesendet wird, ist im Bestand von einer echten Angabe nicht
mehr zu unterscheiden.

---

## 7. Fortschritt anzeigen (E-16)

Alle fünf KI-Endpunkte antworten als Server-Sent-Events. Gemeldet werden

- **Schritte** des Servers („70 Fakten und 5 Gesprächsschritte im Kontext"),
- **Denkschritte** des Modells, satzweise gepuffert,
- die **Länge** der entstehenden Antwort, alle 200 Zeichen.

Technisch: `messages.stream()` mit `output_config.format` — `messages.parse()`
kann nicht streamen, `finalMessage()` liefert trotzdem `parsed_output`. Und
`thinking: { type: 'adaptive', display: 'summarized' }`: Bei Claude Opus 5 ist
die Vorgabe `omitted`, und dann kommen leere Denkblöcke an.

Die Denkschritte kamen im ersten Lauf auf **Englisch** — das Modell denkt in
seiner Arbeitssprache. Da sie dem Nutzer angezeigt werden, steht die Bitte um
Deutsch jetzt in `REDAKTION` und gilt damit für jeden Prompt.

---

## Wenn mehrere Personen antworten (E-23)

Der Assistent spricht immer mit **einer** Person. Der wechselnde Teil des
Interview-Prompts sagt ihm, mit welcher — und was sie nicht weiß:

```
# Wer gerade antwortet

Anna Beispiel

Diese Person hat gesagt, dass sie Folgendes nicht beantworten kann —
frag nicht danach: `kennzahl`, `nutzen_intern`

Folgendes hat jemand anderes nicht beantworten können — vielleicht weiß
diese Person es: `technologie`
```

Dazu ist die Liste der offenen Punkte gefiltert: Sie enthält nur, was für
**diese** Person noch offen ist. Sind alle für sie beantwortbaren Punkte
durch, bekommt das Modell die Anweisung, das deutlich zu sagen und zu nennen,
was offen bleibt — wer dann wen dazuholt, entscheidet der Mensch.

Im `INTERVIEWER`-Block (dem stabilen, zwischengespeicherten Teil) steht die
Regel dazu: Eine übersprungene Frage nicht wiederholen („Sie hat nicht
geschwiegen, sondern gesagt, dass sie es nicht weiß — eine Wiederholung ist
dann eine Zumutung"), und **keine Kollegennamen in Fakten schreiben** — wer
was beigetragen hat, hält die Anwendung selbst fest (I-10).

**Ungemessen:** Dass diese drei Angaben im Prompt landen, ist nicht durch
einen Test gedeckt — die Prompt-Erzeugung steckt in `interviewSchritt()`, und
die ruft das Modell. Geprüft sind die Bausteine (`uebersprungeneVon()`,
`andereHabenUebersprungen()`, die Filterung der offenen Punkte) und der
Zusammenbau durch Lesen, nicht durch einen Lauf mit echter KI.
