# Referenz: wie eine Erfolgsgeschichte auf mybits.de aussieht

Erhoben am 17.09.2026. Quellen:

- `C:\Projekte\Claude\mybits_plugin\mybits-core\acf-json\group_mybits_cs_*.json`
  — die Feldstruktur des Inhaltstyps `mybits_case_study` (dreizehn Feldgruppen)
- `C:\Projekte\Claude\mybits_plugin\REDAKTIONSLEITFADEN.md` — Tonalität,
  Belegpflicht, Begriffsdisziplin
- `https://www.mybits.de/case-studies/` — 12 Geschichten auf Seite 1, rund 40
  im Bestand

Dieses Dokument ist die Grundlage für die Abschnittsstruktur des Ziels
„Website" (`server/src/seed/seed.ts`) und für den Faktenkatalog. Ändert sich
die Website, ändert sich zuerst dieses Dokument.

---

## Die kanonische Abschnittsfolge

| # | Abschnitt | ACF-Felder | Pflicht |
|---|---|---|---|
| 1 | **Kopfbereich** | `cs_kicker`, Titel, `cs_intro` (2–4 Sätze), `cs_kunde`, `cs_meta` (Repeater: Label/Wert), `cs_hero_video`, `cs_hero_standbild` | ja |
| 2 | **Kennzahlen** | `cs_kpis` (Repeater: `kpi_wert`, `kpi_label`, `kpi_text`) — weißes Kartenband, überlappt den Kopf | ja, drei Stück sind die Regel |
| 3 | **Ausgangssituation** | `cs_ausgangssituation` (WYSIWYG), `cs_media_video` / `cs_media_bild` | ja |
| 4 | **Herausforderung** | `cs_herausforderung` (Intro) + `cs_herausforderungen` (Karten: Titel, Text, Symbol) | ja |
| 5 | **Realisierung** | `cs_loesung` (WYSIWYG) + `cs_schritte` (Repeater: Marke, Titel, Kurztext), `cs_real_bilder` (drei Bilder sind die Regel) | ja |
| 6 | **Werkzeuge und Technologien** | `cs_tools_intro` + Taxonomie-Begriffe | ja |
| 7 | **Projektrollen** | `cs_rollen_intro` + Taxonomie-Begriffe | ja |
| 8 | **Kundenstimme** | `cs_kundenzitat`, `cs_zitat_person`, `cs_zitat_foto`, `cs_testimonials` | nein, aber der stärkste Beleg |
| 9 | **Fazit** | `cs_ergebnis` (WYSIWYG), `cs_fazit_grafik` | ja |
| 10 | **Freie Abschnitte** | `cs_abschnitte` (Repeater: Überschrift, Text) | nein |
| — | **Zuordnung** | `cs_leistungen` (verwandte Leistungen), `cs_ansprechpartner`, Taxonomie `mybits_branche` | ja |

Jeder Abschnitt hat ein `*_aus`-Feld („nicht anzeigen") und einen Anker. Leere
Abschnitte verbergen sich technisch selbst — laut Leitfaden ist das „eine
Notbremse, keine Erlaubnis".

### Die Metazeile

Vier Label, immer dieselben vier, gemessen an 40 Geschichten:

```
Projekt:  KI-Support-Plattform · Zendesk-Integration
Einsatz:  Ticket-Analyse · automatische Antworten · Quellenverlinkung
Kern:     mybits.ai als KI-Schaltstelle · RAG · Vector Embeddings
Basis:    Zendesk · Azure AI Services · AWS · Java
```

Trennzeichen ist der Mittelpunkt `·`, nicht das Komma. **Projekt** = was gebaut
wurde, **Einsatz** = was es tut, **Kern** = das tragende Konzept, **Basis** =
die Technik darunter.

### Der Kicker

`Case Study · <Branche>` — die Branche kommt aus der Taxonomie
`mybits_branche` und ist die Branche **des Kunden**. Ein Projekt in eine
fremde Branche zu etikettieren, damit eine Branchenseite nicht leer aussieht,
ist laut Leitfaden eine falsche Tatsachenbehauptung (ADR-153).

### Kennzahlen, wenn es keine Zahlen gibt

Auffällig und für den Assistenten wichtig: `kpi_wert` „darf leer bleiben", und
im Bestand stehen dort oft **Wörter statt Zahlen** — „Automatisiert", „Mehr
Kapazität", „Skalierbar". Ein Kennzahlenband ohne belegte Prozentwerte ist also
zulässig und üblich. Erfundene Prozente wären Klasse A („Nicht erfinden:
Prozentangaben zu erzielten Einsparungen").

---

## Tonalität (aus dem Redaktionsleitfaden)

- **Der Leser ist „Sie"**, wir sind **„wir"** — nie „die BITS GmbH", nie „man".
- **Erfolgsgeschichten**, nicht „Case Studies", „Referenzen" oder „Use Cases".
  Ausnahme: der Pfad `/case-studies/`.
- **Leistungen** ist der Gattungsname für das Angebot. „Lösung" meint in einer
  Erfolgsgeschichte das **gebaute Projekt** (Feld `cs_loesung`) — dort bleibt
  es.
- **KI**, nicht „AI". Ausnahmen sind Eigennamen: Azure AI Services, OpenAI,
  mybits.ai, BITS AI Lab, EU AI Act, Industrial AI.
- **Belegen statt behaupten — bei Fakten.** Wer eine Zahl, einen Zeitraum, ein
  Zertifikat oder ein Ergebnis nennt, muss es belegen können.
- **Kundenstimmen nur mit Namen.** Kein „unsere Kunden schätzen…".
- Claim: **„Wir machen KI wirksam."** Werte in dieser Reihenfolge:
  **Gemeinsam · Langfristig · Wirksam**. Ende-zu-Ende: **Beraten. Bauen.
  Betreiben.**

### Die drei Beanstandungsklassen

Der Leitfaden unterscheidet, und der Assistent muss das auch:

- **A — falsch, muss weg**: unwahre Aussagen, falsche Zahlen, Zusagen ohne
  Deckung, erfundene Referenzen oder Personen.
- **B — uneinheitlich**: zwei Wörter für dieselbe Sache.
- **C — Vorschlag**: Ton, Satzlänge, Aufbau. Darf ohne Begründung abgelehnt
  werden.

Die Wörter „Verstoß", „untersagt", „verboten" gehören zu A und sonst
nirgendwohin. Und die Gegenrichtung steht ebenfalls dort: „Zurückhaltung ist
kein Wert an sich. Ein Satz, der nichts behauptet, verkauft auch nichts."

### Was nie nach außen darf

Zielkundenlisten mit Umsätzen, Partner-Priorisierungen,
Wettbewerbsbewertungen, Skill-Lücken, interne Statusangaben, FTE- und
Preisannahmen. Im Werkzeug ist das die Stufe `vertraulich` (E-04).

---

## Beispielgeschichte (Goldstandard für die Prompts)

Abgerufen am 17.09.2026:
`https://www.mybits.de/case-studies/effizienzsteigerung-im-it-support-durch-kuenstliche-intelligenz-ki-integration-von-zendesk-und-mybits-ai/`

- **Kicker**: Case Study · Hotellerie & Reisen
- **Titel**: KI im IT-Support: Integration von Zendesk und mybits.ai
- **Intro**: „Ein mittelständisches E-Commerce-Unternehmen kämpfte mit
  wachsendem IT-Support. Lange Reaktionszeiten, eine hohe Fehlerquote bei der
  Bearbeitung von Anfragen und eine überforderte Supportabteilung
  beeinträchtigten zunehmend die Kundenzufriedenheit."
- **Kennzahlen**: Automatisiert / Mehr Kapazität / Skalierbar — drei Karten
  ohne eine einzige Zahl
- **Realisierung**: sechs Schritte, jeder mit Titel und einem Satz
- **Werkzeuge**: 21 Begriffe aus der Taxonomie
- **Projektrollen**: sechs Rollen
- **Fazit**: drei Sätze, die den Nutzen benennen, ohne eine Zahl zu erfinden

Bemerkenswert: Der Kunde heißt in der internen Erhebung `LuckyChef GmbH`
(Feld `cs_kunde`), auf der Seite steht nur „ein mittelständisches
E-Commerce-Unternehmen". **Genau diese Trennung ist der Kern von E-04.**

---

## Die zwölf Geschichten auf Seite 1

Als Musterbestand für den Import und als Themenspiegel:

1. KI im IT-Support: Integration von Zendesk und mybits.ai
2. Skalierbare und sichere Cloud-Infrastruktur mit AWS EKS und CI/CD-Automatisierung
3. Smart Work mit KI: Wie intelligente Assistenten den Arbeitsalltag verändern
4. Wettbewerb verstehen, Märkte vergleichen — die smarte Benchmark-Lösung der BITS
5. KI-gestützter Assistent für Ausschreibungsmanagement
6. 15 Jahre Innovation — Digitale Prozessplattform mit Substanz und Skalierbarkeit
7. Digitale Compliance-Lösung für internationale Regulatorik
8. Mobile Datenerfassung für Fahrzeugtests — Digitalisierung vor Ort
9. Systemintegration mit bidirektionaler Datensynchronisierung
10. Digitalisierung konzernweiter Finanzprozesse
11. Zentralisierung und Standardisierung von Applikationen im Konzern
12. Digitale Transformation im Mittelstand durch Prozessberatung

Die 15 Branchen der Website: Produktion & Maschinenbau · Automotive &
Zulieferer · Energie · Logistik & Supply Chain · Banken & Finanzsektor ·
Gesundheitswesen · Öffentlicher Sektor · Versicherungen · Bauindustrie ·
Luft- & Raumfahrt · Handel & E-Commerce · Pharma & Chemie · Telekommunikation ·
Verkehr & Infrastruktur · Hotellerie & Reisen
