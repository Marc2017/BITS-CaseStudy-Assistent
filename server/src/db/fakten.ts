// Der Faktenbestand - das Herz der Anwendung (E-03).
//
// HIER LIEGT DIE VERTRAULICHKEITSGRENZE. `faktenFuerZiel()` ist der einzige
// Weg, auf dem Fakten in einen Formulierungs-Prompt gelangen (I-04). Wer die
// Filterung an einer zweiten Stelle nachbaut, hat sie an einer Stelle
// vergessen - und der Kundenname steht auf der Website.
import { alle, eine, schreib } from './index.ts';

export type Stufe = 'oeffentlich' | 'intern' | 'vertraulich';

/**
 * Rangfolge der Vertraulichkeit als ZAHL (I-05).
 *
 * Ein Textvergleich waere falsch: alphabetisch steht 'intern' vor
 * 'oeffentlich', und `stufe <= ziel.stufe` mit Zeichenketten wuerde interne
 * Fakten auf die Website lassen.
 */
export const STUFEN_RANG: Record<Stufe, number> = {
  oeffentlich: 0,
  intern: 1,
  vertraulich: 2,
};

const STUFEN = Object.keys(STUFEN_RANG) as Stufe[];

/**
 * Unbekanntes wird 'intern', nicht 'oeffentlich' (I-01).
 *
 * Diese Funktion ist die Stelle, an der ein Vorschlag der KI oder eine
 * fehlende Angabe in die konservative Richtung fallen. Ein Fakt wird durch
 * eine Entscheidung oeffentlich, nicht durch Vergessen.
 */
export function stufeOderIntern(wert: unknown): Stufe {
  return STUFEN.includes(wert as Stufe) ? (wert as Stufe) : 'intern';
}

export interface Fakt {
  id: number;
  story_id: number;
  schluessel: string;
  rubrik: string | null;
  wert: string;
  stufe: Stufe;
  quelle: 'interview' | 'import' | 'manuell';
  beleg: string | null;
  sicher: number;
  sort: number;
  erstellt_am: string;
  geaendert_am: string;
}

/** Der vollstaendige Bestand einer Geschichte - ungefiltert. */
export function fakten(storyId: number): Fakt[] {
  return alle<Fakt>(
    `SELECT * FROM fakt WHERE story_id = ?
      ORDER BY sort, id`,
    storyId,
  );
}

/**
 * Die Fakten, die in eine Fassung fuer dieses Ziel gehen duerfen (I-04).
 *
 * Gefiltert wird ueber den Rang (I-05), nicht ueber Text, und nicht im SQL -
 * damit die eine Regel an einer lesbaren Stelle steht.
 */
export function faktenFuerZiel(storyId: number, zielStufe: Stufe): Fakt[] {
  const grenze = STUFEN_RANG[zielStufe] ?? 0;
  return fakten(storyId).filter((f) => STUFEN_RANG[stufeOderIntern(f.stufe)] <= grenze);
}

export interface FaktEingabe {
  schluessel: string;
  wert: string;
  rubrik?: string | null;
  stufe?: unknown;
  quelle?: 'interview' | 'import' | 'manuell';
  beleg?: string | null;
  sicher?: boolean;
}

/**
 * Einen Fakt anlegen oder ersetzen.
 *
 * Traegt der Katalog `mehrfach = 0`, ersetzt ein neuer Wert den alten unter
 * demselben Schluessel - sonst stehen nach drei Nachfragen drei Kunden im
 * Bestand. Bei `mehrfach = 1` (Technologien, Rollen, Herausforderungen) wird
 * angehaengt, aber ein wortgleicher Wert nicht doppelt.
 */
export function faktSetzen(storyId: number, e: FaktEingabe): number {
  const wert = e.wert.trim();
  if (!wert) return 0;
  const stufe = stufeOderIntern(e.stufe);
  const katalog = eine<{ mehrfach: number; rubrik: string }>(
    'SELECT mehrfach, rubrik FROM faktenrubrik WHERE schluessel = ?', e.schluessel,
  );
  const mehrfach = katalog?.mehrfach === 1;
  const rubrik = e.rubrik ?? katalog?.rubrik ?? 'Weiteres';

  const vorhanden = alle<{ id: number; wert: string }>(
    'SELECT id, wert FROM fakt WHERE story_id = ? AND schluessel = ?',
    storyId, e.schluessel,
  );

  if (mehrfach) {
    if (vorhanden.some((v) => v.wert.trim().toLowerCase() === wert.toLowerCase())) return 0;
  } else if (vorhanden.length) {
    const alt = vorhanden[0];
    if (alt.wert.trim() === wert) return alt.id;
    schreib(
      `UPDATE fakt SET wert = ?, stufe = ?, beleg = COALESCE(?, beleg),
          sicher = ?, quelle = ?, geaendert_am = datetime('now')
        WHERE id = ?`,
      wert, stufe, e.beleg ?? null, e.sicher === false ? 0 : 1,
      e.quelle ?? 'interview', alt.id,
    );
    return alt.id;
  }

  const { id } = schreib(
    `INSERT INTO fakt (story_id, schluessel, rubrik, wert, stufe, quelle, beleg, sicher, sort)
     VALUES (?,?,?,?,?,?,?,?, (SELECT COALESCE(MAX(sort),0)+1 FROM fakt WHERE story_id = ?))`,
    storyId, e.schluessel, rubrik, wert, stufe,
    e.quelle ?? 'interview', e.beleg ?? null, e.sicher === false ? 0 : 1, storyId,
  );
  return id;
}

export function faktAendern(id: number, aenderung: Partial<FaktEingabe>): void {
  const felder: string[] = [];
  const werte: unknown[] = [];
  if (aenderung.wert !== undefined) { felder.push('wert = ?'); werte.push(aenderung.wert); }
  if (aenderung.stufe !== undefined) {
    felder.push('stufe = ?'); werte.push(stufeOderIntern(aenderung.stufe));
  }
  if (aenderung.beleg !== undefined) { felder.push('beleg = ?'); werte.push(aenderung.beleg); }
  if (aenderung.sicher !== undefined) {
    felder.push('sicher = ?'); werte.push(aenderung.sicher ? 1 : 0);
  }
  if (aenderung.rubrik !== undefined) { felder.push('rubrik = ?'); werte.push(aenderung.rubrik); }
  if (!felder.length) return;
  felder.push("geaendert_am = datetime('now')");
  schreib(`UPDATE fakt SET ${felder.join(', ')} WHERE id = ?`, ...werte, id);
}

export function faktLoeschen(id: number): void {
  schreib('DELETE FROM fakt WHERE id = ?', id);
}

export interface Katalogeintrag {
  id: number;
  schluessel: string;
  rubrik: string;
  label: string;
  hinweis: string | null;
  pflicht: number;
  mehrfach: number;
  stufe_vorschlag: Stufe;
  sort: number;
  aktiv: number;
}

export function katalog(): Katalogeintrag[] {
  return alle<Katalogeintrag>(
    'SELECT * FROM faktenrubrik WHERE aktiv = 1 ORDER BY sort, id',
  );
}

export interface Fortschritt {
  pflicht: number;
  pflichtErfuellt: number;
  /** Anzahl Fakten. */
  gesamt: number;
  /** Anzahl verschiedener Faktenarten - nicht dasselbe wie `gesamt`. */
  arten: number;
  offen: { schluessel: string; label: string; hinweis: string | null }[];
}

/**
 * Wie weit ist der Bestand? Grundlage der Anzeige „7 von 12" und des
 * Prompt-Abschnitts „was noch fehlt" (E-11).
 */
export function fortschritt(storyId: number): Fortschritt {
  const k = katalog();
  const bestand = fakten(storyId);
  const vorhanden = new Set(bestand.map((f) => f.schluessel));
  const pflicht = k.filter((e) => e.pflicht === 1);
  const offen = pflicht.filter((e) => !vorhanden.has(e.schluessel));
  return {
    pflicht: pflicht.length,
    pflichtErfuellt: pflicht.length - offen.length,
    // `gesamt` ist die Anzahl FAKTEN, nicht die der Faktenarten. Beide Zahlen
    // standen einmal unter demselben Namen: Die Spur meldete „26 gesamt",
    // waehrend der Reiter „Fakten 76" zeigte - fuer denselben Bestand.
    gesamt: bestand.length,
    arten: vorhanden.size,
    offen: offen.map((e) => ({ schluessel: e.schluessel, label: e.label, hinweis: e.hinweis })),
  };
}
