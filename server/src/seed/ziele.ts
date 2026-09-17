// Die mitgelieferten Ziele (Textsorten) und Projektarten.
//
// Alles hier ist eine ERSTAUSSTATTUNG. Sobald das Werkzeug in Gebrauch ist,
// wird das in der Verwaltung gepflegt und nicht mehr hier (E-06/E-07); der
// Seed schreibt deshalb nur, was fehlt.
//
// Die `schluessel` und die Stufenwerte sind Bezeichner und bleiben ASCII.
// Alles Übrige liest ein Mensch oder das Modell und ist deshalb in richtigem
// Deutsch geschrieben.
import type { Stufe } from '../db/fakten.ts';

export interface ZielVorgabe {
  schluessel: string;
  name: string;
  beschreibung: string;
  stufe: Stufe;
  laenge: string;
  prompt: string;
  struktur: { schluessel: string; titel: string; hinweis?: string }[];
}

export const ZIELE: ZielVorgabe[] = [
  {
    schluessel: 'website',
    name: 'Website (mybits.de)',
    beschreibung: 'Vertriebsorientierte Erfolgsgeschichte für die öffentliche Website. '
      + 'Der Kunde bleibt anonym, nur die Branche wird genannt.',
    stufe: 'oeffentlich',
    laenge: '2500 bis 4000 Zeichen',
    prompt: `Du schreibst für die öffentliche Website von BITS. Das ist eine
Vertriebs- und Marketing-Seite: Wir verkaufen uns. Ein Satz, der nichts
behauptet, verkauft auch nichts — aber jede überprüfbare Aussage muss belegt
sein.

Leserin ist eine Entscheiderin aus Industrie oder starkem Mittelstand, die
wissen will: Kennen die mein Problem? Haben die das schon einmal gemacht? Was
habe ich am Ende in der Hand?

- **Der Kunde bleibt anonym.** Nenne ihn über Branche und Größe („ein
  mittelständisches Unternehmen der Logistik"). Ein Kundenname steht im
  Faktenbestand dieser Fassung gar nicht — such nicht danach.
- Keine Abteilungsnamen, keine Personennamen des Kunden, keine
  Projektvolumina, keine Internas.
- Der Einstieg entscheidet: Die ersten zwei Sätze nennen das Problem so
  konkret, dass die Leserin sich wiedererkennt.
- Aktive Verben, kurze Sätze. Kein „innovativ", „ganzheitlich",
  „maßgeschneidert", „zukunftssicher", „Synergien", „Mehrwert".
- Das Fazit benennt den Nutzen, ohne eine Zahl zu erfinden.
- Kennzahlen dürfen Wörter sein statt Zahlen („Automatisiert",
  „Mehr Kapazität", „Skalierbar") — so steht es auch im Bestand der Website.`,
    struktur: [
      {
        schluessel: 'intro',
        titel: 'Einleitung',
        hinweis: 'zwei bis vier Sätze: anonymisierter Kunde, Problem, was entstanden ist. '
          + 'Ohne Überschrift, direkt als Absatz.',
      },
      {
        schluessel: 'kennzahlen',
        titel: 'Auf den Punkt',
        hinweis: 'drei Karten als <ul>: je Aussage ein <li> mit <strong>Wert oder '
          + 'Schlagwort</strong> und einem Satz.',
      },
      { schluessel: 'ausgangssituation', titel: 'Ausgangssituation' },
      {
        schluessel: 'herausforderung',
        titel: 'Die Herausforderung',
        hinweis: 'ein Absatz, dann die einzelnen Herausforderungen als <ul>.',
      },
      {
        schluessel: 'realisierung',
        titel: 'Die Realisierung',
        hinweis: 'ein Absatz, dann die Umsetzungsschritte als <ul> mit '
          + '<strong>Titel:</strong> und einem Satz — in der Reihenfolge der Umsetzung.',
      },
      { schluessel: 'technologien', titel: 'Werkzeuge und Technologien' },
      {
        schluessel: 'stimme',
        titel: 'Stimme aus dem Projekt',
        hinweis: 'nur wenn ein Zitat MIT Person im Bestand steht, als <blockquote> mit '
          + '<cite>. Sonst diesen Abschnitt weglassen.',
      },
      { schluessel: 'fazit', titel: 'Fazit' },
    ],
  },

  {
    schluessel: 'kundenreferenz',
    name: 'Interne Kundenreferenz',
    beschreibung: 'Für das Gespräch beim selben Kunden oder im eigenen Haus. Namen, '
      + 'Abteilungen und Internas sind hier genau das Interessante.',
    stufe: 'intern',
    laenge: '3000 bis 5000 Zeichen',
    prompt: `Du schreibst für den internen Gebrauch: für Kollegen, die zum
selben Kunden gehen, und für das nächste Gespräch in diesem Konzern. Diese
Fassung verlässt BITS nicht.

Der Ton ist sachlich und dicht, nicht vertrieblich. Kein Claim, keine
Selbstbeschreibung von BITS — die Leser arbeiten hier.

- **Namen gehören dazu:** Kunde, Gesellschaft, Standort, Abteilung,
  Ansprechpartner mit Rolle. Wer wen kennt, ist die halbe Information.
- **Die Systemlandschaft gehört dazu:** Was war da, was ist geblieben, was
  wurde ersetzt.
- **Was schwierig war, gehört dazu** — auch Reibung, Verzögerungen und
  Fehleinschätzungen. Ein Bericht, in dem alles glatt lief, ist für den
  nächsten Kollegen wertlos.
- **Anschlusspunkte benennen:** Was liegt beim Kunden offen, was wäre der
  nächste sinnvolle Schritt, wer entscheidet darüber.
- Vertrauliche Angaben (Preise, Margen, Vertragsdetails, Personalthemen)
  stehen nur dann darin, wenn sie als Fakt vorliegen — und dann ohne
  Ausschmückung.`,
    struktur: [
      {
        schluessel: 'kurz',
        titel: 'Kurz gefasst',
        hinweis: 'drei bis fünf Sätze: Kunde, Aufgabe, Ergebnis, Stand.',
      },
      {
        schluessel: 'rahmen',
        titel: 'Rahmen',
        hinweis: 'Kunde, Gesellschaft, Branche, Zeitraum, Auftragsart, Team.',
      },
      { schluessel: 'lage', titel: 'Ausgangslage und Auftrag' },
      {
        schluessel: 'umsetzung',
        titel: 'Was wir gemacht haben',
        hinweis: 'Schritte, Architektur, Technik.',
      },
      {
        schluessel: 'huerden',
        titel: 'Wo es schwierig war',
        hinweis: 'ehrlich; auch was nicht funktioniert hat.',
      },
      { schluessel: 'stand', titel: 'Stand und Wirkung' },
      {
        schluessel: 'anschluss',
        titel: 'Anschlusspunkte',
        hinweis: 'offene Themen, mögliche Folgeprojekte, Entscheider.',
      },
      {
        schluessel: 'beteiligte',
        titel: 'Wer es weiß',
        hinweis: 'BITS-Beteiligte mit Rolle — die Menschen, die man fragen kann.',
      },
    ],
  },

  {
    schluessel: 'cv',
    name: 'Mitarbeiter-CV (Projektabsatz)',
    beschreibung: 'Kurzer Absatz für ein Profil oder CV: was die Person in diesem '
      + 'Projekt geleistet hat, mit welchen Technologien.',
    stufe: 'intern',
    laenge: '600 bis 1200 Zeichen',
    prompt: `Du schreibst einen Projektabsatz für das Profil eines
BITS-Mitarbeitenden — die Form, die in einer Ausschreibung oder beim Kunden
vorgelegt wird.

- **Die Person steht im Mittelpunkt**, nicht BITS und nicht der Kunde. Wenn im
  Faktenbestand Beteiligte mit ihrem Beitrag stehen, ist das der Kern.
- **Der Kunde wird über Branche und Größe beschrieben**, nicht benannt — ein
  Profil geht an Dritte. Ausnahme: Der Faktenbestand enthält ausdrücklich eine
  Freigabe zur Nennung.
- **Technologien und Rollen vollständig und in der üblichen Schreibweise.**
  Sie werden gesucht und gefiltert, also gehören sie hin — als Liste am Ende.
- Knapp und in Tätigkeitsform: „Konzeption und Umsetzung der
  Zendesk-Anbindung", nicht „war beteiligt an".
- Keine Wertungen über die Person („hervorragend", „engagiert") — Leistungen,
  keine Adjektive.
- Steht im Bestand kein einzelner Beitrag einer Person, schreibe den Absatz
  aus Sicht des Projektteams und setze am Ende
  <p class="fehlt">Hier fehlt noch: der eigene Beitrag der Person.</p>`,
    struktur: [
      {
        schluessel: 'projekt',
        titel: 'Projekt',
        hinweis: 'eine Zeile: Aufgabe, Branche, Zeitraum — ohne Überschrift.',
      },
      {
        schluessel: 'aufgabe',
        titel: 'Aufgabe und Beitrag',
        hinweis: 'zwei bis vier Sätze in Tätigkeitsform.',
      },
      {
        schluessel: 'technik',
        titel: 'Eingesetzte Technologien',
        hinweis: 'als <ul> oder durch <br> getrennte Zeile.',
      },
      { schluessel: 'rollen', titel: 'Rollen', hinweis: 'kurze Liste.' },
    ],
  },

  {
    schluessel: 'angebot',
    name: 'Angebot / Pitch',
    beschreibung: 'Referenzabsatz für ein Angebot oder eine Präsentation: Warum '
      + 'qualifiziert uns dieses Projekt für die anstehende Aufgabe?',
    stufe: 'intern',
    laenge: '1200 bis 2000 Zeichen',
    prompt: `Du schreibst einen Referenzabsatz für ein Angebot. Er beantwortet
eine einzige Frage: **Warum qualifiziert uns dieses Projekt für die Aufgabe,
um die es jetzt geht?**

- Beginne mit der Parallele zur neuen Aufgabe, nicht mit der Projekthistorie.
- Bei jedem Punkt steht ein *weil*. Eigenschaften ohne Grund überzeugen nicht.
- Konkrete Artefakte nennen: was am Ende übergeben wurde (Architektur,
  Schnittstelle, Betriebsübergabe, Dokumentation).
- Der Kunde wird nur genannt, wenn eine Referenzfreigabe als Fakt vorliegt —
  sonst über Branche und Größe.
- Keine Zahl ohne Beleg. Ein Angebot mit einer falschen Zahl ist ein
  Haftungsthema, nicht ein Stilfehler.`,
    struktur: [
      {
        schluessel: 'parallele',
        titel: 'Vergleichbare Aufgabe',
        hinweis: 'ohne Überschrift, direkt der Absatz.',
      },
      { schluessel: 'vorgehen', titel: 'Unser Vorgehen dort' },
      {
        schluessel: 'ergebnis',
        titel: 'Ergebnis',
        hinweis: 'was übergeben wurde und was es bewirkt hat.',
      },
      { schluessel: 'uebertrag', titel: 'Was das für Ihr Vorhaben heißt' },
    ],
  },
];

export interface ProjektartVorgabe {
  name: string;
  beschreibung: string;
  hinweise: string;
}

export const PROJEKTARTEN: ProjektartVorgabe[] = [
  {
    name: 'KI-Projekt',
    beschreibung: 'KI-Anwendungen, Assistenten, RAG, Automatisierung von Wissensarbeit.',
    hinweise: `- Nach der Trennung öffentlicher und interner Wissensquellen fragen — das
  ist bei fast jedem KI-Projekt der eigentliche Knackpunkt.
- Nach dem Umgang mit Falschantworten fragen: Wie merkt man sie, was passiert dann?
- Nach der Quellenangabe fragen: Sieht der Nutzer, woher die Antwort kommt?
- Nach dem Modell und dem Ort der Verarbeitung fragen (Datenschutz, EU-Region).
- Nach der letzten Meile fragen: Läuft es im Betrieb, und wer betreibt es?
  Das ist das Kernversprechen von BITS — ein KI-Projekt ohne Betriebsaussage
  ist eine halbe Geschichte.
- Nach dem Vergleich vorher/nachher fragen, aber keine Prozentzahl erzwingen.`,
  },
  {
    name: 'Cloud und Infrastruktur',
    beschreibung: 'Rechenzentrum, Cloud-Migration, Kubernetes, CI/CD, Betrieb.',
    hinweise: `- Nach dem Wartungsfenster und der Ausfallzeit bei der Umstellung fragen.
- Nach dem Rückweg fragen: Gab es einen Rollback-Plan, wurde er gebraucht?
- Nach Standorten und Anbindung fragen, wenn mehrere Gesellschaften beteiligt sind.
- Nach dem Betriebsübergang fragen: Wer betreibt es heute, gab es eine Übergabe?
- Nach Kosten- oder Kapazitätseffekten fragen (oft der einzige harte Wert).
- Nach Zertifizierungen und Audits fragen (ISO 27001, TISAX, BSI).`,
  },
  {
    name: 'Individualentwicklung',
    beschreibung: 'Web-Applikationen, Fachanwendungen, Portale, mobile Erfassung.',
    hinweise: `- Nach den Nutzern fragen: wie viele, welche Rollen, wie geschult?
- Nach dem Ersetzten fragen: Was lief vorher — Excel, Papier, Altsystem?
- Nach der Einführung fragen: Pilot, Rollout, Widerstand, Akzeptanz.
- Nach dem Umgang mit Offline-Fällen fragen, wenn mobil erfasst wird.
- Nach der Weiterentwicklung fragen: Läuft das Projekt weiter, gibt es Releases?`,
  },
  {
    name: 'Systemintegration und Daten',
    beschreibung: 'Schnittstellen, Datensynchronisation, heterogene Systemlandschaften.',
    hinweise: `- Nach der Richtung fragen: einseitig oder bidirektional, und wer gewinnt
  bei einem Konflikt?
- Nach dem Datenvolumen und der Frequenz fragen.
- Nach der Fehlerbehandlung fragen: Was passiert, wenn ein System nicht antwortet?
- Nach dem führenden System fragen — die Antwort ist oft politisch und deshalb
  interessant.
- Nach der Altdatenübernahme fragen (meistens der aufwendigste Teil und in
  keinem Angebot richtig geschätzt).`,
  },
  {
    name: 'Beratung und Prozesse',
    beschreibung: 'Analyse, Prozessberatung, Architektur- und Strategiearbeit, EAM.',
    hinweise: `- Nach dem Ergebnis in der Hand fragen: Welches Dokument, welche
  Entscheidungsvorlage, welches Zielbild ist entstanden? Beratung ohne Artefakt
  lässt sich nicht erzählen.
- Nach der Entscheidung fragen, die daraufhin getroffen wurde — und von wem.
- Nach der Umsetzung fragen: Hat BITS anschließend gebaut? Das ist der Beleg
  für „Beraten. Bauen. Betreiben."
- Nach der Methode fragen (Interviews, Workshops, Erhebung, Bestandsaufnahme).
- Nach der Anzahl der Beteiligten und Standorte fragen — das zeigt die Größe.`,
  },
  {
    name: 'Internes Projekt',
    beschreibung: 'BITS selbst als Auftraggeber: eigene Werkzeuge, Plattformen, mybits.ai.',
    hinweise: `- Kunde ist „BITS (intern)". Die Freigabefrage entfällt, die
  Vertraulichkeitsfrage nicht.
- Nach dem Anlass fragen: Welches eigene Problem war der Auslöser?
- Nach der Nutzung fragen: Wer bei BITS arbeitet heute damit, und wie oft?
- Nach der Produktisierung fragen: Wird daraus eine Leistung für Kunden?
  Genau das macht ein internes Projekt vertrieblich verwertbar.
- Interne Projekte eignen sich besonders für die Website, weil es keine
  Kundenfreigabe braucht — darauf hinweisen, wenn es passt.`,
  },
  {
    name: 'Projekt bei MAN',
    beschreibung: 'Beispiel für eine kundenspezifische Projektart. Sammelt, was bei '
      + 'diesem Kunden immer wieder gebraucht wird.',
    hinweise: `- Diese Projektart ist ein BEISPIEL für kundenspezifisches Wissen. Die
  Hinweise hier sind Platzhalter und werden im Lernmodus durch echte ersetzt.
- Nach der Gesellschaft und dem Werk fragen — „MAN" allein ist zu grob.
- Nach dem Lastenheft fragen: Stand, Version, wer es verantwortet.
- Nach den Vorgaben des Konzerns fragen (IT-Standards, Freigabeprozesse,
  Lieferantenportal).
- Nach dem Ansprechpartner und seiner Rolle fragen — bei Konzernen ist die
  Beziehung die Referenz.`,
  },
];
