// Die rechte Seite: die Erfolgsgeschichte als Blatt, im WYSIWYG-Editor.
//
// Der Editor ist ein contenteditable mit Werkzeugleiste (E-10). Wichtig fuer
// React: Der Inhalt wird NUR gesetzt, wenn die Fassung wechselt oder neu
// formuliert wurde - nicht bei jedem Tastendruck. Sonst springt der Cursor
// bei jeder Eingabe an den Anfang.
import { useEffect, useRef, useState } from 'react';
import {
  api, datum, stufenName, type FassungZeile, type Fortschritt, type Sicherung,
  type ZielMitFreigabe,
} from '../lib/api.ts';
import {
  Arbeitsanzeige, Denkt, Fehlerbalken, Kasten, useFortgang,
} from './teile.tsx';

type Zustand = 'ruht' | 'tippt' | 'speichert' | 'gespeichert';

/**
 * Untergrenze, ab der formuliert wird - dieselbe Zahl wie in
 * server/src/ki/formulierung.ts (I-06). Hier steht sie nur, um die Erklaerung
 * im leeren Blatt zu schreiben; die Grenze selbst zieht der Server.
 */
const MINDESTFAKTEN = 4;

/** Damit der Cursor einen Platz hat, wenn noch nichts geschrieben ist. */
const LEERER_ABSATZ = '<p><br></p>';

/**
 * Ist im Editor nur Leerraum? Dann wird eine leere Fassung gespeichert.
 *
 * Geprueft wird auf ein Nicht-Leerraum-Zeichen und nicht mit `trim()`, weil
 * der Editor geschuetzte Leerzeichen einstreut, die `trim()` stehen laesst -
 * ein Blatt mit einem einzigen davon waere sonst eine Fassung.
 */
const istLeer = (el: HTMLElement) => !/[^\s]/.test(el.innerText);

export function Blatt(
  { storyId, arbeitstitel, ziele, fassungen, zielId, setZielId, stand, kiZugang, neuLaden, fehler }:
  {
    storyId: number;
    arbeitstitel: string;
    ziele: ZielMitFreigabe[];
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
  const [frage, setFrage] = useState<null | 'ueberschreiben' | 'verlauf' | 'ablegen'>(null);
  const [stempel, setStempel] = useState(0);
  const [umLaeuft, setUmLaeuft] = useState(false);
  const { stand: fortgangStand, fortgang, zuruecksetzen } = useFortgang();

  const ziel = ziele.find((z) => z.id === zielId) ?? null;
  const fassung = fassungen.find((f) => f.ziel_id === zielId) ?? null;

  // Inhalt in den Editor legen - nur beim Wechsel, nicht beim Tippen.
  //
  // Der leere Absatz ist keine Kosmetik: Gemessen im Browser hatte ein voellig
  // leerer contenteditable keinen Platz fuer den Cursor, `activeElement` blieb
  // BODY, und ein Klick ins Blatt tat nichts - ohne KI-Fassung war das Blatt
  // nicht beschreibbar. Mit einem Absatz darin greift auch der native Klick.
  useEffect(() => {
    if (!blatt.current) return;
    blatt.current.innerHTML = fassung?.inhalt || LEERER_ABSATZ;
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
          // Ein Blatt, auf dem nur der leere Absatz steht, ist keine Fassung -
          // sonst zaehlte es als Text und die Anleitung „noch kein Text"
          // verschwaende.
          inhalt: istLeer(blatt.current) ? '' : blatt.current.innerHTML,
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
    zuruecksetzen();
    try {
      const r = await api.formulieren(storyId, zielId, fortgang);
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
    zuruecksetzen();
    try {
      const r = await api.umformulieren(text, auftrag, fortgang);
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
            <>
              <button
                type="button"
                className="knopf leise"
                onClick={() => setFrage('ablegen')}
                title="Diesen Stand unter einem Namen ablegen"
              >
                Version speichern
              </button>
              <button type="button" className="knopf leise" onClick={() => setFrage('verlauf')}>
                Verlauf
              </button>
            </>
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
        {/*
          Ein Klick irgendwo auf das Blatt setzt den Cursor in den Text.
          Gemessen: Ohne das war ein leeres Blatt nicht beschreibbar - der
          Editorbereich hatte keine Hoehe, und der Klick ging ins Leere.
        */}
        <div
          className="blatt"
          onMouseUp={() => {
            const el = blatt.current;
            if (!el) return;
            // Hat der Editor den Fokus schon, war der Klick ein normaler Klick
            // in den Text - dann nicht eingreifen, sonst springt der Cursor.
            if (document.activeElement === el) return;
            // Eine Markierung (Text kopieren) nicht zerstoeren.
            if (window.getSelection()?.toString()) return;
            el.focus();
            // Cursor ans Ende setzen. Ohne das steht er bei einem frisch
            // fokussierten contenteditable nirgends, und die erste Taste
            // landet im Nichts.
            const bereich = document.createRange();
            bereich.selectNodeContents(el);
            bereich.collapse(false);
            const auswahl = window.getSelection();
            auswahl?.removeAllRanges();
            auswahl?.addRange(bereich);
          }}
        >
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
                {(ziel?.freigegeben ?? 0) < MINDESTFAKTEN
                  ? `Für dieses Ziel sind ${ziel?.freigegeben ?? 0} von ${stand.gesamt} `
                    + `Fakten freigegeben; ${MINDESTFAKTEN} werden gebraucht. Mit weniger `
                    + 'würde die KI den Rest erfinden — das ist ausgeschaltet. Weiter '
                    + 'interviewen, oder im Reiter „Fakten" die Stufen prüfen.'
                  : `${ziel?.freigegeben} Fakten sind für dieses Ziel freigegeben. `
                    + '„Formulieren" erzeugt den ersten Entwurf; danach lässt sich hier '
                    + 'direkt weiterschreiben.'}
              </p>
            </div>
          )}

          {formuliert && (
            <div style={{ margin: '18px 0 24px' }}>
              <Arbeitsanzeige
                stand={fortgangStand}
                hell
                text="schreibt die Fassung …"
              />
            </div>
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

      {frage === 'ablegen' && zielId && ziel && (
        <AblegenKasten
          storyId={storyId}
          zielId={zielId}
          zielName={ziel.name}
          stufe={ziel.stufe}
          vorschlag={fassung?.titel ?? arbeitstitel}
          zu={() => setFrage(null)}
          fertig={(name) => {
            setMeldung(`Als Version „${name}" abgelegt.`);
            setFrage(null);
          }}
          fehler={fehler}
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
  const [zeilen, setZeilen] = useState<Sicherung[] | null>(null);
  const [nurFertige, setNurFertige] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    setZeilen(null);
    api.fassungVerlauf(storyId, zielId, nurFertige)
      .then((r) => setZeilen(r.sicherungen))
      .catch((e) => setProblem(e instanceof Error ? e.message : String(e)));
  }, [storyId, zielId, nurFertige]);

  return (
    <Kasten
      titel="Abgelegte Fassungen"
      zu={zu}
      breit
      kinder={(
        <>
          <Fehlerbalken text={problem} />
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              justifyContent: 'space-between', marginBottom: 12,
            }}
          >
            <p className="hinweis" style={{ margin: 0, maxWidth: '60ch' }}>
              Hier liegen die Stände, die von Hand als Version abgelegt wurden — und
              jede Fassung, die beim Neuformulieren ersetzt wurde.
            </p>
            <label className="schalter" style={{ whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={nurFertige}
                onChange={(e) => setNurFertige(e.target.checked)}
              />
              nur fertige Fassungen
            </label>
          </div>

          {zeilen === null && <Denkt text="lädt …" />}
          {zeilen?.length === 0 && (
            <div className="leer">
              {nurFertige
                ? 'Keine als fertig markierte Fassung. Der Haken wird beim Ablegen gesetzt.'
                : 'Noch keine abgelegten Fassungen.'}
            </div>
          )}
          {zeilen && zeilen.length > 0 && (
            <table className="tab">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Typ</th>
                  <th>Wann</th>
                  <th>Umfang</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {zeilen.map((z) => (
                  <tr key={z.id}>
                    <td>
                      <div className="haupt">
                        {z.fertig === 1 && (
                          <span
                            className="grenze stufe oeffentlich"
                            style={{ marginRight: 7 }}
                            title="als fertige Fassung markiert"
                          >
                            fertig
                          </span>
                        )}
                        {z.name || <span className="neben">automatisch gesichert</span>}
                      </div>
                      <div className="neben">
                        {z.kommentar || z.grund}
                        {z.handisch === 1 ? ' · von Hand bearbeitet' : ''}
                      </div>
                    </td>
                    <td>
                      {z.stufe
                        ? <span className={`grenze stufe ${z.stufe}`}>{stufenName(z.stufe)}</span>
                        : <span className="neben">—</span>}
                    </td>
                    <td className="neben">{datum(z.erstellt_am)}</td>
                    <td className="neben">{z.zeichen.toLocaleString('de-DE')} Zeichen</td>
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

/**
 * Einen Stand als benannte Version ablegen (E-17).
 *
 * Der Typ wird angezeigt, aber nicht zur Eingabe gestellt: Er ist die
 * Vertraulichkeitsgrenze des Ziels und wird beim Ablegen mitgeschrieben. Sie
 * hier ändern zu lassen, hiesse eine Freigabe zu behaupten, die die Fassung
 * nicht hat (I-04).
 */
function AblegenKasten(
  { storyId, zielId, zielName, stufe, vorschlag, zu, fertig, fehler }:
  {
    storyId: number;
    zielId: number;
    zielName: string;
    stufe: Sicherung['stufe'];
    vorschlag: string;
    zu: () => void;
    fertig: (name: string) => void;
    fehler: (t: string) => void;
  },
) {
  const [name, setName] = useState(vorschlag);
  const [kommentar, setKommentar] = useState('');
  const [istFertig, setIstFertig] = useState(false);
  const [laeuft, setLaeuft] = useState(false);

  const ablegen = async () => {
    if (!name.trim()) return;
    setLaeuft(true);
    try {
      await api.versionSpeichern(storyId, zielId, {
        name: name.trim(),
        kommentar: kommentar.trim() || null,
        fertig: istFertig,
      });
      fertig(name.trim());
    } catch (e) {
      fehler(e instanceof Error ? e.message : String(e));
      setLaeuft(false);
    }
  };

  return (
    <Kasten
      titel="Version speichern"
      zu={zu}
      fuss={(
        <>
          <button type="button" className="knopf" onClick={zu}>Abbrechen</button>
          <button
            type="button"
            className="knopf haupt"
            onClick={ablegen}
            disabled={!name.trim() || laeuft}
          >
            {laeuft ? 'Wird abgelegt …' : 'Ablegen'}
          </button>
        </>
      )}
      kinder={(
        <>
          <label className="zeile">
            <span>Name der Version</span>
            <input
              className="feld"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') ablegen(); }}
            />
          </label>
          <label className="zeile">
            <span>Kommentar — was ist an diesem Stand besonders?</span>
            <textarea
              className="feld"
              value={kommentar}
              placeholder="z. B. nach Freigabe durch den Kunden, Kennzahlen geprüft"
              onChange={(e) => setKommentar(e.target.value)}
            />
          </label>

          <label className="schalter" style={{ marginBottom: 14 }}>
            <input
              type="checkbox"
              checked={istFertig}
              onChange={(e) => setIstFertig(e.target.checked)}
            />
            Fertige Fassung — im Verlauf filterbar
          </label>

          <div className="karte" style={{ marginBottom: 0 }}>
            <div className="reihe" style={{ alignItems: 'center' }}>
              <div>
                <span className="hinweis">Ziel</span>
                <div>{zielName}</div>
              </div>
              <div>
                <span className="hinweis">Typ</span>
                <div>
                  {stufe
                    ? <span className={`grenze stufe ${stufe}`}>{stufenName(stufe)}</span>
                    : '—'}
                </div>
              </div>
            </div>
            <p className="hinweis" style={{ marginTop: 10, marginBottom: 0 }}>
              Der Typ ist die Vertraulichkeitsgrenze des Ziels und wird mitgeschrieben.
              Er lässt sich hier nicht ändern: Eine Fassung, die aus öffentlichen Fakten
              entstanden ist, wird nicht dadurch intern, dass man es behauptet — und
              umgekehrt.
            </p>
          </div>
        </>
      )}
    />
  );
}
