// Mehrere Personen an einer Erfolgsgeschichte (E-23).
//
// Drei Bausteine, die zusammen eine Frage beantworten: Wer weiß was?
//
//   - `AnfrageKasten`  — jemanden bitten, mitzuarbeiten
//   - `MeineAnfragen`  — was andere von mir wollen (Startseite)
//   - `UeberspringenKasten` — „das kann ich nicht beantworten"
//
// Der Link steht in jedem Fall da, auch wenn eine Mail rausgeht: Er ist der
// Weg, der immer funktioniert — per Teams geschickt, in einen Termin gelegt,
// vorgelesen. Eine Mail, die im Spam landet, ist unsichtbar; ein Link, den
// man selbst verschickt, nicht.
import { useState } from 'react';
import { api, type Anfrage, type Katalogeintrag, type Uebersprungen } from '../lib/api.ts';
import { Kasten } from './teile.tsx';

/** Wen frage ich, und warum? */
export function AnfrageKasten(
  { storyId, anfragen, adressen, mailMoeglich, zu, neuLaden, fehler }:
  {
    storyId: number;
    anfragen: Anfrage[];
    adressen: { email: string; name: string | null }[];
    mailMoeglich: boolean;
    zu: () => void;
    neuLaden: () => void;
    fehler: (t: string) => void;
  },
) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [hinweis, setHinweis] = useState('');
  const [mail, setMail] = useState(mailMoeglich);
  const [laeuft, setLaeuft] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [mailFehler, setMailFehler] = useState<string | null>(null);

  const offen = anfragen.filter((a) => a.status === 'offen');

  const fragen = async () => {
    if (!email.trim() || laeuft) return;
    setLaeuft(true);
    setMailFehler(null);
    try {
      const r = await api.anfrageNeu(storyId, {
        an_email: email.trim(),
        an_name: name.trim() || null,
        hinweis: hinweis.trim() || null,
        mail,
      });
      setLink(r.link);
      setMailFehler(r.mail_fehler);
      setEmail('');
      setName('');
      setHinweis('');
      neuLaden();
    } catch (e) {
      fehler(e instanceof Error ? e.message : String(e));
    } finally {
      setLaeuft(false);
    }
  };

  const beenden = async (id: number, status: 'erledigt' | 'abgelehnt') => {
    try {
      await api.anfrageBeenden(id, status);
      neuLaden();
    } catch (e) {
      fehler(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Kasten
      titel="Kollegen um Mithilfe bitten"
      zu={zu}
      kinder={(
        <>
      <p className="hinweis">
        Niemand weiß alles über ein Projekt. Wer gefragt wird, beantwortet die
        Fragen, die er beantworten kann, und überspringt die anderen — die
        bleiben dann für die Nächste offen.
      </p>

      <label className="zeile">
        <span>E-Mail-Adresse</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          list="bekannte-adressen"
          placeholder="vorname.nachname@mybits.de"
          autoFocus
        />
      </label>
      {/* Vorschläge, kein Adressbuch: Eine Anfrage an jemanden, der noch nie
          hier war, ist der häufigste Fall. */}
      <datalist id="bekannte-adressen">
        {adressen.map((a) => <option key={a.email} value={a.email}>{a.name ?? ''}</option>)}
      </datalist>

      <label className="zeile">
        <span>Name (optional)</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vorname Nachname" />
      </label>

      <label className="zeile">
        <span>Worum geht es?</span>
        <textarea
          value={hinweis}
          onChange={(e) => setHinweis(e.target.value)}
          rows={3}
          placeholder="Du hast die Schnittstelle gebaut — kannst du die technische Seite ergänzen?"
        />
      </label>

      {mailMoeglich ? (
        <label className="haken">
          <input type="checkbox" checked={mail} onChange={(e) => setMail(e.target.checked)} />
          Auch eine E-Mail schicken
        </label>
      ) : (
        <p className="hinweis">
          Kein Mailversand eingerichtet — die Anfrage erscheint beim Gefragten in
          der Anwendung, und den Link unten kannst du selbst weitergeben.
          Einrichten: Verwaltung → Einstellungen → Mailserver.
        </p>
      )}

      <div className="reihe">
        <button type="button" className="knopf haupt" onClick={fragen} disabled={!email.trim() || laeuft}>
          {laeuft ? 'Wird angelegt …' : 'Bitten'}
        </button>
      </div>

      {mailFehler && (
        <p className="warnung">
          Die Anfrage steht, aber die Mail ging nicht raus: {mailFehler}
          {' '}Gib den Link weiter, dann ist es trotzdem erledigt.
        </p>
      )}

      {link && (
        <label className="zeile">
          <span>Link zum Weitergeben</span>
          <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
        </label>
      )}

      {offen.length > 0 && (
        <>
          <h3>Offen</h3>
          <ul className="anfrageliste">
            {offen.map((a) => (
              <li key={a.id}>
                <div>
                  <b>{a.an_name || a.an_email}</b>
                  {a.an_name && <span className="hinweis"> · {a.an_email}</span>}
                  {a.hinweis && <div className="hinweis">{a.hinweis}</div>}
                  <div className="hinweis">
                    gebeten von {a.von_name}
                    {a.mail_versandt ? ' · Mail verschickt' : ''}
                    {a.mail_fehler ? ` · Mail fehlgeschlagen: ${a.mail_fehler}` : ''}
                  </div>
                </div>
                <button type="button" className="knopf leise" onClick={() => beenden(a.id, 'erledigt')}>
                  erledigt
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
        </>
      )}
    />
  );
}

/**
 * „Das kann ich nicht beantworten."
 *
 * Zur Auswahl stehen die noch offenen Pflichtfakten. Ausdrücklich eine
 * Auswahl und kein „überspringe die letzte Frage": Eine Frage im Gespräch
 * kann mehrere Punkte berühren, und welchen die Person nicht weiß, weiß nur
 * sie.
 */
export function UeberspringenKasten(
  { storyId, offen, uebersprungen, ichKennung, zu, neuLaden, fehler }:
  {
    storyId: number;
    offen: { schluessel: string; label: string }[];
    uebersprungen: Uebersprungen[];
    ichKennung: string;
    zu: () => void;
    neuLaden: () => void;
    fehler: (t: string) => void;
  },
) {
  const [gewaehlt, setGewaehlt] = useState<Set<string>>(new Set());
  const [grund, setGrund] = useState('');
  const [laeuft, setLaeuft] = useState(false);

  const meine = new Set(
    uebersprungen.filter((u) => u.person === ichKennung).map((u) => u.schluessel),
  );
  const andere = uebersprungen.filter((u) => u.person !== ichKennung);
  const waehlbar = offen.filter((o) => !meine.has(o.schluessel));

  const umschalten = (s: string) => {
    const neu = new Set(gewaehlt);
    if (neu.has(s)) neu.delete(s); else neu.add(s);
    setGewaehlt(neu);
  };

  const speichern = async () => {
    if (!gewaehlt.size || laeuft) return;
    setLaeuft(true);
    try {
      for (const s of gewaehlt) {
        await api.ueberspringen(storyId, s, grund.trim() || null);
      }
      setGewaehlt(new Set());
      setGrund('');
      neuLaden();
      zu();
    } catch (e) {
      fehler(e instanceof Error ? e.message : String(e));
    } finally {
      setLaeuft(false);
    }
  };

  const zurueck = async (s: string) => {
    try {
      await api.frageWiederStellen(storyId, s);
      neuLaden();
    } catch (e) {
      fehler(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Kasten
      titel="Was ich nicht beantworten kann"
      zu={zu}
      kinder={(
        <>
      <p className="hinweis">
        Übersprungene Punkte fragt der Assistent <b>dich</b> nicht mehr. Für
        alle anderen bleiben sie offen — genau darum lohnt es sich, jemanden
        dazuzuholen.
      </p>

      {waehlbar.length === 0 ? (
        <p className="hinweis">Zurzeit ist nichts offen, das du überspringen könntest.</p>
      ) : (
        <ul className="auswahl">
          {waehlbar.map((o) => (
            <li key={o.schluessel}>
              <label className="haken">
                <input
                  type="checkbox"
                  checked={gewaehlt.has(o.schluessel)}
                  onChange={() => umschalten(o.schluessel)}
                />
                {o.label}
                {andere.some((u) => u.schluessel === o.schluessel) && (
                  <span className="hinweis">
                    {' '}· hat {andere.find((u) => u.schluessel === o.schluessel)?.person_name
                      ?? 'jemand anderes'} auch übersprungen
                  </span>
                )}
              </label>
            </li>
          ))}
        </ul>
      )}

      {gewaehlt.size > 0 && (
        <label className="zeile">
          <span>Grund (optional, hilft dem Nächsten)</span>
          <input
            value={grund}
            onChange={(e) => setGrund(e.target.value)}
            placeholder="war nicht im Projekt dabei"
          />
        </label>
      )}

      <div className="reihe">
        <button
          type="button"
          className="knopf haupt"
          onClick={speichern}
          disabled={!gewaehlt.size || laeuft}
        >
          {laeuft ? 'Wird vermerkt …' : `${gewaehlt.size || ''} überspringen`}
        </button>
      </div>

      {meine.size > 0 && (
        <>
          <h3>Von mir übersprungen</h3>
          <ul className="anfrageliste">
            {[...meine].map((s) => (
              <li key={s}>
                <span>{offen.find((o) => o.schluessel === s)?.label ?? s}</span>
                <button type="button" className="knopf leise" onClick={() => zurueck(s)}>
                  doch fragen
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
        </>
      )}
    />
  );
}

/** Was andere von mir wollen - auf der Startseite. */
export function MeineAnfragen(
  { anfragen, oeffnen }: { anfragen: Anfrage[]; oeffnen: (id: number) => void },
) {
  if (!anfragen.length) return null;
  return (
    <section className="angefragt">
      <h2>Für mich angefragt</h2>
      <table className="liste">
        <tbody>
          {anfragen.map((a) => (
            <tr key={a.id}>
              <td>
                <b>{a.arbeitstitel ?? `Erfolgsgeschichte ${a.story_id}`}</b>
                {a.hinweis && <div className="hinweis">{a.hinweis}</div>}
              </td>
              <td className="hinweis">von {a.von_name}</td>
              <td>
                <button type="button" className="knopf" onClick={() => oeffnen(a.story_id)}>
                  Mitarbeiten
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** Woher die Angaben kommen - in der Faktenansicht. */
export function Beteiligte(
  { wer, uebersprungen, katalog }:
  {
    wer: { name: string; fakten: number }[];
    uebersprungen: Uebersprungen[];
    katalog: Katalogeintrag[];
  },
) {
  if (!wer.length && !uebersprungen.length) return null;
  const label = (s: string) => katalog.find((k) => k.schluessel === s)?.label ?? s;
  return (
    <div className="beteiligte">
      {wer.length > 0 && (
        <p className="hinweis">
          Beigetragen:{' '}
          {wer.map((b, i) => (
            <span key={b.name}>
              {i > 0 && ' · '}
              {b.name} ({b.fakten})
            </span>
          ))}
        </p>
      )}
      {uebersprungen.length > 0 && (
        <p className="hinweis">
          Übersprungen:{' '}
          {uebersprungen.map((u, i) => (
            <span key={`${u.person}-${u.schluessel}`}>
              {i > 0 && ' · '}
              {label(u.schluessel)} ({u.person_name ?? 'jemand'}
              {u.grund ? `: ${u.grund}` : ''})
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
