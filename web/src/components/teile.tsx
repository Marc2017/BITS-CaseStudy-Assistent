// Kleine Bausteine, die mehrere Ansichten teilen.
import { useEffect, type ReactNode } from 'react';
import { STUFEN, stufenName, type Fortschritt, type Stufe } from '../lib/api.ts';

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
        {voll}/{stand.pflicht} Pflichtfakten · {stand.gesamt} gesamt
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
