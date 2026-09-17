// Fortschritt sichtbar machen, während die KI arbeitet.
//
// Gemessen am 17.09.2026: Ein Import dauert 87 Sekunden, eine Formulierung
// 61, ein Interviewschritt 10 bis 13. In dieser Zeit sagt ein ausgegrauter
// Knopf nur „irgendwas passiert" — nicht, ob es noch lebt, wie weit es ist
// oder ob man besser abbricht.
//
// Deshalb ein Ereignisstrom (Server-Sent Events): Der Server meldet, in
// welchem Schritt er ist, und während das Modell denkt, kommen dessen eigene
// Zwischenüberlegungen durch. Das sind echte Meldungen — kein
// Fortschrittsbalken, der eine Zeit rät, die niemand kennt.
//
// Übernommen aus der BITS Machine (E-02), dort für den KI-Assistenten gebaut.
import type { ServerResponse } from 'node:http';

export type MeldeArt = 'schritt' | 'denkt' | 'ausgabe' | 'fertig' | 'fehler';

export interface Melder {
  /** Ein Arbeitsschritt beginnt. */
  schritt(text: string, zusatz?: Record<string, unknown>): void;
  /** Das Modell überlegt — Text aus seinen Zwischenschritten. */
  denkt(text: string): void;
  /** Wie viel Antwort schon da ist (Zeichen). */
  ausgabe(zeichen: number): void;
}

/** Ein Melder, der nichts tut - für Aufrufe ohne offenen Strom. */
export const STILL: Melder = {
  schritt: () => {},
  denkt: () => {},
  ausgabe: () => {},
};

/**
 * Einen Ereignisstrom eröffnen.
 *
 * `X-Accel-Buffering: no` und das sofortige `flushHeaders()` sind nötig, weil
 * sonst irgendeine Schicht dazwischen puffert und alle Meldungen erst am Ende
 * ankommen — dann hätte man sich die Mühe sparen können.
 */
export function stromOeffnen(res: ServerResponse) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });
  res.flushHeaders?.();

  const senden = (art: MeldeArt, daten: unknown) => {
    if (res.writableEnded) return;
    res.write(`event: ${art}\ndata: ${JSON.stringify(daten)}\n\n`);
  };

  // Ein Lebenszeichen alle zehn Sekunden. Ohne das schließen Zwischenstellen
  // eine still daliegende Verbindung — mitten in einem laufenden Modellaufruf.
  const puls = setInterval(() => {
    if (!res.writableEnded) res.write(': puls\n\n');
  }, 10_000);
  puls.unref?.();

  const beginn = Date.now();

  const melder: Melder = {
    schritt: (text, zusatz) =>
      senden('schritt', { text, seit: Date.now() - beginn, ...zusatz }),
    denkt: (text) => senden('denkt', { text }),
    ausgabe: (zeichen) => senden('ausgabe', { zeichen }),
  };

  return {
    melder,
    fertig(daten: unknown) {
      clearInterval(puls);
      senden('fertig', daten);
      res.end();
    },
    fehler(meldung: string) {
      clearInterval(puls);
      senden('fehler', { meldung });
      res.end();
    },
  };
}
