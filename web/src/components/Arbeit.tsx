// Der Arbeitsbereich: links die Entwicklung (Gespräch / Fakten), rechts das
// Blatt. Der Splitscreen ist verschiebbar.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type StoryVoll } from '../lib/api.ts';
import { Blatt } from './Blatt.tsx';
import { Fakten } from './Fakten.tsx';
import { Gespraech } from './Gespraech.tsx';
import { Arbeitsanzeige, Fehlerbalken, Spur, useFortgang } from './teile.tsx';

export function Arbeit(
  { storyId, kiZugang, zurueck, zurVerwaltung }:
  { storyId: number; kiZugang: boolean; zurueck: () => void; zurVerwaltung: () => void },
) {
  const [daten, setDaten] = useState<StoryVoll | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [reiter, setReiter] = useState<'gespraech' | 'fakten'>('gespraech');
  const [laeuft, setLaeuft] = useState(false);
  const [reif, setReif] = useState(false);
  const [neueFakten, setNeueFakten] = useState(0);
  const [zielId, setZielId] = useState<number | null>(null);
  const [breite, setBreite] = useState(46);
  const [titel, setTitel] = useState('');
  const [auswertung, setAuswertung] = useState<string | null>(null);
  const [wertetAus, setWertetAus] = useState(false);
  const { stand, fortgang, zuruecksetzen } = useFortgang();

  const laden = useCallback(async () => {
    try {
      const d = await api.story(storyId);
      setDaten(d);
      setTitel(d.story.arbeitstitel);
      setZielId((z) => z ?? d.ziele[0]?.id ?? null);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    }
  }, [storyId]);

  useEffect(() => { laden(); }, [laden]);

  // ------------------------------------------------------------ Splitscreen
  const zieht = useRef(false);
  useEffect(() => {
    const bewegen = (e: MouseEvent) => {
      if (!zieht.current) return;
      const anteil = (e.clientX / window.innerWidth) * 100;
      setBreite(Math.min(72, Math.max(24, anteil)));
    };
    const los = () => { zieht.current = false; document.body.style.cursor = ''; };
    window.addEventListener('mousemove', bewegen);
    window.addEventListener('mouseup', los);
    return () => {
      window.removeEventListener('mousemove', bewegen);
      window.removeEventListener('mouseup', los);
    };
  }, []);

  const schritt = async (text?: string) => {
    setLaeuft(true);
    setFehler(null);
    setNeueFakten(0);
    zuruecksetzen();
    try {
      const r = await api.interview(storyId, text, fortgang);
      setDaten((d) => (d ? {
        ...d, verlauf: r.verlauf, fakten: r.fakten, fortschritt: r.fortschritt,
      } : d));
      setReif(r.reif);
      setNeueFakten(r.neue_fakten);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    } finally {
      setLaeuft(false);
    }
  };

  const titelSpeichern = async () => {
    if (!daten || titel.trim() === daten.story.arbeitstitel || !titel.trim()) return;
    try {
      await api.storyPatch(storyId, { arbeitstitel: titel.trim() });
      await laden();
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    }
  };

  const auswerten = async () => {
    setWertetAus(true);
    setAuswertung(null);
    zuruecksetzen();
    try {
      const r = await api.auswerten(storyId, zielId, fortgang);
      setAuswertung(r.uebersprungen
        ?? (r.angelegt
          ? `${r.angelegt} Lernnotiz${r.angelegt === 1 ? '' : 'en'} angelegt — `
            + 'unter Verwaltung → Gelernt zu prüfen.'
          : 'Nichts gefunden, was der Assistent künftig anders fragen sollte.'));
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    } finally {
      setWertetAus(false);
    }
  };

  if (!daten) {
    return (
      <>
        <div className="kopf">
          <button type="button" className="marke" onClick={zurueck}>
            <i /> Erfolgsgeschichten
          </button>
        </div>
        <div className="start"><Fehlerbalken text={fehler} />{!fehler && 'Lädt …'}</div>
      </>
    );
  }

  return (
    <>
      <div className="kopf">
        <button type="button" className="marke" onClick={zurueck} title="Zur Übersicht">
          <i /> <small>Erfolgsgeschichten</small>
        </button>
        <div className="titel">
          <input
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            onBlur={titelSpeichern}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            aria-label="Arbeitstitel"
          />
          <select
            value={daten.story.projektart_id ?? ''}
            onChange={async (e) => {
              await api.storyPatch(storyId, {
                projektart_id: e.target.value ? Number(e.target.value) : null,
              });
              laden();
            }}
            aria-label="Projektart"
            style={{
              background: 'var(--bg-3)', border: '1px solid var(--line)',
              borderRadius: 6, padding: '4px 7px', color: 'var(--muted)', fontSize: 12.5,
            }}
          >
            <option value="">Projektart offen</option>
            {daten.projektarten.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={daten.story.kunde_id ?? ''}
            onChange={async (e) => {
              await api.storyPatch(storyId, {
                kunde_id: e.target.value ? Number(e.target.value) : null,
              });
              laden();
            }}
            aria-label="Kunde"
            title="Der Kundendatensatz bringt seine eigenen Interview-Hinweise mit."
            style={{
              background: 'var(--bg-3)', border: '1px solid var(--line)',
              borderRadius: 6, padding: '4px 7px', color: 'var(--muted)', fontSize: 12.5,
            }}
          >
            <option value="">Kunde offen</option>
            {daten.kunden.map((k) => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
        </div>
        <Spur stand={daten.fortschritt} neu={neueFakten} />
        <button
          type="button"
          className="knopf leise"
          onClick={auswerten}
          disabled={wertetAus || laeuft || !kiZugang}
          title="Lernmodus: auswerten, welche Fragen gefehlt haben"
        >
          {wertetAus ? 'Wertet aus …' : 'Auswerten'}
        </button>
        <button type="button" className="knopf leise" onClick={zurVerwaltung}>
          Verwaltung
        </button>
      </div>

      <div className="buehne">
        <div className="werkstatt" style={{ width: `${breite}%` }}>
          <div className="reiter">
            <button
              type="button"
              aria-selected={reiter === 'gespraech'}
              onClick={() => setReiter('gespraech')}
            >
              Gespräch
              <span className="zaehler">
                {daten.verlauf.filter((n) => n.rolle !== 'notiz').length}
              </span>
            </button>
            <button
              type="button"
              aria-selected={reiter === 'fakten'}
              onClick={() => setReiter('fakten')}
            >
              Fakten
              <span className="zaehler">{daten.fakten.length}</span>
            </button>
          </div>

          {(fehler || auswertung || wertetAus) && (
            <div style={{ padding: '10px 18px 0' }}>
              <Fehlerbalken text={fehler} weg={() => setFehler(null)} />
              {wertetAus && (
                <Arbeitsanzeige stand={stand} text="wertet das Gespräch aus …" />
              )}
              {auswertung && (
                <p className="hinweis" style={{ color: 'var(--accent-2)' }}>
                  {auswertung}{' '}
                  <button type="button" className="knopf leise" onClick={() => setAuswertung(null)}>
                    ok
                  </button>
                </p>
              )}
            </div>
          )}

          {reiter === 'gespraech' ? (
            <Gespraech
              storyId={storyId}
              fehler={setFehler}
              verlauf={daten.verlauf}
              fakten={daten.fakten}
              laeuft={laeuft}
              kiZugang={kiZugang}
              reif={reif}
              senden={(t) => schritt(t)}
              beginnen={() => schritt()}
              stand={stand}
            />
          ) : (
            <Fakten
              storyId={storyId}
              fakten={daten.fakten}
              stand={daten.fortschritt}
              katalog={daten.katalog}
              aktualisieren={(f, s) => setDaten((d) => (d ? { ...d, fakten: f, fortschritt: s } : d))}
              fehler={setFehler}
            />
          )}
        </div>

        <div
          className="griff"
          onMouseDown={() => { zieht.current = true; document.body.style.cursor = 'col-resize'; }}
          role="separator"
          aria-label="Aufteilung verschieben"
        />

        <div className="blatt-seite">
          <Blatt
            storyId={storyId}
            arbeitstitel={daten.story.arbeitstitel}
            ziele={daten.ziele}
            fassungen={daten.fassungen}
            zielId={zielId}
            setZielId={setZielId}
            stand={daten.fortschritt}
            kiZugang={kiZugang}
            neuLaden={laden}
            fehler={setFehler}
          />
        </div>
      </div>
    </>
  );
}
