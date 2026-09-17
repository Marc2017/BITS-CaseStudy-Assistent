// Aus Fakten eine Fassung machen - je Ziel eine andere.
//
// Die Vertraulichkeitsgrenze wird HIER nicht entschieden, sondern in
// fakten.ts geholt (I-04). Dieser Datei ist nicht bekannt, welche Fakten es
// sonst noch gibt - und genau das ist der Schutz.
import { z } from 'zod';
import { frageJson, frageText, type Runde } from './anbieter.ts';
import { faktenText, FORMULIERER, strukturText } from './prompts.ts';
import { faktenFuerZiel, fakten } from '../db/fakten.ts';
import { fassung, fassungSpeichern, story } from '../db/story.ts';
import { struktur, ziel } from '../db/vorlagen.ts';

/** Untergrenze fuer I-06: Ohne Grundlage wird nicht formuliert. */
const MINDESTFAKTEN = 4;

export const FassungSchema = z.object({
  titel: z.string().describe('Titel der Fassung, ohne Etikett wie "Case Study:"'),
  inhalt: z.string().describe('die Fassung als HTML'),
  luecken: z.array(z.string()).describe('welche Angaben fehlen, im Klartext'),
});

export type FassungAntwort = z.infer<typeof FassungSchema>;

export interface FormulierErgebnis extends FassungAntwort {
  fassung_id: number;
  verwendete_fakten: number;
  ausgelassene_fakten: number;
}

export async function formulieren(
  storyId: number, zielId: number,
): Promise<FormulierErgebnis> {
  const s = story(storyId);
  if (!s) throw new Error(`Erfolgsgeschichte ${storyId} gibt es nicht.`);
  const z0 = ziel(zielId);
  if (!z0) throw new Error(`Ziel ${zielId} gibt es nicht.`);

  // I-04: der einzige Weg zu den Fakten einer Fassung.
  const erlaubt = faktenFuerZiel(storyId, z0.stufe);
  const gesamt = fakten(storyId).length;

  // I-06: lieber nichts als Erfundenes.
  if (erlaubt.length < MINDESTFAKTEN) {
    throw new Error(
      `Für das Ziel „${z0.name}" liegen nur ${erlaubt.length} freigegebene Fakten vor `
      + `(von ${gesamt} insgesamt, Grenze dieses Ziels: ${z0.stufe}). `
      + `Mindestens ${MINDESTFAKTEN} werden gebraucht — sonst erfindet die KI den Rest. `
      + 'Erst weiter interviewen oder Fakten freigeben.',
    );
  }

  const abschnitte = struktur(z0);
  const alt = fassung(storyId, zielId);

  const systemStabil = FORMULIERER;
  const wechselnd = [
    `# Ziel dieser Fassung: ${z0.name}`,
    z0.beschreibung ?? null,
    '',
    '## Anweisung für dieses Ziel',
    z0.prompt,
    z0.laenge ? `\nRichtwert für die Länge: ${z0.laenge}` : null,
    '',
    strukturText(abschnitte),
    '',
    faktenText(erlaubt, 'Freigegebene Fakten'),
    '',
    `Arbeitstitel der Geschichte: ${s.arbeitstitel}`,
  ].filter((x) => x !== null).join('\n');

  const auftrag = alt?.inhalt
    ? 'Hier ist die bisherige Fassung. Überarbeite sie auf Grundlage der Fakten oben: '
      + 'behalte gelungene Formulierungen, ergänze Neues, entferne, was keine Grundlage '
      + `mehr hat:\n\n${alt.inhalt}`
    : 'Formuliere die Fassung.';

  const runden: Runde[] = [{ rolle: 'nutzer', text: auftrag }];

  const antwort = await frageJson(
    { systemStabil, systemWechselnd: wechselnd, verlauf: runden, effort: 'xhigh', maxTokens: 20000 },
    FassungSchema, 'fassung',
  );

  const id = fassungSpeichern({
    storyId,
    zielId,
    titel: antwort.titel,
    inhalt: antwort.inhalt,
    handisch: false,
    grund: 'neu formuliert',
  });

  return {
    ...antwort,
    fassung_id: id,
    verwendete_fakten: erlaubt.length,
    ausgelassene_fakten: gesamt - erlaubt.length,
  };
}

/**
 * Eine markierte Textstelle im Editor umformulieren.
 *
 * Bewusst ohne Faktenkontext: Hier wird nur die Form geaendert. Was keine
 * Grundlage hat, darf auch bei „staerker formulieren" nicht dazukommen.
 */
export async function textUmformulieren(
  text: string, auftrag: string,
): Promise<string> {
  if (!text.trim()) throw new Error('Kein Text markiert.');
  const systemStabil = [
    FORMULIERER,
    '',
    '# Sonderfall: eine einzelne Textstelle',
    'Du bekommst einen Ausschnitt und eine Anweisung. Gib **nur** den neuen',
    'Ausschnitt zurück, im gleichen HTML-Format, ohne Vorrede und ohne',
    'Erklärung. Keine Tatsache hinzufügen, keine Zahl ändern, keinen Namen',
    'erfinden — auch nicht, wenn die Anweisung nach mehr Wirkung verlangt.',
  ].join('\n');

  return frageText({
    systemStabil,
    verlauf: [{ rolle: 'nutzer', text: `Anweisung: ${auftrag}\n\nAusschnitt:\n${text}` }],
    effort: 'medium',
    maxTokens: 4000,
  });
}
