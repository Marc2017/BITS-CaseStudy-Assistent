// Ziele (Textsorten) und Projektarten - die editierbaren Vorlagen (E-06).
//
// Beide sind Daten, nicht Code: Wer eine neue Textsorte braucht, legt sie in
// der Verwaltung an, und wer merkt, dass bei MAN-Projekten nach dem Werk
// gefragt werden muss, schreibt es in die Hinweise der Projektart.
import { alle, eine, schreib } from './index.ts';
import type { Stufe } from './fakten.ts';

export interface Abschnitt {
  schluessel: string;
  titel: string;
  hinweis?: string;
}

export interface Ziel {
  id: number;
  schluessel: string;
  name: string;
  beschreibung: string | null;
  prompt: string;
  struktur: string;
  stufe: Stufe;
  laenge: string | null;
  lernmodus: number;
  sort: number;
  aktiv: number;
}

export function ziele(nurAktive = true): Ziel[] {
  return alle<Ziel>(
    `SELECT * FROM ziel ${nurAktive ? 'WHERE aktiv = 1' : ''} ORDER BY sort, id`,
  );
}

export function ziel(id: number): Ziel | undefined {
  return eine<Ziel>('SELECT * FROM ziel WHERE id = ?', id);
}

export function zielNach(schluessel: string): Ziel | undefined {
  return eine<Ziel>('SELECT * FROM ziel WHERE schluessel = ?', schluessel);
}

/** Die Struktur als Liste - eine kaputte JSON-Spalte darf nichts umbringen. */
export function struktur(z: Ziel): Abschnitt[] {
  try {
    const d = JSON.parse(z.struktur);
    return Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
}

export function zielSpeichern(e: Partial<Ziel> & { schluessel: string; name: string }): number {
  const vorhanden = zielNach(e.schluessel);
  if (vorhanden) {
    schreib(
      `UPDATE ziel SET name = ?, beschreibung = ?, prompt = ?, struktur = ?,
          stufe = ?, laenge = ?, lernmodus = ?, sort = ?, aktiv = ?
        WHERE id = ?`,
      e.name, e.beschreibung ?? vorhanden.beschreibung, e.prompt ?? vorhanden.prompt,
      e.struktur ?? vorhanden.struktur, e.stufe ?? vorhanden.stufe,
      e.laenge ?? vorhanden.laenge, e.lernmodus ?? vorhanden.lernmodus,
      e.sort ?? vorhanden.sort, e.aktiv ?? vorhanden.aktiv, vorhanden.id,
    );
    return vorhanden.id;
  }
  const { id } = schreib(
    `INSERT INTO ziel (schluessel, name, beschreibung, prompt, struktur, stufe,
        laenge, lernmodus, sort, aktiv)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    e.schluessel, e.name, e.beschreibung ?? null, e.prompt ?? '',
    e.struktur ?? '[]', e.stufe ?? 'oeffentlich', e.laenge ?? null,
    e.lernmodus ?? 1, e.sort ?? 0, e.aktiv ?? 1,
  );
  return id;
}

// ---------------------------------------------------------------- Projektarten

export interface Projektart {
  id: number;
  name: string;
  beschreibung: string | null;
  hinweise: string | null;
  lernmodus: number;
  sort: number;
  aktiv: number;
}

export function projektarten(nurAktive = true): Projektart[] {
  return alle<Projektart>(
    `SELECT * FROM projektart ${nurAktive ? 'WHERE aktiv = 1' : ''} ORDER BY sort, id`,
  );
}

export function projektart(id: number | null): Projektart | undefined {
  if (!id) return undefined;
  return eine<Projektart>('SELECT * FROM projektart WHERE id = ?', id);
}

export function projektartSpeichern(e: Partial<Projektart> & { name: string }): number {
  if (e.id) {
    schreib(
      `UPDATE projektart SET name = ?, beschreibung = ?, hinweise = ?,
          lernmodus = ?, sort = ?, aktiv = ? WHERE id = ?`,
      e.name, e.beschreibung ?? null, e.hinweise ?? null,
      e.lernmodus ?? 1, e.sort ?? 0, e.aktiv ?? 1, e.id,
    );
    return e.id;
  }
  const vorhanden = eine<{ id: number }>('SELECT id FROM projektart WHERE name = ?', e.name);
  if (vorhanden) {
    schreib(
      'UPDATE projektart SET beschreibung = ?, hinweise = ?, lernmodus = ? WHERE id = ?',
      e.beschreibung ?? null, e.hinweise ?? null, e.lernmodus ?? 1, vorhanden.id,
    );
    return vorhanden.id;
  }
  const { id } = schreib(
    `INSERT INTO projektart (name, beschreibung, hinweise, lernmodus, sort, aktiv)
     VALUES (?,?,?,?,?,?)`,
    e.name, e.beschreibung ?? null, e.hinweise ?? null,
    e.lernmodus ?? 1, e.sort ?? 0, e.aktiv ?? 1,
  );
  return id;
}

/**
 * Hinweise ergaenzen - der Weg, auf dem eine uebernommene Lernnotiz in die
 * Projektart kommt (E-07). Angehaengt, nie ersetzt: der Verlauf bleibt lesbar.
 */
export function hinweisErgaenzen(id: number, text: string): void {
  const a = projektart(id);
  if (!a) return;
  const neu = [a.hinweise?.trim(), `- ${text.trim()}`].filter(Boolean).join('\n');
  schreib('UPDATE projektart SET hinweise = ? WHERE id = ?', neu, id);
}

export function promptErgaenzen(id: number, text: string): void {
  const z = ziel(id);
  if (!z) return;
  const neu = [z.prompt.trim(), `- ${text.trim()}`].filter(Boolean).join('\n');
  schreib('UPDATE ziel SET prompt = ? WHERE id = ?', neu, id);
}
