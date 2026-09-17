// Das Interview: links die Entwicklung, Reiter „Gespräch".
import { useEffect, useRef, useState } from 'react';
import type { Fakt, Nachricht } from '../lib/api.ts';
import { Denkt, StufenKnopf } from './teile.tsx';

export function Gespraech(
  { verlauf, fakten, laeuft, kiZugang, senden, reif, beginnen }:
  {
    verlauf: Nachricht[];
    fakten: Fakt[];
    laeuft: boolean;
    kiZugang: boolean;
    senden: (text: string) => void;
    reif: boolean;
    beginnen: () => void;
  },
) {
  const [text, setText] = useState('');
  const ende = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ende.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [verlauf.length, laeuft]);

  const ab = () => {
    const t = text.trim();
    if (!t || laeuft) return;
    setText('');
    senden(t);
  };

  /**
   * Welche Fakten hat der Assistent nach einer Nachricht notiert?
   *
   * Zugeordnet über den Zeitstempel: alles, was zwischen der Nutzerantwort
   * und der folgenden Assistentenfrage entstanden ist. Nicht exakt, aber
   * ohne eine zusätzliche Spalte - und für die Anzeige „das habe ich mir
   * notiert" genau genug.
   */
  const notiertNach = (n: Nachricht, naechste?: Nachricht): Fakt[] => {
    if (n.rolle !== 'nutzer') return [];
    return fakten.filter((f) => f.erstellt_am >= n.erstellt_am
      && (!naechste || f.erstellt_am <= naechste.erstellt_am));
  };

  return (
    <>
      <div className="gespraech">
        {verlauf.length === 0 && (
          <div className="leer">
            Noch kein Gespräch.
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className="knopf haupt"
                onClick={beginnen}
                disabled={laeuft || !kiZugang}
              >
                Interview beginnen
              </button>
            </div>
            {!kiZugang && (
              <p className="hinweis" style={{ marginTop: 10 }}>
                Ohne KI-Zugang lassen sich Fakten nur von Hand eintragen — im Reiter
                „Fakten".
              </p>
            )}
          </div>
        )}

        {verlauf.map((n, i) => {
          const notiert = notiertNach(n, verlauf[i + 1]);
          return (
            <div key={n.id} className={`rede ${n.rolle}`}>
              <div className="wer">
                {n.rolle === 'assistent' ? '◆' : n.rolle === 'nutzer' ? 'Sie' : '·'}
              </div>
              <div className="was">
                {n.text}
                {notiert.length > 0 && (
                  <div className="notiert">
                    <em>notiert:</em>
                    {notiert.map((f) => (
                      <StufenKnopf key={f.id} stufe={f.stufe} />
                    ))}
                    <em>
                      {notiert.length === 1 ? '1 Fakt' : `${notiert.length} Fakten`}
                    </em>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {laeuft && (
          <div className="rede assistent">
            <div className="wer">◆</div>
            <div className="was" style={{ borderLeftColor: 'var(--muted-2)' }}>
              <Denkt text="hört zu, notiert und überlegt die nächste Frage …" />
            </div>
          </div>
        )}
        <div ref={ende} />
      </div>

      <div className="antwortfeld">
        {reif && !laeuft && (
          <p className="hinweis" style={{ marginBottom: 8, color: 'var(--accent-2)' }}>
            Der Bestand reicht für eine Fassung. Rechts ein Ziel wählen und formulieren
            lassen — weiterreden geht danach immer noch.
          </p>
        )}
        <div className="reihe">
          <textarea
            className="feld"
            value={text}
            placeholder={verlauf.length
              ? 'Antwort eingeben. Stichpunkte genügen.'
              : 'Oder direkt hier anfangen zu erzählen.'}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                ab();
              }
            }}
            disabled={laeuft || !kiZugang}
          />
          <button
            type="button"
            className="knopf haupt"
            onClick={ab}
            disabled={!text.trim() || laeuft || !kiZugang}
          >
            Senden
          </button>
        </div>
        <div className="unten">
          <span>Strg + Enter sendet</span>
          <span>{text.length > 0 ? `${text.length} Zeichen` : ''}</span>
        </div>
      </div>
    </>
  );
}
