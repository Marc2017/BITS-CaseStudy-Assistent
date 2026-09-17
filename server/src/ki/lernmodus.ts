// Der Lernmodus: aus einem gefuehrten Gespraech lernen, welche FRAGEN gefehlt
// haben - und das als Vorschlag ablegen, nicht als Aenderung (E-07).
import { z } from 'zod';
import { frageJson } from './anbieter.ts';
import { faktenText, LERNER } from './prompts.ts';
import { fakten } from '../db/fakten.ts';
import { story, verlauf } from '../db/story.ts';
import { lernnotizAnlegen } from '../db/lernen.ts';
import { projektart, ziel } from '../db/vorlagen.ts';

export const LernSchema = z.object({
  notizen: z.array(z.object({
    bezug: z.enum(['ziel', 'projektart', 'katalog']),
    text: z.string().describe('die Frage oder Eigenheit, die künftig zu beachten ist'),
    begruendung: z.string().describe('woran im Gespräch das aufgefallen ist'),
  })).max(3),
});

export interface LernErgebnis {
  angelegt: number;
  uebersprungen: string | null;
}

/**
 * Nach einer Sitzung auswerten.
 *
 * Laeuft nur, wenn die Projektart oder das Ziel den Lernmodus tragen - sonst
 * kostet es Geld fuer eine Notiz, die niemand haben wollte.
 */
export async function auswerten(
  storyId: number, zielId?: number | null,
): Promise<LernErgebnis> {
  const s = story(storyId);
  if (!s) throw new Error(`Erfolgsgeschichte ${storyId} gibt es nicht.`);

  const art = projektart(s.projektart_id);
  const z0 = zielId ? ziel(zielId) : undefined;
  const lernenErlaubt = art?.lernmodus === 1 || z0?.lernmodus === 1;
  if (!lernenErlaubt) {
    return {
      angelegt: 0,
      uebersprungen: 'Lernmodus ist für diese Projektart und dieses Ziel aus.',
    };
  }

  const gespraech = verlauf(storyId).filter((n) => n.rolle !== 'notiz');
  if (gespraech.length < 4) {
    return { angelegt: 0, uebersprungen: 'Das Gespräch ist zu kurz für eine Auswertung.' };
  }

  const wechselnd = [
    `# Projektart: ${art?.name ?? 'nicht zugeordnet'}`,
    art?.hinweise ? `## Bisherige Hinweise\n${art.hinweise}` : '## Bisherige Hinweise\n(keine)',
    '',
    z0 ? `# Ziel der Fassung: ${z0.name}\n${z0.prompt}` : '',
    '',
    faktenText(fakten(storyId), 'Herausgekommener Faktenbestand'),
    '',
    '# Das Gespräch',
    ...gespraech.map((n) => `${n.rolle === 'nutzer' ? 'NUTZER' : 'ASSISTENT'}: ${n.text}`),
  ].filter(Boolean).join('\n');

  const antwort = await frageJson(
    {
      systemStabil: LERNER,
      systemWechselnd: wechselnd,
      verlauf: [{ rolle: 'nutzer', text: 'Werte dieses Gespräch aus.' }],
      effort: 'medium',
    },
    LernSchema, 'lernnotizen',
  );

  let angelegt = 0;
  for (const n of antwort.notizen) {
    const bezugId = n.bezug === 'projektart'
      ? (art?.id ?? null)
      : n.bezug === 'ziel' ? (z0?.id ?? null) : null;
    // Eine Notiz ohne Bezugsobjekt waere in der Verwaltung nicht zuzuordnen.
    if (n.bezug !== 'katalog' && !bezugId) continue;
    lernnotizAnlegen({
      bezug: n.bezug,
      bezug_id: bezugId,
      text: n.text,
      begruendung: n.begruendung,
      story_id: storyId,
    });
    angelegt += 1;
  }

  return { angelegt, uebersprungen: null };
}
