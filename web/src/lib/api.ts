// Zugriff auf die API. Eine Stelle, ein Fehlerweg.
//
// Der Server antwortet auf jeden Fehler mit { fehler: "..." } und einem
// Statuscode. Hier wird daraus eine Ausnahme mit lesbarem Text - die
// Oberflaeche zeigt sie unveraendert an, statt "Fehler beim Laden".

import { strom, type Fortgang } from './strom.ts';

export type { Fortgang } from './strom.ts';

export type Stufe = 'oeffentlich' | 'intern' | 'vertraulich';

export interface Fakt {
  id: number;
  story_id: number;
  schluessel: string;
  rubrik: string | null;
  wert: string;
  stufe: Stufe;
  quelle: 'interview' | 'import' | 'manuell';
  beleg: string | null;
  sicher: number;
  erstellt_am: string;
  /** Wer die Angabe beigetragen hat (E-23) - nur zur Anzeige, nie im Prompt (I-10). */
  beigetragen_von: string | null;
  beigetragen_name: string | null;
}

export interface Nachricht {
  id: number;
  rolle: 'assistent' | 'nutzer' | 'notiz';
  text: string;
  erstellt_am: string;
}

export interface Fortschritt {
  pflicht: number;
  pflichtErfuellt: number;
  /** Anzahl Fakten. */
  gesamt: number;
  /** Anzahl verschiedener Faktenarten. */
  arten: number;
  offen: { schluessel: string; label: string; hinweis: string | null }[];
}

export interface Ziel {
  id: number;
  schluessel: string;
  name: string;
  beschreibung: string | null;
  prompt: string;
  struktur: string;
  stufe: Stufe;
  laenge: string | null;
  lernmodus: number;
  sort: number;
  aktiv: number;
}

export interface Projektart {
  id: number;
  name: string;
  beschreibung: string | null;
  hinweise: string | null;
  lernmodus: number;
  sort: number;
  aktiv: number;
}

/** Eine abgelegte Fassung: automatisch gesichert oder von Hand benannt. */
export interface Sicherung {
  id: number;
  titel: string | null;
  name: string | null;
  kommentar: string | null;
  fertig: number;
  stufe: Stufe | null;
  handisch: number;
  grund: string | null;
  erstellt_am: string;
  zeichen: number;
}

export interface Kunde {
  id: number;
  name: string;
  branche: string | null;
  hinweise: string | null;
  /** Wie der Kunde ohne Namen beschrieben wird. */
  anonym: string | null;
  lernmodus: number;
  sort: number;
  aktiv: number;
}

export interface Katalogeintrag {
  id: number;
  schluessel: string;
  rubrik: string;
  label: string;
  hinweis: string | null;
  pflicht: number;
  mehrfach: number;
  stufe_vorschlag: Stufe;
  sort: number;
  aktiv: number;
}

export interface StoryZeile {
  id: number;
  arbeitstitel: string;
  projektart_id: number | null;
  projektart: string | null;
  kunde_id: number | null;
  kunde_name: string | null;
  status: 'aktiv' | 'fertig' | 'archiv';
  autor: string | null;
  herkunft: 'interview' | 'import';
  quelle: string | null;
  kunde: string | null;
  branche: string | null;
  fakten_anzahl: number;
  nachrichten: number;
  fassungen: number;
  erstellt_am: string;
  geaendert_am: string;
}

export interface FassungZeile {
  id: number;
  story_id: number;
  ziel_id: number;
  titel: string | null;
  inhalt: string;
  handisch: number;
  fakten_stand: number;
  geaendert_am: string;
  ziel_name: string;
  ziel_schluessel: string | null;
  ziel_stufe: Stufe | null;
  veraltet: boolean;
}

/** Ein Ziel mit der Zahl der Fakten, die es sehen darf (kommt vom Server). */
export interface ZielMitFreigabe extends Ziel {
  freigegeben: number;
}

/** Eine Bitte um Mithilfe (E-23). */
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
  /** Nur in „Für mich angefragt": der Arbeitstitel der Geschichte. */
  arbeitstitel?: string;
}

/** Was eine Person nicht beantworten konnte - fuer andere bleibt es offen. */
export interface Uebersprungen {
  schluessel: string;
  person: string;
  person_name: string | null;
  grund: string | null;
  erstellt_am: string;
}

export interface StoryVoll {
  story: StoryZeile;
  verlauf: Nachricht[];
  fakten: Fakt[];
  fortschritt: Fortschritt;
  fassungen: FassungZeile[];
  ziele: ZielMitFreigabe[];
  katalog: Katalogeintrag[];
  projektarten: Projektart[];
  kunden: Kunde[];
  anfragen: Anfrage[];
  uebersprungen: Uebersprungen[];
  beteiligte: { name: string; fakten: number }[];
  /** Adressen, die schon einmal hier waren - Vorschlag beim Anfragen. */
  adressen: { email: string; name: string | null }[];
  mail_moeglich: boolean;
  /** Meine Kennung - um „von mir übersprungen" zu erkennen. */
  ich_kennung: string;
}

/** Wer arbeitet hier, und was darf er (E-19). */
export interface Ich {
  mehrbenutzer: boolean;
  anmeldungMoeglich: boolean;
  angemeldet: boolean;
  name: string | null;
  benutzername: string | null;
  email: string | null;
  rollen: string[];
  verwalter: boolean;
  verwalterRolle: string;
}

export interface Startdaten {
  storys: StoryZeile[];
  projektarten: Projektart[];
  kunden: Kunde[];
  ziele: Pick<Ziel, 'id' | 'schluessel' | 'name' | 'beschreibung' | 'stufe'>[];
  ki: { zugang: boolean; anbieter: string; modell: string };
  ich: Ich;
  betrieb: { mehrbenutzer: boolean; mail: boolean };
  /** Was andere von mir wollen (E-23). */
  anfragen: Anfrage[];
}

export interface Lernnotiz {
  id: number;
  bezug: 'ziel' | 'projektart' | 'kunde' | 'katalog';
  bezug_id: number | null;
  bezug_name: string | null;
  text: string;
  begruendung: string | null;
  story_titel: string | null;
  status: string;
  erstellt_am: string;
}

export interface Einstellung {
  schluessel: string;
  gesetzt: boolean;
  wert: string | null;
  geheim: boolean;
  geaendert_am: string | null;
}

export interface Verwaltungsdaten {
  ziele: Ziel[];
  projektarten: Projektart[];
  kunden: Kunde[];
  katalog: Katalogeintrag[];
  einstellungen: Einstellung[];
  ki: { zugang: boolean; anbieter: string; modell: string };
  lernnotizen: Lernnotiz[];
}

export class ApiFehler extends Error {
  status: number;
  constructor(text: string, status: number) {
    super(text);
    this.status = status;
    this.name = 'ApiFehler';
  }
}

/**
 * Nicht mehr angemeldet: zur Anmeldung schicken.
 *
 * An EINER Stelle, nicht in jedem Aufrufer. Eine abgelaufene Sitzung trifft
 * sonst irgendeinen Aufruf irgendwo, und der Nutzer sieht „Nicht angemeldet"
 * als Fehlermeldung statt einer Anmeldeseite.
 *
 * Der Rücksprung geht über `window.location`, nicht über fetch: Die
 * Anmeldeseite von Keycloak gehört ins Fenster, nicht in eine Antwort.
 */
function zurAnmeldung(ziel: string): never {
  window.location.href = ziel;
  // Der Aufrufer darf nicht weiterlaufen, während der Browser navigiert.
  throw new ApiFehler('Nicht angemeldet — Sie werden weitergeleitet.', 401);
}

async function ruf<T>(pfad: string, art = 'GET', koerper?: unknown): Promise<T> {
  const antwort = await fetch(`/api${pfad}`, {
    method: art,
    headers: koerper ? { 'Content-Type': 'application/json' } : undefined,
    body: koerper ? JSON.stringify(koerper) : undefined,
    // Das Sitzungscookie muss mit. Im Entwicklungsbetrieb läuft die
    // Oberfläche auf einem anderen Port als die API, und ohne diese Angabe
    // schickt der Browser kein Cookie.
    credentials: 'include',
  });
  const roh = await antwort.text();
  let daten: unknown = null;
  try {
    daten = roh ? JSON.parse(roh) : null;
  } catch {
    throw new ApiFehler(`Unlesbare Antwort des Servers (${antwort.status}).`, antwort.status);
  }
  if (!antwort.ok) {
    const d = daten as { fehler?: string; anmelden?: string } | null;
    if (antwort.status === 401 && d?.anmelden) zurAnmeldung(d.anmelden);
    const meldung = d?.fehler ?? `Der Server antwortete mit ${antwort.status}.`;
    throw new ApiFehler(meldung, antwort.status);
  }
  return daten as T;
}

export const api = {
  start: () => ruf<Startdaten>('/start'),
  ich: () => ruf<Ich>('/ich'),

  storyNeu: (e: {
    arbeitstitel: string;
    projektart_id?: number | null;
    kunde_id?: number | null;
    autor?: string | null;
  }) => ruf<StoryVoll & { id: number }>('/storys', 'POST', e),
  story: (id: number) => ruf<StoryVoll>(`/storys/${id}`),
  storyPatch: (id: number, e: Record<string, unknown>) =>
    ruf<{ story: StoryZeile }>(`/storys/${id}`, 'PATCH', e),
  storyWeg: (id: number) => ruf<{ ok: true }>(`/storys/${id}`, 'DELETE'),

  // --- Die KI-Aufrufe laufen als Ereignisstrom (Fortschritt sichtbar) ---

  interview: (id: number, text: string | undefined, fortgang?: Fortgang) =>
    strom<{
      frage: string; hinweis: string | null; luecken: string[]; reif: boolean;
      neue_fakten: number; fortschritt: Fortschritt;
      fakten: Fakt[]; verlauf: Nachricht[];
    }>(`/storys/${id}/interview`, { text }, fortgang),

  faktNeu: (id: number, e: Record<string, unknown>) =>
    ruf<{ fakten: Fakt[]; fortschritt: Fortschritt }>(`/storys/${id}/fakten`, 'POST', e),
  faktPatch: (faktId: number, storyId: number, e: Record<string, unknown>) =>
    ruf<{ fakten: Fakt[]; fortschritt: Fortschritt }>(
      `/fakten/${faktId}?story=${storyId}`, 'PATCH', e,
    ),
  faktWeg: (faktId: number, storyId: number) =>
    ruf<{ fakten: Fakt[]; fortschritt: Fortschritt }>(
      `/fakten/${faktId}?story=${storyId}`, 'DELETE',
    ),

  formulieren: (id: number, zielId: number, fortgang?: Fortgang) =>
    strom<{
      titel: string; inhalt: string; luecken: string[]; fassung_id: number;
      verwendete_fakten: number; ausgelassene_fakten: number; fassungen: FassungZeile[];
    }>(`/storys/${id}/fassung`, { ziel_id: zielId }, fortgang),
  fassungSpeichern: (id: number, zielId: number, e: { titel?: string | null; inhalt: string }) =>
    ruf<{ fassung: FassungZeile }>(`/storys/${id}/fassung/${zielId}`, 'PUT', e),
  fassungVerlauf: (id: number, zielId: number, nurFertige = false) =>
    ruf<{ fassung_id?: number; sicherungen: Sicherung[] }>(
      `/storys/${id}/fassung/${zielId}/verlauf${nurFertige ? '?fertig=1' : ''}`,
    ),
  versionSpeichern: (
    id: number, zielId: number,
    e: { name: string; kommentar?: string | null; fertig: boolean },
  ) => ruf<{ id: number; sicherungen: Sicherung[] }>(
    `/storys/${id}/fassung/${zielId}/version`, 'POST', e,
  ),
  fassungZurueck: (id: number, zielId: number, sicherungId: number) =>
    ruf<{ fassung: FassungZeile }>(
      `/storys/${id}/fassung/${zielId}/zurueck`, 'POST', { sicherung_id: sicherungId },
    ),

  importieren: (
    e: {
      text?: string; url?: string; arbeitstitel?: string;
      projektart_id?: number | null; kunde_id?: number | null;
    },
    fortgang?: Fortgang,
  ) =>
    strom<{ story_id: number; titel: string; fakten: number; luecken: string[] }>(
      '/import', e, fortgang,
    ),

  zerlegen: (id: number, fortgang?: Fortgang) =>
    strom<{
      frage: string;
      teilfragen: { frage: string; hinweis: string | null }[];
    }>(`/storys/${id}/zerlegen`, {}, fortgang),

  beispielantwort: (id: number, fortgang?: Fortgang) =>
    strom<{ antwort: string; geraten: string[] }>(
      `/storys/${id}/beispielantwort`, {}, fortgang,
    ),

  umformulieren: (text: string, auftrag: string, fortgang?: Fortgang) =>
    strom<{ text: string }>('/text/umformulieren', { text, auftrag }, fortgang),

  auswerten: (id: number, zielId?: number | null, fortgang?: Fortgang) =>
    strom<{ angelegt: number; uebersprungen: string | null }>(
      `/storys/${id}/auswerten`, { ziel_id: zielId }, fortgang,
    ),

  // ---------------------------------------------------------- Mitarbeit
  anfrageNeu: (
    id: number,
    e: { an_email: string; an_name?: string | null; hinweis?: string | null; mail?: boolean },
  ) => ruf<{
    anfrage: Anfrage; anfragen: Anfrage[]; link: string; mail_fehler: string | null;
  }>(`/storys/${id}/anfragen`, 'POST', e),

  anfrageBeenden: (id: number, status: 'erledigt' | 'abgelehnt') =>
    ruf<{ anfrage: Anfrage; anfragen: Anfrage[] }>(`/anfragen/${id}`, 'PATCH', { status }),

  ueberspringen: (id: number, schluessel: string, grund?: string | null) =>
    ruf<{ uebersprungen: Uebersprungen[]; fortschritt: Fortschritt }>(
      `/storys/${id}/ueberspringen`, 'POST', { schluessel, grund },
    ),

  frageWiederStellen: (id: number, schluessel: string) =>
    ruf<{ uebersprungen: Uebersprungen[] }>(
      `/storys/${id}/ueberspringen/${encodeURIComponent(schluessel)}`, 'DELETE',
    ),

  verwaltung: () => ruf<Verwaltungsdaten>('/verwaltung'),
  zielSpeichern: (e: Record<string, unknown>) =>
    ruf<{ id: number; ziele: Ziel[] }>('/verwaltung/ziele', 'PUT', e),
  projektartSpeichern: (e: Record<string, unknown>) =>
    ruf<{ id: number; projektarten: Projektart[] }>('/verwaltung/projektarten', 'PUT', e),
  kundeSpeichern: (e: Record<string, unknown>) =>
    ruf<{ id: number; kunden: Kunde[] }>('/verwaltung/kunden', 'PUT', e),
  katalogSpeichern: (e: Record<string, unknown>) =>
    ruf<{ katalog: Katalogeintrag[] }>('/verwaltung/katalog', 'PUT', e),
  einstellungenSetzen: (e: Record<string, unknown>) =>
    ruf<{ geaendert: number; einstellungen: Einstellung[]; ki: Verwaltungsdaten['ki'] }>(
      '/einstellungen', 'PUT', e,
    ),

  lernUebernehmen: (id: number) =>
    ruf<{ notizen: Lernnotiz[]; hinweis?: string }>(`/lernnotizen/${id}/uebernehmen`, 'POST', {}),
  lernVerwerfen: (id: number) =>
    ruf<{ notizen: Lernnotiz[] }>(`/lernnotizen/${id}/verwerfen`, 'POST', {}),
};

export const STUFEN: { wert: Stufe; name: string; erklaerung: string }[] = [
  { wert: 'oeffentlich', name: 'öffentlich', erklaerung: 'darf auf die Website' },
  { wert: 'intern', name: 'intern', erklaerung: 'nur für interne Unterlagen' },
  { wert: 'vertraulich', name: 'vertraulich', erklaerung: 'auch intern nur eingeschränkt' },
];

export const stufenName = (s: Stufe) => STUFEN.find((x) => x.wert === s)?.name ?? s;

/** Deutsches Datum aus dem SQLite-Zeitstempel. */
export function datum(s: string | null): string {
  if (!s) return '';
  const d = new Date(s.replace(' ', 'T') + (s.includes('Z') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
