// Ein Interviewschritt: Nutzerantwort aufnehmen, Fakten daraus ziehen, die
// naechste Frage stellen - in EINEM Modellaufruf (E-12).
import { z } from 'zod';
import { frageJson, type Runde } from './anbieter.ts';
import { STILL, type Melder } from '../api/strom.ts';
import { faktenText, INTERVIEWER, katalogText } from './prompts.ts';
import { fakten, faktSetzen, fortschritt, katalog } from '../db/fakten.ts';
import { nachrichtAnlegen, story, verlauf } from '../db/story.ts';
import { kunde, projektart } from '../db/vorlagen.ts';

const StufeSchema = z.enum(['oeffentlich', 'intern', 'vertraulich']);

/**
 * Ein einzelner Fakt, wie das Modell ihn liefert.
 *
 * Alle Felder sind Pflicht (nullable statt optional): Bei strukturierter
 * Ausgabe ist ein fehlendes Feld eine Fehlerquelle, ein leeres nicht.
 */
export const FaktSchema = z.object({
  schluessel: z.string().describe('Kleinbuchstaben-Schlüssel, möglichst aus dem Katalog'),
  wert: z.string().describe('die Tatsache in einem Satz oder einer Wortgruppe'),
  stufe: StufeSchema,
  beleg: z.string().nullable().describe('woher die Angabe kommt, sonst null'),
  sicher: z.boolean().describe('false, wenn unbelegt oder vom Nutzer nicht bestätigt'),
});

export const InterviewSchema = z.object({
  fakten: z.array(FaktSchema).describe('nur Neues oder Korrigiertes'),
  frage: z.string().describe('genau eine Frage an den Nutzer'),
  hinweis: z.string().nullable(),
  luecken: z.array(z.string()).describe('Katalogschlüssel, die als Nächstes dran wären'),
  reif: z.boolean().describe('reicht der Bestand für eine Fassung?'),
});

export type Interview = z.infer<typeof InterviewSchema>;

export interface SchrittErgebnis extends Interview {
  neue_fakten: number;
  fortschritt: ReturnType<typeof fortschritt>;
}

/**
 * Ein Schritt im Gespraech.
 *
 * `nutzerText` fehlt beim ersten Aufruf - dann eroeffnet der Assistent das
 * Interview. Die Nutzerantwort wird VOR dem Modellaufruf gespeichert: Bricht
 * der Aufruf ab, ist die Antwort trotzdem nicht verloren.
 */
export async function interviewSchritt(
  storyId: number, nutzerText?: string, melder: Melder = STILL,
): Promise<SchrittErgebnis> {
  const s = story(storyId);
  if (!s) throw new Error(`Erfolgsgeschichte ${storyId} gibt es nicht.`);

  if (nutzerText?.trim()) nachrichtAnlegen(storyId, 'nutzer', nutzerText.trim());

  melder.schritt('Faktenbestand und Katalog zusammenstellen');
  const art = projektart(s.projektart_id);
  const kd = kunde(s.kunde_id);
  const bestand = fakten(storyId);
  const stand = fortschritt(storyId);

  // Stabiler Teil: Rollenanweisung + Katalog. Aendert sich nur, wenn der
  // Katalog gepflegt wird - deshalb zwischenspeicherbar.
  const systemStabil = `${INTERVIEWER}\n\n${katalogText(katalog())}`;

  // Wechselnder Teil: Projekt, Bestand, Luecken.
  // Der Kontext ist die KOMBINATION aus Projektart und Kunde (E-14): Die
  // Projektart sagt, was bei dieser Art von Vorhaben zu fragen ist, der Kunde,
  // was bei diesem Auftraggeber gilt. Beide Hinweistexte gehen ein, getrennt
  // benannt - damit im Lernmodus zuzuordnen bleibt, woher ein Hinweis kommt.
  const wechselnd = [
    '# Diese Erfolgsgeschichte',
    `Arbeitstitel: ${s.arbeitstitel}`,
    `Projektart: ${art?.name ?? 'nicht zugeordnet'}`,
    art?.beschreibung ? `(${art.beschreibung})` : null,
    kd ? `Kunde: ${kd.name}${kd.branche ? ` — ${kd.branche}` : ''}` : 'Kunde: nicht zugeordnet',
    kd?.anonym ? `Anonymisiert zu beschreiben als: ${kd.anonym}` : null,
    '',
    art?.hinweise
      ? `## Hinweise zu dieser Projektart\n\nDas hat sich hier bisher als wichtig erwiesen:\n\n${art.hinweise}`
      : null,
    '',
    kd?.hinweise
      ? `## Hinweise zu diesem Kunden\n\nDas gilt bei ${kd.name} unabh\u00e4ngig von der Projektart:\n\n${kd.hinweise}`
      : null,
    '',
    faktenText(bestand),
    '',
    `# Stand: ${stand.pflichtErfuellt} von ${stand.pflicht} Pflichtfakten`,
    stand.offen.length
      ? `Es fehlen noch: ${stand.offen.map((o) => `${o.label} (\`${o.schluessel}\`)`).join(', ')}`
      : 'Alle Pflichtfakten liegen vor.',
  ].filter((z) => z !== null).join('\n');

  const runden: Runde[] = verlauf(storyId)
    .filter((n) => n.rolle !== 'notiz')
    .map((n) => ({ rolle: n.rolle === 'nutzer' ? 'nutzer' : 'assistent', text: n.text }));

  melder.schritt(
    `${bestand.length} Fakten und ${runden.length} Gesprächsschritte im Kontext`,
  );

  const antwort = await frageJson(
    { systemStabil, systemWechselnd: wechselnd, verlauf: runden, effort: 'high', melder },
    InterviewSchema, 'interviewschritt',
  );

  melder.schritt('Fakten aus der Antwort übernehmen');
  let neue = 0;
  for (const f of antwort.fakten) {
    if (faktSetzen(storyId, {
      schluessel: f.schluessel.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      wert: f.wert,
      stufe: f.stufe,
      beleg: f.beleg,
      sicher: f.sicher,
      quelle: 'interview',
    })) neue += 1;
  }

  const text = [antwort.hinweis, antwort.frage].filter(Boolean).join('\n\n');
  nachrichtAnlegen(storyId, 'assistent', text);

  return {
    ...antwort,
    neue_fakten: neue,
    fortschritt: fortschritt(storyId),
  };
}
