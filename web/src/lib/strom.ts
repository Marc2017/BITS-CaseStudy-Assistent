// Einen Ereignisstrom des Servers lesen.
//
// Nicht `EventSource`: Das kann nur GET, und alle KI-Aufrufe sind POST mit
// Körper. Also `fetch` und das SSE-Format selbst zerlegen — es ist einfach
// genug: Blöcke durch eine Leerzeile getrennt, darin `event:` und `data:`.

export interface Fortgang {
  /** Arbeitsschritt des Servers. */
  schritt?: (text: string, seit: number) => void;
  /** Ein Gedanke des Modells. */
  denkt?: (text: string) => void;
  /** Wie viele Zeichen Antwort bisher da sind. */
  ausgabe?: (zeichen: number) => void;
}

export class StromFehler extends Error {}

/**
 * Einen Strom-Endpunkt aufrufen und den Fortschritt melden.
 *
 * Löst mit den Daten des `fertig`-Ereignisses auf, oder wirft mit der Meldung
 * aus `fehler`. Bricht die Verbindung ab, ohne dass eines von beiden kam, ist
 * das auch ein Fehler — sonst wartet die Oberfläche ewig auf ein Ergebnis,
 * das nie kommt.
 */
export async function strom<T>(
  pfad: string, koerper: unknown, fortgang: Fortgang = {}, abbruch?: AbortSignal,
): Promise<T> {
  const antwort = await fetch(`/api${pfad}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(koerper ?? {}),
    signal: abbruch,
    // Wie in api.ts: ohne das Cookie ist der Aufruf nicht angemeldet.
    credentials: 'include',
  });

  // Der Server kann auch vor dem Strom scheitern (kein Endpunkt, kaputtes
  // JSON, abgelaufene Sitzung).
  if (!antwort.ok || !antwort.body) {
    let meldung = `Der Server antwortete mit ${antwort.status}.`;
    try {
      const d = await antwort.json() as { fehler?: string; anmelden?: string };
      if (antwort.status === 401 && d?.anmelden) {
        window.location.href = d.anmelden;
        throw new StromFehler('Nicht angemeldet — Sie werden weitergeleitet.');
      }
      if (d?.fehler) meldung = d.fehler;
    } catch (e) {
      if (e instanceof StromFehler) throw e;
      // Keine JSON-Antwort - dann bleibt die Statusmeldung.
    }
    throw new StromFehler(meldung);
  }

  const leser = antwort.body.getReader();
  const zerleger = new TextDecoder();
  let puffer = '';
  let ergebnis: T | undefined;
  let fertig = false;

  const block = (roh: string) => {
    let art = 'message';
    const datenZeilen: string[] = [];
    for (const zeile of roh.split('\n')) {
      if (zeile.startsWith(':')) continue;               // Puls
      if (zeile.startsWith('event:')) art = zeile.slice(6).trim();
      else if (zeile.startsWith('data:')) datenZeilen.push(zeile.slice(5).trim());
    }
    if (!datenZeilen.length) return;
    let daten: Record<string, unknown>;
    try {
      daten = JSON.parse(datenZeilen.join('\n'));
    } catch {
      return;
    }
    if (art === 'schritt') {
      fortgang.schritt?.(String(daten.text ?? ''), Number(daten.seit ?? 0));
    } else if (art === 'denkt') {
      fortgang.denkt?.(String(daten.text ?? ''));
    } else if (art === 'ausgabe') {
      fortgang.ausgabe?.(Number(daten.zeichen ?? 0));
    } else if (art === 'fertig') {
      ergebnis = daten as T;
      fertig = true;
    } else if (art === 'fehler') {
      throw new StromFehler(String(daten.meldung ?? 'Unbekannter Fehler.'));
    }
  };

  for (;;) {
    const { done, value } = await leser.read();
    if (done) break;
    puffer += zerleger.decode(value, { stream: true });
    // Blöcke sind durch eine Leerzeile getrennt; der Rest bleibt im Puffer.
    const teile = puffer.split(/\r?\n\r?\n/);
    puffer = teile.pop() ?? '';
    for (const t of teile) block(t);
    if (fertig) break;
  }
  if (puffer.trim()) block(puffer);

  if (!fertig || ergebnis === undefined) {
    throw new StromFehler(
      'Die Verbindung brach ab, ohne ein Ergebnis zu liefern. '
      + 'Läuft der Server noch?',
    );
  }
  return ergebnis;
}
