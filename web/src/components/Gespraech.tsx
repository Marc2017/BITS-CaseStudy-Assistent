// Das Interview: links die Entwicklung, Reiter „Gespräch".
//
// Zwei Hilfen senken die Eingabehürde (E-15):
//   - „Eins nach dem anderen" zerlegt die letzte Frage in Teilfragen, die
//     einzeln beantwortet und als EINE Antwort gesendet werden.
//   - „Antwort vorschlagen" entwirft eine wahrscheinliche Antwort. Sie landet
//     im Eingabefeld, nicht im Gespräch: Der Vorschlag rät an den Stellen, die
//     er in eckige Klammern setzt, und Geratenes darf nicht ungeprüft als Fakt
//     in den Bestand wandern.
import { useEffect, useRef, useState } from 'react';
import { api, type Fakt, type Nachricht } from '../lib/api.ts';
import {
  Arbeitsanzeige, StufenKnopf, useFortgang, type FortgangStand,
} from './teile.tsx';

interface Teilfrage {
  frage: string;
  hinweis: string | null;
}

export function Gespraech(
  { storyId, verlauf, fakten, laeuft, kiZugang, senden, reif, beginnen, stand, fehler }:
  {
    storyId: number;
    verlauf: Nachricht[];
    fakten: Fakt[];
    laeuft: boolean;
    kiZugang: boolean;
    senden: (text: string) => void;
    reif: boolean;
    beginnen: () => void;
    stand: FortgangStand;
    fehler: (t: string) => void;
  },
) {
  const [text, setText] = useState('');
  const [teilfragen, setTeilfragen] = useState<Teilfrage[] | null>(null);
  const [teilantworten, setTeilantworten] = useState<string[]>([]);
  const [geraten, setGeraten] = useState<string[]>([]);
  const [hilfeLaeuft, setHilfeLaeuft] = useState<null | 'zerlegen' | 'beispiel'>(null);
  const { stand: hilfeStand, fortgang, zuruecksetzen } = useFortgang();
  const ende = useRef<HTMLDivElement>(null);
  const eingabe = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ende.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [verlauf.length, laeuft, teilfragen]);

  // Eine neue Frage macht die Hilfen der alten ungültig.
  const letzteId = verlauf.length ? verlauf[verlauf.length - 1].id : 0;
  useEffect(() => {
    setTeilfragen(null);
    setTeilantworten([]);
    setGeraten([]);
  }, [letzteId]);

  const ab = (inhalt?: string) => {
    const t = (inhalt ?? text).trim();
    if (!t || laeuft) return;
    setText('');
    setTeilfragen(null);
    setGeraten([]);
    senden(t);
  };

  const zerlegen = async () => {
    setHilfeLaeuft('zerlegen');
    zuruecksetzen();
    try {
      const r = await api.zerlegen(storyId, fortgang);
      setTeilfragen(r.teilfragen);
      setTeilantworten(r.teilfragen.map(() => ''));
    } catch (e) {
      fehler(e instanceof Error ? e.message : String(e));
    } finally {
      setHilfeLaeuft(null);
    }
  };

  const vorschlagen = async () => {
    setHilfeLaeuft('beispiel');
    zuruecksetzen();
    try {
      const r = await api.beispielantwort(storyId, fortgang);
      setText(r.antwort);
      setGeraten(r.geraten);
      eingabe.current?.focus();
    } catch (e) {
      fehler(e instanceof Error ? e.message : String(e));
    } finally {
      setHilfeLaeuft(null);
    }
  };

  /**
   * Die Teilantworten zu einer Antwort zusammensetzen.
   *
   * Je Teilfrage eine Zeile „Frage: Antwort" — so bleibt für den Assistenten
   * zuordenbar, was worauf antwortet. Leere Felder fallen weg; wer eine
   * Teilfrage nicht beantworten kann, lässt sie stehen.
   */
  const teileSenden = () => {
    if (!teilfragen) return;
    const zeilen = teilfragen
      .map((t, i) => [t.frage, teilantworten[i]?.trim()])
      .filter((z) => z[1])
      .map(([f, a]) => `${f} ${a}`);
    if (!zeilen.length) return;
    ab(zeilen.join('\n'));
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

  const frageSteht = verlauf.some((n) => n.rolle === 'assistent');
  const hilfenAus = laeuft || !kiZugang || !frageSteht || hilfeLaeuft !== null;

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
              <Arbeitsanzeige
                stand={stand}
                text="hört zu, notiert und überlegt die nächste Frage …"
              />
            </div>
          </div>
        )}

        {hilfeLaeuft && (
          <div className="rede assistent">
            <div className="wer">◆</div>
            <div className="was" style={{ borderLeftColor: 'var(--muted-2)' }}>
              <Arbeitsanzeige
                stand={hilfeStand}
                text={hilfeLaeuft === 'zerlegen'
                  ? 'zerlegt die Frage in kleinere …'
                  : 'entwirft einen Antwortvorschlag …'}
              />
            </div>
          </div>
        )}

        {/* Die Teilfragen: einzeln beantworten, zusammen senden. */}
        {teilfragen && !laeuft && (
          <div className="teilfragen">
            <header>
              <b>Eins nach dem anderen</b>
              <button
                type="button"
                className="knopf leise"
                onClick={() => setTeilfragen(null)}
              >
                schließen
              </button>
            </header>
            {teilfragen.map((t, i) => (
              <label className="teilfrage" key={t.frage}>
                <span>{t.frage}</span>
                {t.hinweis && <em>{t.hinweis}</em>}
                <textarea
                  className="feld"
                  rows={2}
                  value={teilantworten[i] ?? ''}
                  placeholder="Antwort — oder leer lassen"
                  onChange={(e) => setTeilantworten((a) => {
                    const neuA = [...a];
                    neuA[i] = e.target.value;
                    return neuA;
                  })}
                />
              </label>
            ))}
            <footer>
              <span className="hinweis">
                {teilantworten.filter((a) => a.trim()).length} von {teilfragen.length}{' '}
                beantwortet
              </span>
              <button
                type="button"
                className="knopf haupt"
                onClick={teileSenden}
                disabled={!teilantworten.some((a) => a.trim())}
              >
                Antworten senden
              </button>
            </footer>
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

        {geraten.length > 0 && (
          <p className="hinweis" style={{ marginBottom: 8, color: 'var(--ph)' }}>
            Vorschlag im Feld — bitte prüfen. Geraten ist: {geraten.join('; ')}.
            Die Angaben in eckigen Klammern müssen Sie ersetzen.
          </p>
        )}

        <div className="reihe">
          <textarea
            ref={eingabe}
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
            onClick={() => ab()}
            disabled={!text.trim() || laeuft || !kiZugang}
          >
            Senden
          </button>
        </div>

        <div className="unten">
          <div className="hilfen">
            <button
              type="button"
              className="knopf leise"
              onClick={zerlegen}
              disabled={hilfenAus}
              title="Zerlegt die letzte Frage in kleinere, die sich einzeln beantworten lassen"
            >
              Eins nach dem anderen abfragen
            </button>
            <button
              type="button"
              className="knopf leise"
              onClick={vorschlagen}
              disabled={hilfenAus}
              title="Entwirft eine wahrscheinliche Antwort zum Prüfen und Anpassen"
            >
              Antwort vorschlagen
            </button>
          </div>
          <span>{text.length > 0 ? `${text.length} Zeichen · Strg + Enter sendet` : 'Strg + Enter sendet'}</span>
        </div>
      </div>
    </>
  );
}
