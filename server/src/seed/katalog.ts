// Der Faktenkatalog: was eine Erfolgsgeschichte braucht (E-11).
//
// Abgeleitet aus der Feldstruktur von mybits.de (docs/06-referenz-website.md).
// Die Reihenfolge ist die ERZÄHLreihenfolge, nicht die Formularreihenfolge -
// der Assistent arbeitet sie von oben nach unten ab.
//
// `stufe` ist die Vorgabe, wenn die KI nichts anderes erkennt. Sie ist bewusst
// streng: 'oeffentlich' steht nur dort, wo eine Angabe ihrer Natur nach
// unkritisch ist.
//
// ACHTUNG bei Änderungen: Die Schlüssel und die Stufenwerte sind Bezeichner in
// der Datenbank und bleiben ASCII. Alles, was ein Mensch oder das Modell liest
// (Label, Hinweis), wird in richtigem Deutsch geschrieben - ein Prompt in
// kaputter Orthografie erzeugt Texte in kaputter Orthografie.
import type { Stufe } from '../db/fakten.ts';

export interface KatalogVorgabe {
  schluessel: string;
  rubrik: string;
  label: string;
  hinweis: string;
  pflicht?: boolean;
  mehrfach?: boolean;
  stufe: Stufe;
}

export const KATALOG: KatalogVorgabe[] = [
  // ------------------------------------------------------------------ Rahmen
  {
    schluessel: 'kunde',
    rubrik: 'Rahmen',
    label: 'Kunde (Klarname)',
    hinweis: 'Der Name des Auftraggebers. Bei einem internen Projekt: „BITS (intern)". '
      + 'Immer intern — auf der Website steht er nie.',
    pflicht: true,
    stufe: 'intern',
  },
  {
    schluessel: 'kunde_anonym',
    rubrik: 'Rahmen',
    label: 'Kunde, anonymisiert',
    hinweis: 'Wie der Kunde ohne Namen beschrieben wird: „ein mittelständisches '
      + 'E-Commerce-Unternehmen", „ein Automobilkonzern". Fehlt diese Angabe, kann die '
      + 'Website-Fassung den Kunden nicht beschreiben — frag danach, sobald der Kunde '
      + 'bekannt ist.',
    pflicht: true,
    stufe: 'oeffentlich',
  },
  {
    schluessel: 'branche',
    rubrik: 'Rahmen',
    label: 'Branche des Kunden',
    hinweis: 'Eine der 15 Branchen der Website: Produktion & Maschinenbau, Automotive & '
      + 'Zulieferer, Energie, Logistik & Supply Chain, Banken & Finanzsektor, '
      + 'Gesundheitswesen, Öffentlicher Sektor, Versicherungen, Bauindustrie, Luft- & '
      + 'Raumfahrt, Handel & E-Commerce, Pharma & Chemie, Telekommunikation, Verkehr & '
      + 'Infrastruktur, Hotellerie & Reisen. Die Branche des KUNDEN, nicht die des '
      + 'Projekts.',
    pflicht: true,
    stufe: 'oeffentlich',
  },
  {
    schluessel: 'projekt_art',
    rubrik: 'Rahmen',
    label: 'Kundenprojekt oder intern',
    hinweis: 'Entweder „Kundenprojekt" oder „internes Projekt". Bestimmt, ob es überhaupt '
      + 'eine Kundenfreigabe braucht.',
    pflicht: true,
    stufe: 'oeffentlich',
  },
  {
    schluessel: 'projektstand',
    rubrik: 'Rahmen',
    label: 'Läuft noch oder abgeschlossen',
    hinweis: 'Entscheidet das Tempus der ganzen Fassung. Frag das FRÜH — wer es am Ende '
      + 'erfährt, muss alles umschreiben.',
    pflicht: true,
    stufe: 'oeffentlich',
  },
  {
    schluessel: 'zeitraum',
    rubrik: 'Rahmen',
    label: 'Zeitraum',
    hinweis: 'Von wann bis wann, oder seit wann. Jahreszahlen genügen.',
    stufe: 'intern',
  },
  {
    schluessel: 'projektgroesse',
    rubrik: 'Rahmen',
    label: 'Größe des Vorhabens',
    hinweis: 'Personentage, Teamgröße oder Volumen. Volumen und Preise sind vertraulich, '
      + 'eine Teamgröße ist es nicht.',
    stufe: 'vertraulich',
  },

  // ------------------------------------------------------------- Ausgangslage
  {
    schluessel: 'ausgangslage',
    rubrik: 'Ausgangslage',
    label: 'Lage vor dem Projekt',
    hinweis: 'Was war der Zustand, und warum war er ein Problem? Nicht die Lösung, '
      + 'sondern der Schmerz. Frag nach dem Konkreten: Wer hat gemerkt, dass es nicht '
      + 'geht, und woran?',
    pflicht: true,
    stufe: 'oeffentlich',
  },
  {
    schluessel: 'betroffene',
    rubrik: 'Ausgangslage',
    label: 'Wer litt darunter',
    hinweis: 'Rollen oder Abteilungen beim Kunden. Abteilungsnamen sind intern.',
    stufe: 'intern',
  },
  {
    schluessel: 'auftrag',
    rubrik: 'Ausgangslage',
    label: 'Auftrag an BITS',
    hinweis: 'Was sollte BITS tun? Der Satz, der im Angebot stand.',
    pflicht: true,
    stufe: 'oeffentlich',
  },
  {
    schluessel: 'bestandssystem',
    rubrik: 'Ausgangslage',
    label: 'Systemlandschaft vorher',
    hinweis: 'Welche Systeme waren im Einsatz? Detaillierte Landschaften sind intern.',
    stufe: 'intern',
  },

  // ---------------------------------------------------------- Herausforderung
  {
    schluessel: 'herausforderung',
    rubrik: 'Herausforderung',
    label: 'Herausforderung',
    hinweis: 'Was war schwierig — und WARUM war es schwierig? Je Herausforderung ein '
      + 'eigener Fakt. Drei bis sechs sind die Regel auf der Website. Eine '
      + 'Herausforderung ohne Grund ist eine Behauptung.',
    pflicht: true,
    mehrfach: true,
    stufe: 'oeffentlich',
  },
  {
    schluessel: 'risiko',
    rubrik: 'Herausforderung',
    label: 'Risiko oder Randbedingung',
    hinweis: 'Regulatorik, Datenschutz, Verfügbarkeit, Termindruck, Zertifizierungen '
      + '(TISAX, ISO 27001).',
    mehrfach: true,
    stufe: 'oeffentlich',
  },

  // ---------------------------------------------------------------- Lösung
  {
    schluessel: 'loesung',
    rubrik: 'Lösung',
    label: 'Was gebaut wurde',
    hinweis: 'Das Projekt in zwei bis vier Sätzen: was entstanden ist und wie es '
      + 'funktioniert. Hier heißt „Lösung" das gebaute Projekt.',
    pflicht: true,
    stufe: 'oeffentlich',
  },
  {
    schluessel: 'schritt',
    rubrik: 'Lösung',
    label: 'Umsetzungsschritt',
    hinweis: 'Je Schritt ein Fakt, in der Reihenfolge der Umsetzung: kurzer Titel und ein '
      + 'Satz. Auf der Website stehen vier bis sechs.',
    pflicht: true,
    mehrfach: true,
    stufe: 'oeffentlich',
  },
  {
    schluessel: 'architektur',
    rubrik: 'Lösung',
    label: 'Tragendes Konzept',
    hinweis: 'Das Prinzip dahinter — „RAG mit Vector Embeddings", „ereignisgetriebene '
      + 'Integration", „zentrales Rechenzentrum mit Standortanbindung". Wird zur Zeile '
      + '„Kern" in der Metazeile der Website.',
    stufe: 'oeffentlich',
  },

  // ----------------------------------------------------------------- Technik
  {
    schluessel: 'technologie',
    rubrik: 'Technik',
    label: 'Technologie oder Werkzeug',
    hinweis: 'Je Technologie ein Fakt: Sprachen, Frameworks, Clouds, Produkte, Methoden '
      + '(Scrum, Agile). Schreibweise beachten: KI, nicht AI — aber Azure AI Services, '
      + 'OpenAI und mybits.ai bleiben, wie sie sind.',
    pflicht: true,
    mehrfach: true,
    stufe: 'oeffentlich',
  },
  {
    schluessel: 'schnittstelle',
    rubrik: 'Technik',
    label: 'Angebundenes System',
    hinweis: 'Womit wurde integriert? Fremdprodukte sind öffentlich, die konkrete '
      + 'Systemlandschaft des Kunden ist intern.',
    mehrfach: true,
    stufe: 'oeffentlich',
  },

  // ------------------------------------------------------------ Team & Rollen
  {
    schluessel: 'rolle',
    rubrik: 'Team und Rollen',
    label: 'Projektrolle',
    hinweis: 'Welche Rollen hat BITS gestellt? Die Website nennt etwa IT-Consulting/'
      + 'Beratung, IT-Projektmanagement, IT-Systemarchitektur, Fullstack Entwicklung, '
      + 'DevOps, Infrastruktur/Betrieb. Je Rolle ein Fakt.',
    pflicht: true,
    mehrfach: true,
    stufe: 'oeffentlich',
  },
  {
    schluessel: 'beteiligte',
    rubrik: 'Team und Rollen',
    label: 'Beteiligte Person bei BITS',
    hinweis: 'Name und Rolle. Für die CV-Fassung entscheidend, für die Website '
      + 'unnötig — deshalb intern. Frag nach, WAS die Person beigetragen hat, nicht nur, '
      + 'dass sie dabei war.',
    mehrfach: true,
    stufe: 'intern',
  },
  {
    schluessel: 'zusammenarbeit',
    rubrik: 'Team und Rollen',
    label: 'Art der Zusammenarbeit',
    hinweis: 'Vor Ort, aus der Ferne, gemischtes Team mit dem Kunden, Werkvertrag, '
      + 'Dienstleistung? Für die interne Referenz wichtig.',
    stufe: 'intern',
  },

  // ----------------------------------------------------------------- Wirkung
  {
    schluessel: 'wirkung',
    rubrik: 'Wirkung',
    label: 'Was heute anders ist',
    hinweis: 'Die Veränderung im Betrieb, nicht in der Präsentation. Je Wirkung ein '
      + 'Fakt. Wenn der Nutzer „schneller" oder „besser" sagt: nachfragen, von was auf '
      + 'was.',
    pflicht: true,
    mehrfach: true,
    stufe: 'oeffentlich',
  },
  {
    schluessel: 'kennzahl',
    rubrik: 'Wirkung',
    label: 'Kennzahl',
    hinweis: 'Eine Zahl mit Bezug: „von 4 Tagen auf 4 Stunden", „rund 400 Tickets pro '
      + 'Woche". IMMER nach dem Beleg fragen. Ohne Beleg mit „sicher: false" aufnehmen. '
      + 'Ein Kennzahlenband ohne Zahlen ist erlaubt — auf der Website steht dort oft '
      + '„Automatisiert" oder „Skalierbar"; eine erfundene Prozentzahl ist es nicht.',
    mehrfach: true,
    stufe: 'oeffentlich',
  },
  {
    schluessel: 'nutzen_intern',
    rubrik: 'Wirkung',
    label: 'Nutzen für BITS',
    hinweis: 'Folgeaufträge, aufgebautes Wissen, neue Referenz, Produktisierung. Nur '
      + 'für interne Fassungen.',
    stufe: 'intern',
  },

  // ------------------------------------------------------------------ Belege
  {
    schluessel: 'kundenzitat',
    rubrik: 'Belege',
    label: 'Kundenzitat',
    hinweis: 'Wörtlich. Ein Zitat ohne Person ist kein Zitat — frag immer nach Name und '
      + 'Rolle. Bis zur Freigabe des Kunden bleibt es intern.',
    stufe: 'intern',
  },
  {
    schluessel: 'zitat_person',
    rubrik: 'Belege',
    label: 'Person des Zitats',
    hinweis: 'Name, Rolle, Unternehmen — und ob die Freigabe vorliegt.',
    stufe: 'intern',
  },
  {
    schluessel: 'nachweis',
    rubrik: 'Belege',
    label: 'Nachweis',
    hinweis: 'Woran eine Aussage hängt: Abnahmeprotokoll, Monitoring-Auswertung, '
      + 'Zertifikat, Messung. Der Teil, der die Belegpflicht trägt.',
    mehrfach: true,
    stufe: 'intern',
  },

  // --------------------------------------------------------------- Besonderes
  {
    schluessel: 'besonderheit',
    rubrik: 'Besonderes',
    label: 'Was ungewöhnlich war',
    hinweis: 'Der Teil, den nur jemand erzählen kann, der dabei war. Genau hier '
      + 'entsteht der Unterschied zu einer austauschbaren Geschichte — frag danach, auch '
      + 'wenn alles andere schon vollständig ist.',
    mehrfach: true,
    stufe: 'intern',
  },
  {
    schluessel: 'gelernt',
    rubrik: 'Besonderes',
    label: 'Was wir gelernt haben',
    hinweis: 'Für die interne Referenz das Wertvollste. Auch Fehlschläge — die sind '
      + 'intern oder vertraulich, aber sie sind Wissen.',
    mehrfach: true,
    stufe: 'intern',
  },
  {
    schluessel: 'leistung',
    rubrik: 'Besonderes',
    label: 'Passende BITS-Leistung',
    hinweis: 'Welche Leistung von mybits.de passt dazu? Für die Verlinkung auf der '
      + 'Website.',
    mehrfach: true,
    stufe: 'oeffentlich',
  },
];
