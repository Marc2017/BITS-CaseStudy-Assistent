// Verwaltung: Ziele, Projektarten, Faktenkatalog, Gelerntes, Einstellungen.
//
// Alle vier sind Daten und keine Programmlogik (E-06/E-11) - deshalb sind sie
// hier bearbeitbar, ohne dass jemand Code anfassen muss.
import { useEffect, useState } from 'react';
import {
  api, datum, STUFEN, type Ich, type Katalogeintrag, type Kunde,
  type Lernnotiz, type Projektart, type Stufe, type Verwaltungsdaten,
  type Ziel,
} from '../lib/api.ts';
import { Fehlerbalken, ThemaKnopf } from './teile.tsx';

type Seite = 'ziele' | 'projektarten' | 'kunden' | 'katalog' | 'gelernt' | 'einstellungen';

export function Verwaltung(
  { zurueck, ich }: { zurueck: () => void; ich?: Ich },
) {
  const [seite, setSeite] = useState<Seite>('ziele');
  const [daten, setDaten] = useState<Verwaltungsdaten | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  // Lesen darf jeder Angemeldete - die Vorlagen zu SEHEN hilft beim
  // Verstehen, und ohne sie waere die Seite leer. Aendern nur die Verwaltung.
  const darfAendern = ich?.verwalter ?? true;

  const laden = () => {
    api.verwaltung().then(setDaten)
      .catch((e) => setFehler(e instanceof Error ? e.message : String(e)));
  };
  useEffect(laden, []);

  const seiten: { s: Seite; name: string }[] = [
    { s: 'ziele', name: 'Ziele und Vorlagen' },
    { s: 'projektarten', name: 'Projektarten' },
    { s: 'kunden', name: 'Kunden' },
    { s: 'katalog', name: 'Faktenkatalog' },
    { s: 'gelernt', name: 'Gelernt' },
    { s: 'einstellungen', name: 'Einstellungen' },
  ];

  return (
    <>
      <div className="kopf">
        <button type="button" className="marke" onClick={zurueck}>
          <i /> <small>Erfolgsgeschichten</small>
        </button>
        <div className="titel" style={{ fontWeight: 600, fontSize: 15, paddingLeft: 8 }}>
          Verwaltung
        </div>
        <ThemaKnopf />
        <button type="button" className="knopf" onClick={zurueck}>Zurück</button>
      </div>

      <div className="verwaltung">
        <nav>
          {seiten.map(({ s, name }) => (
            <button
              key={s}
              type="button"
              aria-current={seite === s}
              onClick={() => setSeite(s)}
            >
              {name}
              {s === 'gelernt' && daten?.lernnotizen.length
                ? ` (${daten.lernnotizen.length})` : ''}
            </button>
          ))}
        </nav>

        <div className="rolle">
          <Fehlerbalken text={fehler} weg={() => setFehler(null)} />
          {!darfAendern && (
            <p className="hinweis" style={{
              border: '1px solid var(--line-hell)', borderLeft: '3px solid var(--ph)',
              borderRadius: 6, padding: '10px 12px', marginBottom: 18, maxWidth: '70ch',
            }}
            >
              Sie sehen die Vorlagen, können sie aber nicht ändern: Dafür braucht es die
              Rolle <code>{ich?.verwalterRolle}</code>. Erfolgsgeschichten schreiben
              dürfen Sie ohne diese Rolle.
            </p>
          )}
          {!daten && 'Lädt …'}
          {daten && seite === 'ziele' && (
            <Ziele ziele={daten.ziele} fehler={setFehler} neuLaden={laden} />
          )}
          {daten && seite === 'projektarten' && (
            <Projektarten arten={daten.projektarten} fehler={setFehler} neuLaden={laden} />
          )}
          {daten && seite === 'kunden' && (
            <Kunden liste={daten.kunden} fehler={setFehler} neuLaden={laden} />
          )}
          {daten && seite === 'katalog' && (
            <Katalog eintraege={daten.katalog} fehler={setFehler} neuLaden={laden} />
          )}
          {daten && seite === 'gelernt' && (
            <Gelernt notizen={daten.lernnotizen} fehler={setFehler} neuLaden={laden} />
          )}
          {daten && seite === 'einstellungen' && (
            <Einstellungen daten={daten} fehler={setFehler} neuLaden={laden} />
          )}
        </div>
      </div>
    </>
  );
}

// -------------------------------------------------------------------- Ziele

function Ziele(
  { ziele, fehler, neuLaden }:
  { ziele: Ziel[]; fehler: (t: string) => void; neuLaden: () => void },
) {
  return (
    <>
      <h2>Ziele und Vorlagen</h2>
      <p className="hinweis">
        Ein Ziel ist eine Textsorte: der Prompt sagt, wie formuliert wird, die
        Abschnitte sagen, was drinsteht, und die Grenze sagt, welche Fakten überhaupt
        hineindürfen. Die Grenze ist die wichtigste Angabe — sie ist der Unterschied
        zwischen einem Text für die Website und einem für den internen Gebrauch.
      </p>

      {ziele.map((z) => (
        <ZielKarte key={z.id} ziel={z} fehler={fehler} neuLaden={neuLaden} />
      ))}
    </>
  );
}

function ZielKarte(
  { ziel, fehler, neuLaden }:
  { ziel: Ziel; fehler: (t: string) => void; neuLaden: () => void },
) {
  const [prompt, setPrompt] = useState(ziel.prompt);
  const [stufe, setStufe] = useState<Stufe>(ziel.stufe);
  const [laenge, setLaenge] = useState(ziel.laenge ?? '');
  const [lernmodus, setLernmodus] = useState(ziel.lernmodus === 1);
  const [gespeichert, setGespeichert] = useState(false);

  const abschnitte: { titel: string }[] = (() => {
    try { return JSON.parse(ziel.struktur); } catch { return []; }
  })();

  const geaendert = prompt !== ziel.prompt || stufe !== ziel.stufe
    || laenge !== (ziel.laenge ?? '') || lernmodus !== (ziel.lernmodus === 1);

  const speichern = async () => {
    try {
      await api.zielSpeichern({
        schluessel: ziel.schluessel, name: ziel.name, beschreibung: ziel.beschreibung,
        prompt, struktur: ziel.struktur, stufe, laenge: laenge || null,
        lernmodus: lernmodus ? 1 : 0, sort: ziel.sort, aktiv: ziel.aktiv,
      });
      setGespeichert(true);
      neuLaden();
      window.setTimeout(() => setGespeichert(false), 2500);
    } catch (e) {
      fehler(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="karte">
      <header>
        <h3>{ziel.name}</h3>
        <span className={`grenze stufe ${stufe}`}>
          bis {STUFEN.find((s) => s.wert === stufe)?.name}
        </span>
        {gespeichert && <span className="gespeichert">gespeichert</span>}
        <button type="button" className="knopf haupt" disabled={!geaendert} onClick={speichern}>
          Speichern
        </button>
      </header>

      <p className="hinweis">{ziel.beschreibung}</p>

      <label className="zeile">
        <span>Formulierungsanweisung (der Prompt)</span>
        <textarea className="feld" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      </label>

      <div className="reihe">
        <label className="zeile">
          <span>Vertraulichkeitsgrenze</span>
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
        <label className="zeile">
          <span>Richtwert für die Länge</span>
          <input className="feld" value={laenge} onChange={(e) => setLaenge(e.target.value)} />
        </label>
      </div>

      <div className="reihe" style={{ alignItems: 'center' }}>
        <label className="schalter">
          <input
            type="checkbox"
            checked={lernmodus}
            onChange={(e) => setLernmodus(e.target.checked)}
          />
          Lernmodus — nach einer Sitzung auswerten, was gefehlt hat
        </label>
        <span className="hinweis">
          Abschnitte: {abschnitte.map((a) => a.titel).join(' · ') || 'keine'}
        </span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- Projektarten

function Projektarten(
  { arten, fehler, neuLaden }:
  { arten: Projektart[]; fehler: (t: string) => void; neuLaden: () => void },
) {
  const [neu, setNeu] = useState('');

  const anlegen = async () => {
    if (!neu.trim()) return;
    try {
      await api.projektartSpeichern({ name: neu.trim(), hinweise: '', lernmodus: 1 });
      setNeu('');
      neuLaden();
    } catch (e) {
      fehler(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <>
      <h2>Projektarten</h2>
      <p className="hinweis">
        Die Hinweise einer Projektart gehen in jedes Interview ein, das ihr zugeordnet
        ist. Hier sammelt sich über Zeit an, was bei dieser Art von Vorhaben gefragt
        werden muss — von Hand oder über den Lernmodus. Eine kundenspezifische Art
        („Projekt bei MAN") ist ausdrücklich vorgesehen.
      </p>

      <div className="karte">
        <header><h3>Neue Projektart</h3></header>
        <div className="reihe">
          <input
            className="feld"
            value={neu}
            placeholder="z. B. Projekt bei Siemens Energy"
            onChange={(e) => setNeu(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') anlegen(); }}
          />
          <button
            type="button"
            className="knopf haupt"
            style={{ flex: '0 0 auto' }}
            onClick={anlegen}
            disabled={!neu.trim()}
          >
            Anlegen
          </button>
        </div>
      </div>

      {arten.map((a) => (
        <ArtKarte key={a.id} art={a} fehler={fehler} neuLaden={neuLaden} />
      ))}
    </>
  );
}

function ArtKarte(
  { art, fehler, neuLaden }:
  { art: Projektart; fehler: (t: string) => void; neuLaden: () => void },
) {
  const [hinweise, setHinweise] = useState(art.hinweise ?? '');
  const [beschreibung, setBeschreibung] = useState(art.beschreibung ?? '');
  const [lernmodus, setLernmodus] = useState(art.lernmodus === 1);
  const [gespeichert, setGespeichert] = useState(false);

  const geaendert = hinweise !== (art.hinweise ?? '')
    || beschreibung !== (art.beschreibung ?? '')
    || lernmodus !== (art.lernmodus === 1);

  const speichern = async () => {
    try {
      await api.projektartSpeichern({
        id: art.id, name: art.name, beschreibung, hinweise,
        lernmodus: lernmodus ? 1 : 0, sort: art.sort, aktiv: art.aktiv,
      });
      setGespeichert(true);
      neuLaden();
      window.setTimeout(() => setGespeichert(false), 2500);
    } catch (e) {
      fehler(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="karte">
      <header>
        <h3>{art.name}</h3>
        {gespeichert && <span className="gespeichert">gespeichert</span>}
        <button type="button" className="knopf haupt" disabled={!geaendert} onClick={speichern}>
          Speichern
        </button>
      </header>
      <label className="zeile">
        <span>Wofür diese Art gilt</span>
        <input
          className="feld"
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
        />
      </label>
      <label className="zeile">
        <span>Hinweise für das Interview</span>
        <textarea
          className="feld"
          value={hinweise}
          placeholder="- Nach dem Wartungsfenster fragen&#10;- Nach dem führenden System fragen"
          onChange={(e) => setHinweise(e.target.value)}
        />
      </label>
      <label className="schalter">
        <input
          type="checkbox"
          checked={lernmodus}
          onChange={(e) => setLernmodus(e.target.checked)}
        />
        Lernmodus an
      </label>
    </div>
  );
}

// ---------------------------------------------------------------- Katalog

function Katalog(
  { eintraege, fehler, neuLaden }:
  { eintraege: Katalogeintrag[]; fehler: (t: string) => void; neuLaden: () => void },
) {
  const speichern = async (e: Katalogeintrag, aenderung: Partial<Katalogeintrag>) => {
    try {
      await api.katalogSpeichern({ ...e, ...aenderung });
      neuLaden();
    } catch (x) {
      fehler(x instanceof Error ? x.message : String(x));
    }
  };

  const pflichtZahl = eintraege.filter((e) => e.pflicht && e.aktiv).length;

  return (
    <>
      <h2>Faktenkatalog</h2>
      <p className="hinweis">
        Was eine Erfolgsgeschichte braucht. Pflichtfakten zählen in die Faktenspur oben
        und bestimmen, wann der Assistent eine Fassung vorschlägt — derzeit{' '}
        <b>{pflichtZahl}</b>. Wird die Liste länger, dauert das Interview länger: Das ist
        die eigentliche Stellschraube des Werkzeugs.
      </p>

      <table className="tab">
        <thead>
          <tr>
            <th>Fakt</th><th>Rubrik</th><th>Pflicht</th><th>mehrfach</th>
            <th>Vorgabestufe</th><th>aktiv</th>
          </tr>
        </thead>
        <tbody>
          {eintraege.map((e) => (
            <tr key={e.id}>
              <td>
                <div className="haupt">{e.label}</div>
                <div className="neben">{e.hinweis}</div>
              </td>
              <td className="neben">{e.rubrik}</td>
              <td>
                <input
                  type="checkbox"
                  checked={e.pflicht === 1}
                  onChange={(x) => speichern(e, { pflicht: x.target.checked ? 1 : 0 })}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={e.mehrfach === 1}
                  onChange={(x) => speichern(e, { mehrfach: x.target.checked ? 1 : 0 })}
                />
              </td>
              <td>
                <select
                  value={e.stufe_vorschlag}
                  onChange={(x) => speichern(e, { stufe_vorschlag: x.target.value as Stufe })}
                  style={{
                    background: 'var(--bg-3)', border: '1px solid var(--line)',
                    borderRadius: 6, padding: '3px 6px',
                  }}
                >
                  {STUFEN.map((s) => (
                    <option key={s.wert} value={s.wert}>{s.name}</option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={e.aktiv === 1}
                  onChange={(x) => speichern(e, { aktiv: x.target.checked ? 1 : 0 })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// ---------------------------------------------------------------- Gelernt

function Gelernt(
  { notizen, fehler, neuLaden }:
  { notizen: Lernnotiz[]; fehler: (t: string) => void; neuLaden: () => void },
) {
  const [meldung, setMeldung] = useState<string | null>(null);

  const tun = async (fn: () => Promise<{ hinweis?: string; notizen: Lernnotiz[] }>) => {
    try {
      const r = await fn();
      if (r.hinweis) setMeldung(r.hinweis);
      neuLaden();
    } catch (e) {
      fehler(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <>
      <h2>Gelernt</h2>
      <p className="hinweis">
        Vorschläge aus geführten Gesprächen: welche Frage gefehlt hat, welche Eigenheit
        einer Projektart man kennen muss. Nichts davon wirkt, bis es hier übernommen
        wird — eine Vorlage, die sich selbst umschreibt, wäre nach zwanzig Läufen
        niemandes Entscheidung mehr.
      </p>
      {meldung && <p className="hinweis" style={{ color: 'var(--accent-2)' }}>{meldung}</p>}

      {notizen.length === 0 && (
        <div className="leer">
          Nichts offen. Neue Vorschläge entstehen, wenn im Arbeitsbereich „Auswerten"
          gedrückt wird und die Projektart oder das Ziel den Lernmodus tragen.
        </div>
      )}

      {notizen.map((n) => (
        <div className="karte notiz-karte" key={n.id}>
          <header>
            <h3>{n.text}</h3>
            <button
              type="button"
              className="knopf haupt"
              onClick={() => tun(() => api.lernUebernehmen(n.id))}
            >
              Übernehmen
            </button>
            <button
              type="button"
              className="knopf"
              onClick={() => tun(() => api.lernVerwerfen(n.id))}
            >
              Verwerfen
            </button>
          </header>
          <div className="warum">
            {n.begruendung}
          </div>
          <div className="hinweis" style={{ marginTop: 8 }}>
            Ziel: {
              n.bezug === 'projektart' ? 'Projektart'
                : n.bezug === 'kunde' ? 'Kunde'
                  : n.bezug === 'ziel' ? 'Ziel' : 'Faktenkatalog'
            }
            {n.bezug_name ? ` „${n.bezug_name}"` : ''}
            {n.story_titel ? ` · aus: ${n.story_titel}` : ''}
            {` · ${datum(n.erstellt_am)}`}
          </div>
        </div>
      ))}
    </>
  );
}

// ------------------------------------------------------------ Einstellungen

const BESCHRIFTUNG: Record<string, { name: string; hinweis: string; typ?: string }> = {
  'ki.anbieter': {
    name: 'Anbieter',
    hinweis: 'anthropic (Claude) oder azure (Azure OpenAI). Azure ist vorbereitet, aber '
      + 'noch nicht gegen einen echten Endpunkt getestet.',
  },
  'ki.modell': { name: 'Modell', hinweis: 'Leer = claude-opus-5.' },
  'ki.effort': { name: 'Effort-Stufe', hinweis: 'Leer = high im Interview, xhigh beim Formulieren.' },
  'ki.api_key': { name: 'Anthropic API-Schlüssel', hinweis: 'console.anthropic.com → API Keys.', typ: 'password' },
  'ki.azure_key': { name: 'Azure-Schlüssel', hinweis: '', typ: 'password' },
  'ki.azure_endpunkt': { name: 'Azure-Endpunkt', hinweis: 'https://<name>.openai.azure.com' },
  'ki.azure_deployment': { name: 'Azure-Deployment', hinweis: 'Name des Deployments.' },
  'ki.azure_version': { name: 'Azure API-Version', hinweis: 'Leer = 2026-02-01.' },
  'ich.person': { name: 'Ich bin', hinweis: 'Wird als Autor an neue Erfolgsgeschichten geschrieben.' },

  // Mailversand fuer Anfragen (E-24). Ohne Server und Absender bleibt der
  // Haken „auch per E-Mail" verborgen - die Anfrage selbst funktioniert
  // trotzdem.
  'mail.host': {
    name: 'Mailserver',
    hinweis: 'Rechnername des SMTP-Servers. Leer = kein Mailversand; Anfragen '
      + 'erscheinen dann nur in der Anwendung.',
  },
  'mail.port': { name: 'Mail-Port', hinweis: 'Leer = 587 (STARTTLS). 465 für TLS ab der ersten Zeile.' },
  'mail.sicher': { name: 'Mail-TLS sofort', hinweis: '1 bei Port 465, 0 bei 587. Leer = aus dem Port geraten.' },
  'mail.benutzer': { name: 'Mail-Benutzer', hinweis: 'Leer, wenn der Server ohne Anmeldung sendet.' },
  'mail.passwort': { name: 'Mail-Passwort', hinweis: 'Im Mehrbenutzerbetrieb nur über die Umgebung (I-08).', typ: 'password' },
  'mail.absender': {
    name: 'Absenderadresse',
    hinweis: 'Was im Von-Feld steht, etwa "BITS Erfolgsgeschichten '
      + '<noreply@mybits.de>". Ohne Absender wird nicht gesendet.',
  },
};

function Einstellungen(
  { daten, fehler, neuLaden }:
  { daten: Verwaltungsdaten; fehler: (t: string) => void; neuLaden: () => void },
) {
  const [werte, setWerte] = useState<Record<string, string>>({});
  const [meldung, setMeldung] = useState<string | null>(null);

  const speichern = async () => {
    try {
      const r = await api.einstellungenSetzen(werte);
      setWerte({});
      setMeldung(
        `${r.geaendert} Einstellung${r.geaendert === 1 ? '' : 'en'} gespeichert. `
        + `KI-Zugang: ${r.ki.zugang ? `vorhanden (${r.ki.anbieter}, ${r.ki.modell})` : 'fehlt'}.`,
      );
      neuLaden();
    } catch (e) {
      fehler(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <>
      <h2>Einstellungen</h2>
      <p className="hinweis">
        Was hier steht, wirkt sofort und hat Vorrang vor der Datei <code>.env</code>.
        Schlüssel werden nur maskiert angezeigt — ein leeres Feld lässt den
        gespeicherten Wert unverändert.
      </p>

      <div className="karte">
        <header>
          <h3>KI-Zugang</h3>
          <span className={`grenze stufe ${daten.ki.zugang ? 'oeffentlich' : 'vertraulich'}`}>
            {daten.ki.zugang ? `${daten.ki.anbieter} · ${daten.ki.modell}` : 'kein Zugang'}
          </span>
          <button
            type="button"
            className="knopf haupt"
            disabled={Object.keys(werte).length === 0}
            onClick={speichern}
          >
            Speichern
          </button>
        </header>

        {meldung && <p className="hinweis" style={{ color: 'var(--accent-2)' }}>{meldung}</p>}

        {daten.einstellungen.map((e) => {
          const b = BESCHRIFTUNG[e.schluessel] ?? { name: e.schluessel, hinweis: '' };
          return (
            <label className="zeile" key={e.schluessel}>
              <span>
                {b.name}
                {e.gesetzt && (
                  <> — gesetzt: <code>{e.wert}</code>
                    {e.geaendert_am ? ` (${datum(e.geaendert_am)})` : ''}
                  </>
                )}
              </span>
              {e.schluessel === 'ki.anbieter' ? (
                <select
                  className="feld"
                  value={werte[e.schluessel] ?? e.wert ?? 'anthropic'}
                  onChange={(x) => setWerte((w) => ({ ...w, [e.schluessel]: x.target.value }))}
                >
                  <option value="anthropic">anthropic — Claude</option>
                  <option value="azure">azure — Azure OpenAI</option>
                </select>
              ) : (
                <input
                  className="feld"
                  type={b.typ ?? 'text'}
                  value={werte[e.schluessel] ?? ''}
                  placeholder={e.gesetzt ? '(unverändert)' : ''}
                  onChange={(x) => setWerte((w) => ({ ...w, [e.schluessel]: x.target.value }))}
                />
              )}
              {b.hinweis && <span className="hinweis">{b.hinweis}</span>}
            </label>
          );
        })}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------- Kunden

function Kunden(
  { liste, fehler, neuLaden }:
  { liste: Kunde[]; fehler: (t: string) => void; neuLaden: () => void },
) {
  const [neu, setNeu] = useState('');

  const anlegen = async () => {
    if (!neu.trim()) return;
    try {
      await api.kundeSpeichern({ name: neu.trim(), hinweise: '', lernmodus: 1 });
      setNeu('');
      neuLaden();
    } catch (e) {
      fehler(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <>
      <h2>Kunden</h2>
      <p className="hinweis">
        Ein Kunde ist eine eigene Achse, keine Projektart: Dieselbe Projektart kommt bei
        vielen Kunden vor, und was bei einem bestimmten Auftraggeber gilt, gilt dort für
        jede Projektart. Im Interview bekommt der Assistent <b>beide</b> Hinweistexte —
        die der Projektart und die des Kunden.
      </p>
      <p className="hinweis" style={{ marginBottom: 20 }}>
        Wird ein Kunde einer Erfolgsgeschichte zugeordnet, legt das Werkzeug daraus
        gleich drei Fakten an: den Namen (intern), die Branche und die anonymisierte
        Beschreibung (beide öffentlich). Korrigieren lassen sie sich danach im Gespräch —
        die Eingabe im Gespräch hat das letzte Wort.
      </p>

      <div className="karte">
        <header><h3>Neuer Kunde</h3></header>
        <div className="reihe">
          <input
            className="feld"
            value={neu}
            placeholder="Name des Auftraggebers"
            onChange={(e) => setNeu(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') anlegen(); }}
          />
          <button
            type="button"
            className="knopf haupt"
            style={{ flex: '0 0 auto' }}
            onClick={anlegen}
            disabled={!neu.trim()}
          >
            Anlegen
          </button>
        </div>
      </div>

      {liste.length === 0 && (
        <div className="leer">Noch keine Kunden hinterlegt.</div>
      )}
      {liste.map((k) => (
        <KundeKarte key={k.id} kunde={k} fehler={fehler} neuLaden={neuLaden} />
      ))}
    </>
  );
}

function KundeKarte(
  { kunde, fehler, neuLaden }:
  { kunde: Kunde; fehler: (t: string) => void; neuLaden: () => void },
) {
  const [branche, setBranche] = useState(kunde.branche ?? '');
  const [anonym, setAnonym] = useState(kunde.anonym ?? '');
  const [hinweise, setHinweise] = useState(kunde.hinweise ?? '');
  const [lernmodus, setLernmodus] = useState(kunde.lernmodus === 1);
  const [aktiv, setAktiv] = useState(kunde.aktiv === 1);
  const [gespeichert, setGespeichert] = useState(false);

  const geaendert = branche !== (kunde.branche ?? '')
    || anonym !== (kunde.anonym ?? '')
    || hinweise !== (kunde.hinweise ?? '')
    || lernmodus !== (kunde.lernmodus === 1)
    || aktiv !== (kunde.aktiv === 1);

  const speichern = async () => {
    try {
      await api.kundeSpeichern({
        id: kunde.id, name: kunde.name, branche, anonym, hinweise,
        lernmodus: lernmodus ? 1 : 0, sort: kunde.sort, aktiv: aktiv ? 1 : 0,
      });
      setGespeichert(true);
      neuLaden();
      window.setTimeout(() => setGespeichert(false), 2500);
    } catch (e) {
      fehler(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="karte">
      <header>
        <h3>{kunde.name}</h3>
        {!aktiv && <span className="hinweis">ausgeblendet</span>}
        {gespeichert && <span className="gespeichert">gespeichert</span>}
        <button type="button" className="knopf haupt" disabled={!geaendert} onClick={speichern}>
          Speichern
        </button>
      </header>

      <div className="reihe">
        <label className="zeile">
          <span>Branche</span>
          <input
            className="feld"
            value={branche}
            placeholder="z. B. Automotive &amp; Zulieferer"
            onChange={(e) => setBranche(e.target.value)}
          />
        </label>
        <label className="zeile">
          <span>Anonymisiert zu beschreiben als</span>
          <input
            className="feld"
            value={anonym}
            placeholder="z. B. ein internationaler Nutzfahrzeughersteller"
            onChange={(e) => setAnonym(e.target.value)}
          />
        </label>
      </div>

      <label className="zeile">
        <span>Hinweise für das Interview (gelten bei diesem Kunden für jede Projektart)</span>
        <textarea
          className="feld"
          value={hinweise}
          placeholder="- Nach der Gesellschaft und dem Werk fragen&#10;- Nach dem Lastenheft fragen: Stand, Version, wer es verantwortet"
          onChange={(e) => setHinweise(e.target.value)}
        />
      </label>

      <div className="reihe" style={{ alignItems: 'center' }}>
        <label className="schalter">
          <input
            type="checkbox"
            checked={lernmodus}
            onChange={(e) => setLernmodus(e.target.checked)}
          />
          Lernmodus an
        </label>
        <label className="schalter">
          <input
            type="checkbox"
            checked={aktiv}
            onChange={(e) => setAktiv(e.target.checked)}
          />
          in der Auswahl zeigen
        </label>
      </div>
    </div>
  );
}
