// Mehrere Personen an einer Erfolgsgeschichte (E-23).
//
// Drei Dinge stehen hier zusammen, weil sie dieselbe Frage beantworten:
// **wer weiss was?**
//
//   1. `anfrage`       - jemanden bitten, am Interview mitzuwirken
//   2. `uebersprungen` - was DIESE Person nicht beantworten konnte
//   3. `beigetragen_*` - von wem eine Angabe stammt
//
// Der Kern ist Punkt 2, und er ist leicht falsch zu bauen: Eine
// uebersprungene Frage darf nur fuer die Person verstummen, die sie
// uebersprungen hat. Wer sie fuer die ganze Geschichte abschaltet, hat den
// Zweck zerstoert - der Sinn des Weiterreichens ist ja, dass die naechste
// Person genau diese Frage beantwortet.
import { alle, eine, schreib } from './index.ts';
import { lesen, SCHLUESSEL } from './einstellung.ts';
import { mehrbenutzer } from './betrieb.ts';
import type { Sitzung } from '../auth/sitzung.ts';

export interface Person {
  /** Stabile Kennung - bei Keycloak `sub`, im Einzelplatz aus der Einstellung. */
  kennung: string;
  name: string;
  email: string | null;
}

export interface Anfrage {
  id: number;
  story_id: number;
  an_email: string;
  an_name: string | null;
  von_kennung: string;
  von_name: string;
  hinweis: string | null;
  status: 'offen' | 'erledigt' | 'abgelehnt';
  mail_versandt: string | null;
  mail_fehler: string | null;
  erstellt_am: string;
  beendet_am: string | null;
  /** Nur in Listen: der Arbeitstitel der Geschichte. */
  arbeitstitel?: string;
}

export interface Uebersprungen {
  schluessel: string;
  person: string;
  person_name: string | null;
  grund: string | null;
  erstellt_am: string;
}

/**
 * Wer arbeitet hier gerade?
 *
 * Im Mehrbenutzerbetrieb die angemeldete Person. Im Einzelplatzbetrieb gibt
 * es keine Anmeldung — dort gilt der Name aus der Einstellung `ich.person`
 * (die ehrliche Vorstufe, O-01), und fehlt der, eine feste Kennung. Damit
 * funktioniert „Ueberspringen" auch ohne Anmeldung, ohne eine Person zu
 * erfinden.
 */
export function person(sitzung?: Sitzung | null): Person {
  if (mehrbenutzer() && sitzung) {
    return { kennung: sitzung.sub, name: sitzung.name, email: sitzung.email };
  }
  const eigen = lesen(SCHLUESSEL.ichBin)?.trim();
  return {
    kennung: eigen ? `einzelplatz:${eigen.toLowerCase()}` : 'einzelplatz',
    name: eigen || 'Einzelplatz',
    email: null,
  };
}

// ----------------------------------------------------------------- Anfragen

/**
 * Eine Bitte um Mitwirkung anlegen.
 *
 * Die Empfaengeradresse ist Freitext und wird NICHT gegen eine Benutzerliste
 * geprueft: Der haeufigste Fall ist, jemanden hinzuzuholen, der die Anwendung
 * noch nie geoeffnet hat. Eine Pruefung gegen bekannte Anmeldungen wuerde
 * genau das verhindern.
 */
export function anfrageAnlegen(
  storyId: number,
  e: { an_email: string; an_name?: string | null; hinweis?: string | null },
  von: Person,
): Anfrage {
  const email = e.an_email.trim().toLowerCase();
  if (!email) throw new Error('Ohne Adresse kann ich niemanden fragen.');

  // Dieselbe Person zweimal zur selben Geschichte zu bitten, ergibt keine
  // zweite Anfrage - sondern aktualisiert den Hinweis der offenen.
  const offen = eine<{ id: number }>(
    "SELECT id FROM anfrage WHERE story_id = ? AND an_email = ? AND status = 'offen'",
    storyId, email,
  );
  if (offen) {
    schreib(
      'UPDATE anfrage SET hinweis = COALESCE(?, hinweis), an_name = COALESCE(?, an_name) WHERE id = ?',
      e.hinweis?.trim() || null, e.an_name?.trim() || null, offen.id,
    );
    return anfrage(offen.id)!;
  }

  const { id } = schreib(
    `INSERT INTO anfrage (story_id, an_email, an_name, von_kennung, von_name, hinweis)
     VALUES (?,?,?,?,?,?)`,
    storyId, email, e.an_name?.trim() || null, von.kennung, von.name,
    e.hinweis?.trim() || null,
  );
  return anfrage(Number(id))!;
}

export function anfrage(id: number): Anfrage | null {
  return eine<Anfrage>('SELECT * FROM anfrage WHERE id = ?', id) ?? null;
}

/** Alle Anfragen zu einer Geschichte, offene zuerst. */
export function anfragenZuStory(storyId: number): Anfrage[] {
  return alle<Anfrage>(
    `SELECT * FROM anfrage WHERE story_id = ?
      ORDER BY status = 'offen' DESC, erstellt_am DESC`,
    storyId,
  );
}

/**
 * Was fuer mich offen ist.
 *
 * Ueber die E-Mail-Adresse, nicht ueber die Kennung: Die Anfrage entsteht,
 * bevor die Person sich je angemeldet hat - eine Kennung gibt es dann noch
 * nicht.
 */
export function anfragenFuer(email: string | null): Anfrage[] {
  if (!email) return [];
  return alle<Anfrage>(
    `SELECT a.*, s.arbeitstitel FROM anfrage a
       JOIN story s ON s.id = a.story_id
      WHERE a.an_email = ? AND a.status = 'offen'
      ORDER BY a.erstellt_am DESC`,
    email.trim().toLowerCase(),
  );
}

export function anfrageBeenden(id: number, status: 'erledigt' | 'abgelehnt'): void {
  schreib(
    "UPDATE anfrage SET status = ?, beendet_am = datetime('now') WHERE id = ?",
    status, id,
  );
}

export function mailVermerken(id: number, fehler: string | null): void {
  schreib(
    `UPDATE anfrage SET mail_versandt = CASE WHEN ? IS NULL THEN datetime('now') END,
        mail_fehler = ? WHERE id = ?`,
    fehler, fehler, id,
  );
}

/**
 * Adressen, die schon einmal hier waren - als Vorschlag beim Anfragen.
 *
 * Quelle sind die Anmeldungen und frueheren Anfragen. Kein Adressbuch, nur
 * eine Erleichterung beim Tippen.
 */
export function bekannteAdressen(): { email: string; name: string | null }[] {
  return alle<{ email: string; name: string | null }>(
    `SELECT email, MAX(name) AS name FROM (
        SELECT email, name FROM sitzung WHERE email IS NOT NULL AND email <> ''
        UNION ALL
        SELECT an_email AS email, an_name AS name FROM anfrage
      )
      WHERE email IS NOT NULL AND email <> ''
      GROUP BY email ORDER BY email`,
  );
}

// ------------------------------------------------------------ Ueberspringen

/**
 * „Das kann ich nicht beantworten" - fuer DIESE Person vermerken.
 *
 * `UNIQUE (story_id, schluessel, person)` macht den zweiten Aufruf zum
 * Aktualisieren des Grundes statt zu einem Fehler.
 */
export function ueberspringen(
  storyId: number, schluessel: string, p: Person, grund?: string | null,
): void {
  const s = schluessel.trim().toLowerCase();
  if (!s) throw new Error('Welche Frage soll übersprungen werden?');
  schreib(
    `INSERT INTO uebersprungen (story_id, schluessel, person, person_name, grund)
     VALUES (?,?,?,?,?)
     ON CONFLICT (story_id, schluessel, person)
       DO UPDATE SET grund = COALESCE(excluded.grund, grund),
                     person_name = COALESCE(excluded.person_name, person_name)`,
    storyId, s, p.kennung, p.name, grund?.trim() || null,
  );
}

/** Rueckgaengig - die Frage darf wieder gestellt werden. */
export function ueberspringenAufheben(
  storyId: number, schluessel: string, p: Person,
): void {
  schreib(
    'DELETE FROM uebersprungen WHERE story_id = ? AND schluessel = ? AND person = ?',
    storyId, schluessel.trim().toLowerCase(), p.kennung,
  );
}

/** Was diese Person uebersprungen hat - das gehoert in ihren Interview-Prompt. */
export function uebersprungeneVon(storyId: number, kennung: string): string[] {
  return alle<{ schluessel: string }>(
    'SELECT schluessel FROM uebersprungen WHERE story_id = ? AND person = ?',
    storyId, kennung,
  ).map((z) => z.schluessel);
}

/** Alles Uebersprungene einer Geschichte - fuer die Faktenansicht. */
export function uebersprungeneAlle(storyId: number): Uebersprungen[] {
  return alle<Uebersprungen>(
    `SELECT schluessel, person, person_name, grund, erstellt_am
       FROM uebersprungen WHERE story_id = ? ORDER BY erstellt_am`,
    storyId,
  );
}

/**
 * Eine offene Frage, die jemand anderes schon uebersprungen hat, ist ein
 * Hinweis wert: Genau dafuer holt man jemanden hinzu.
 */
export function andereHabenUebersprungen(
  storyId: number, kennung: string,
): { schluessel: string; person_name: string | null }[] {
  return alle<{ schluessel: string; person_name: string | null }>(
    `SELECT schluessel, MAX(person_name) AS person_name
       FROM uebersprungen WHERE story_id = ? AND person <> ?
      GROUP BY schluessel`,
    storyId, kennung,
  );
}

// ---------------------------------------------------------------- Beitraege

/** Wer hat an dieser Geschichte mitgeschrieben, und wie viel? */
export function beteiligte(storyId: number): { name: string; fakten: number }[] {
  return alle<{ name: string; fakten: number }>(
    `SELECT COALESCE(beigetragen_name, 'ohne Angabe') AS name, COUNT(*) AS fakten
       FROM fakt WHERE story_id = ? AND beigetragen_von IS NOT NULL
      GROUP BY beigetragen_von ORDER BY fakten DESC`,
    storyId,
  );
}
