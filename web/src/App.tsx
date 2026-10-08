// Der Rahmen: Startseite, Arbeitsbereich, Verwaltung.
//
// Keine Router-Bibliothek - es sind drei Ansichten, und der Zustand steckt in
// der Adresszeile (#/story/7), damit ein Neuladen nicht zur Startseite
// zurueckwirft.
import { useCallback, useEffect, useState } from 'react';
import { api, type Ich, type Startdaten } from './lib/api.ts';
import { Arbeit } from './components/Arbeit.tsx';
import { Start } from './components/Start.tsx';
import { Verwaltung } from './components/Verwaltung.tsx';
import { Fehlerbalken, ThemaKnopf } from './components/teile.tsx';

type Ansicht = { was: 'start' } | { was: 'arbeit'; id: number } | { was: 'verwaltung' };

function ausAdresse(): Ansicht {
  const h = window.location.hash;
  const m = /^#\/story\/(\d+)/.exec(h);
  if (m) return { was: 'arbeit', id: Number(m[1]) };
  if (h.startsWith('#/verwaltung')) return { was: 'verwaltung' };
  return { was: 'start' };
}

function inAdresse(a: Ansicht): void {
  const ziel = a.was === 'arbeit' ? `#/story/${a.id}`
    : a.was === 'verwaltung' ? '#/verwaltung' : '#/';
  if (window.location.hash !== ziel) window.location.hash = ziel;
}

export function App() {
  const [ansicht, setAnsicht] = useState<Ansicht>(ausAdresse);
  const [daten, setDaten] = useState<Startdaten | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const laden = useCallback(async () => {
    try {
      setDaten(await api.start());
      setFehler(null);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => { laden(); }, [laden]);

  useEffect(() => {
    const zurueck = () => setAnsicht(ausAdresse());
    window.addEventListener('hashchange', zurueck);
    return () => window.removeEventListener('hashchange', zurueck);
  }, []);

  const gehe = (a: Ansicht) => {
    inAdresse(a);
    setAnsicht(a);
    if (a.was === 'start') laden();
  };

  if (ansicht.was === 'arbeit') {
    return (
      <Arbeit
        storyId={ansicht.id}
        kiZugang={daten?.ki.zugang ?? true}
        zurueck={() => gehe({ was: 'start' })}
        zurVerwaltung={() => gehe({ was: 'verwaltung' })}
      />
    );
  }

  if (ansicht.was === 'verwaltung') {
    return (
      <Verwaltung
        zurueck={() => gehe({ was: 'start' })}
        ich={daten?.ich}
      />
    );
  }

  return (
    <>
      <div className="kopf">
        <button type="button" className="marke" onClick={() => laden()}>
          <i /> BITS <small>Erfolgsgeschichten</small>
        </button>
        <div className="titel" />
        {daten && (
          <span className="hinweis">
            {daten.ki.zugang
              ? `KI: ${daten.ki.anbieter} · ${daten.ki.modell}`
              : 'KI: kein Zugang'}
          </span>
        )}
        {daten && <Wer ich={daten.ich} />}
        <ThemaKnopf />
        <button type="button" className="knopf" onClick={() => gehe({ was: 'verwaltung' })}>
          Verwaltung
        </button>
      </div>

      {fehler && (
        <div className="start">
          <Fehlerbalken text={fehler} weg={() => setFehler(null)} />
          <p className="hinweis">
            Läuft das Backend? Im Entwicklungsbetrieb startet beides zusammen mit
            <code> npm run dev</code>.
          </p>
          <button type="button" className="knopf" onClick={laden}>Nochmal versuchen</button>
        </div>
      )}

      {daten && !fehler && (
        <Start
          daten={daten}
          oeffnen={(id) => gehe({ was: 'arbeit', id })}
          neuGeladen={laden}
        />
      )}
    </>
  );
}

/**
 * Wer angemeldet ist — und der Weg hinaus.
 *
 * Im Einzelplatzbetrieb zeigt die Zeile nichts: Dort gibt es keine Anmeldung,
 * und ein „Abmelden", das nichts abmeldet, wäre eine Lüge in der Kopfzeile.
 */
function Wer({ ich }: { ich: Ich }) {
  if (!ich.mehrbenutzer) return null;

  if (!ich.angemeldet) {
    return (
      <a className="knopf haupt" href="/auth/login" style={{ textDecoration: 'none' }}>
        Anmelden
      </a>
    );
  }

  return (
    <span className="wer-ich">
      <span title={[ich.email, ich.verwalter ? `Rolle: ${ich.verwalterRolle}` : null]
        .filter(Boolean).join(' · ')}
      >
        {ich.name}
        {ich.verwalter && <em> · Verwaltung</em>}
      </span>
      <a className="knopf leise" href="/auth/abmelden">Abmelden</a>
    </span>
  );
}
