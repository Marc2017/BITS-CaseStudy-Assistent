// Alle API-Handler. Jeder bekommt einen Kontext (params, query, body) und gibt
// Daten zurueck; das Serialisieren uebernimmt server.ts.
import { alle, schreib, zahl } from '../db/index.ts';
import {
  fakten, faktAendern, faktenFuerZiel, faktLoeschen, faktSetzen, fortschritt,
  katalog, type Stufe,
} from '../db/fakten.ts';
import {
  fassung, fassungen, fassungSpeichern, nachrichtAnlegen, sicherung, sicherungen,
  story, storyAendern, storyAnlegen, storyLoeschen, storys, verlauf,
  versionAblegen,
} from '../db/story.ts';
import {
  kunde, kunden, kundeSpeichern, projektarten, projektartSpeichern, struktur,
  ziel, ziele, zielSpeichern,
} from '../db/vorlagen.ts';
import { aenderbar, anzeige, lesen, SCHLUESSEL, setzen } from '../db/einstellung.ts';
import { mehrbenutzer, NUR_UMGEBUNG, verwalterRolle } from '../db/betrieb.ts';
import { anmeldungMoeglich } from '../auth/oidc.ts';
import { istVerwalter } from '../auth/waechter.ts';
import type { Sitzung } from '../auth/sitzung.ts';
import { lernnotizen, lernnotizUebernehmen, lernnotizVerwerfen } from '../db/lernen.ts';
import {
  anbieter, fehlerText, klientVerwerfen, modell, zugangVorhanden,
} from '../ki/anbieter.ts';
import { interviewSchritt } from '../ki/interview.ts';
import {
  anfrage, anfrageAnlegen, anfrageBeenden, anfragenFuer, anfragenZuStory,
  bekannteAdressen, beteiligte, mailVermerken, person, ueberspringen,
  ueberspringenAufheben, uebersprungeneAlle,
} from '../db/mitarbeit.ts';
import { anfrageText, mailMoeglich, senden } from '../mail.ts';
import { formulieren, textUmformulieren } from '../ki/formulierung.ts';
import { importieren } from '../ki/importieren.ts';
import { auswerten } from '../ki/lernmodus.ts';
import { beispielantwort, zerlegen } from '../ki/hilfe.ts';
import { stromOeffnen } from './strom.ts';

export interface Kontext {
  params: Record<string, string>;
  query: URLSearchParams;
  body: Record<string, unknown>;
  /**
   * Die rohe Antwort - nur fuer Endpunkte, die selbst schreiben
   * (Ereignisstrom). Alle anderen Handler geben Daten zurueck und lassen den
   * Server antworten.
   */
  antwort?: import('node:http').ServerResponse;
  /**
   * Wer die Anfrage stellt. Im Einzelplatzbetrieb null - dort gibt es keine
   * Anmeldung, und `null` heisst nicht "unberechtigt", sondern "niemand
   * fragt danach".
   */
  sitzung?: Sitzung | null;
}

/** Wer arbeitet hier? Im Mehrbenutzerbetrieb der angemeldete Mensch. */
function autorAus(k: Kontext): string | null {
  return k.sitzung?.name ?? lesen(SCHLUESSEL.ichBin);
}

const nr = (k: Kontext, name: string) => Number(k.params[name]);
const text = (k: Kontext, name: string): string | undefined => {
  const v = k.body[name];
  return typeof v === 'string' ? v : undefined;
};

export class Fehlerhaft extends Error {
  status = 400;
}

const pflicht = (k: Kontext, name: string): string => {
  const v = text(k, name)?.trim();
  if (!v) throw new Fehlerhaft(`Das Feld „${name}" fehlt.`);
  return v;
};

// ------------------------------------------------------------------- Gesundheit

/**
 * Lebenszeichen fuer die Probes des Clusters (E-18).
 *
 * Bewusst OHNE Anmeldung erreichbar und ohne Inhalt: Kubernetes fragt hier im
 * Sekundentakt, und eine Probe, die eine Sitzung braucht, meldet einen
 * gesunden Pod als tot. Preisgegeben wird nur, dass der Dienst laeuft und die
 * Datenbank antwortet - keine Zahlen aus dem Bestand.
 */
export function gesund(_k: Kontext) {
  // Ein echter Lesezugriff, kein `SELECT 1`: Eine Datenbank, die geoeffnet
  // aber nicht migriert ist, antwortet auf 1 und scheitert am Schema.
  const stand = zahl('PRAGMA user_version');
  const katalogZeilen = zahl('SELECT COUNT(*) FROM faktenrubrik');
  return {
    ok: katalogZeilen > 0,
    schema: stand,
    erstausstattung: katalogZeilen > 0,
    ki: zugangVorhanden(),
    zeit: new Date().toISOString(),
  };
}

/**
 * Wer bin ich, und was darf ich?
 *
 * Die Oberflaeche fragt das beim Start: Sie muss den Namen zeigen und wissen,
 * ob sie die Verwaltung anbieten darf. Im Einzelplatzbetrieb antwortet der
 * Endpunkt mit `angemeldet: false` und `verwalter: true` - dort gibt es
 * keine Anmeldung, aber auch keine Einschraenkung.
 */
export function ich(k: Kontext) {
  const s = k.sitzung ?? null;
  return {
    mehrbenutzer: mehrbenutzer(),
    anmeldungMoeglich: anmeldungMoeglich(),
    angemeldet: Boolean(s),
    name: s?.name ?? lesen(SCHLUESSEL.ichBin),
    benutzername: s?.benutzername ?? null,
    email: s?.email ?? null,
    rollen: s?.rollen ?? [],
    verwalter: istVerwalter(s),
    verwalterRolle: verwalterRolle(),
  };
}

// ------------------------------------------------------------------ Startseite

/**
 * Was die Startseite braucht: die vorhandenen Geschichten und ob die KI
 * ueberhaupt erreichbar ist. Ohne Zugang bleibt die Anwendung bedienbar - die
 * Oberflaeche sagt dann nur, was gerade nicht geht.
 */
export function start(_k: Kontext) {
  return {
    storys: storys(),
    projektarten: projektarten(),
    kunden: kunden(),
    ziele: ziele().map((z) => ({
      id: z.id, schluessel: z.schluessel, name: z.name,
      beschreibung: z.beschreibung, stufe: z.stufe,
    })),
    ki: { zugang: zugangVorhanden(), anbieter: anbieter(), modell: modell() },
    // `ich` ist seit der Anmeldung ein Objekt und kein Name mehr: Die
    // Oberflaeche muss nicht nur wissen, WER hier arbeitet, sondern auch, was
    // er darf.
    ich: ich(_k),
    betrieb: { mehrbenutzer: mehrbenutzer(), mail: mailMoeglich() },
    // Was andere von MIR wollen. Ueber die Adresse, nicht ueber die
    // Kennung - die Bitte entsteht oft, bevor die Person je angemeldet war
    // (E-23).
    anfragen: anfragenFuer(_k.sitzung?.email ?? null),
  };
}

// ---------------------------------------------------------------- Geschichten

export function storyListe(k: Kontext) {
  return storys(k.query.get('status') ?? undefined);
}

export function storyNeu(k: Kontext) {
  const arbeitstitel = pflicht(k, 'arbeitstitel');
  const kundeId = k.body.kunde_id ? Number(k.body.kunde_id) : null;
  const id = storyAnlegen({
    arbeitstitel,
    projektart_id: k.body.projektart_id ? Number(k.body.projektart_id) : null,
    kunde_id: kundeId,
    autor: text(k, 'autor') ?? autorAus(k),
  });
  kundenfaktenSetzen(id, kundeId);
  return { id, ...storyVoll({ ...k, params: { id: String(id) } }) };
}

/**
 * Aus dem Stammdatensatz die passenden Fakten vorbelegen.
 *
 * Die Zuordnung `story.kunde_id` ist eine Steuergroesse (welche Hinweise
 * gelten), der Kundenname ist Inhalt - und Inhalt steht als Fakt (I-03).
 * Beides wird deshalb EINMAL beim Zuordnen abgeglichen, nicht dauernd
 * synchron gehalten: Wer den Fakt danach im Gespraech korrigiert, hat das
 * letzte Wort.
 */
function kundenfaktenSetzen(storyId: number, kundeId: number | null): void {
  const kd = kunde(kundeId);
  if (!kd) return;
  faktSetzen(storyId, {
    schluessel: 'kunde', wert: kd.name, stufe: 'intern', quelle: 'manuell',
    beleg: 'Stammdatensatz Kunde',
  });
  if (kd.branche) {
    faktSetzen(storyId, {
      schluessel: 'branche', wert: kd.branche, stufe: 'oeffentlich', quelle: 'manuell',
      beleg: 'Stammdatensatz Kunde',
    });
  }
  if (kd.anonym) {
    faktSetzen(storyId, {
      schluessel: 'kunde_anonym', wert: kd.anonym, stufe: 'oeffentlich', quelle: 'manuell',
      beleg: 'Stammdatensatz Kunde',
    });
  }
}

/** Der ganze Arbeitsstand einer Geschichte - das, was der Splitscreen braucht. */
export function storyVoll(k: Kontext) {
  const id = nr(k, 'id');
  const s = story(id);
  if (!s) throw new Fehlerhaft(`Erfolgsgeschichte ${id} gibt es nicht.`);
  return {
    story: s,
    verlauf: verlauf(id),
    fakten: fakten(id),
    fortschritt: fortschritt(id),
    fassungen: fassungen(id).map((f) => {
      const z = ziel(f.ziel_id);
      return {
        ...f,
        ziel_name: z?.name ?? '(gelöschtes Ziel)',
        ziel_schluessel: z?.schluessel ?? null,
        ziel_stufe: z?.stufe ?? null,
        veraltet: f.inhalt ? fakten(id).length > f.fakten_stand : false,
      };
    }),
    // Je Ziel die Zahl der Fakten, die es sehen darf. Sie kommt vom Server,
    // damit die Oberflaeche die Filterung nicht nachbaut (I-04) - sonst gaebe
    // es zwei Rechnungen fuer dieselbe Grenze, und eine davon waere falsch.
    ziele: ziele().map((z) => ({
      ...z,
      freigegeben: faktenFuerZiel(id, z.stufe).length,
    })),
    katalog: katalog(),
    // Mitarbeit (E-23): wer gebeten wurde, was wer uebersprungen hat, und
    // von wem die Angaben stammen.
    anfragen: anfragenZuStory(id),
    uebersprungen: uebersprungeneAlle(id),
    beteiligte: beteiligte(id),
    adressen: bekannteAdressen(),
    mail_moeglich: mailMoeglich(),
    ich_kennung: person(k.sitzung).kennung,
    projektarten: projektarten(),
    kunden: kunden(),
  };
}

export function storyPatch(k: Kontext) {
  const id = nr(k, 'id');
  const kundeNeu = k.body.kunde_id === undefined
    ? undefined
    : (k.body.kunde_id ? Number(k.body.kunde_id) : null);
  storyAendern(id, {
    arbeitstitel: text(k, 'arbeitstitel'),
    status: k.body.status as 'aktiv' | 'fertig' | 'archiv' | undefined,
    projektart_id: k.body.projektart_id === undefined
      ? undefined
      : (k.body.projektart_id ? Number(k.body.projektart_id) : null),
    kunde_id: kundeNeu,
    autor: text(k, 'autor'),
  });
  if (kundeNeu) kundenfaktenSetzen(id, kundeNeu);
  return { ok: true, story: story(id) };
}

export function storyWeg(k: Kontext) {
  storyLoeschen(nr(k, 'id'));
  return { ok: true };
}

// ------------------------------------------------------------------ Interview

/**
 * Ein Interviewschritt, als Ereignisstrom.
 *
 * Der Handler antwortet selbst: Ein Schritt dauert gemessen 10 bis 13
 * Sekunden, und in dieser Zeit soll sichtbar sein, dass etwas passiert.
 * Das Ergebnis kommt am Ende als Ereignis `fertig` - dieselben Daten, die der
 * Handler sonst zurueckgegeben haette.
 */
export async function interview(k: Kontext) {
  const id = nr(k, 'id');
  const strom = stromOeffnen(k.antwort!);
  try {
    const ergebnis = await interviewSchritt(
      id, text(k, 'text'), strom.melder, person(k.sitzung),
    );
    strom.fertig({ ...ergebnis, verlauf: verlauf(id), fakten: fakten(id) });
  } catch (e) {
    strom.fehler(fehlerText(e));
  }
}

/**
 * Die letzte Frage in Teilfragen zerlegen (Hilfe bei der Eingabe).
 *
 * Zerlegen erfindet nichts, es sortiert - deshalb ist das gefahrlos und
 * landet auch nicht im Verlauf. Die Teilfragen beantwortet der Nutzer in der
 * Oberflaeche; abgesendet wird eine zusammengesetzte Antwort.
 */
export async function frageZerlegen(k: Kontext) {
  const strom = stromOeffnen(k.antwort!);
  try {
    strom.fertig(await zerlegen(nr(k, 'id'), strom.melder));
  } catch (e) {
    strom.fehler(fehlerText(e));
  }
}

/**
 * Einen Antwortvorschlag entwerfen.
 *
 * Der Vorschlag wird NICHT gesendet, sondern ins Eingabefeld gelegt: Er raet
 * an den Stellen, die er in eckige Klammern setzt, und geratene Angaben
 * duerfen nicht ungeprueft als Fakt in den Bestand wandern.
 */
export async function frageBeispiel(k: Kontext) {
  const strom = stromOeffnen(k.antwort!);
  try {
    strom.fertig(await beispielantwort(nr(k, 'id'), strom.melder));
  } catch (e) {
    strom.fehler(fehlerText(e));
  }
}

/** Eine Notiz in den Verlauf schreiben, ohne die KI zu fragen. */
export function notiz(k: Kontext) {
  const id = nr(k, 'id');
  nachrichtAnlegen(id, 'notiz', pflicht(k, 'text'));
  return { verlauf: verlauf(id) };
}

// --------------------------------------------------------------------- Fakten

export function faktNeu(k: Kontext) {
  const id = nr(k, 'id');
  const wer = person(k.sitzung);
  faktSetzen(id, {
    schluessel: pflicht(k, 'schluessel').toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    wert: pflicht(k, 'wert'),
    stufe: k.body.stufe,
    beleg: text(k, 'beleg') ?? null,
    sicher: k.body.sicher === undefined ? true : Boolean(k.body.sicher),
    quelle: 'manuell',
    // Wer von Hand eintraegt, hat beigetragen (E-23) - sonst stuende eine
    // Herkunft nur an Interview-Fakten, und das sieht aus wie ein Fehler.
    beigetragen_von: wer.kennung,
    beigetragen_name: wer.name,
  });
  return { fakten: fakten(id), fortschritt: fortschritt(id) };
}

export function faktPatch(k: Kontext) {
  const id = nr(k, 'id');
  faktAendern(id, {
    wert: text(k, 'wert'),
    stufe: k.body.stufe,
    beleg: k.body.beleg === undefined ? undefined : (text(k, 'beleg') ?? null),
    sicher: k.body.sicher === undefined ? undefined : Boolean(k.body.sicher),
  });
  const storyId = Number(k.query.get('story') ?? 0);
  return storyId ? { fakten: fakten(storyId), fortschritt: fortschritt(storyId) } : { ok: true };
}

export function faktWeg(k: Kontext) {
  const storyId = Number(k.query.get('story') ?? 0);
  faktLoeschen(nr(k, 'id'));
  return storyId ? { fakten: fakten(storyId), fortschritt: fortschritt(storyId) } : { ok: true };
}

// ------------------------------------------------------------------ Fassungen

export async function fassungFormulieren(k: Kontext) {
  const id = nr(k, 'id');
  const zielId = Number(k.body.ziel_id);
  const strom = stromOeffnen(k.antwort!);
  if (!zielId) {
    strom.fehler('Kein Ziel gewählt.');
    return;
  }
  try {
    const ergebnis = await formulieren(id, zielId, strom.melder);
    strom.fertig({ ...ergebnis, fassungen: storyVoll(k).fassungen });
  } catch (e) {
    strom.fehler(fehlerText(e));
  }
}

/** Von Hand gespeichert - setzt `handisch` (I-02). */
export function fassungHand(k: Kontext) {
  const id = nr(k, 'id');
  const zielId = nr(k, 'ziel');
  const inhalt = text(k, 'inhalt') ?? '';
  fassungSpeichern({
    storyId: id,
    zielId,
    titel: text(k, 'titel') ?? null,
    inhalt,
    handisch: true,
    grund: 'von Hand geändert',
  });
  return { fassung: fassung(id, zielId) };
}

export function fassungVerlauf(k: Kontext) {
  const f = fassung(nr(k, 'id'), nr(k, 'ziel'));
  if (!f) return { sicherungen: [] };
  const nurFertige = k.query.get('fertig') === '1';
  return { fassung_id: f.id, sicherungen: sicherungen(f.id, nurFertige) };
}

/** Den aktuellen Stand als benannte Version ablegen (E-17). */
export function versionSpeichern(k: Kontext) {
  const id = nr(k, 'id');
  const zielId = nr(k, 'ziel');
  const z = ziel(zielId);
  if (!z) throw new Fehlerhaft('Ziel unbekannt.');
  const r = versionAblegen({
    storyId: id,
    zielId,
    name: pflicht(k, 'name'),
    kommentar: text(k, 'kommentar') ?? null,
    fertig: Boolean(k.body.fertig),
    // Die Stufe kommt vom Ziel, nicht aus dem Antragskoerper: Sie ist eine
    // Eigenschaft der Vorlage und darf nicht von der Oberflaeche gesetzt
    // werden (I-04).
    stufe: (text(k, 'stufe') as Stufe | undefined) ?? z.stufe,
  });
  return { ...r, sicherungen: sicherungen(fassung(id, zielId)!.id) };
}

export function fassungZurueck(k: Kontext) {
  const id = nr(k, 'id');
  const zielId = nr(k, 'ziel');
  const s = sicherung(Number(k.body.sicherung_id));
  if (!s) throw new Fehlerhaft('Diese Sicherung gibt es nicht.');
  fassungSpeichern({
    storyId: id, zielId, titel: s.titel, inhalt: s.inhalt,
    handisch: true, grund: 'auf eine Sicherung zurückgesetzt',
  });
  return { fassung: fassung(id, zielId) };
}

export function zielStruktur(k: Kontext) {
  const z = ziel(nr(k, 'id'));
  if (!z) throw new Fehlerhaft('Ziel unbekannt.');
  return { ziel: z, abschnitte: struktur(z) };
}

// ---------------------------------------------------------------------- Import

export async function importieren_(k: Kontext) {
  const url = text(k, 'url')?.trim();
  const inhalt = text(k, 'text')?.trim();
  const strom = stromOeffnen(k.antwort!);
  if (!url && !inhalt) {
    strom.fehler('Weder Text noch Adresse angegeben.');
    return;
  }
  try {
    const ergebnis = await importieren({
      url,
      text: inhalt,
      arbeitstitel: text(k, 'arbeitstitel'),
      projektart_id: k.body.projektart_id ? Number(k.body.projektart_id) : null,
      kunde_id: k.body.kunde_id ? Number(k.body.kunde_id) : null,
      autor: text(k, 'autor') ?? autorAus(k),
    }, strom.melder);
    if (k.body.kunde_id) kundenfaktenSetzen(ergebnis.story_id, Number(k.body.kunde_id));
    strom.fertig(ergebnis);
  } catch (e) {
    strom.fehler(fehlerText(e));
  }
}

// ------------------------------------------------------------------- Lernmodus

export async function lernenAuswerten(k: Kontext) {
  const strom = stromOeffnen(k.antwort!);
  try {
    const ergebnis = await auswerten(
      nr(k, 'id'), k.body.ziel_id ? Number(k.body.ziel_id) : null, strom.melder,
    );
    strom.fertig(ergebnis);
  } catch (e) {
    strom.fehler(fehlerText(e));
  }
}

export function lernListe(k: Kontext) {
  return { notizen: lernnotizen(k.query.get('status') ?? 'offen') };
}

export function lernUebernehmen(k: Kontext) {
  const r = lernnotizUebernehmen(nr(k, 'id'));
  if (!r.ok) throw new Fehlerhaft(r.hinweis ?? 'Nicht möglich.');
  return { ...r, notizen: lernnotizen('offen') };
}

export function lernVerwerfen(k: Kontext) {
  lernnotizVerwerfen(nr(k, 'id'));
  return { notizen: lernnotizen('offen') };
}

// ------------------------------------------------------------- Textwerkzeug

export async function umformulieren(k: Kontext) {
  const strom = stromOeffnen(k.antwort!);
  try {
    const neu = await textUmformulieren(
      pflicht(k, 'text'), pflicht(k, 'auftrag'), strom.melder,
    );
    strom.fertig({ text: neu });
  } catch (e) {
    strom.fehler(fehlerText(e));
  }
}

// ------------------------------------------------------------------ Verwaltung

export function verwaltung(_k: Kontext) {
  return {
    ziele: ziele(false),
    projektarten: projektarten(false),
    kunden: kunden(false),
    katalog: alle('SELECT * FROM faktenrubrik ORDER BY sort, id'),
    einstellungen: anzeige(),
    ki: { zugang: zugangVorhanden(), anbieter: anbieter(), modell: modell() },
    lernnotizen: lernnotizen('offen'),
  };
}

export function zielSpeichern_(k: Kontext) {
  const id = zielSpeichern({
    schluessel: pflicht(k, 'schluessel').toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
    name: pflicht(k, 'name'),
    beschreibung: text(k, 'beschreibung') ?? null,
    prompt: text(k, 'prompt') ?? '',
    struktur: typeof k.body.struktur === 'string'
      ? k.body.struktur
      : JSON.stringify(k.body.struktur ?? []),
    stufe: (k.body.stufe as Stufe) ?? 'oeffentlich',
    laenge: text(k, 'laenge') ?? null,
    lernmodus: k.body.lernmodus === undefined ? 1 : (k.body.lernmodus ? 1 : 0),
    sort: Number(k.body.sort ?? 0),
    aktiv: k.body.aktiv === undefined ? 1 : (k.body.aktiv ? 1 : 0),
  });
  return { id, ziele: ziele(false) };
}

export function projektartSpeichern_(k: Kontext) {
  const id = projektartSpeichern({
    id: k.body.id ? Number(k.body.id) : undefined,
    name: pflicht(k, 'name'),
    beschreibung: text(k, 'beschreibung') ?? null,
    hinweise: text(k, 'hinweise') ?? null,
    lernmodus: k.body.lernmodus === undefined ? 1 : (k.body.lernmodus ? 1 : 0),
    sort: Number(k.body.sort ?? 0),
    aktiv: k.body.aktiv === undefined ? 1 : (k.body.aktiv ? 1 : 0),
  });
  return { id, projektarten: projektarten(false) };
}

export function kundeSpeichern_(k: Kontext) {
  const id = kundeSpeichern({
    id: k.body.id ? Number(k.body.id) : undefined,
    name: pflicht(k, 'name'),
    branche: text(k, 'branche') ?? null,
    hinweise: text(k, 'hinweise') ?? null,
    anonym: text(k, 'anonym') ?? null,
    lernmodus: k.body.lernmodus === undefined ? 1 : (k.body.lernmodus ? 1 : 0),
    sort: Number(k.body.sort ?? 0),
    aktiv: k.body.aktiv === undefined ? 1 : (k.body.aktiv ? 1 : 0),
  });
  return { id, kunden: kunden(false) };
}

export function katalogSpeichern(k: Kontext) {
  const schluessel = pflicht(k, 'schluessel').toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const felder = {
    rubrik: text(k, 'rubrik') ?? 'Weiteres',
    label: pflicht(k, 'label'),
    hinweis: text(k, 'hinweis') ?? null,
    pflicht: k.body.pflicht ? 1 : 0,
    mehrfach: k.body.mehrfach ? 1 : 0,
    stufe: (k.body.stufe_vorschlag as Stufe) ?? 'intern',
    sort: Number(k.body.sort ?? 0),
    aktiv: k.body.aktiv === undefined ? 1 : (k.body.aktiv ? 1 : 0),
  };
  schreib(
    `INSERT INTO faktenrubrik (schluessel, rubrik, label, hinweis, pflicht, mehrfach,
        stufe_vorschlag, sort, aktiv) VALUES (?,?,?,?,?,?,?,?,?)
     ON CONFLICT (schluessel) DO UPDATE SET rubrik = excluded.rubrik,
        label = excluded.label, hinweis = excluded.hinweis, pflicht = excluded.pflicht,
        mehrfach = excluded.mehrfach, stufe_vorschlag = excluded.stufe_vorschlag,
        sort = excluded.sort, aktiv = excluded.aktiv`,
    schluessel, felder.rubrik, felder.label, felder.hinweis, felder.pflicht,
    felder.mehrfach, felder.stufe, felder.sort, felder.aktiv,
  );
  return { katalog: alle('SELECT * FROM faktenrubrik ORDER BY sort, id') };
}

export function einstellungenLesen(_k: Kontext) {
  return { einstellungen: anzeige(), ki: { zugang: zugangVorhanden(), anbieter: anbieter(), modell: modell() } };
}

/**
 * Einstellungen setzen.
 *
 * Nach einer Aenderung am Schluessel wird der Klient verworfen - sonst
 * arbeitet der Server mit dem alten Zugang weiter und der Nutzer sucht den
 * Fehler beim Schluessel.
 */
export function einstellungenSetzen(k: Kontext) {
  const bekannt = new Set<string>(Object.values(SCHLUESSEL));
  let geaendert = 0;
  const abgewiesen: string[] = [];
  for (const [s, w] of Object.entries(k.body)) {
    if (!bekannt.has(s)) continue;
    // I-08: Im Mehrbenutzerbetrieb nimmt der Server einen KI-Zugang aus der
    // Oberflaeche nicht an. Stillschweigend zu ignorieren waere schlimmer als
    // abzulehnen - der Nutzer glaubte sonst, er haette etwas geaendert.
    if (!aenderbar(s)) {
      abgewiesen.push(s);
      continue;
    }
    setzen(s, w === null || w === '' ? null : String(w));
    geaendert += 1;
  }
  klientVerwerfen();
  return {
    geaendert,
    abgewiesen,
    hinweis: abgewiesen.length ? NUR_UMGEBUNG : null,
    einstellungen: anzeige(),
    ki: { zugang: zugangVorhanden(), anbieter: anbieter(), modell: modell() },
  };
}

// ------------------------------------------------------------------ Mitarbeit
//
// Mehrere Personen an einer Erfolgsgeschichte (E-23). Der Kern ist das
// Ueberspringen: Es gilt je PERSON, damit dieselbe Frage bei der naechsten
// wieder gestellt wird.

/**
 * Einen Kollegen um Mithilfe bitten.
 *
 * Die Anfrage wird ZUERST gespeichert, die Mail danach versucht. Scheitert
 * der Versand, bleibt die Bitte bestehen und der Grund steht an ihr - sonst
 * waere eine Anfrage bei jedem Netzproblem verloren, ohne dass es jemand
 * merkt.
 */
export async function anfrageNeu(k: Kontext) {
  const id = nr(k, 'id');
  const s = story(id);
  if (!s) throw new Fehlerhaft(`Erfolgsgeschichte ${id} gibt es nicht.`);

  const a = anfrageAnlegen(id, {
    an_email: pflicht(k, 'an_email'),
    an_name: text(k, 'an_name') ?? null,
    hinweis: text(k, 'hinweis') ?? null,
  }, person(k.sitzung));

  let mailFehler: string | null = null;
  if (k.body.mail === true) {
    if (!mailMoeglich()) {
      mailFehler = 'Es ist kein Mailserver eingetragen.';
    } else {
      const auftrag = anfrageText({
        vonName: a.von_name,
        arbeitstitel: s.arbeitstitel,
        hinweis: a.hinweis,
        link: `${frontendBasis()}/#/story/${id}`,
      });
      mailFehler = await senden({ ...auftrag, an: a.an_email });
    }
    mailVermerken(a.id, mailFehler);
  }

  return {
    anfrage: anfrage(a.id),
    anfragen: anfragenZuStory(id),
    // Der Link zum Weitergeben - er funktioniert immer, auch ohne Mail.
    link: `${frontendBasis()}/#/story/${id}`,
    mail_fehler: mailFehler,
  };
}

/** Wohin der Link zeigt. */
function frontendBasis(): string {
  return (process.env.FRONTEND_URL || process.env.AUTH_URL || 'http://localhost:4700')
    .replace(/\/+$/, '');
}

export function anfragePatch(k: Kontext) {
  const id = nr(k, 'id');
  const a = anfrage(id);
  if (!a) throw new Fehlerhaft(`Anfrage ${id} gibt es nicht.`);
  const status = text(k, 'status');
  if (status !== 'erledigt' && status !== 'abgelehnt') {
    throw new Fehlerhaft('Status muss „erledigt" oder „abgelehnt" sein.');
  }
  anfrageBeenden(id, status);
  return { anfrage: anfrage(id), anfragen: anfragenFuer(k.sitzung?.email ?? null) };
}

/**
 * „Das kann ich nicht beantworten."
 *
 * Vermerkt fuer DIESE Person. Fuer alle anderen bleibt die Frage offen - das
 * ist der ganze Sinn, denn sonst waere Weiterreichen wertlos.
 */
export function frageUeberspringen(k: Kontext) {
  const id = nr(k, 'id');
  if (!story(id)) throw new Fehlerhaft(`Erfolgsgeschichte ${id} gibt es nicht.`);
  const schluessel = pflicht(k, 'schluessel');
  ueberspringen(id, schluessel, person(k.sitzung), text(k, 'grund') ?? null);
  return {
    uebersprungen: uebersprungeneAlle(id),
    fortschritt: fortschritt(id),
  };
}

export function frageWiederStellen(k: Kontext) {
  const id = nr(k, 'id');
  ueberspringenAufheben(id, k.params.schluessel ?? '', person(k.sitzung));
  return { uebersprungen: uebersprungeneAlle(id) };
}
