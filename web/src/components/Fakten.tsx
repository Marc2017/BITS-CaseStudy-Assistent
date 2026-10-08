// Der Faktenbestand: sichtbar, korrigierbar, und er zeigt, was noch fehlt.
//
// Die Stufe ist hier kein Nebending: Sie entscheidet, ob ein Fakt auf die
// Website darf. Deshalb steht sie an jedem Fakt und ist mit einem Klick
// aenderbar.
import { useState } from 'react';
import {
  api, STUFEN,
  type Fakt, type Fortschritt, type Katalogeintrag, type Stufe, type Uebersprungen,
} from '../lib/api.ts';
import { Kasten, StufenKnopf } from './teile.tsx';
import { Beteiligte } from './Mitarbeit.tsx';

export function Fakten(
  { storyId, fakten, stand, katalog, beteiligte, uebersprungen, aktualisieren, fehler }:
  {
    storyId: number;
    fakten: Fakt[];
    stand: Fortschritt;
    katalog: Katalogeintrag[];
    beteiligte: { name: string; fakten: number }[];
    uebersprungen: Uebersprungen[];
    aktualisieren: (f: Fakt[], s: Fortschritt) => void;
    fehler: (t: string) => void;
  },
) {
  const [neu, setNeu] = useState(false);

  const machen = async (fn: () => Promise<{ fakten: Fakt[]; fortschritt: Fortschritt }>) => {
    try {
      const r = await fn();
      aktualisieren(r.fakten, r.fortschritt);
    } catch (e) {
      fehler(e instanceof Error ? e.message : String(e));
    }
  };

  // Nach Rubrik gruppieren, in der Reihenfolge des Katalogs.
  const rubrikFolge = [...new Set(katalog.map((k) => k.rubrik))];
  const gruppen = new Map<string, Fakt[]>();
  for (const f of fakten) {
    const r = f.rubrik ?? 'Weiteres';
    if (!gruppen.has(r)) gruppen.set(r, []);
    gruppen.get(r)!.push(f);
  }
  const rubriken = [
    ...rubrikFolge.filter((r) => gruppen.has(r)),
    ...[...gruppen.keys()].filter((r) => !rubrikFolge.includes(r)),
  ];

  const label = (schluessel: string) =>
    katalog.find((k) => k.schluessel === schluessel)?.label ?? schluessel;

  return (
    <>
      <div className="fakten">
        {fakten.length === 0 && (
          <div className="leer" style={{ margin: 18 }}>
            Noch keine Fakten. Sie entstehen im Gespräch — oder tragen Sie den ersten
            von Hand ein.
          </div>
        )}

        {rubriken.map((rubrik) => (
          <div key={rubrik}>
            <div className="rubrik">{rubrik}</div>
            {gruppen.get(rubrik)!.map((f) => (
              <div className="fakt" key={f.id}>
                <div>
                  <div className="schluessel">{label(f.schluessel)}</div>
                  <div
                    className="wert"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const wert = e.currentTarget.textContent?.trim() ?? '';
                      if (wert && wert !== f.wert) {
                        machen(() => api.faktPatch(f.id, storyId, { wert }));
                      } else if (!wert) {
                        e.currentTarget.textContent = f.wert;
                      }
                    }}
                  >
                    {f.wert}
                  </div>
                  {f.beleg && <div className="beleg">Beleg: {f.beleg}</div>}
                  {f.quelle === 'import' && (
                    <div className="beleg">aus einem bestehenden Text übernommen</div>
                  )}
                  {f.beigetragen_name && (
                    <div className="beleg">von {f.beigetragen_name}</div>
                  )}
                </div>
                <div className="werkzeug">
                  {!f.sicher && (
                    <span className="unsicher" title="unbelegt oder nicht bestätigt">
                      unbestätigt
                    </span>
                  )}
                  <StufenKnopf
                    stufe={f.stufe}
                    aendern={(stufe) => machen(() => api.faktPatch(f.id, storyId, { stufe }))}
                  />
                  <button
                    type="button"
                    className="knopf leise"
                    title="Fakt löschen"
                    onClick={() => machen(() => api.faktWeg(f.id, storyId))}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}

        {stand.offen.length > 0 && (
          <>
            <div className="rubrik">Fehlt noch</div>
            {stand.offen.map((o) => (
              <div className="fehlend" key={o.schluessel}>
                <b>{o.label}</b>
                {o.hinweis && <div className="hinweis">{o.hinweis}</div>}
              </div>
            ))}
          </>
        )}
      
        {/* Wer was beigetragen und wer was übersprungen hat (E-23).
            Hier und nicht in der Kopfzeile: Es gehört zum Bestand,
            nicht zur Steuerung. */}
        <Beteiligte wer={beteiligte} uebersprungen={uebersprungen} katalog={katalog} />
      </div>

      <div className="werkzeugleiste">
        <button type="button" className="knopf" onClick={() => setNeu(true)}>
          Fakt eintragen
        </button>
        <div className="rechts gespeichert">
          {fakten.filter((f) => f.stufe === 'oeffentlich').length} öffentlich ·{' '}
          {fakten.filter((f) => f.stufe === 'intern').length} intern ·{' '}
          {fakten.filter((f) => f.stufe === 'vertraulich').length} vertraulich
        </div>
      </div>

      {neu && (
        <NeuerFakt
          katalog={katalog}
          zu={() => setNeu(false)}
          speichern={async (e) => {
            await machen(() => api.faktNeu(storyId, e));
            setNeu(false);
          }}
        />
      )}
    </>
  );
}

function NeuerFakt(
  { katalog, zu, speichern }:
  {
    katalog: Katalogeintrag[];
    zu: () => void;
    speichern: (e: Record<string, unknown>) => Promise<void>;
  },
) {
  const [schluessel, setSchluessel] = useState(katalog[0]?.schluessel ?? '');
  const [wert, setWert] = useState('');
  const [beleg, setBeleg] = useState('');
  const [stufe, setStufe] = useState<Stufe>(katalog[0]?.stufe_vorschlag ?? 'intern');
  const eintrag = katalog.find((k) => k.schluessel === schluessel);

  return (
    <Kasten
      titel="Fakt eintragen"
      zu={zu}
      fuss={(
        <>
          <button type="button" className="knopf" onClick={zu}>Abbrechen</button>
          <button
            type="button"
            className="knopf haupt"
            disabled={!wert.trim() || !schluessel}
            onClick={() => speichern({
              schluessel, wert: wert.trim(), stufe, beleg: beleg.trim() || null, sicher: true,
            })}
          >
            Eintragen
          </button>
        </>
      )}
      kinder={(
        <>
          <label className="zeile">
            <span>Was für ein Fakt</span>
            <select
              className="feld"
              value={schluessel}
              onChange={(e) => {
                setSchluessel(e.target.value);
                const k = katalog.find((x) => x.schluessel === e.target.value);
                if (k) setStufe(k.stufe_vorschlag);
              }}
            >
              {[...new Set(katalog.map((k) => k.rubrik))].map((rubrik) => (
                <optgroup key={rubrik} label={rubrik}>
                  {katalog.filter((k) => k.rubrik === rubrik).map((k) => (
                    <option key={k.schluessel} value={k.schluessel}>
                      {k.label}{k.pflicht ? ' (Pflicht)' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          {eintrag?.hinweis && <p className="hinweis" style={{ marginTop: -6, marginBottom: 12 }}>{eintrag.hinweis}</p>}

          <label className="zeile">
            <span>Wert</span>
            <textarea
              className="feld"
              value={wert}
              autoFocus
              onChange={(e) => setWert(e.target.value)}
            />
          </label>
          <label className="zeile">
            <span>Beleg (woher kommt die Angabe?)</span>
            <input className="feld" value={beleg} onChange={(e) => setBeleg(e.target.value)} />
          </label>
          <label className="zeile">
            <span>Vertraulichkeit</span>
            <select
              className="feld"
              value={stufe}
              onChange={(e) => setStufe(e.target.value as Stufe)}
            >
              {STUFEN.map((s) => (
                <option key={s.wert} value={s.wert}>{s.name} — {s.erklaerung}</option>
              ))}
            </select>
          </label>
        </>
      )}
    />
  );
}
