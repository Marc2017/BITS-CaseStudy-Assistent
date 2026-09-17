// Die Startseite: neu anfangen, weiterarbeiten oder eine bestehende
// Erfolgsgeschichte aufnehmen.
import { useState } from 'react';
import { api, datum, type Startdaten } from '../lib/api.ts';
import { Arbeitsanzeige, Fehlerbalken, Kasten, useFortgang } from './teile.tsx';

type Weg = null | 'neu' | 'import';

export function Start(
  { daten, oeffnen, neuGeladen }:
  { daten: Startdaten; oeffnen: (id: number) => void; neuGeladen: () => void },
) {
  const [weg, setWeg] = useState<Weg>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const aktive = daten.storys.filter((s) => s.status === 'aktiv');
  const fertige = daten.storys.filter((s) => s.status !== 'aktiv');

  return (
    <div className="start-rolle">
      <div className="start">
        <h1>Erfolgsgeschichten</h1>
        <p className="vorspann">
          Erzählen Sie von einem Projekt — der Assistent fragt nach, sammelt die Fakten
          und formuliert daraus, was Sie brauchen: einen Text für die Website, eine
          interne Referenz, einen Absatz für ein Profil oder ein Angebot.
        </p>

        <Fehlerbalken text={fehler} weg={() => setFehler(null)} />

        {!daten.ki.zugang && (
          <div className="fehler" style={{ marginBottom: 20 }}>
            Es ist kein KI-Zugang hinterlegt — Interview, Formulieren und Import sind
            deshalb aus. Fakten von Hand eintragen funktioniert. Zugang unter
            Verwaltung → Einstellungen.
          </div>
        )}

        <div className="wege">
          <button type="button" className="weg" onClick={() => setWeg('neu')}>
            <b>Neue Erfolgsgeschichte</b>
            <span>
              Arbeitstitel eingeben, dann führt der Assistent das Interview. Rechnen Sie
              mit 15 bis 25 Minuten.
            </span>
          </button>
          <button type="button" className="weg" onClick={() => setWeg('import')}>
            <b>Bestehende aufnehmen</b>
            <span>
              Text einfügen oder eine Adresse von mybits.de angeben. Der Assistent zieht
              die Fakten heraus; danach lässt sich daran weiterarbeiten.
            </span>
          </button>
        </div>

        <div className="liste">
          <h2>In Arbeit</h2>
          {aktive.length === 0
            ? <div className="leer">Noch nichts angefangen.</div>
            : <Tabelle zeilen={aktive} oeffnen={oeffnen} />}
        </div>

        {fertige.length > 0 && (
          <div className="liste">
            <h2>Abgeschlossen und abgelegt</h2>
            <Tabelle zeilen={fertige} oeffnen={oeffnen} />
          </div>
        )}
      </div>

      {weg === 'neu' && (
        <NeuKasten
          daten={daten}
          zu={() => setWeg(null)}
          fertig={(id) => { setWeg(null); oeffnen(id); }}
          fehler={setFehler}
        />
      )}
      {weg === 'import' && (
        <ImportKasten
          daten={daten}
          zu={() => setWeg(null)}
          fertig={(id) => { setWeg(null); neuGeladen(); oeffnen(id); }}
          fehler={setFehler}
        />
      )}
    </div>
  );
}

function Tabelle(
  { zeilen, oeffnen }: { zeilen: Startdaten['storys']; oeffnen: (id: number) => void },
) {
  return (
    <table className="tab">
      <thead>
        <tr>
          <th>Arbeitstitel</th>
          <th>Projektart</th>
          <th>Fakten</th>
          <th>Fassungen</th>
          <th>Zuletzt</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {zeilen.map((s) => (
          <tr key={s.id}>
            <td>
              <div className="haupt">{s.arbeitstitel}</div>
              <div className="neben">
                {[s.kunde, s.branche].filter(Boolean).join(' · ')
                  || (s.herkunft === 'import' ? 'importiert' : 'noch keine Angaben')}
              </div>
            </td>
            <td className="neben">{s.projektart ?? '—'}</td>
            <td className="neben">{s.fakten_anzahl}</td>
            <td className="neben">{s.fassungen}</td>
            <td className="neben">{datum(s.geaendert_am)}</td>
            <td className="rechts">
              <button type="button" className="knopf" onClick={() => oeffnen(s.id)}>
                Weiterarbeiten
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NeuKasten(
  { daten, zu, fertig, fehler }:
  { daten: Startdaten; zu: () => void; fertig: (id: number) => void; fehler: (t: string) => void },
) {
  const [titel, setTitel] = useState('');
  const [art, setArt] = useState<string>('');
  const [kunde, setKunde] = useState<string>('');
  const [laeuft, setLaeuft] = useState(false);

  const anlegen = async () => {
    if (!titel.trim()) return;
    setLaeuft(true);
    try {
      const r = await api.storyNeu({
        arbeitstitel: titel.trim(),
        projektart_id: art ? Number(art) : null,
        kunde_id: kunde ? Number(kunde) : null,
      });
      fertig(r.id);
    } catch (e) {
      fehler(e instanceof Error ? e.message : String(e));
      setLaeuft(false);
    }
  };

  return (
    <Kasten
      titel="Neue Erfolgsgeschichte"
      zu={zu}
      fuss={(
        <>
          <button type="button" className="knopf" onClick={zu}>Abbrechen</button>
          <button
            type="button"
            className="knopf haupt"
            onClick={anlegen}
            disabled={!titel.trim() || laeuft}
          >
            {laeuft ? 'Wird angelegt …' : 'Anlegen und beginnen'}
          </button>
        </>
      )}
      kinder={(
        <>
          <label className="zeile">
            <span>Arbeitstitel</span>
            <input
              className="feld"
              value={titel}
              autoFocus
              placeholder="z. B. Zendesk-Anbindung beim Hotelbuchungsportal"
              onChange={(e) => setTitel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') anlegen(); }}
            />
          </label>
          <label className="zeile">
            <span>Projektart</span>
            <select className="feld" value={art} onChange={(e) => setArt(e.target.value)}>
              <option value="">— noch offen —</option>
              {daten.projektarten.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="zeile">
            <span>Kunde</span>
            <select className="feld" value={kunde} onChange={(e) => setKunde(e.target.value)}>
              <option value="">— noch offen, oder internes Projekt —</option>
              {daten.kunden.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}{k.branche ? ` — ${k.branche}` : ''}
                </option>
              ))}
            </select>
          </label>
          <p className="hinweis">
            Projektart und Kunde steuern gemeinsam, worauf der Assistent im Interview
            achtet: die Art sagt, was bei diesem Typ Vorhaben zu fragen ist, der Kunde,
            was bei diesem Auftraggeber gilt. Beides lässt sich später ändern.
          </p>
        </>
      )}
    />
  );
}

function ImportKasten(
  { daten, zu, fertig, fehler }:
  { daten: Startdaten; zu: () => void; fertig: (id: number) => void; fehler: (t: string) => void },
) {
  const [modus, setModus] = useState<'url' | 'text'>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [titel, setTitel] = useState('');
  const [art, setArt] = useState('');
  const [kunde, setKunde] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  const { stand, fortgang } = useFortgang();

  const los = async () => {
    setLaeuft(true);
    try {
      const r = await api.importieren({
        url: modus === 'url' ? url.trim() : undefined,
        text: modus === 'text' ? text : undefined,
        arbeitstitel: titel.trim() || undefined,
        projektart_id: art ? Number(art) : null,
        kunde_id: kunde ? Number(kunde) : null,
      }, fortgang);
      fertig(r.story_id);
    } catch (e) {
      fehler(e instanceof Error ? e.message : String(e));
      setLaeuft(false);
    }
  };

  const bereit = modus === 'url' ? url.trim().length > 10 : text.trim().length > 200;

  return (
    <Kasten
      titel="Bestehende Erfolgsgeschichte aufnehmen"
      zu={zu}
      fuss={(
        <>
          <button type="button" className="knopf" onClick={zu}>Abbrechen</button>
          <button
            type="button"
            className="knopf haupt"
            onClick={los}
            disabled={!bereit || laeuft || !daten.ki.zugang}
          >
            {laeuft ? 'Fakten werden gelesen …' : 'Fakten herauslesen'}
          </button>
        </>
      )}
      kinder={(
        <>
          <div className="reiter" style={{ marginBottom: 14, borderRadius: 6 }}>
            <button
              type="button"
              aria-selected={modus === 'url'}
              onClick={() => setModus('url')}
            >
              Adresse
            </button>
            <button
              type="button"
              aria-selected={modus === 'text'}
              onClick={() => setModus('text')}
            >
              Text einfügen
            </button>
          </div>

          {modus === 'url' ? (
            <label className="zeile">
              <span>Adresse der Erfolgsgeschichte</span>
              <input
                className="feld"
                value={url}
                autoFocus
                placeholder="https://www.mybits.de/case-studies/…"
                onChange={(e) => setUrl(e.target.value)}
              />
            </label>
          ) : (
            <label className="zeile">
              <span>Text der Erfolgsgeschichte ({text.trim().length} Zeichen, mindestens 200)</span>
              <textarea
                className="feld"
                style={{ minHeight: 200 }}
                value={text}
                autoFocus
                placeholder="Den vollständigen Text einfügen — auch Metazeile, Kennzahlen und Zitat."
                onChange={(e) => setText(e.target.value)}
              />
            </label>
          )}

          <div className="karte reihe" style={{ background: 'transparent', border: 0, padding: 0 }}>
            <label className="zeile">
              <span>Arbeitstitel (leer = Vorschlag der KI)</span>
              <input className="feld" value={titel} onChange={(e) => setTitel(e.target.value)} />
            </label>
            <label className="zeile">
              <span>Projektart</span>
              <select className="feld" value={art} onChange={(e) => setArt(e.target.value)}>
                <option value="">— noch offen —</option>
                {daten.projektarten.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="zeile">
              <span>Kunde</span>
              <select className="feld" value={kunde} onChange={(e) => setKunde(e.target.value)}>
                <option value="">— noch offen —</option>
                {daten.kunden.map((k) => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
            </label>
          </div>

          <p className="hinweis">
            Der Gesprächsverlauf wird nicht nachgebaut: Ein erfundener Dialog würde
            Menschen Aussagen zuschreiben, die sie nie gemacht haben. Stattdessen tragen
            die Fakten die Quelle „import", und der Assistent fragt anschließend die
            Lücken ab.
          </p>
          {laeuft && (
            <Arbeitsanzeige
              stand={stand}
              text="liest den Text und zieht die Fakten heraus …"
            />
          )}
        </>
      )}
    />
  );
}
