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
    return {
      schluessel: s,
      gesetzt: Boolean(z?.wert),
      wert: geheim ? maskiert(z?.wert ?? null) : (z?.wert ?? null),
      geheim,
      geaendert_am: z?.geaendert_am ?? null,
    };
  });
}
