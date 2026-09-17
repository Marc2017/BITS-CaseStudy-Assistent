// Erfolgsgeschichten, ihr Gespraechsverlauf und ihre Fassungen.
import { alle, eine, schreib } from './index.ts';
import { fakten } from './fakten.ts';

export interface Story {
  id: number;
  arbeitstitel: string;
  projektart_id: number | null;
  kunde_id: number | null;
  status: 'aktiv' | 'fertig' | 'archiv';
  autor: string | null;
  herkunft: 'interview' | 'import';
  quelle: string | null;
  erstellt_am: string;
  geaendert_am: string;
}

export interface StoryZeile extends Story {
  projektart: string | null;
  kunde_name: string | null;
  kunde: string | null;
  branche: string | null;
  fakten_anzahl: number;
  nachrichten: number;
  fassungen: number;
}

/**
 * Die Uebersicht.
 *
 * Kunde und Branche kommen ueber einen Join auf `fakt` - sie sind Fakten und
 * keine Spalten (I-03). Die Unterabfrage nimmt den zuletzt geaenderten Wert,
 * damit eine Korrektur im Gespraech sofort in der Liste steht.
 */
export function storys(status?: string): StoryZeile[] {
  const filter = status ? 'WHERE s.status = ?' : '';
  const p = status ? [status] : [];
  return alle<StoryZeile>(
    `SELECT s.*, p.name AS projektart, ku.name AS kunde_name,
            (SELECT wert FROM fakt f WHERE f.story_id = s.id AND f.schluessel = 'kunde'
              ORDER BY f.geaendert_am DESC LIMIT 1) AS kunde,
            (SELECT wert FROM fakt f WHERE f.story_id = s.id AND f.schluessel = 'branche'
              ORDER BY f.geaendert_am DESC LIMIT 1) AS branche,
            (SELECT COUNT(*) FROM fakt f WHERE f.story_id = s.id) AS fakten_anzahl,
            (SELECT COUNT(*) FROM nachricht n WHERE n.story_id = s.id) AS nachrichten,
            (SELECT COUNT(*) FROM fassung v WHERE v.story_id = s.id AND v.inhalt <> '')
              AS fassungen
       FROM story s
       LEFT JOIN projektart p ON p.id = s.projektart_id
       LEFT JOIN kunde ku ON ku.id = s.kunde_id
       ${filter}
      ORDER BY s.geaendert_am DESC`,
    ...p,
  );
}

export function story(id: number): StoryZeile | undefined {
  return storys().find((s) => s.id === id);
}

export function storyAnlegen(e: {
  arbeitstitel: string;
  projektart_id?: number | null;
  kunde_id?: number | null;
  autor?: string | null;
  herkunft?: 'interview' | 'import';
  quelle?: string | null;
}): number {
  const { id } = schreib(
    `INSERT INTO story (arbeitstitel, projektart_id, kunde_id, autor, herkunft, quelle)
     VALUES (?,?,?,?,?,?)`,
    e.arbeitstitel.trim(), e.projektart_id ?? null, e.kunde_id ?? null,
    e.autor ?? null, e.herkunft ?? 'interview', e.quelle ?? null,
  );
  return id;
}

export function storyAendern(id: number, e: Partial<Story>): void {
  const felder: string[] = [];
  const werte: unknown[] = [];
  if (e.arbeitstitel !== undefined) { felder.push('arbeitstitel = ?'); werte.push(e.arbeitstitel); }
  if (e.projektart_id !== undefined) {
    felder.push('projektart_id = ?'); werte.push(e.projektart_id);
  }
  if (e.kunde_id !== undefined) { felder.push('kunde_id = ?'); werte.push(e.kunde_id); }
  if (e.status !== undefined) { felder.push('status = ?'); werte.push(e.status); }
  if (e.autor !== undefined) { felder.push('autor = ?'); werte.push(e.autor); }
  if (!felder.length) return;
  felder.push("geaendert_am = datetime('now')");
  schreib(`UPDATE story SET ${felder.join(', ')} WHERE id = ?`, ...werte, id);
}

export function storyBeruehrt(id: number): void {
  schreib("UPDATE story SET geaendert_am = datetime('now') WHERE id = ?", id);
}

export function storyLoeschen(id: number): void {
  schreib('DELETE FROM story WHERE id = ?', id);
}

// -------------------------------------------------------------------- Verlauf

export interface Nachricht {
  id: number;
  story_id: number;
  rolle: 'assistent' | 'nutzer' | 'notiz';
  text: string;
  erstellt_am: string;
}

export function verlauf(storyId: number): Nachricht[] {
  return alle<Nachricht>(
    'SELECT * FROM nachricht WHERE story_id = ? ORDER BY id', storyId,
  );
}

export function nachrichtAnlegen(
  storyId: number, rolle: Nachricht['rolle'], text: string,
): number {
  const { id } = schreib(
    'INSERT INTO nachricht (story_id, rolle, text) VALUES (?,?,?)',
    storyId, rolle, text,
  );
  storyBeruehrt(storyId);
  return id;
}

// ------------------------------------------------------------------ Fassungen

export interface Fassung {
  id: number;
  story_id: number;
  ziel_id: number;
  titel: string | null;
  inhalt: string;
  handisch: number;
  fakten_stand: number;
  erstellt_am: string;
  geaendert_am: string;
}

export function fassung(storyId: number, zielId: number): Fassung | undefined {
  return eine<Fassung>(
    'SELECT * FROM fassung WHERE story_id = ? AND ziel_id = ?', storyId, zielId,
  );
}

export function fassungen(storyId: number): Fassung[] {
  return alle<Fassung>('SELECT * FROM fassung WHERE story_id = ? ORDER BY ziel_id', storyId);
}

/**
 * Fassung speichern.
 *
 * Vor dem Ueberschreiben einer handgeschriebenen Fassung wird gesichert
 * (I-02). Das gilt auch dann, wenn der Aufrufer es vergisst - deshalb steht es
 * hier und nicht im Handler.
 */
export function fassungSpeichern(e: {
  storyId: number;
  zielId: number;
  titel?: string | null;
  inhalt: string;
  handisch: boolean;
  grund?: string;
}): number {
  const alt = fassung(e.storyId, e.zielId);
  const stand = fakten(e.storyId).length;

  if (alt) {
    const ueberschreibt = alt.inhalt && alt.inhalt !== e.inhalt;
    if (ueberschreibt && (alt.handisch === 1 || !e.handisch)) {
      schreib(
        `INSERT INTO fassung_sicherung (fassung_id, titel, inhalt, handisch, grund)
         VALUES (?,?,?,?,?)`,
        alt.id, alt.titel, alt.inhalt, alt.handisch, e.grund ?? 'ersetzt',
      );
    }
    schreib(
      `UPDATE fassung SET titel = ?, inhalt = ?, handisch = ?, fakten_stand = ?,
          geaendert_am = datetime('now')
        WHERE id = ?`,
      e.titel ?? alt.titel, e.inhalt, e.handisch ? 1 : 0, stand, alt.id,
    );
    storyBeruehrt(e.storyId);
    return alt.id;
  }

  const { id } = schreib(
    `INSERT INTO fassung (story_id, ziel_id, titel, inhalt, handisch, fakten_stand)
     VALUES (?,?,?,?,?,?)`,
    e.storyId, e.zielId, e.titel ?? null, e.inhalt, e.handisch ? 1 : 0, stand,
  );
  storyBeruehrt(e.storyId);
  return id;
}

export function sicherungen(fassungId: number) {
  return alle(
    `SELECT id, titel, handisch, grund, erstellt_am, length(inhalt) AS zeichen
       FROM fassung_sicherung WHERE fassung_id = ? ORDER BY id DESC`,
    fassungId,
  );
}

export function sicherung(id: number) {
  return eine<{ id: number; inhalt: string; titel: string | null }>(
    'SELECT id, titel, inhalt FROM fassung_sicherung WHERE id = ?', id,
  );
}
