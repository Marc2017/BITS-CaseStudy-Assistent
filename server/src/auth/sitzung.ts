// Sitzungen: wer ist angemeldet, und wie lange noch.
//
// Serverseitig in der Datenbank, nicht als signiertes Token im Cookie. Der
// Unterschied zaehlt an zwei Stellen:
//
//   - **Abmelden wirkt sofort.** Ein JWT im Cookie bleibt gueltig, bis es
//     ablaeuft; eine Zeile in der Tabelle ist beim naechsten Aufruf weg.
//   - **Rollen bleiben nachlesbar.** Wer wissen will, was ein Benutzer darf,
//     liest die Sitzung - und nicht ein Token, dessen Inhalt der Browser
//     mitbringt.
//
// Das Cookie traegt nur die Kennung und eine Signatur darueber. Ohne
// Signatur koennte jemand eine fremde Kennung raten oder durchprobieren; mit
// ihr ist ein geratener Wert ein Fehler statt einer Anmeldung.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { alle, eine, schreib } from '../db/index.ts';
import type { Angemeldet } from './oidc.ts';

export const COOKIE = 'eg_sitzung';

/** Wie lange eine Sitzung ohne Zutun gilt. */
const DAUER_STUNDEN = 12;

export interface Sitzung {
  id: string;
  sub: string;
  name: string;
  email: string | null;
  benutzername: string;
  rollen: string[];
  erstellt_am: string;
  gesehen_am: string;
  ablauf: string;
}

function geheimnis(): string {
  const s = process.env.SESSION_SECRET?.trim();
  if (!s) {
    throw new Error(
      'SESSION_SECRET fehlt. Ohne dieses Geheimnis liesse sich jedes '
      + 'Sitzungscookie faelschen - die Anmeldung waere wirkungslos.',
    );
  }
  return s;
}

function unterschrift(id: string): string {
  return createHmac('sha256', geheimnis()).update(id).digest('base64url');
}

/** Der Wert, der ins Cookie geht: Kennung und Signatur. */
export function cookieWert(id: string): string {
  return `${id}.${unterschrift(id)}`;
}

/**
 * Die Kennung aus einem Cookie lesen - oder null, wenn die Signatur nicht
 * stimmt.
 *
 * Der Vergleich laeuft ueber `timingSafeEqual`: Ein Vergleich mit `===`
 * bricht beim ersten falschen Zeichen ab und verraet damit ueber die Laufzeit,
 * wie viele Zeichen schon stimmen.
 */
export function ausCookie(wert: string | undefined): string | null {
  if (!wert) return null;
  const punkt = wert.lastIndexOf('.');
  if (punkt <= 0) return null;
  const id = wert.slice(0, punkt);
  const mit = wert.slice(punkt + 1);
  const soll = Buffer.from(unterschrift(id));
  const ist = Buffer.from(mit);
  if (soll.length !== ist.length) return null;
  return timingSafeEqual(soll, ist) ? id : null;
}

/** Cookies eines Anfragekopfs lesen. */
export function cookiesLesen(kopf: string | undefined): Record<string, string> {
  const raus: Record<string, string> = {};
  if (!kopf) return raus;
  for (const teil of kopf.split(';')) {
    const i = teil.indexOf('=');
    if (i < 0) continue;
    raus[teil.slice(0, i).trim()] = decodeURIComponent(teil.slice(i + 1).trim());
  }
  return raus;
}

interface Zeile {
  id: string;
  sub: string;
  name: string;
  email: string | null;
  benutzername: string;
  rollen: string;
  erstellt_am: string;
  gesehen_am: string;
  ablauf: string;
}

function ausZeile(z: Zeile): Sitzung {
  let rollen: string[] = [];
  try {
    const d = JSON.parse(z.rollen);
    if (Array.isArray(d)) rollen = d.map(String);
  } catch {
    // Eine kaputte Spalte darf niemanden aussperren - sie macht ihn nur
    // rollenlos, und das ist die sichere Richtung.
  }
  return { ...z, rollen };
}

export function sitzungAnlegen(a: Angemeldet): string {
  const id = randomBytes(32).toString('base64url');
  // Die Sitzung endet, wenn das Token endet - aber nie spaeter als die
  // eigene Hoechstdauer. Sonst haette ein langlebiges Token eine Sitzung
  // ueber Tage offen gehalten.
  const bisToken = a.ablauf * 1000;
  const bisDauer = Date.now() + DAUER_STUNDEN * 3600 * 1000;
  const bis = new Date(Math.min(bisToken, bisDauer)).toISOString();

  schreib(
    `INSERT INTO sitzung (id, sub, name, email, benutzername, rollen, ablauf)
     VALUES (?,?,?,?,?,?,?)`,
    id, a.sub, a.name, a.email, a.benutzername, JSON.stringify(a.rollen), bis,
  );
  aufraeumen();
  return id;
}

/**
 * Eine Sitzung holen und als gesehen markieren.
 *
 * Abgelaufene Sitzungen werden hier geloescht und nicht nur ignoriert: Sonst
 * waechst die Tabelle mit jeder Anmeldung, und ein abgelaufener Eintrag
 * saehe in der Datenbank wie ein gueltiger aus.
 */
export function sitzung(id: string | null): Sitzung | null {
  if (!id) return null;
  const z = eine<Zeile>('SELECT * FROM sitzung WHERE id = ?', id);
  if (!z) return null;
  if (new Date(z.ablauf).getTime() <= Date.now()) {
    schreib('DELETE FROM sitzung WHERE id = ?', id);
    return null;
  }
  schreib("UPDATE sitzung SET gesehen_am = datetime('now') WHERE id = ?", id);
  return ausZeile(z);
}

export function sitzungBeenden(id: string | null): void {
  if (!id) return;
  schreib('DELETE FROM sitzung WHERE id = ?', id);
}

export function aufraeumen(): number {
  return schreib("DELETE FROM sitzung WHERE ablauf <= datetime('now')").anzahl;
}

export function sitzungen(): Sitzung[] {
  return alle<Zeile>('SELECT * FROM sitzung ORDER BY gesehen_am DESC').map(ausZeile);
}

/**
 * Das Set-Cookie fuer eine Anmeldung.
 *
 * `HttpOnly`, damit kein Skript es lesen kann. `SameSite=Lax`, damit es beim
 * Ruecksprung von Keycloak mitkommt (bei `Strict` waere der Nutzer nach dem
 * Anmelden wieder abgemeldet). `Secure` nur bei HTTPS - sonst waere das
 * Cookie im lokalen Betrieb auf http unbrauchbar.
 */
export function cookieSetzen(id: string, https: boolean): string {
  const teile = [
    `${COOKIE}=${cookieWert(id)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${DAUER_STUNDEN * 3600}`,
  ];
  if (https) teile.push('Secure');
  return teile.join('; ');
}

export function cookieLoeschen(https: boolean): string {
  const teile = [`${COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (https) teile.push('Secure');
  return teile.join('; ');
}
