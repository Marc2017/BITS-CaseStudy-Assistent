// Lernnotizen: Beobachtungen aus Gespraechen, die eine Vorlage besser machen
// koennten - als Vorschlag, nicht als stille Aenderung (E-07).
import { alle, schreib, eine } from './index.ts';
import { hinweisErgaenzen, promptErgaenzen } from './vorlagen.ts';

export interface Lernnotiz {
  id: number;
  bezug: 'ziel' | 'projektart' | 'katalog';
  bezug_id: number | null;
  text: string;
  begruendung: string | null;
  story_id: number | null;
  status: 'offen' | 'uebernommen' | 'verworfen';
  erstellt_am: string;
}

export interface LernnotizZeile extends Lernnotiz {
  bezug_name: string | null;
  story_titel: string | null;
}

export function lernnotizen(status = 'offen'): LernnotizZeile[] {
  return alle<LernnotizZeile>(
    `SELECT l.*,
            CASE l.bezug
              WHEN 'projektart' THEN (SELECT name FROM projektart WHERE id = l.bezug_id)
              WHEN 'ziel'       THEN (SELECT name FROM ziel WHERE id = l.bezug_id)
              ELSE NULL END AS bezug_name,
            (SELECT arbeitstitel FROM story WHERE id = l.story_id) AS story_titel
       FROM lernnotiz l
      WHERE (? = 'alle' OR l.status = ?)
      ORDER BY l.id DESC`,
    status, status,
  );
}

export function lernnotizAnlegen(e: {
  bezug: Lernnotiz['bezug'];
  bezug_id: number | null;
  text: string;
  begruendung?: string | null;
  story_id?: number | null;
}): number {
  // Wortgleiche Vorschlaege nicht doppelt sammeln - sonst steht nach zehn
  // Gespraechen zehnmal derselbe Satz in der Verwaltung.
  const doppelt = eine<{ id: number }>(
    `SELECT id FROM lernnotiz
      WHERE bezug = ? AND COALESCE(bezug_id,0) = COALESCE(?,0)
        AND lower(trim(text)) = lower(trim(?)) AND status = 'offen'`,
    e.bezug, e.bezug_id, e.text,
  );
  if (doppelt) return doppelt.id;

  const { id } = schreib(
    `INSERT INTO lernnotiz (bezug, bezug_id, text, begruendung, story_id)
     VALUES (?,?,?,?,?)`,
    e.bezug, e.bezug_id, e.text.trim(), e.begruendung ?? null, e.story_id ?? null,
  );
  return id;
}

/**
 * Eine Notiz uebernehmen: Text an die Vorlage anhaengen und Status setzen.
 *
 * Bei `bezug = 'katalog'` gibt es kein Zielfeld - der Faktenkatalog wird von
 * Hand gepflegt. Die Notiz wird dann nur als uebernommen markiert; die
 * Aenderung macht ein Mensch in der Verwaltung.
 */
export function lernnotizUebernehmen(id: number): { ok: boolean; hinweis?: string } {
  const n = eine<Lernnotiz>('SELECT * FROM lernnotiz WHERE id = ?', id);
  if (!n) return { ok: false, hinweis: 'Diese Notiz gibt es nicht.' };

  if (n.bezug === 'projektart' && n.bezug_id) hinweisErgaenzen(n.bezug_id, n.text);
  else if (n.bezug === 'ziel' && n.bezug_id) promptErgaenzen(n.bezug_id, n.text);

  schreib("UPDATE lernnotiz SET status = 'uebernommen' WHERE id = ?", id);
  return {
    ok: true,
    hinweis: n.bezug === 'katalog'
      ? 'Als übernommen markiert. Der Faktenkatalog wird von Hand gepflegt.'
      : undefined,
  };
}

export function lernnotizVerwerfen(id: number): void {
  schreib("UPDATE lernnotiz SET status = 'verworfen' WHERE id = ?", id);
}
