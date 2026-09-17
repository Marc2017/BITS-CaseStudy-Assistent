// Die rechte Seite: die Erfolgsgeschichte als Blatt, im WYSIWYG-Editor.
//
// Der Editor ist ein contenteditable mit Werkzeugleiste (E-10). Wichtig fuer
// React: Der Inhalt wird NUR gesetzt, wenn die Fassung wechselt oder neu
// formuliert wurde - nicht bei jedem Tastendruck. Sonst springt der Cursor
// bei jeder Eingabe an den Anfang.
import { useEffect, useRef, useState } from 'react';
import {
  api, datum, stufenName, type FassungZeile, type Fortschritt, type Ziel,
} from '../lib/api.ts';
import { Denkt, Fehlerbalken, Kasten } from './teile.tsx';

type Zustand = 'ruht' | 'tippt' | 'speichert' | 'gespeichert';

export function Blatt(
  { storyId, arbeitstitel, ziele, fassungen, zielId, setZielId, stand, kiZugang, neuLaden, fehler }:
  {
    storyId: number;
    arbeitstitel: string;
    ziele: Ziel[];
    fassungen: FassungZeile[];
    zielId: number | null;
    setZielId: (id: number) => void;
    stand: Fortschritt;
    kiZugang: boolean;
    neuLaden: () => Promise<void>;
    fehler: (t: string) => void;
  },
) {
  const blatt = useRef<HTMLDivElement>(null);
  const [zustand, setZustand] = useState<Zustand>('ruht');
  const [formuliert, setFormuliert] = useState(false);
  const [luecken, setLuecken] = useState<string[]>([]);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [frage, setFrage] = useState<null | 'ueberschreiben' | 'verlauf'>(null);
  const [stempel, setStempel] = useState(0);
  const [umLaeuft, setUmLaeuft] = useState(false);

  const ziel = ziele.find((z) => z.id === zielId) ?? null;
  const fassung = fassungen.find((f) => f.ziel_id === zielId) ?? null;

  // Inhalt in den Editor legen - nur beim Wechsel, nicht beim Tippen.
  useEffect(() => {
    if (!blatt.current) return;
    blatt.current.innerHTML = fassung?.inhalt ?? '';
    setZustand('ruht');
  }, [zielId, storyId, stempel]);

  // Von Hand geaendert: verzoegert speichern (I-02 setzt dabei `handisch`).
  const uhr = useRef<number | null>(null);
  const getippt = () => {
    setZustand('tippt');
    if (uhr.current) window.clearTimeout(uhr.current);
    uhr.current = window.setTimeout(async () => {
      if (!blatt.current || !zielId) return;
      setZustand('speichert');
      try {
        await api.fassungSpeichern(storyId, zielId, {
          inhalt: blatt.current.innerHTML,
          titel: fassung?.titel ?? null,
        });
        setZustand('gespeichert');
      } catch (e) {
        fehler(e instanceof Error ? e.message : String(e));
        setZustand('ruht');
      }
    }, 1200);
  };

  useEffect(() => () => { if (uhr.current) window.clearTimeout(uhr.current); }, []);

  const formulieren = async () => {
    if (!zielId) return;
    setFrage(null);
    setFormuliert(true);
    setMeldung(null);
    try {
      const r = await api.formulieren(storyId, zielId);
      setLuecken(r.luecken);
      setMeldung(
        `Formuliert aus ${r.verwendete_fakten} freigegebenen Fakten.`
        + (r.ausgelassene_fakten
          ? ` ${r.ausgelassene_fakten} Fakten blieben draußen — sie liegen über der `
            + `Grenze dieses Ziels (${stufenName(ziel!.stufe)}).`
          : ''),
      );
      await neuLaden();
      setStempel((s) => s + 1);
    } catch (e) {
      fehler(e instanceof Error ? e.message : String(e));
    } finally {
      setFormuliert(false);
    }
  };

  const befehl = (b: string, wert?: string) => {
    blatt.current?.focus();
    document.execCommand(b, false, wert);
    getippt();
  };

  const luecke = () => {
    befehl('insertHTML', '<p class="fehlt">Hier fehlt noch: </p>');
  };

  const umformulieren = async (auftrag: string) => {
    const auswahl = window.getSelection();
    const text = auswahl?.toString().trim();
    if (!text) {
      fehler('Erst eine Textstelle markieren, dann umformulieren lassen.');
      return;
    }
    setUmLaeuft(true);
    try {
      const r = await api.umformulieren(text, auftrag);
      befehl('insertText', r.text.replace(/<[^>]+>/g, ''));
    } catch (e) {
      fehler(e instanceof Error ? e.message : String(e));
    } finally {
      setUmLaeuft(false);
    }
  };

  const kopieren = async () => {
    if (!blatt.current) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([blatt.current.innerHTML], { type: 'text/html' }),
        'text/plain': new Blob([blatt.current.innerText], { type: 'text/plain' }),
      })]);
      setMeldung('In die Ablage kopiert — mit Formatierung.');
    } catch {
      await navigator.clipboard.writeText(blatt.current.innerText);
      setMeldung('Als Text in die Ablage kopiert.');
    }
  };

  return (
    <>
      <div className="blatt-kopf">
        <select
          value={zielId ?? ''}
          onChange={(e) => setZielId(Number(e.target.value))}
          aria-label="Ziel der Fassung"
        >
          {ziele.map((z) => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
        {ziel && (
          <span
            className={`grenze stufe ${ziel.stufe}`}
            title={`In diese Fassung gehen nur Fakten bis zur Stufe „${stufenName(ziel.stufe)}".`}
          >
            bis {stufenName(ziel.stufe)}
          </span>
        )}
        {fassung?.veraltet && (
          <span className="unsicher" title="Seit der Formulierung sind Fakten dazugekommen.">
            Fakten neuer als der Text
          </span>
        )}
        <div className="rechts">
          {fassung?.inhalt && (
            <button type="button" className="knopf leise" onClick={() => setFrage('verlauf')}>
              Verlauf
            </button>
          )}
          <button
            type="button"
            className="knopf haupt"
            disabled={formuliert || !zielId || !kiZugang}
            onClick={() => {
              if (fassung?.handisch && fassung.inhalt) setFrage('ueberschreiben');
              else formulieren();
            }}
          >
            {formuliert ? 'Formuliert …' : fassung?.inhalt ? 'Neu formulieren' : 'Formulieren'}
          </button>
        </div>
      </div>

      <div className="blatt-rolle">
        <div className="blatt">
          <h1>{fassung?.titel || arbeitstitel}</h1>
          <div className="zeile-ziel">
            {ziel?.name}
            {ziel?.beschreibung ? ` — ${ziel.beschreibung}` : ''}
          </div>

          {meldung && (
            <p className="hinweis" style={{ color: 'var(--tinte-2)' }}>{meldung}</p>
          )}
          {luecken.length > 0 && (
            <div className="fehlt" style={{
              background: '#FFF3E2', borderLeft: '3px solid #FF9F45',
              color: '#8A4B08', padding: '9px 12px', margin: '14px 0',
              font: '13.5px/1.5 var(--sans)',
            }}>
              Der Assistent nennt diese Lücken: {luecken.join('; ')}
            </div>
          )}

          {!fassung?.inhalt && !formuliert && (
            <div className="leer-blatt">
              <h3>Noch kein Text für dieses Ziel</h3>
              <p>
                {stand.pflichtErfuellt < 4
                  ? 'Erst ein paar Fakten sammeln — mit weniger als vier freigegebenen '
                    + 'Fakten würde die KI den Rest erfinden. Das ist ausgeschaltet.'
                  : 'Genug Fakten sind da. „Formulieren" erzeugt den ersten Entwurf; '
                    + 'danach lässt sich hier direkt weiterschreiben.'}
              </p>
            </div>
          )}

          {formuliert && (
            <p style={{ color: 'var(--tinte-2)', font: '13px/1.5 var(--sans)' }}>
              Die Fassung entsteht. Bei einem langen Text dauert das eine bis zwei Minuten.
            </p>
          )}

          <div
            ref={blatt}
            className="dok"
            contentEditable
            suppressContentEditableWarning
            onInput={getippt}
            spellCheck
            lang="de"
          />
        </div>
      </div>

      <div className="werkzeugleiste">
        <button type="button" className="b" title="Fett (Strg+B)" onClick={() => befehl('bold')}>B</button>
        <button type="button" className="i" title="Kursiv (Strg+I)" onClick={() => befehl('italic')}>I</button>
        <div className="teiler" />
        <button type="button" title="Überschrift" onClick={() => befehl('formatBlock', 'h2')}>H2</button>
        <button type="button" title="Unterüberschrift" onClick={() => befehl('formatBlock', 'h3')}>H3</button>
        <button type="button" title="Absatz" onClick={() => befehl('formatBlock', 'p')}>¶</button>
        <div className="teiler" />
        <button type="button" title="Liste" onClick={() => befehl('insertUnorderedList')}>•</button>
        <button type="button" title="Zitat" onClick={() => befehl('formatBlock', 'blockquote')}>„</button>
        <button type="button" title="Lücke markieren" onClick={luecke}>Lücke</button>
        <div className="teiler" />
        <button type="button" title="Formatierung entfernen" onClick={() => befehl('removeFormat')}>
          ⌫
        </button>
        <div className="rechts">
          {umLaeuft
            ? <Denkt text="formuliert um …" />
            : (
              <>
                <button
                  type="button"
                  title="Markierte Stelle kürzer fassen"
                  disabled={!kiZugang}
                  onClick={() => umformulieren('Kürzer und klarer fassen, ohne Inhalt zu verlieren.')}
                >
                  kürzen
                </button>
                <button
                  type="button"
                  title="Markierte Stelle klarer fassen"
                  disabled={!kiZugang}
                  onClick={() => umformulieren('Konkreter und aktiver formulieren. Keine Floskeln.')}
                >
                  schärfen
                </button>
              </>
            )}
          <div className="teiler" />
          <span className="gespeichert">
            {zustand === 'tippt' ? 'ungespeichert'
              : zustand === 'speichert' ? 'speichert …'
                : zustand === 'gespeichert' ? 'gespeichert'
                  : fassung ? `zuletzt ${datum(fassung.geaendert_am)}` : ''}
          </span>
          <button type="button" className="knopf" onClick={kopieren}>Kopieren</button>
        </div>
      </div>

      {frage === 'ueberschreiben' && (
        <Kasten
          titel="Von Hand geschriebenen Text ersetzen?"
          zu={() => setFrage(null)}
          fuss={(
            <>
              <button type="button" className="knopf" onClick={() => setFrage(null)}>
                Behalten
              </button>
              <button type="button" className="knopf haupt" onClick={formulieren}>
                Neu formulieren
              </button>
            </>
          )}
          kinder={(
            <p>
              Diese Fassung wurde von Hand bearbeitet. Die bisherige Version wird
              gesichert und lässt sich über „Verlauf" zurückholen — verloren geht
              also nichts.
            </p>
          )}
        />
      )}

      {frage === 'verlauf' && zielId && (
        <VerlaufKasten
          storyId={storyId}
          zielId={zielId}
          zu={() => setFrage(null)}
          zurueck={async (id) => {
            await api.fassungZurueck(storyId, zielId, id);
            await neuLaden();
            setStempel((s) => s + 1);
            setFrage(null);
          }}
          fehler={fehler}
        />
      )}
    </>
  );
}

function VerlaufKasten(
  { storyId, zielId, zu, zurueck, fehler }:
  {
    storyId: number; zielId: number; zu: () => void;
    zurueck: (id: number) => Promise<void>; fehler: (t: string) => void;
  },
) {
  const [zeilen, setZeilen] = useState<
    { id: number; grund: string; erstellt_am: string; zeichen: number; handisch: number }[] | null
  >(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    api.fassungVerlauf(storyId, zielId)
      .then((r) => setZeilen(r.sicherungen))
      .catch((e) => setProblem(e instanceof Error ? e.message : String(e)));
  }, [storyId, zielId]);

  return (
    <Kasten
      titel="Frühere Versionen"
      zu={zu}
      kinder={(
        <>
          <Fehlerbalken text={problem} />
          <p className="hinweis" style={{ marginBottom: 12 }}>
            Jedes Mal, wenn eine Fassung ersetzt wurde, ist die vorige hier abgelegt.
          </p>
          {zeilen === null && <Denkt text="lädt …" />}
          {zeilen?.length === 0 && (
            <div className="leer">Noch keine früheren Versionen.</div>
          )}
          {zeilen && zeilen.length > 0 && (
            <table className="tab">
              <thead>
                <tr><th>Wann</th><th>Grund</th><th>Umfang</th><th /></tr>
              </thead>
              <tbody>
                {zeilen.map((z) => (
                  <tr key={z.id}>
                    <td className="neben">{datum(z.erstellt_am)}</td>
                    <td className="neben">
                      {z.grund}{z.handisch ? ' (von Hand)' : ''}
                    </td>
                    <td className="neben">{z.zeichen} Zeichen</td>
                    <td className="rechts">
                      <button
                        type="button"
                        className="knopf"
                        onClick={() => zurueck(z.id).catch((e) => fehler(String(e)))}
                      >
                        Zurückholen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    />
  );
}
