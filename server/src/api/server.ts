// HTTP-Server: JSON-API unter /api/* und das gebaute Frontend als statische
// Dateien. Kein Framework, node:http genuegt (E-02).
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { datenbank } from '../db/index.ts';
import * as r from './routen.ts';
import { fehlerText } from '../ki/anbieter.ts';

const hier = dirname(fileURLToPath(import.meta.url));
const WEB_DIST = join(hier, '..', '..', '..', 'web', 'dist');
const PORT = Number(process.env.PORT ?? 4700);

type Handler = (k: r.Kontext) => unknown;
interface Route { methode: string; muster: string[]; handler: Handler; strom?: boolean }

const routen: Route[] = [];
const fuege = (methode: string, pfad: string, handler: Handler) =>
  routen.push({ methode, muster: pfad.split('/').filter(Boolean), handler });

/**
 * Eine Route, die selbst antwortet (Ereignisstrom).
 *
 * Der Server darf hier nicht sein uebliches JSON hinterherschicken - der
 * Handler hat den Kopf schon geschrieben.
 */
const fuegeStrom = (methode: string, pfad: string, handler: Handler) =>
  routen.push({ methode, muster: pfad.split('/').filter(Boolean), handler, strom: true });

// ------------------------------------------------------------------- Routen
fuege('GET',    '/api/start',                        r.start);

fuege('GET',    '/api/storys',                       r.storyListe);
fuege('POST',   '/api/storys',                       r.storyNeu);
fuege('GET',    '/api/storys/:id',                   r.storyVoll);
fuege('PATCH',  '/api/storys/:id',                   r.storyPatch);
fuege('DELETE', '/api/storys/:id',                   r.storyWeg);

fuegeStrom('POST', '/api/storys/:id/interview',         r.interview);
fuege('POST',   '/api/storys/:id/notiz',             r.notiz);
fuegeStrom('POST', '/api/storys/:id/zerlegen',        r.frageZerlegen);
fuegeStrom('POST', '/api/storys/:id/beispielantwort', r.frageBeispiel);

fuege('POST',   '/api/storys/:id/fakten',            r.faktNeu);
fuege('PATCH',  '/api/fakten/:id',                   r.faktPatch);
fuege('DELETE', '/api/fakten/:id',                   r.faktWeg);

fuegeStrom('POST', '/api/storys/:id/fassung',           r.fassungFormulieren);
fuege('PUT',    '/api/storys/:id/fassung/:ziel',     r.fassungHand);
fuege('GET',    '/api/storys/:id/fassung/:ziel/verlauf', r.fassungVerlauf);
fuege('POST',   '/api/storys/:id/fassung/:ziel/zurueck', r.fassungZurueck);
fuege('POST',   '/api/storys/:id/fassung/:ziel/version', r.versionSpeichern);

fuegeStrom('POST', '/api/import',                       r.importieren_);
fuegeStrom('POST', '/api/text/umformulieren',           r.umformulieren);

fuegeStrom('POST', '/api/storys/:id/auswerten',         r.lernenAuswerten);
fuege('GET',    '/api/lernnotizen',                  r.lernListe);
fuege('POST',   '/api/lernnotizen/:id/uebernehmen',  r.lernUebernehmen);
fuege('POST',   '/api/lernnotizen/:id/verwerfen',    r.lernVerwerfen);

fuege('GET',    '/api/verwaltung',                   r.verwaltung);
fuege('PUT',    '/api/verwaltung/ziele',             r.zielSpeichern_);
fuege('GET',    '/api/verwaltung/ziele/:id',         r.zielStruktur);
fuege('PUT',    '/api/verwaltung/projektarten',      r.projektartSpeichern_);
fuege('PUT',    '/api/verwaltung/kunden',            r.kundeSpeichern_);
fuege('PUT',    '/api/verwaltung/katalog',           r.katalogSpeichern);
fuege('GET',    '/api/einstellungen',                r.einstellungenLesen);
fuege('PUT',    '/api/einstellungen',                r.einstellungenSetzen);

// ------------------------------------------------------------------- Helfer

function passt(muster: string[], teile: string[]): Record<string, string> | null {
  if (muster.length !== teile.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < muster.length; i += 1) {
    const m = muster[i];
    if (m.startsWith(':')) params[m.slice(1)] = decodeURIComponent(teile[i]);
    else if (m !== teile[i]) return null;
  }
  return params;
}

async function koerper(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (req.method === 'GET' || req.method === 'DELETE') return {};
  const stuecke: Buffer[] = [];
  for await (const s of req) stuecke.push(s as Buffer);
  if (!stuecke.length) return {};
  const roh = Buffer.concat(stuecke).toString('utf8');
  if (!roh.trim()) return {};
  try {
    const d = JSON.parse(roh);
    return (d && typeof d === 'object') ? d as Record<string, unknown> : {};
  } catch {
    throw new r.Fehlerhaft('Der Anfragekörper ist kein gültiges JSON.');
  }
}

const TYPEN: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/** Das gebaute Frontend ausliefern; unbekannte Pfade bekommen die index.html. */
async function statisch(pfad: string, res: ServerResponse): Promise<void> {
  const sicher = normalize(pfad).replace(/^(\.\.[/\\])+/, '');
  let datei = join(WEB_DIST, sicher === '/' ? 'index.html' : sicher);
  try {
    const s = await stat(datei);
    if (s.isDirectory()) datei = join(datei, 'index.html');
  } catch {
    datei = join(WEB_DIST, 'index.html');
  }
  try {
    const inhalt = await readFile(datei);
    res.writeHead(200, { 'Content-Type': TYPEN[extname(datei)] ?? 'application/octet-stream' });
    res.end(inhalt);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(
      'Das Frontend ist nicht gebaut. Im Entwicklungsbetrieb läuft es unter\n'
      + 'http://localhost:5273 (npm run web); für den Einzelbetrieb erst\n'
      + '"npm run build" ausführen.\n',
    );
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  // Der Entwicklungsserver von Vite laeuft auf einem anderen Port.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (!url.pathname.startsWith('/api/')) {
    await statisch(url.pathname, res);
    return;
  }

  const teile = url.pathname.split('/').filter(Boolean);
  for (const route of routen) {
    if (route.methode !== req.method) continue;
    const params = passt(route.muster, teile);
    if (!params) continue;
    try {
      const body = await koerper(req);
      const daten = await route.handler({
        params, query: url.searchParams, body, antwort: res,
      });
      // Strom-Routen haben selbst geantwortet.
      if (route.strom) return;
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(daten ?? { ok: true }));
    } catch (e) {
      const status = e instanceof r.Fehlerhaft ? 400 : 500;
      const meldung = fehlerText(e);
      if (status === 500) console.error('Fehler:', e);
      // Steht der Kopf schon (Strom), laesst sich kein Status mehr setzen -
      // dann nur noch die Verbindung schliessen.
      if (res.headersSent) {
        if (!res.writableEnded) {
          res.write(`event: fehler\ndata: ${JSON.stringify({ meldung })}\n\n`);
          res.end();
        }
        return;
      }
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ fehler: meldung }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ fehler: `Kein Endpunkt für ${req.method} ${url.pathname}.` }));
});

datenbank();
server.listen(PORT, () => {
  console.log(`BITS Erfolgsgeschichte-Assistent auf http://localhost:${PORT}`);
  console.log('  Entwicklungsbetrieb: npm run dev (Backend + Vite)');
});
