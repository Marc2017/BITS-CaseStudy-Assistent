// Ein Interviewschritt: Nutzerantwort aufnehmen, Fakten daraus ziehen, die
// naechste Frage stellen - in EINEM Modellaufruf (E-12).
import { z } from 'zod';
import { frageJson, type Runde } from './anbieter.ts';
import { STILL, type Melder } from '../api/strom.ts';
import { faktenText, INTERVIEWER, katalogText } from './prompts.ts';
import { fakten, faktSetzen, fortschritt, katalog } from '../db/fakten.ts';
import { nachrichtAnlegen, story, verlauf } from '../db/story.ts';
import { kunde, projektart } from '../db/vorlagen.ts';
import {
  andereHabenUebersprungen, person, uebersprungeneVon, type Person,
} from '../db/mitarbeit.ts';

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
  storyId: number, nutzerText?: string, melder: Melder = STILL, wer?: Person,
): Promise<SchrittErgebnis> {
  const s = story(storyId);
  if (!s) throw new Error(`Erfolgsgeschichte ${storyId} gibt es nicht.`);

  // Wer hier antwortet, entscheidet, was gefragt wird (E-23): Was DIESE
  // Person uebersprungen hat, wird nicht wiederholt - fuer die naechste
  // Person steht dieselbe Frage weiter offen.
  const ich = wer ?? person(null);

  if (nutzerText?.trim()) nachrichtAnlegen(storyId, 'nutzer', nutzerText.trim());

  melder.schritt('Faktenbestand und Katalog zusammenstellen');
  const art = projektart(s.projektart_id);
  const kd = kunde(s.kunde_id);
  const bestand = fakten(storyId);
  const stand = fortschritt(storyId);
  const meineLuecken = new Set(uebersprungeneVon(storyId, ich.kennung));
  const fremdeLuecken = andereHabenUebersprungen(storyId, ich.kennung)
    .filter((u) => !meineLuecken.has(u.schluessel));
  // Offen UND fuer diese Person nicht uebersprungen - das ist der Vorrat,
  // aus dem die naechste Frage kommen soll.
  const offenFuerMich = stand.offen.filter((o) => !meineLuecken.has(o.schluessel));

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
    offenFuerMich.length
      ? `Es fehlen noch: ${offenFuerMich.map((o) => `${o.label} (\`${o.schluessel}\`)`).join(', ')}`
      : stand.offen.length
        ? 'Alles, was offen ist, hat diese Person übersprungen.'
        : 'Alle Pflichtfakten liegen vor.',
    '',
    `# Wer gerade antwortet\n\n${ich.name}`,
    meineLuecken.size
      ? `\nDiese Person hat gesagt, dass sie Folgendes nicht beantworten kann — `
        + `frag nicht danach: ${[...meineLuecken].map((k) => `\`${k}\``).join(', ')}`
      : null,
    fremdeLuecken.length
      ? `\nFolgendes hat jemand anderes nicht beantworten können — vielleicht `
        + `weiß diese Person es: `
        + fremdeLuecken.map((u) => `\`${u.schluessel}\``).join(', ')
      : null,
    offenFuerMich.length === 0 && stand.offen.length > 0
      ? '\nSag deutlich, dass für diese Person nichts mehr zu holen ist, und '
        + 'nenne, was offen bleibt — damit jemand entscheiden kann, wen er dazuholt.'
      : null,
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
      beigetragen_von: ich.kennung,
      beigetragen_name: ich.name,
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
