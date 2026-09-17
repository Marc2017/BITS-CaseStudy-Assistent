// Zwei Hilfen bei der Eingabe.
//
// Beide lösen dasselbe Problem: Eine Frage steht da, und der Nutzer weiß
// nicht, wo er anfangen soll. Die eine zerlegt sie, die andere macht einen
// Vorschlag.
//
// Der Unterschied ist wichtig: Eine Zerlegung erfindet nichts, sie sortiert.
// Ein Antwortvorschlag dagegen RÄT — und muss das kenntlich machen, sonst
// wandern geratene Angaben als Fakten in den Bestand. Deshalb setzt der
// Vorschlag überall, wo er raten müsste, einen Platzhalter in eckigen
// Klammern, und die Oberfläche legt ihn ins Eingabefeld statt ihn zu senden.
import { z } from 'zod';
import { frageJson } from './anbieter.ts';
import { BITS, faktenText, REDAKTION } from './prompts.ts';
import { fakten, katalog } from '../db/fakten.ts';
import { story, verlauf } from '../db/story.ts';
import { kunde, projektart } from '../db/vorlagen.ts';
import { STILL, type Melder } from '../api/strom.ts';

export const TeilfragenSchema = z.object({
  teilfragen: z.array(z.object({
    frage: z.string().describe('eine einzige, kurze Frage'),
    hinweis: z.string().nullable().describe('was gemeint ist, oder ein Beispiel; sonst null'),
  })).min(1).max(6),
});

export const BeispielSchema = z.object({
  antwort: z.string().describe('der Antwortvorschlag, mit [Platzhaltern] wo geraten wurde'),
  geraten: z.array(z.string()).describe('was der Nutzer prüfen muss'),
});

export type Teilfragen = z.infer<typeof TeilfragenSchema>;
export type Beispiel = z.infer<typeof BeispielSchema>;

const ZERLEGER = `
Du zerlegst eine Interviewfrage in kleine Teilfragen.

Die letzte Frage des Assistenten war für den Nutzer zu groß — sie verlangt
mehrere Angaben auf einmal, oder sie ist so weit gestellt, dass man nicht
weiß, wo man anfängt.

# Regeln

1. **Jede Teilfrage fragt genau eine Sache.** Eine Angabe, ein Satz Antwort.
2. **Zwei bis fünf Teilfragen.** Mehr erschlägt, eine einzige hilft nicht.
3. **Nichts Neues.** Du zerlegst die vorhandene Frage, du erweiterst sie nicht
   um Themen, die der Assistent nicht gefragt hat.
4. **Kurz und in „Sie"-Anrede.** Höchstens ein Satz je Teilfrage.
5. Der Hinweis ist optional und sagt, was gemeint ist — gern mit einem
   Beispiel („z. B. vier Tage auf vier Stunden"). Nie eine Antwort vorwegnehmen.
6. Schreib richtiges Deutsch mit Umlauten. Auch deine Zwischenüberlegungen.
`.trim();

const BEISPIELGEBER = `
Du schlägst dem Nutzer eine Antwort vor, die er prüfen und absenden kann.

${BITS}

Der Nutzer kennt sein Projekt, aber das Tippen fällt ihm schwer. Deine Aufgabe
ist ein **Entwurf**, den er in Sekunden korrigieren kann — nicht eine
Behauptung.

# Die Regel, die alles entscheidet

**Was du nicht aus dem Faktenbestand oder dem Gesprächsverlauf weißt, setzt du
in eckige Klammern.** Beispiel:

  „Der Betrieb liegt beim Kunden; wir haben [Rufbereitschaft / keine
  Beteiligung] für die Schnittstelle. Die Umstellung lief in
  [Monat/Jahr] über ein Wartungsfenster von [Dauer]."

So sieht der Nutzer auf einen Blick, was er noch einsetzen muss. Eine
erfundene Zahl ohne Klammern würde als Fakt in den Bestand wandern und wäre
später von einer echten Angabe nicht zu unterscheiden — das ist der einzige
Fehler, den du hier nicht machen darfst.

# Weiteres

- Schreib, wie ein Projektleiter im Gespräch antwortet: knapp, sachlich,
  Stichpunkte sind erlaubt. Keine Marketingsprache.
- Nutze, was schon im Bestand steht — darauf darfst du dich stützen, ohne
  Klammern.
- Zwei bis fünf Sätze genügen.
- „geraten" listet in Klartext, was der Nutzer prüfen muss.

${REDAKTION}
`.trim();

/** Kontext, den beide Hilfen brauchen. */
function umgebung(storyId: number): { stabil: string; wechselnd: string; frage: string } {
  const s = story(storyId);
  if (!s) throw new Error(`Erfolgsgeschichte ${storyId} gibt es nicht.`);

  const gespraech = verlauf(storyId).filter((n) => n.rolle !== 'notiz');
  const letzteFrage = [...gespraech].reverse().find((n) => n.rolle === 'assistent');
  if (!letzteFrage) {
    throw new Error(
      'Es steht noch keine Frage im Gespräch. Erst das Interview beginnen.',
    );
  }

  const art = projektart(s.projektart_id);
  const kd = kunde(s.kunde_id);

  const wechselnd = [
    '# Diese Erfolgsgeschichte',
    `Arbeitstitel: ${s.arbeitstitel}`,
    `Projektart: ${art?.name ?? 'nicht zugeordnet'}`,
    kd ? `Kunde: ${kd.name}` : null,
    '',
    faktenText(fakten(storyId)),
    '',
    '# Die letzten Gesprächsschritte',
    ...gespraech.slice(-6).map(
      (n) => `${n.rolle === 'nutzer' ? 'NUTZER' : 'ASSISTENT'}: ${n.text}`,
    ),
    '',
    '# Die Frage, um die es geht',
    letzteFrage.text,
  ].filter((z) => z !== null).join('\n');

  // Der Katalog hilft beim Zerlegen: Er sagt, welche Einzelangaben es gibt.
  const stabil = `# Faktenkatalog\n\n${katalog()
    .map((e) => `- ${e.label}: ${e.hinweis ?? ''}`).join('\n')}`;

  return { stabil, wechselnd, frage: letzteFrage.text };
}

export async function zerlegen(
  storyId: number, melder: Melder = STILL,
): Promise<Teilfragen & { frage: string }> {
  const u = umgebung(storyId);
  melder.schritt('Die letzte Frage wird zerlegt');
  const antwort = await frageJson(
    {
      systemStabil: `${ZERLEGER}\n\n${u.stabil}`,
      systemWechselnd: u.wechselnd,
      verlauf: [{ rolle: 'nutzer', text: 'Zerlege diese Frage in Teilfragen.' }],
      effort: 'medium',
      maxTokens: 4000,
      melder,
    },
    TeilfragenSchema, 'teilfragen',
  );
  return { ...antwort, frage: u.frage };
}

export async function beispielantwort(
  storyId: number, melder: Melder = STILL,
): Promise<Beispiel> {
  const u = umgebung(storyId);
  melder.schritt('Ein Antwortvorschlag wird entworfen');
  return frageJson(
    {
      systemStabil: BEISPIELGEBER,
      systemWechselnd: u.wechselnd,
      verlauf: [{ rolle: 'nutzer', text: 'Entwirf eine Antwort auf diese Frage.' }],
      effort: 'medium',
      maxTokens: 4000,
      melder,
    },
    BeispielSchema, 'beispielantwort',
  );
}
