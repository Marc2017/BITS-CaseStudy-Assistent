// Einstellungen, die zur Laufzeit geaendert werden koennen - vor allem die
// Zugaenge zur KI-API.
//
// Warum in der Datenbank und nicht nur in der .env: Ein Schluessel, der ueber
// die Oberflaeche eingetragen wird, soll sofort wirken. Die .env zu schreiben
// wuerde einen Neustart erfordern.
//
// Vorsicht: Der Schluessel liegt damit in der Datenbankdatei und wandert in
// jede Sicherung. Fuer ein lokal laufendes Werkzeug mit einem Nutzer ist das
// vertretbar; sobald mehrere Personen zugreifen (O-01), gehoert er in einen
// Schluesselspeicher.
import { alle, eine, schreib } from './index.ts';
import { mehrbenutzer } from './betrieb.ts';

export const SCHLUESSEL = {
  /** 'anthropic' | 'azure' - welcher Anbieter gefragt wird (E-05). */
  anbieter: 'ki.anbieter',
  modell: 'ki.modell',
  effort: 'ki.effort',

  // Anthropic
  apiKey: 'ki.api_key',

  // Azure OpenAI - vorbereitet fuer den datenschutzkonformen Betrieb (O-04)
  azureKey: 'ki.azure_key',
  azureEndpunkt: 'ki.azure_endpunkt',
  azureDeployment: 'ki.azure_deployment',
  azureVersion: 'ki.azure_version',

  /** Wer sitzt hier? Die ehrliche Vorstufe zur Anmeldung (O-01). */
  ichBin: 'ich.person',
} as const;

/**
 * Welche Umgebungsvariable zu welcher Einstellung gehoert.
 *
 * Gebraucht, um im Mehrbenutzerbetrieb ehrlich zu melden, ob ein Zugang
 * vorhanden ist - ohne den Wert zu zeigen.
 */
const UMGEBUNG: Record<string, string | undefined> = {
  [SCHLUESSEL.apiKey]: 'ANTHROPIC_API_KEY',
  [SCHLUESSEL.azureKey]: 'AZURE_OPENAI_KEY',
  [SCHLUESSEL.azureEndpunkt]: 'AZURE_OPENAI_ENDPUNKT',
  [SCHLUESSEL.azureDeployment]: 'AZURE_OPENAI_DEPLOYMENT',
  [SCHLUESSEL.azureVersion]: 'AZURE_OPENAI_VERSION',
  [SCHLUESSEL.anbieter]: 'BITS_EG_KI_ANBIETER',
};

/** Einstellungen, die niemals im Klartext ausgeliefert werden. */
const GEHEIM = new Set<string>([SCHLUESSEL.apiKey, SCHLUESSEL.azureKey]);

export function lesen(schluessel: string): string | null {
  return eine<{ wert: string | null }>(
    'SELECT wert FROM setting WHERE schluessel = ?', schluessel,
  )?.wert ?? null;
}

export function setzen(schluessel: string, wert: string | null): void {
  if (wert === null || wert === '') {
    schreib('DELETE FROM setting WHERE schluessel = ?', schluessel);
    return;
  }
  schreib(
    `INSERT INTO setting (schluessel, wert, geaendert_am) VALUES (?,?,datetime('now'))
     ON CONFLICT (schluessel) DO UPDATE SET wert = excluded.wert,
       geaendert_am = datetime('now')`,
    schluessel, wert,
  );
}

/** Zeigt nur, dass etwas hinterlegt ist - nie den Wert selbst. */
export function maskiert(wert: string | null): string | null {
  if (!wert) return null;
  if (wert.length <= 8) return '••••';
  return `${wert.slice(0, 7)}…${wert.slice(-4)}`;
}

export interface EinstellungAnzeige {
  schluessel: string;
  gesetzt: boolean;
  wert: string | null;
  geheim: boolean;
  geaendert_am: string | null;
  /** Im Mehrbenutzerbetrieb: kommt aus der Umgebung, hier nicht aenderbar. */
  gesperrt: boolean;
}

/** Welche Schluessel im Mehrbenutzerbetrieb nur aus der Umgebung kommen (I-08). */
export const NUR_UMGEBUNG_SCHLUESSEL = new Set<string>([
  SCHLUESSEL.apiKey,
  SCHLUESSEL.azureKey,
  SCHLUESSEL.azureEndpunkt,
  SCHLUESSEL.azureDeployment,
  SCHLUESSEL.azureVersion,
  SCHLUESSEL.anbieter,
]);

/** Darf dieser Schluessel ueber die Oberflaeche gesetzt werden? */
export function aenderbar(schluessel: string): boolean {
  return !(mehrbenutzer() && NUR_UMGEBUNG_SCHLUESSEL.has(schluessel));
}

/** Alle bekannten Schluessel fuer die Oberflaeche - geheime maskiert. */
export function anzeige(): EinstellungAnzeige[] {
  const gespeichert = new Map(
    alle<{ schluessel: string; wert: string | null; geaendert_am: string }>(
      'SELECT schluessel, wert, geaendert_am FROM setting',
    ).map((z) => [z.schluessel, z]),
  );
  return Object.values(SCHLUESSEL).map((s) => {
    const z = gespeichert.get(s);
    const geheim = GEHEIM.has(s);
    const gesperrt = !aenderbar(s);
    // Bei einem gesperrten Schluessel ist der Wert in der Datenbank
    // bedeutungslos - er wird nicht benutzt (I-08). Ihn trotzdem als
    // "gesetzt" zu zeigen, waere eine falsche Auskunft.
    const umgebungsname = UMGEBUNG[s];
    const ausUmgebung = umgebungsname ? Boolean(process.env[umgebungsname]?.trim()) : false;
    return {
      schluessel: s,
      gesetzt: gesperrt ? ausUmgebung : Boolean(z?.wert),
      wert: gesperrt
        ? (ausUmgebung ? 'aus der Umgebung' : null)
        : (geheim ? maskiert(z?.wert ?? null) : (z?.wert ?? null)),
      geheim,
      geaendert_am: gesperrt ? null : (z?.geaendert_am ?? null),
      gesperrt,
    };
  });
}
