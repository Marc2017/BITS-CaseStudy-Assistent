// Alle API-Handler. Jeder bekommt einen Kontext (params, query, body) und gibt
// Daten zurueck; das Serialisieren uebernimmt server.ts.
import { alle, schreib } from '../db/index.ts';
import {
  fakten, faktAendern, faktenFuerZiel, faktLoeschen, faktSetzen, fortschritt,
  katalog, type Stufe,
} from '../db/fakten.ts';
import {
  fassung, fassungen, fassungSpeichern, nachrichtAnlegen, sicherung, sicherungen,
  story, storyAendern, storyAnlegen, storyLoeschen, storys, verlauf,
} from '../db/story.ts';
import {
  projektarten, projektartSpeichern, struktur, ziel, ziele, zielSpeichern,
} from '../db/vorlagen.ts';
import { anzeige, lesen, SCHLUESSEL, setzen } from '../db/einstellung.ts';
import { lernnotizen, lernnotizUebernehmen, lernnotizVerwerfen } from '../db/lernen.ts';
import { anbieter, klientVerwerfen, modell, zugangVorhanden } from '../ki/anbieter.ts';
import { interviewSchritt } from '../ki/interview.ts';
import { formulieren, textUmformulieren } from '../ki/formulierung.ts';
import { importieren } from '../ki/importieren.ts';
import { auswerten } from '../ki/lernmodus.ts';

export interface Kontext {
  params: Record<string, string>;
  query: URLSearchParams;
  body: Record<string, unknown>;
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
    ziele: ziele().map((z) => ({
      id: z.id, schluessel: z.schluessel, name: z.name,
      beschreibung: z.beschreibung, stufe: z.stufe,
    })),
    ki: { zugang: zugangVorhanden(), anbieter: anbieter(), modell: modell() },
    ich: lesen(SCHLUESSEL.ichBin),
  };
}

// ---------------------------------------------------------------- Geschichten

export function storyListe(k: Kontext) {
  return storys(k.query.get('status') ?? undefined);
}

export function storyNeu(k: Kontext) {
  const arbeitstitel = pflicht(k, 'arbeitstitel');
  const id = storyAnlegen({
    arbeitstitel,
    projektart_id: k.body.projektart_id ? Number(k.body.projektart_id) : null,
    autor: text(k, 'autor') ?? lesen(SCHLUESSEL.ichBin),
  });
  return { id, ...storyVoll({ ...k, params: { id: String(id) } }) };
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
    projektarten: projektarten(),
  };
}

export function storyPatch(k: Kontext) {
  const id = nr(k, 'id');
  storyAendern(id, {
    arbeitstitel: text(k, 'arbeitstitel'),
    status: k.body.status as 'aktiv' | 'fertig' | 'archiv' | undefined,
    projektart_id: k.body.projektart_id === undefined
      ? undefined
      : (k.body.projektart_id ? Number(k.body.projektart_id) : null),
    autor: text(k, 'autor'),
  });
  return { ok: true, story: story(id) };
}

export function storyWeg(k: Kontext) {
  storyLoeschen(nr(k, 'id'));
  return { ok: true };
}

// ------------------------------------------------------------------ Interview

export async function interview(k: Kontext) {
  const id = nr(k, 'id');
  const ergebnis = await interviewSchritt(id, text(k, 'text'));
  return { ...ergebnis, verlauf: verlauf(id), fakten: fakten(id) };
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
  faktSetzen(id, {
    schluessel: pflicht(k, 'schluessel').toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    wert: pflicht(k, 'wert'),
    stufe: k.body.stufe,
    beleg: text(k, 'beleg') ?? null,
    sicher: k.body.sicher === undefined ? true : Boolean(k.body.sicher),
    quelle: 'manuell',
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
  if (!zielId) throw new Fehlerhaft('Kein Ziel gewählt.');
  const ergebnis = await formulieren(id, zielId);
  return { ...ergebnis, fassungen: storyVoll(k).fassungen };
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
  return { fassung_id: f.id, sicherungen: sicherungen(f.id) };
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
  if (!url && !inhalt) throw new Fehlerhaft('Weder Text noch Adresse angegeben.');
  return importieren({
    url, text: inhalt,
    arbeitstitel: text(k, 'arbeitstitel'),
    projektart_id: k.body.projektart_id ? Number(k.body.projektart_id) : null,
    autor: text(k, 'autor') ?? lesen(SCHLUESSEL.ichBin),
  });
}

// ------------------------------------------------------------------- Lernmodus

export async function lernenAuswerten(k: Kontext) {
  return auswerten(nr(k, 'id'), k.body.ziel_id ? Number(k.body.ziel_id) : null);
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
  const neu = await textUmformulieren(pflicht(k, 'text'), pflicht(k, 'auftrag'));
  return { text: neu };
}

// ------------------------------------------------------------------ Verwaltung

export function verwaltung(_k: Kontext) {
  return {
    ziele: ziele(false),
    projektarten: projektarten(false),
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
  for (const [s, w] of Object.entries(k.body)) {
    if (!bekannt.has(s)) continue;
    setzen(s, w === null || w === '' ? null : String(w));
    geaendert += 1;
  }
  klientVerwerfen();
  return {
    geaendert,
    einstellungen: anzeige(),
    ki: { zugang: zugangVorhanden(), anbieter: anbieter(), modell: modell() },
  };
}
