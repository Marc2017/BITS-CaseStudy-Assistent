// Zugang zur KI. Alles Modellbezogene laeuft ueber diese Datei, damit
// Anbieterwahl, Modellwahl, Fehlerbehandlung und Schluesselpruefung an einer
// Stelle stehen (E-05).
//
// Zwei Anbieter hinter einer Schnittstelle:
//   - anthropic: Claude ueber @anthropic-ai/sdk (heute)
//   - azure:     Azure OpenAI ueber fetch (vorbereitet, ungetestet - O-04)
//
// Grundsatz: Ohne Zugang muss die Anwendung vollstaendig bedienbar bleiben.
// Die KI-Funktionen fallen dann aus, sie blockieren nichts - Fakten von Hand
// eintragen und Fassungen von Hand schreiben geht weiter.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { lesen, SCHLUESSEL } from '../db/einstellung.ts';

const hier = dirname(fileURLToPath(import.meta.url));
const ENV_PFAD = join(hier, '..', '..', '..', '.env');

// Node 24 kann .env selbst laden - kein zusaetzliches Paket noetig.
if (existsSync(ENV_PFAD)) {
  try {
    process.loadEnvFile(ENV_PFAD);
  } catch {
    // Datei unlesbar oder fehlerhaft: nicht schlimm, wir pruefen unten.
  }
}

/** Claude Opus 5 - bewusst nicht heruntergestuft; das ist eine Nutzerentscheidung (E-13). */
export const MODELL_STANDARD = 'claude-opus-5';

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
export type Anbieter = 'anthropic' | 'azure';

export function anbieter(): Anbieter {
  return lesen(SCHLUESSEL.anbieter) === 'azure' ? 'azure' : 'anthropic';
}

export function modell(): string {
  return lesen(SCHLUESSEL.modell) ?? MODELL_STANDARD;
}

function anthropicSchluessel(): string | null {
  return lesen(SCHLUESSEL.apiKey) ?? process.env.ANTHROPIC_API_KEY ?? null;
}

interface AzureZugang {
  key: string;
  endpunkt: string;
  deployment: string;
  version: string;
}

function azureZugang(): AzureZugang | null {
  const key = lesen(SCHLUESSEL.azureKey) ?? process.env.AZURE_OPENAI_KEY ?? null;
  const endpunkt = lesen(SCHLUESSEL.azureEndpunkt) ?? process.env.AZURE_OPENAI_ENDPUNKT ?? null;
  const deployment = lesen(SCHLUESSEL.azureDeployment)
    ?? process.env.AZURE_OPENAI_DEPLOYMENT ?? null;
  if (!key || !endpunkt || !deployment) return null;
  return {
    key,
    endpunkt: endpunkt.replace(/\/+$/, ''),
    deployment,
    version: lesen(SCHLUESSEL.azureVersion) ?? process.env.AZURE_OPENAI_VERSION ?? '2026-02-01',
  };
}

/** Ist ueberhaupt ein Zugang hinterlegt? Die Oberflaeche fragt das beim Start. */
export function zugangVorhanden(): boolean {
  return anbieter() === 'azure' ? Boolean(azureZugang()) : Boolean(anthropicSchluessel());
}

export class KeinZugang extends Error {
  constructor(text?: string) {
    super(text ?? 'Kein KI-Zugang hinterlegt. Die KI-Funktionen sind deshalb aus. '
      + 'Zugang unter Verwaltung → Einstellungen eintragen (wirkt sofort) oder in die '
      + 'Datei .env schreiben (Vorlage: .env.example, danach Server neu starten).');
    this.name = 'KeinZugang';
  }
}

let klient: Anthropic | null = null;
let klientFuer: string | null = null;

function claude(): Anthropic {
  const schluessel = anthropicSchluessel();
  if (!schluessel) throw new KeinZugang();
  // Wechselt der Schluessel in den Einstellungen, muss der Klient neu gebaut werden.
  if (!klient || klientFuer !== schluessel) {
    klient = new Anthropic({ apiKey: schluessel });
    klientFuer = schluessel;
  }
  return klient;
}

export function klientVerwerfen(): void {
  klient = null;
  klientFuer = null;
}

/**
 * Uebersetzt Fehler in Meldungen, die in der Oberflaeche etwas taugen.
 * Von spezifisch nach allgemein - eine einzige breite Klasse wuerde die
 * Unterscheidung zwischen "nochmal versuchen" und "so nicht" verlieren.
 */
export function fehlerText(e: unknown): string {
  if (e instanceof KeinZugang) return e.message;
  if (e instanceof Anthropic.AuthenticationError) {
    return 'Der API-Schlüssel wurde abgelehnt. Bitte in den Einstellungen prüfen.';
  }
  if (e instanceof Anthropic.RateLimitError) {
    return 'Das Kontingent ist gerade erschöpft. Bitte in einem Moment noch einmal versuchen.';
  }
  if (e instanceof Anthropic.BadRequestError) {
    return `Die Anfrage wurde abgelehnt: ${e.message}`;
  }
  if (e instanceof Anthropic.APIConnectionError) {
    return 'Keine Verbindung zur KI-API. Netzwerk oder Endpunkt prüfen.';
  }
  if (e instanceof Anthropic.APIError) {
    return `Fehler der KI-API (${e.status}): ${e.message}`;
  }
  return e instanceof Error ? e.message : String(e);
}

export interface Runde {
  rolle: 'nutzer' | 'assistent';
  text: string;
}

export interface Auftrag {
  /** Der stabile Teil des Prompts. Steht vorn und wird zwischengespeichert. */
  systemStabil: string;
  /** Der wechselnde Teil (Bestand, Luecken). Steht hinter dem Cache-Punkt. */
  systemWechselnd?: string;
  verlauf: Runde[];
  effort?: Effort;
  maxTokens?: number;
}

/** Aus unserem Verlauf die Nachrichten der API bauen. */
function nachrichten(verlauf: Runde[]): Anthropic.MessageParam[] {
  const m: Anthropic.MessageParam[] = verlauf
    .filter((r) => r.text.trim())
    .map((r) => ({ role: r.rolle === 'nutzer' ? 'user' : 'assistant', content: r.text }));
  // Die erste Nachricht muss vom Nutzer kommen. Beginnt der Verlauf mit einer
  // Assistentenfrage (der Fall beim ersten Interviewschritt), setzen wir einen
  // Auftakt davor, statt die Frage zu verlieren.
  if (!m.length || m[0].role !== 'user') {
    m.unshift({ role: 'user', content: 'Beginne mit dem Interview.' });
  }
  return m;
}

// ----------------------------------------------------------------- Anthropic

async function anthropicJson<T>(a: Auftrag, schema: z.ZodType<T>): Promise<T> {
  const antwort = await claude().messages.parse({
    model: modell(),
    max_tokens: a.maxTokens ?? 16000,
    system: [
      { type: 'text', text: a.systemStabil, cache_control: { type: 'ephemeral' } },
      ...(a.systemWechselnd ? [{ type: 'text' as const, text: a.systemWechselnd }] : []),
    ],
    messages: nachrichten(a.verlauf),
    output_config: {
      effort: a.effort ?? 'high',
      format: zodOutputFormat(schema),
    },
  });
  if (antwort.stop_reason === 'refusal') {
    throw new Error('Die KI hat die Anfrage abgelehnt. Bitte den Text prüfen.');
  }
  if (!antwort.parsed_output) {
    throw new Error('Die KI hat keine verwertbare Antwort geliefert — die Struktur kam leer zurück.');
  }
  return antwort.parsed_output;
}

async function anthropicText(a: Auftrag): Promise<string> {
  // Streaming, weil die Formulierung lang wird und ein langer Aufruf sonst in
  // das HTTP-Zeitlimit des SDK laeuft.
  const strom = claude().messages.stream({
    model: modell(),
    max_tokens: a.maxTokens ?? 32000,
    system: [
      { type: 'text', text: a.systemStabil, cache_control: { type: 'ephemeral' } },
      ...(a.systemWechselnd ? [{ type: 'text' as const, text: a.systemWechselnd }] : []),
    ],
    messages: nachrichten(a.verlauf),
    output_config: { effort: a.effort ?? 'xhigh' },
  });
  const antwort = await strom.finalMessage();
  if (antwort.stop_reason === 'refusal') {
    throw new Error('Die KI hat die Anfrage abgelehnt.');
  }
  return antwort.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

// --------------------------------------------------------------------- Azure
// Ungetestet, weil es noch keinen Endpunkt gibt (O-04). Der erste Lauf gegen
// einen echten Endpunkt ist eine Messung, kein Vertrauen.

async function azureAufruf(a: Auftrag, format?: unknown): Promise<string> {
  const z = azureZugang();
  if (!z) {
    throw new KeinZugang(
      'Kein Azure-Zugang hinterlegt. Endpunkt, Deployment und Schlüssel werden alle '
      + 'drei gebraucht (Verwaltung → Einstellungen).',
    );
  }
  const url = `${z.endpunkt}/openai/deployments/${z.deployment}`
    + `/chat/completions?api-version=${z.version}`;

  const system = [a.systemStabil, a.systemWechselnd].filter(Boolean).join('\n\n');
  const antwort = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': z.key },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: system },
        ...nachrichten(a.verlauf).map((m) => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : '',
        })),
      ],
      max_completion_tokens: a.maxTokens ?? 16000,
      ...(format ? { response_format: format } : {}),
    }),
  });

  if (!antwort.ok) {
    const text = await antwort.text().catch(() => '');
    throw new Error(`Azure OpenAI antwortete mit ${antwort.status}: ${text.slice(0, 400)}`);
  }
  const daten = await antwort.json() as {
    choices?: { message?: { content?: string } }[];
  };
  const inhalt = daten.choices?.[0]?.message?.content;
  if (!inhalt) throw new Error('Azure OpenAI lieferte keine Antwort.');
  return inhalt;
}

async function azureJson<T>(a: Auftrag, schema: z.ZodType<T>, name: string): Promise<T> {
  const roh = await azureAufruf(a, {
    type: 'json_schema',
    json_schema: { name, strict: true, schema: z.toJSONSchema(schema, { io: 'output' }) },
  });
  return schema.parse(JSON.parse(roh));
}

// ---------------------------------------------------------- oeffentliche API

/** Strukturierte Antwort nach Zod-Schema. */
export async function frageJson<T>(
  a: Auftrag, schema: z.ZodType<T>, name = 'antwort',
): Promise<T> {
  return anbieter() === 'azure'
    ? azureJson(a, schema, name)
    : anthropicJson(a, schema);
}

/** Freie Textantwort (HTML fuer die Fassung). */
export async function frageText(a: Auftrag): Promise<string> {
  return anbieter() === 'azure' ? azureAufruf(a) : anthropicText(a);
}
