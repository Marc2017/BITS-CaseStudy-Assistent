// Eine bestehende Erfolgsgeschichte aufnehmen: Text einfuegen oder URL
// abrufen, Fakten extrahieren (E-08).
//
// Es wird KEIN Gespraechsverlauf erfunden. Ein rekonstruierter Dialog wuerde
// Menschen Aussagen zuschreiben, die sie nie gemacht haben, und einen
// abgeschriebenen Text wie einen belegten Fakt aussehen lassen. Stattdessen
// ein Verlaufseintrag, der sagt, woher es kommt.
import { z } from 'zod';
import { frageJson } from './anbieter.ts';
import { STILL, type Melder } from '../api/strom.ts';
import { EXTRAKTOR } from './prompts.ts';
import { katalogText } from './prompts.ts';
import { faktSetzen, fortschritt, katalog } from '../db/fakten.ts';
import { nachrichtAnlegen, storyAnlegen, storyAendern } from '../db/story.ts';
import { FaktSchema } from './interview.ts';

export const ImportSchema = z.object({
  titelvorschlag: z.string().describe('Arbeitstitel aus dem Text, höchstens 80 Zeichen'),
  fakten: z.array(FaktSchema),
  luecken: z.array(z.string()).describe('was einer guten Erfolgsgeschichte hier fehlt'),
});

export type ImportAntwort = z.infer<typeof ImportSchema>;

/**
 * Eine Webseite als Text holen.
 *
 * Absichtlich einfach: Skript- und Stilbloecke raus, Tags raus, Entities
 * aufloesen, Leerraum zusammenfassen. Ein HTML-Parser waere eine Abhaengigkeit
 * fuer einen Handgriff, der bei mybits.de-Seiten messbar genuegt.
 */
export async function seiteHolen(url: string): Promise<string> {
  let ziel: URL;
  try {
    ziel = new URL(url);
  } catch {
    throw new Error(`Das ist keine gültige Adresse: ${url}`);
  }
  if (ziel.protocol !== 'http:' && ziel.protocol !== 'https:') {
    throw new Error('Nur http- und https-Adressen werden abgerufen.');
  }

  const antwort = await fetch(ziel, {
    headers: { 'User-Agent': 'BITS-Erfolgsgeschichte-Assistent/0.1' },
    redirect: 'follow',
  });
  if (!antwort.ok) {
    throw new Error(`Die Seite antwortete mit ${antwort.status} ${antwort.statusText}.`);
  }
  const html = await antwort.text();
  return textAus(html);
}

/**
 * Benannte HTML-Entities, die auf deutschen Seiten wirklich vorkommen.
 *
 * Gemessen: Ohne diese Liste kam aus `&auml;` ein wortwoertliches "&auml;" in
 * den Fakten an - die KI haette daraus "mittelstauml;ndisch" gelesen. Die
 * fuenf ueblichen Verdaechtigen (&amp; und Konsorten) genuegen fuer deutsche
 * Texte nicht.
 */
const ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß',
  eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç', uacute: 'ú', oacute: 'ó',
  ndash: '–', mdash: '—', hellip: '…', middot: '·', bull: '•',
  laquo: '«', raquo: '»', bdquo: '„', ldquo: '“', rdquo: '”',
  sbquo: '‚', lsquo: '‘', rsquo: '’', shy: '', zwnj: '', zwj: '',
  euro: '€', copy: '©', reg: '®', trade: '™', deg: '°', times: '×', minus: '−',
};

export function textAus(html: string): string {
  const ohneKopf = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  return ohneKopf
    // Absatzgrenzen erhalten, damit die Gliederung nicht verloren geht
    .replace(/<\/(p|div|section|h[1-6]|li|tr|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    // Numerische Entities zuerst, dann die benannten: `&#38;auml;` wuerde sonst
    // in der falschen Reihenfolge zu einem halb aufgeloesten Rest.
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]{1,8});/g, (ganz, name: string) =>
      (name in ENTITIES ? ENTITIES[name] : ganz))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .split('\n')
    .map((z) => z.trim())
    .join('\n')
    .trim();
}

export interface ImportErgebnis {
  story_id: number;
  titel: string;
  fakten: number;
  luecken: string[];
  fortschritt: ReturnType<typeof fortschritt>;
}

/**
 * Text (oder URL) in eine neue Erfolgsgeschichte verwandeln.
 *
 * `arbeitstitel` ueberstimmt den Vorschlag der KI - der Nutzer hat ihn
 * eingegeben, das ist die staerkere Angabe.
 */
export async function importieren(e: {
  text?: string;
  url?: string;
  arbeitstitel?: string;
  projektart_id?: number | null;
  kunde_id?: number | null;
  autor?: string | null;
}, melder: Melder = STILL): Promise<ImportErgebnis> {
  const quelle = e.url?.trim() || 'eingefügter Text';
  if (e.url?.trim()) melder.schritt(`Seite abrufen: ${e.url.trim()}`);
  const text = e.url?.trim() ? await seiteHolen(e.url.trim()) : (e.text ?? '').trim();

  if (text.length < 200) {
    throw new Error(
      `Der Text hat nur ${text.length} Zeichen. Das ist zu wenig für eine `
      + 'Faktenextraktion — bitte den vollständigen Text einfügen.',
    );
  }

  melder.schritt(`${text.length} Zeichen Text — Fakten werden herausgelesen`);

  const systemStabil = `${EXTRAKTOR}\n\n${katalogText(katalog())}`;
  const antwort = await frageJson(
    {
      systemStabil,
      verlauf: [{
        rolle: 'nutzer',
        text: `Quelle: ${quelle}\n\n--- Anfang des Textes ---\n${text}\n--- Ende des Textes ---`,
      }],
      effort: 'high',
      maxTokens: 20000,
      melder,
    },
    ImportSchema, 'faktenextraktion',
  );

  melder.schritt(`${antwort.fakten.length} Fakten erkannt — werden gesichert`);

  const titel = (e.arbeitstitel?.trim() || antwort.titelvorschlag || 'Importierte Erfolgsgeschichte')
    .slice(0, 160);

  const storyId = storyAnlegen({
    arbeitstitel: titel,
    projektart_id: e.projektart_id ?? null,
    kunde_id: e.kunde_id ?? null,
    autor: e.autor ?? null,
    herkunft: 'import',
    quelle,
  });

  let anzahl = 0;
  for (const f of antwort.fakten) {
    if (faktSetzen(storyId, {
      schluessel: f.schluessel.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      wert: f.wert,
      stufe: f.stufe,
      beleg: f.beleg,
      sicher: f.sicher,
      quelle: 'import',
    })) anzahl += 1;
  }

  nachrichtAnlegen(
    storyId, 'notiz',
    `Importiert aus ${quelle} — ${anzahl} Fakten übernommen. `
    + 'Der Gesprächsverlauf wurde nicht rekonstruiert (siehe E-08); '
    + 'die Fakten tragen die Quelle „import".',
  );

  if (antwort.luecken.length) {
    nachrichtAnlegen(
      storyId, 'assistent',
      'Ich habe die Geschichte gelesen. Für eine tragfähige Fassung fehlt mir noch '
      + `Folgendes: ${antwort.luecken.join('; ')}.\n\n`
      + 'Fangen wir mit dem Wichtigsten an — was davon können Sie mir sagen?',
    );
  }

  storyAendern(storyId, {});
  return {
    story_id: storyId,
    titel,
    fakten: anzahl,
    luecken: antwort.luecken,
    fortschritt: fortschritt(storyId),
  };
}
