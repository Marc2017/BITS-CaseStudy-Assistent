// Kleine Bausteine, die mehrere Ansichten teilen.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  STUFEN, stufenName, type Fortgang, type Fortschritt, type Stufe,
} from '../lib/api.ts';

export type Thema = 'light' | 'dark';

const THEMA_SPEICHER = 'bits-thema';

/** Was gerade gilt - gesetzt vom Skript in `index.html`. */
function themaJetzt(): Thema {
  return document.documentElement.getAttribute('data-theme') === 'dark'
    ? 'dark' : 'light';
}

/**
 * Umschalter fuer hell und dunkel.
 *
 * Die Wahl gilt **pro Person und Gerät**: Sie liegt in `localStorage`, nicht
 * in der Datenbank. Zwei Kollegen am selben Werkzeug duerfen
 * unterschiedlich sehen wollen, und ein Thema ist keine Angabe, die eine
 * Sicherung oder eine Migration wert ist.
 *
 * Der Startwert kommt aus der Systemeinstellung (siehe `index.html`); erst
 * ein Klick hier schreibt eine eigene Wahl fest.
 */
export function ThemaKnopf() {
  const [thema, setThema] = useState<Thema>(themaJetzt);

  const wechseln = () => {
    const neu: Thema = thema === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', neu);
    setThema(neu);
    try {
      localStorage.setItem(THEMA_SPEICHER, neu);
    } catch {
      // Privates Fenster oder gesperrte Website-Daten: Die Umschaltung
      // wirkt trotzdem, sie ueberlebt nur das Neuladen nicht.
    }
  };

  const hin = thema === 'dark' ? 'Helles Thema' : 'Dunkles Thema';
  return (
    <button type="button" className="thema" onClick={wechseln} title={hin} aria-label={hin}>
      {thema === 'dark' ? <Sonne /> : <Mond />}
    </button>
  );
}

/* Als Pfade, nicht als Zeichen: Die Unicode-Symbole fuer Sonne und Mond
 * (U+2600, U+263E) rendern je nach Schrift als dünner Strich - der Mond sah
 * in der Kopfzeile wie ein „C" aus. */
function Mond() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M6.6 1.4a6.6 6.6 0 1 0 8 8.1 5.3 5.3 0 0 1-8-8.1Z"
      />
    </svg>
  );
}

function Sonne() {
  return (
    <svg
      viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
    >
      <circle cx="8" cy="8" r="3.1" />
      <path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3.1 3.1l1.1 1.1M11.8 11.8l1.1 1.1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1" />
    </svg>
  );
}

/**
 * Die Faktenspur: eine Marke je Pflichtfakt.
 *
 * Statt eines Prozentbalkens, der nur eine Zahl zeigt. Frisch gefuellte
 * Marken leuchten einmal auf - der Moment, in dem sichtbar wird, dass aus
 * Reden Fakten geworden sind.
 */
export function Spur({ stand, neu = 0 }: { stand: Fortschritt; neu?: number }) {
  const gesamt = Math.max(stand.pflicht, 1);
  const voll = stand.pflichtErfuellt;
  const marken = Array.from({ length: gesamt }, (_, i) => {
    const gefuellt = i < voll;
    const frisch = gefuellt && i >= voll - neu;
    return <i key={i} className={`m${gefuellt ? ' voll' : ''}${frisch ? ' neu' : ''}`} />;
  });
  const titel = stand.offen.length
    ? `Es fehlen noch: ${stand.offen.map((o) => o.label).join(', ')}`
    : 'Alle Pflichtfakten liegen vor.';
  return (
    <div className="spur" title={titel}>
      <div className="marken">{marken}</div>
      <span className="zahl">
        {voll}/{stand.pflicht} Pflichtfakten · {stand.gesamt} Fakten in{' '}
        {stand.arten} Rubriken
      </span>
    </div>
  );
}

export function StufenKnopf(
  { stufe, aendern }: { stufe: Stufe; aendern?: (s: Stufe) => void },
) {
  const naechste = () => {
    const i = STUFEN.findIndex((s) => s.wert === stufe);
    aendern?.(STUFEN[(i + 1) % STUFEN.length].wert);
  };
  return (
    <button
      type="button"
      className={`stufe ${stufe}`}
      onClick={aendern ? naechste : undefined}
      title={aendern
        ? `${stufenName(stufe)} — klicken für die nächste Stufe`
        : stufenName(stufe)}
      disabled={!aendern}
    >
      {stufenName(stufe)}
    </button>
  );
}

export function Fehlerbalken({ text, weg }: { text: string | null; weg?: () => void }) {
  if (!text) return null;
  return (
    <div className="fehler" role="alert">
      {text}
      {weg && (
        <button type="button" className="knopf leise" style={{ float: 'right' }} onClick={weg}>
          ausblenden
        </button>
      )}
    </div>
  );
}

export function Denkt({ text }: { text: string }) {
  return (
    <span className="denkt">
      <i />
      {text}
    </span>
  );
}

export function Kasten(
  { titel, zu, kinder, fuss, breit }:
  { titel: string; zu: () => void; kinder: ReactNode; fuss?: ReactNode; breit?: boolean },
) {
  useEffect(() => {
    const taste = (e: KeyboardEvent) => { if (e.key === 'Escape') zu(); };
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  }, [zu]);

  return (
    <div className="decke" onMouseDown={(e) => { if (e.target === e.currentTarget) zu(); }}>
      <div className={`kasten${breit ? ' breit' : ''}`} role="dialog" aria-label={titel}>
        <header>
          <h2>{titel}</h2>
          <button type="button" className="knopf leise" onClick={zu} aria-label="Schließen">
            ✕
          </button>
        </header>
        <div className="inhalt">{kinder}</div>
        {fuss && <footer>{fuss}</footer>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ Arbeitsanzeige

export interface FortgangStand {
  schritt: { text: string; seit: number } | null;
  gedanken: string[];
  zeichen: number;
}

/**
 * Den Fortschritt eines KI-Aufrufs mitschreiben.
 *
 * Gemessen dauert ein Import 87 Sekunden, eine Formulierung 61. Ohne diese
 * Meldungen sagt die Oberflaeche in dieser Zeit nichts - und der Nutzer weiss
 * nicht, ob es noch lebt.
 */
export function useFortgang() {
  const [stand, setStand] = useState<FortgangStand>({
    schritt: null, gedanken: [], zeichen: 0,
  });

  // Der Fortgang darf sich nicht bei jeder Meldung neu bilden, sonst
  // registriert der Aufruf mitten im Lauf einen neuen Empfaenger.
  const fortgang = useMemo<Fortgang>(() => ({
    schritt: (text, seit) => setStand((s) => ({ ...s, schritt: { text, seit } })),
    // Nur die letzten Gedanken behalten - es kommen viele, und alte
    // interessieren nicht mehr.
    denkt: (text) => setStand((s) => ({ ...s, gedanken: [...s.gedanken.slice(-5), text] })),
    ausgabe: (zeichen) => setStand((s) => ({ ...s, zeichen })),
  }), []);

  const zuruecksetzen = useCallback(
    () => setStand({ schritt: null, gedanken: [], zeichen: 0 }),
    [],
  );

  return { stand, fortgang, zuruecksetzen };
}

/**
 * Was die KI gerade tut.
 *
 * Die Gedanken stehen klein und gedaempft darunter: interessant, aber nicht
 * das Wichtigste auf dem Schirm. Sie ersetzen sich, statt eine Liste
 * aufzubauen, die niemand liest.
 */
export function Arbeitsanzeige(
  { stand, text, hell }: { stand: FortgangStand; text: string; hell?: boolean },
) {
  const sekunden = stand.schritt ? Math.round(stand.schritt.seit / 1000) : 0;
  return (
    <div className={`arbeit${hell ? ' hell' : ''}`}>
      <div className="kopfzeile">
        <Denkt text={text} />
        {sekunden > 0 && <span className="dauer">{sekunden} s</span>}
      </div>
      {stand.schritt && <div className="schritt">{stand.schritt.text}</div>}
      {stand.gedanken.length > 0 && (
        <div className="gedanken">
          {stand.gedanken.slice(-3).map((g, i) => (
            // Der Index genuegt als Schluessel: Die Liste ist ein rollendes
            // Fenster, keine Menge mit Identitaet.
            // eslint-disable-next-line react/no-array-index-key
            <div key={i}>{g}</div>
          ))}
        </div>
      )}
      {stand.zeichen > 0 && (
        <div className="schritt">{stand.zeichen.toLocaleString('de-DE')} Zeichen geschrieben</div>
      )}
    </div>
  );
}
