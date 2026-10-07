// Anmeldung über Keycloak (OpenID Connect, Authorization Code mit PKCE).
//
// Ohne Bibliothek. bits-burn benutzt `openid-client`, weil es dort ohnehin an
// NestJS und Express haengt; hier ist der Server `node:http` pur, und der
// gebrauchte Teil des Protokolls sind drei HTTP-Aufrufe. Eine Abhaengigkeit
// fuer drei Aufrufe waere mehr Code, nicht weniger.
//
// WARUM HIER KEINE SIGNATUR GEPRUEFT WIRD
//
// Das Token kommt nicht von einem Client, sondern direkt vom Token-Endpunkt
// von Keycloak - ueber eine TLS-Verbindung, die dieser Prozess selbst
// aufgebaut hat, mit dem Client-Secret authentisiert. Wer diese Antwort
// faelschen koennte, haette schon TLS gebrochen; eine Signaturpruefung mit
// einem Schluessel, der ueber dieselbe Verbindung geholt wird, fuegt nichts
// hinzu. Geprueft werden deshalb nur die Angaben, die auch ein echtes Token
// falsch haben kann: Aussteller, Empfaenger und Ablauf.
//
// Das waere anders, wenn ein Token aus einer Anfrage von aussen kaeme (etwa
// ein Bearer-Header eines Kommandozeilenwerkzeugs). Dafuer gibt es hier
// bewusst keinen Weg - und wenn er kommt, muss die Signatur geprueft werden.
import { createHash, randomBytes } from 'node:crypto';

export interface OidcEinstellungen {
  realm: string;
  clientId: string;
  clientSecret: string;
  /** Basis-URL, die der BROWSER erreicht. */
  externBasis: string;
  /** Basis-URL, die der SERVER erreicht (im Cluster oft dieselbe). */
  internBasis: string;
}

export interface Angemeldet {
  /** Die unveränderliche Kennung des Benutzers bei Keycloak. */
  sub: string;
  name: string;
  email: string | null;
  benutzername: string;
  rollen: string[];
  /** Wann das Token abläuft (Sekunden seit 1970) - Grundlage der Sitzungsdauer. */
  ablauf: number;
}

const ohneSchraegstrich = (s: string) => s.replace(/\/+$/, '');

export function einstellungen(): OidcEinstellungen | null {
  const clientId = process.env.KEYCLOAK_CLIENT_ID?.trim();
  const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET?.trim();
  const externBasis = process.env.KEYCLOAK_EXTERNAL_BASE_URL?.trim();
  if (!clientId || !clientSecret || !externBasis) return null;
  return {
    realm: process.env.KEYCLOAK_REALM?.trim() || 'master',
    clientId,
    clientSecret,
    externBasis: ohneSchraegstrich(externBasis),
    internBasis: ohneSchraegstrich(
      process.env.KEYCLOAK_INTERNAL_BASE_URL?.trim() || externBasis,
    ),
  };
}

/** Sind die Angaben für eine Anmeldung vollständig? */
export function anmeldungMoeglich(): boolean {
  return einstellungen() !== null;
}

function endpunkte(e: OidcEinstellungen) {
  const extern = `${e.externBasis}/realms/${e.realm}`;
  const intern = `${e.internBasis}/realms/${e.realm}`;
  return {
    aussteller: extern,
    autorisierung: `${extern}/protocol/openid-connect/auth`,
    // Der Server tauscht den Code ein, also die interne Adresse.
    token: `${intern}/protocol/openid-connect/token`,
    abmeldung: `${extern}/protocol/openid-connect/logout`,
  };
}

export interface Auftakt {
  url: string;
  state: string;
  verifier: string;
}

/**
 * Den Anmeldeweg eröffnen.
 *
 * PKCE (S256) ist hier nicht optional: Der Code wandert über die Adresszeile
 * des Browsers und steht damit in jedem Verlauf und jedem Proxy-Protokoll.
 * Ohne Verifier genügt er allein, um ein Token zu holen.
 */
export function anmeldungBeginnen(rueckweg: string): Auftakt {
  const e = einstellungen();
  if (!e) throw new Error('Keycloak ist nicht konfiguriert.');
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const state = randomBytes(16).toString('base64url');

  const p = new URLSearchParams({
    client_id: e.clientId,
    redirect_uri: rueckweg,
    response_type: 'code',
    scope: 'openid profile email',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return { url: `${endpunkte(e).autorisierung}?${p}`, state, verifier };
}

/** Einen Token-Teil lesen, ohne die Signatur zu prüfen (Begründung oben). */
function nutzlast(jwt: string): Record<string, unknown> {
  const teile = jwt.split('.');
  if (teile.length !== 3) throw new Error('Das Token hat nicht die Form eines JWT.');
  return JSON.parse(Buffer.from(teile[1], 'base64url').toString('utf8'));
}

/**
 * Den Code gegen ein Token tauschen und daraus den Benutzer lesen.
 *
 * Geprüft werden Aussteller, Empfänger und Ablauf — die drei Angaben, die
 * auch ein echtes Token falsch haben kann, etwa weil ein Realm umbenannt
 * wurde oder eine Uhr falsch läuft.
 */
export async function anmeldungAbschliessen(
  code: string, verifier: string, rueckweg: string,
): Promise<Angemeldet> {
  const e = einstellungen();
  if (!e) throw new Error('Keycloak ist nicht konfiguriert.');
  const ep = endpunkte(e);

  const antwort = await fetch(ep.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: rueckweg,
      client_id: e.clientId,
      client_secret: e.clientSecret,
      code_verifier: verifier,
    }),
  });

  if (!antwort.ok) {
    const text = await antwort.text().catch(() => '');
    // Der Text von Keycloak nennt den Grund ("invalid_grant", "unauthorized_client")
    // und gehoert in die Meldung - ohne ihn sucht man im Falschen.
    throw new Error(
      `Keycloak hat den Code nicht eingelöst (${antwort.status}): ${text.slice(0, 300)}`,
    );
  }

  const daten = await antwort.json() as {
    access_token?: string; id_token?: string; expires_in?: number;
  };
  if (!daten.access_token || !daten.id_token) {
    throw new Error('Keycloak lieferte kein Token.');
  }

  const id = nutzlast(daten.id_token);
  const zugriff = nutzlast(daten.access_token);
  const jetzt = Math.floor(Date.now() / 1000);

  const aussteller = String(id.iss ?? '');
  if (aussteller !== ep.aussteller) {
    throw new Error(
      `Das Token kommt von einem anderen Aussteller: ${aussteller} statt ${ep.aussteller}.`,
    );
  }
  const empfaenger = Array.isArray(id.aud) ? id.aud.map(String) : [String(id.aud ?? '')];
  if (!empfaenger.includes(e.clientId)) {
    throw new Error('Das Token ist nicht für diese Anwendung ausgestellt.');
  }
  const ablauf = Number(id.exp ?? 0);
  if (!ablauf || ablauf <= jetzt) throw new Error('Das Token ist bereits abgelaufen.');

  // Die Rollen stehen im Zugriffstoken, nicht im ID-Token.
  const realm = (zugriff.realm_access ?? {}) as { roles?: unknown };
  const rollen = Array.isArray(realm.roles) ? realm.roles.map(String) : [];

  const sub = String(id.sub ?? '');
  if (!sub) throw new Error('Das Token nennt keinen Benutzer.');

  const benutzername = String(id.preferred_username ?? id.email ?? sub);
  return {
    sub,
    name: String(id.name ?? benutzername),
    email: id.email ? String(id.email) : null,
    benutzername,
    rollen,
    ablauf,
  };
}

/** Wohin der Browser zum Abmelden geschickt wird. */
export function abmeldeUrl(zurueck: string): string | null {
  const e = einstellungen();
  if (!e) return null;
  const p = new URLSearchParams({
    client_id: e.clientId,
    post_logout_redirect_uri: zurueck,
  });
  return `${endpunkte(e).abmeldung}?${p}`;
}
