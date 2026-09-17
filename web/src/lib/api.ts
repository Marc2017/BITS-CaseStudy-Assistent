// Zugriff auf die API. Eine Stelle, ein Fehlerweg.
//
// Der Server antwortet auf jeden Fehler mit { fehler: "..." } und einem
// Statuscode. Hier wird daraus eine Ausnahme mit lesbarem Text - die
// Oberflaeche zeigt sie unveraendert an, statt "Fehler beim Laden".

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
  gesamt: number;
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

export interface StoryVoll {
  story: StoryZeile;
  verlauf: Nachricht[];
  fakten: Fakt[];
  fortschritt: Fortschritt;
  fassungen: FassungZeile[];
  ziele: Ziel[];
  katalog: Katalogeintrag[];
  projektarten: Projektart[];
}

export interface Startdaten {
  storys: StoryZeile[];
  projektarten: Projektart[];
  ziele: Pick<Ziel, 'id' | 'schluessel' | 'name' | 'beschreibung' | 'stufe'>[];
  ki: { zugang: boolean; anbieter: string; modell: string };
  ich: string | null;
}

export interface Lernnotiz {
  id: number;
  bezug: 'ziel' | 'projektart' | 'katalog';
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

async function ruf<T>(pfad: string, art = 'GET', koerper?: unknown): Promise<T> {
  const antwort = await fetch(`/api${pfad}`, {
    method: art,
    headers: koerper ? { 'Content-Type': 'application/json' } : undefined,
    body: koerper ? JSON.stringify(koerper) : undefined,
  });
  const roh = await antwort.text();
  let daten: unknown = null;
  try {
    daten = roh ? JSON.parse(roh) : null;
  } catch {
    throw new ApiFehler(`Unlesbare Antwort des Servers (${antwort.status}).`, antwort.status);
  }
  if (!antwort.ok) {
    const meldung = (daten as { fehler?: string } | null)?.fehler
      ?? `Der Server antwortete mit ${antwort.status}.`;
    throw new ApiFehler(meldung, antwort.status);
  }
  return daten as T;
}

export const api = {
  start: () => ruf<Startdaten>('/start'),

  storyNeu: (e: { arbeitstitel: string; projektart_id?: number | null; autor?: string | null }) =>
    ruf<StoryVoll & { id: number }>('/storys', 'POST', e),
  story: (id: number) => ruf<StoryVoll>(`/storys/${id}`),
  storyPatch: (id: number, e: Record<string, unknown>) =>
    ruf<{ story: StoryZeile }>(`/storys/${id}`, 'PATCH', e),
  storyWeg: (id: number) => ruf<{ ok: true }>(`/storys/${id}`, 'DELETE'),

  interview: (id: number, text?: string) =>
    ruf<{
      frage: string; hinweis: string | null; luecken: string[]; reif: boolean;
      neue_fakten: number; fortschritt: Fortschritt;
      fakten: Fakt[]; verlauf: Nachricht[];
    }>(`/storys/${id}/interview`, 'POST', { text }),

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

  formulieren: (id: number, zielId: number) =>
    ruf<{
      titel: string; inhalt: string; luecken: string[]; fassung_id: number;
      verwendete_fakten: number; ausgelassene_fakten: number; fassungen: FassungZeile[];
    }>(`/storys/${id}/fassung`, 'POST', { ziel_id: zielId }),
  fassungSpeichern: (id: number, zielId: number, e: { titel?: string | null; inhalt: string }) =>
    ruf<{ fassung: FassungZeile }>(`/storys/${id}/fassung/${zielId}`, 'PUT', e),
  fassungVerlauf: (id: number, zielId: number) =>
    ruf<{ fassung_id?: number; sicherungen: { id: number; grund: string; erstellt_am: string; zeichen: number; handisch: number }[] }>(
      `/storys/${id}/fassung/${zielId}/verlauf`,
    ),
  fassungZurueck: (id: number, zielId: number, sicherungId: number) =>
    ruf<{ fassung: FassungZeile }>(
      `/storys/${id}/fassung/${zielId}/zurueck`, 'POST', { sicherung_id: sicherungId },
    ),

  importieren: (e: { text?: string; url?: string; arbeitstitel?: string; projektart_id?: number | null }) =>
    ruf<{ story_id: number; titel: string; fakten: number; luecken: string[] }>(
      '/import', 'POST', e,
    ),

  umformulieren: (text: string, auftrag: string) =>
    ruf<{ text: string }>('/text/umformulieren', 'POST', { text, auftrag }),

  auswerten: (id: number, zielId?: number | null) =>
    ruf<{ angelegt: number; uebersprungen: string | null }>(
      `/storys/${id}/auswerten`, 'POST', { ziel_id: zielId },
    ),

  verwaltung: () => ruf<Verwaltungsdaten>('/verwaltung'),
  zielSpeichern: (e: Record<string, unknown>) =>
    ruf<{ id: number; ziele: Ziel[] }>('/verwaltung/ziele', 'PUT', e),
  projektartSpeichern: (e: Record<string, unknown>) =>
    ruf<{ id: number; projektarten: Projektart[] }>('/verwaltung/projektarten', 'PUT', e),
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
