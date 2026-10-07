// Wer darf was? Die Anmeldewege und die Prüfung davor.
//
// Diese Datei ist die einzige Stelle, an der entschieden wird, ob eine
// Anfrage durchgelassen wird. Zwei Dinge sind daran wichtig:
//
//   1. **Die Liste des Offenen ist eine Liste, keine Regel.** Nur was hier
//      ausdrücklich steht, geht ohne Anmeldung durch. Ein Muster
//      (`/api/lesen/*` ist offen) wäre die Art von Regel, die beim nächsten
//      neuen Endpunkt unbemerkt zu viel freigibt.
//   2. **Im Einzelplatzbetrieb ist alles offen.** Ohne
//      `BITS_EG_MEHRBENUTZER` gibt es keine Anmeldung und keine Rollen — das
//      Werkzeug läuft lokal für einen Menschen, so wie bisher.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { mehrbenutzer, verwalterRolle } from '../db/betrieb.ts';
import {
  abmeldeUrl, anmeldungAbschliessen, anmeldungBeginnen, anmeldungMoeglich,
} from './oidc.ts';
import {
  ausCookie, COOKIE, cookieLoeschen, cookieSetzen, cookiesLesen, sitzung,
  sitzungAnlegen, sitzungBeenden, type Sitzung,
} from './sitzung.ts';

/** Pfade, die ohne Anmeldung erreichbar sind. Vollständig und abschließend. */
const OFFEN = new Set([
  // Die Probes des Clusters fragen im Sekundentakt und haben keine Sitzung.
  '/api/gesund',
  // Die Anmeldewege selbst - sonst käme man nie hinein.
  '/auth/login',
  '/auth/callback',
  '/auth/abmelden',
]);

/**
 * Läuft die Anfrage über HTTPS?
 *
 * Hinter dem Istio-Gateway kommt sie beim Pod als HTTP an; die Wahrheit steht
 * in `X-Forwarded-Proto`. Ohne diese Prüfung bekäme das Cookie im Cluster
 * kein `Secure` — und im lokalen Betrieb eines, das der Browser über http
 * verwirft.
 */
export function istHttps(req: IncomingMessage): boolean {
  const kopf = req.headers['x-forwarded-proto'];
  const erster = Array.isArray(kopf) ? kopf[0] : kopf?.split(',')[0]?.trim();
  if (erster) return erster === 'https';
  return Boolean((req.socket as { encrypted?: boolean }).encrypted);
}

/** Die Adresse, unter der der Browser diese Anwendung erreicht. */
export function herkunft(req: IncomingMessage): string {
  const kopf = (name: string) => {
    const w = req.headers[name];
    return (Array.isArray(w) ? w[0] : w)?.split(',')[0]?.trim();
  };
  const host = kopf('x-forwarded-host') ?? req.headers.host;
  const proto = istHttps(req) ? 'https' : 'http';
  // AUTH_URL gewinnt, wenn gesetzt: Hinter mehreren Zwischenstellen ist der
  // Host-Kopf nicht verlaesslich, und eine falsche Rücksprungadresse lässt
  // Keycloak die Anmeldung ablehnen.
  const gesetzt = process.env.AUTH_URL?.trim();
  if (gesetzt) return gesetzt.replace(/\/+$/, '');
  return `${proto}://${host ?? 'localhost:4700'}`;
}

export function sitzungAus(req: IncomingMessage): Sitzung | null {
  const kekse = cookiesLesen(req.headers.cookie);
  return sitzung(ausCookie(kekse[COOKIE]));
}

export function istVerwalter(s: Sitzung | null): boolean {
  // Im Einzelplatzbetrieb gibt es keine Rollen - dort darf der eine Mensch
  // alles, sonst käme er nicht an seine eigene Verwaltung.
  if (!mehrbenutzer()) return true;
  return Boolean(s?.rollen.includes(verwalterRolle()));
}

/**
 * Endpunkte, die die Verwalterrolle brauchen.
 *
 * Geprüft wird auf Präfix UND Methode: Lesen darf jeder Angemeldete (die
 * Oberfläche braucht die Ziele, um überhaupt etwas anzuzeigen), Ändern nur
 * der Verwalter.
 */
export function brauchtVerwalter(methode: string, pfad: string): boolean {
  if (methode === 'GET') return false;
  return pfad.startsWith('/api/verwaltung/') || pfad === '/api/einstellungen';
}

export interface Pruefung {
  durchlassen: boolean;
  sitzung: Sitzung | null;
}

/**
 * Die Anfrage prüfen. Antwortet selbst, wenn sie nicht durchdarf.
 *
 * Gibt `durchlassen: false` zurück, nachdem die Antwort geschrieben wurde -
 * der Aufrufer muss dann nichts mehr tun.
 */
export function pruefen(
  req: IncomingMessage, res: ServerResponse, pfad: string,
): Pruefung {
  if (!mehrbenutzer()) return { durchlassen: true, sitzung: null };

  if (OFFEN.has(pfad)) return { durchlassen: true, sitzung: sitzungAus(req) };

  const s = sitzungAus(req);
  if (!s) {
    // Eine API-Anfrage bekommt 401 und die Adresse des Anmeldewegs; die
    // Oberfläche schickt den Browser dann selbst dorthin. Ein Redirect auf
    // eine Fetch-Anfrage würde die Anmeldeseite in den Fetch laden, nicht in
    // das Fenster.
    if (pfad.startsWith('/api/')) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        fehler: 'Nicht angemeldet.',
        anmelden: '/auth/login',
      }));
      return { durchlassen: false, sitzung: null };
    }
    // Ein Seitenaufruf wird direkt zur Anmeldung geschickt.
    res.writeHead(302, { Location: '/auth/login' });
    res.end();
    return { durchlassen: false, sitzung: null };
  }

  if (brauchtVerwalter(req.method ?? 'GET', pfad)) {
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      fehler: `Dafür braucht es die Rolle „${verwalterRolle()}". `
        + 'Erfolgsgeschichten schreiben darf jeder Angemeldete; Vorlagen, '
        + 'Kunden, Faktenkatalog und Einstellungen ändern nur die Verwaltung.',
    }));
    return { durchlassen: false, sitzung: s };
  }

  return { durchlassen: true, sitzung: s };
}

/**
 * Die Anmeldewege unter /auth/*.
 *
 * Gibt true zurück, wenn der Pfad behandelt wurde.
 */
export async function anmeldeweg(
  req: IncomingMessage, res: ServerResponse, url: URL,
): Promise<boolean> {
  const pfad = url.pathname;
  if (!pfad.startsWith('/auth/')) return false;

  const https = istHttps(req);
  const rueckweg = `${herkunft(req)}/auth/callback`;

  if (pfad === '/auth/login') {
    if (!anmeldungMoeglich()) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(
        'Keycloak ist nicht konfiguriert. Es fehlen KEYCLOAK_CLIENT_ID, '
        + 'KEYCLOAK_CLIENT_SECRET oder KEYCLOAK_EXTERNAL_BASE_URL.\n',
      );
      return true;
    }
    const a = anmeldungBeginnen(rueckweg);
    // State und Verifier gehören zu DIESEM Anmeldeversuch und dürfen nicht in
    // der Datenbank landen: Zwei Versuche in zwei Tabs würden sich sonst
    // gegenseitig überschreiben. Deshalb ein kurzlebiges eigenes Cookie.
    const merk = Buffer.from(JSON.stringify({ s: a.state, v: a.verifier })).toString('base64url');
    const kekse = [
      `eg_anmeldung=${merk}; Path=/auth; HttpOnly; SameSite=Lax; Max-Age=600${https ? '; Secure' : ''}`,
    ];
    res.writeHead(302, { Location: a.url, 'Set-Cookie': kekse });
    res.end();
    return true;
  }

  if (pfad === '/auth/callback') {
    const kekse = cookiesLesen(req.headers.cookie);
    const merk = kekse.eg_anmeldung;
    const fehlerText = (t: string) => {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        `<!doctype html><meta charset="utf-8"><title>Anmeldung fehlgeschlagen</title>`
        + `<body style="font:14px system-ui;padding:40px;max-width:60ch">`
        + `<h1 style="font-size:19px">Die Anmeldung ist fehlgeschlagen</h1>`
        + `<p>${t}</p><p><a href="/auth/login">Noch einmal versuchen</a></p></body>`,
      );
    };

    if (!merk) {
      fehlerText(
        'Der Anmeldeversuch ist abgelaufen oder das Cookie fehlt. '
        + 'Das passiert, wenn die Seite zu lange offen lag.',
      );
      return true;
    }

    let state = '';
    let verifier = '';
    try {
      const d = JSON.parse(Buffer.from(merk, 'base64url').toString('utf8'));
      state = String(d.s ?? '');
      verifier = String(d.v ?? '');
    } catch {
      fehlerText('Das Anmeldecookie war unlesbar.');
      return true;
    }

    const fehler = url.searchParams.get('error');
    if (fehler) {
      fehlerText(`Keycloak meldet: ${fehler} — ${url.searchParams.get('error_description') ?? ''}`);
      return true;
    }

    // Der State bindet die Rückkehr an den eigenen Anmeldeversuch. Ohne diese
    // Prüfung könnte jemand einen Rücksprung mit seinem eigenen Code
    // unterschieben und den Browser des Opfers in seinem Namen anmelden.
    if (url.searchParams.get('state') !== state) {
      fehlerText('Der Rücksprung gehört nicht zu diesem Anmeldeversuch.');
      return true;
    }

    const code = url.searchParams.get('code');
    if (!code) {
      fehlerText('Keycloak hat keinen Code zurückgegeben.');
      return true;
    }

    try {
      const wer = await anmeldungAbschliessen(code, verifier, rueckweg);
      const id = sitzungAnlegen(wer);
      res.writeHead(302, {
        Location: '/',
        'Set-Cookie': [
          cookieSetzen(id, https),
          `eg_anmeldung=; Path=/auth; HttpOnly; SameSite=Lax; Max-Age=0${https ? '; Secure' : ''}`,
        ],
      });
      res.end();
    } catch (e) {
      console.error('Anmeldung fehlgeschlagen:', e);
      fehlerText(e instanceof Error ? e.message : String(e));
    }
    return true;
  }

  if (pfad === '/auth/abmelden') {
    const kekse = cookiesLesen(req.headers.cookie);
    sitzungBeenden(ausCookie(kekse[COOKIE]));
    // Auch bei Keycloak abmelden: Sonst ist der nächste Klick auf „Anmelden"
    // sofort wieder angemeldet, und niemand versteht, warum.
    const weiter = abmeldeUrl(`${herkunft(req)}/`) ?? '/';
    res.writeHead(302, { Location: weiter, 'Set-Cookie': cookieLoeschen(https) });
    res.end();
    return true;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Unbekannter Anmeldeweg.\n');
  return true;
}
