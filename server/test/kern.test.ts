// Tests fuer die Invarianten aus docs/02-datenmodell.md.
//
// Jede dieser Pruefungen steht hier, weil ihre Verletzung entweder stille
// Falschaussagen in einem Text erzeugt oder vertrauliche Angaben nach aussen
// traegt - und beides fiele ohne Test nicht auf.
//
// Die Tests arbeiten auf einer eigenen Datenbankdatei (BITS_EG_DB), damit der
// echte Bestand des Benutzers unberuehrt bleibt.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

const tempVerzeichnis = mkdtempSync(join(tmpdir(), 'bits-eg-test-'));
process.env.BITS_EG_DB = join(tempVerzeichnis, 'test.db');

const { datenbank, schreib, zahl } = await import('../src/db/index.ts');
const {
  faktenFuerZiel, faktSetzen, fakten, fortschritt, STUFEN_RANG, stufeOderIntern,
} = await import('../src/db/fakten.ts');
const { fassung, fassungSpeichern, sicherungen, storyAnlegen } = await import('../src/db/story.ts');
const { zielNach } = await import('../src/db/vorlagen.ts');
const { formulieren } = await import('../src/ki/formulierung.ts');
const { textAus } = await import('../src/ki/importieren.ts');
const { erstausstattungFallsLeer, seed } = await import('../src/seed/seed.ts');
const { mehrbenutzer } = await import('../src/db/betrieb.ts');
const { aenderbar, anzeige, setzen, SCHLUESSEL } = await import('../src/db/einstellung.ts');
const { zugangVorhanden } = await import('../src/ki/anbieter.ts');
const {
  ausCookie, cookieWert, sitzung, sitzungAnlegen, sitzungBeenden,
} = await import('../src/auth/sitzung.ts');
const { brauchtVerwalter, istVerwalter } = await import('../src/auth/waechter.ts');
const fsModul = await import('node:fs');

/** `node:fs` synchron - in den Tests oft gebraucht, hier einmal geholt. */
function requireFs() {
  return fsModul;
}

before(() => {
  datenbank();
  seed();
});

after(() => {
  try {
    rmSync(tempVerzeichnis, { recursive: true, force: true });
  } catch {
    // Unter Windows haelt SQLite die Datei manchmal noch - kein Grund zum Scheitern.
  }
});

describe('I-01: ein unbekannter Wert wird intern, nicht oeffentlich', () => {
  it('faengt leere und falsche Angaben ab', () => {
    assert.equal(stufeOderIntern(undefined), 'intern');
    assert.equal(stufeOderIntern(null), 'intern');
    assert.equal(stufeOderIntern(''), 'intern');
    assert.equal(stufeOderIntern('public'), 'intern');
    assert.equal(stufeOderIntern('OEFFENTLICH'), 'intern');
  });

  it('laesst gueltige Angaben durch', () => {
    assert.equal(stufeOderIntern('oeffentlich'), 'oeffentlich');
    assert.equal(stufeOderIntern('vertraulich'), 'vertraulich');
  });
});

describe('I-05: Stufen werden ueber eine Zahl verglichen', () => {
  it('haelt die Rangfolge oeffentlich < intern < vertraulich', () => {
    assert.ok(STUFEN_RANG.oeffentlich < STUFEN_RANG.intern);
    assert.ok(STUFEN_RANG.intern < STUFEN_RANG.vertraulich);
  });

  it('der alphabetische Vergleich waere falsch - deshalb die Zahl', () => {
    // 'intern' < 'oeffentlich' als Zeichenkette: genau der Fehler, der interne
    // Fakten auf die Website liesse.
    assert.ok('intern' < 'oeffentlich');
    assert.ok(STUFEN_RANG.intern > STUFEN_RANG.oeffentlich);
  });
});

describe('I-04: die Vertraulichkeitsgrenze des Ziels', () => {
  let storyId = 0;

  before(() => {
    storyId = storyAnlegen({ arbeitstitel: 'Vertraulichkeitsprobe' });
    faktSetzen(storyId, { schluessel: 'kunde', wert: 'LuckyChef GmbH', stufe: 'intern' });
    faktSetzen(storyId, {
      schluessel: 'kunde_anonym', wert: 'ein E-Commerce-Unternehmen', stufe: 'oeffentlich',
    });
    faktSetzen(storyId, { schluessel: 'branche', wert: 'Handel & E-Commerce', stufe: 'oeffentlich' });
    faktSetzen(storyId, { schluessel: 'projektgroesse', wert: '180 TEUR', stufe: 'vertraulich' });
  });

  it('das Ziel Website sieht nur oeffentliche Fakten', () => {
    const erlaubt = faktenFuerZiel(storyId, 'oeffentlich');
    assert.equal(erlaubt.length, 2);
    assert.ok(!erlaubt.some((f) => f.schluessel === 'kunde'),
      'der Kundenname darf nicht in der Website-Fassung landen');
    assert.ok(!erlaubt.some((f) => f.stufe === 'vertraulich'));
  });

  it('die interne Kundenreferenz sieht oeffentlich und intern, nicht vertraulich', () => {
    const erlaubt = faktenFuerZiel(storyId, 'intern');
    assert.equal(erlaubt.length, 3);
    assert.ok(erlaubt.some((f) => f.wert === 'LuckyChef GmbH'),
      'intern ist der Kundenname genau das Interessante');
    assert.ok(!erlaubt.some((f) => f.schluessel === 'projektgroesse'));
  });

  it('die mitgelieferten Ziele tragen die erwarteten Grenzen', () => {
    assert.equal(zielNach('website')?.stufe, 'oeffentlich');
    assert.equal(zielNach('kundenreferenz')?.stufe, 'intern');
    assert.equal(zielNach('cv')?.stufe, 'intern');
  });
});

describe('I-06: ohne Grundlage wird nicht formuliert', () => {
  it('weist eine Fassung mit zu wenig freigegebenen Fakten ab', async () => {
    const storyId = storyAnlegen({ arbeitstitel: 'Zu duenn' });
    // Drei Fakten, aber nur einer davon oeffentlich: Fuer das Ziel Website ist
    // das zu wenig, obwohl der Bestand nicht leer ist.
    faktSetzen(storyId, { schluessel: 'branche', wert: 'Energie', stufe: 'oeffentlich' });
    faktSetzen(storyId, { schluessel: 'kunde', wert: 'Stadtwerke X', stufe: 'intern' });
    faktSetzen(storyId, { schluessel: 'projektgroesse', wert: '90 TEUR', stufe: 'vertraulich' });

    const ziel = zielNach('website')!;
    await assert.rejects(
      () => formulieren(storyId, ziel.id),
      (e: Error) => {
        assert.match(e.message, /freigegebene Fakten/);
        assert.match(e.message, /erfindet/);
        return true;
      },
      'die Pruefung greift VOR dem Modellaufruf - sie braucht keinen Schluessel',
    );
  });
});

describe('Fakten anlegen und ersetzen', () => {
  let storyId = 0;
  before(() => { storyId = storyAnlegen({ arbeitstitel: 'Faktenprobe' }); });

  it('ersetzt einen einwertigen Fakt statt ihn zu verdoppeln', () => {
    faktSetzen(storyId, { schluessel: 'kunde', wert: 'Erst falsch' });
    faktSetzen(storyId, { schluessel: 'kunde', wert: 'Dann richtig' });
    const treffer = fakten(storyId).filter((f) => f.schluessel === 'kunde');
    assert.equal(treffer.length, 1);
    assert.equal(treffer[0].wert, 'Dann richtig');
  });

  it('haengt mehrwertige Fakten an, aber nicht doppelt', () => {
    faktSetzen(storyId, { schluessel: 'technologie', wert: 'Java' });
    faktSetzen(storyId, { schluessel: 'technologie', wert: 'Zendesk' });
    faktSetzen(storyId, { schluessel: 'technologie', wert: ' java ' });
    const treffer = fakten(storyId).filter((f) => f.schluessel === 'technologie');
    assert.equal(treffer.length, 2);
  });

  it('zaehlt nur Pflichtfakten in den Fortschritt', () => {
    const stand = fortschritt(storyId);
    assert.ok(stand.pflicht >= 12, 'der Lieferkatalog hat mindestens zwoelf Pflichtfakten');
    assert.ok(stand.pflichtErfuellt >= 2);
    assert.ok(stand.offen.every((o) => o.label.length > 0));
  });
});

describe('I-02: handgeschriebener Text wird gesichert, nicht ueberschrieben', () => {
  it('legt die vorige Fassung ab, bevor sie ersetzt wird', () => {
    const storyId = storyAnlegen({ arbeitstitel: 'Fassungsprobe' });
    const ziel = zielNach('website')!;

    fassungSpeichern({
      storyId, zielId: ziel.id, titel: 'Erster Entwurf',
      inhalt: '<p>Von der KI formuliert.</p>', handisch: false,
    });
    fassungSpeichern({
      storyId, zielId: ziel.id, titel: 'Erster Entwurf',
      inhalt: '<p>Von Hand ueberarbeitet, zwanzig Minuten Arbeit.</p>', handisch: true,
    });
    const nachHand = fassung(storyId, ziel.id)!;
    assert.equal(nachHand.handisch, 1);

    fassungSpeichern({
      storyId, zielId: ziel.id, titel: 'Neu',
      inhalt: '<p>Neu formuliert.</p>', handisch: false, grund: 'neu formuliert',
    });

    const ablage = sicherungen(nachHand.id) as { grund: string }[];
    assert.ok(ablage.length >= 1, 'die Handarbeit muss in der Ablage liegen');
    assert.ok(
      ablage.some((s) => s.grund === 'neu formuliert'),
      'und der Grund sagt, warum sie ersetzt wurde',
    );
  });

  it('haelt je Geschichte und Ziel genau eine aktuelle Fassung', () => {
    const storyId = storyAnlegen({ arbeitstitel: 'Eindeutigkeit' });
    const ziel = zielNach('cv')!;
    fassungSpeichern({ storyId, zielId: ziel.id, inhalt: '<p>a</p>', handisch: false });
    fassungSpeichern({ storyId, zielId: ziel.id, inhalt: '<p>b</p>', handisch: false });
    assert.equal(fassung(storyId, ziel.id)?.inhalt, '<p>b</p>');
  });
});

describe('Import: Text aus HTML', () => {
  it('entfernt Markup, behaelt aber die Absatzgrenzen', () => {
    const html = `
      <html><head><style>p{color:red}</style><script>alert(1)</script></head>
      <body><h1>KI im IT-Support</h1>
      <p>Ein mittelst&auml;ndisches Unternehmen k&auml;mpfte mit&nbsp;wachsendem Support.</p>
      <ul><li>Lange Reaktionszeiten</li><li>Hohe Fehlerquote</li></ul>
      </body></html>`;
    const text = textAus(html);
    assert.ok(!text.includes('<'), 'kein Markup mehr');
    assert.ok(!text.includes('alert(1)'), 'kein Skriptinhalt');
    assert.ok(!text.includes('color:red'), 'kein Stilinhalt');
    assert.ok(text.includes('mittelständisches'), 'Entities aufgeloest');
    assert.ok(text.includes('KI im IT-Support'));
    // Die Listenpunkte muessen getrennt bleiben - sonst wird aus zwei
    // Herausforderungen ein Fakt.
    const zeilen = text.split('\n').filter((z) => z.trim());
    assert.ok(zeilen.length >= 4, `erwartet mindestens 4 Zeilen, waren ${zeilen.length}`);
  });
});

describe('I-08: im Mehrbenutzerbetrieb kommt der KI-Zugang nur aus der Umgebung', () => {
  // Diese Tests schalten die Betriebsart um und raeumen hinterher auf: Bliebe
  // das Flag stehen, liefen alle folgenden Tests in einer anderen Betriebsart.
  const vorher = {
    mehrbenutzer: process.env.BITS_EG_MEHRBENUTZER,
    schluessel: process.env.ANTHROPIC_API_KEY,
  };

  after(() => {
    if (vorher.mehrbenutzer === undefined) delete process.env.BITS_EG_MEHRBENUTZER;
    else process.env.BITS_EG_MEHRBENUTZER = vorher.mehrbenutzer;
    if (vorher.schluessel === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = vorher.schluessel;
    setzen(SCHLUESSEL.apiKey, null);
  });

  it('ein Schluessel in der Datenbank wird im Mehrbenutzerbetrieb ignoriert', () => {
    // Der gefaehrliche Fall: Die Datei kommt aus dem Einzelplatzbetrieb und
    // bringt einen Schluessel mit. Er darf im Cluster nicht stillschweigend
    // weiterverwendet werden - niemand wuesste, welcher der beiden gilt.
    setzen(SCHLUESSEL.apiKey, 'sk-ant-aus-der-datenbank');
    delete process.env.ANTHROPIC_API_KEY;

    delete process.env.BITS_EG_MEHRBENUTZER;
    assert.equal(mehrbenutzer(), false);
    assert.equal(zugangVorhanden(), true, 'am Einzelplatz zaehlt die Datenbank');

    process.env.BITS_EG_MEHRBENUTZER = '1';
    assert.equal(mehrbenutzer(), true);
    assert.equal(
      zugangVorhanden(), false,
      'im Mehrbenutzerbetrieb darf der Schluessel aus der Datenbank nicht zaehlen',
    );

    process.env.ANTHROPIC_API_KEY = 'sk-ant-aus-der-umgebung';
    assert.equal(zugangVorhanden(), true, 'die Umgebung zaehlt');
  });

  it('die Oberflaeche darf den Zugang im Mehrbenutzerbetrieb nicht setzen', () => {
    process.env.BITS_EG_MEHRBENUTZER = '1';
    assert.equal(aenderbar(SCHLUESSEL.apiKey), false);
    assert.equal(aenderbar(SCHLUESSEL.azureKey), false);
    assert.equal(aenderbar(SCHLUESSEL.anbieter), false);
    // Was kein Zugang ist, bleibt aenderbar - sonst waere die Verwaltung tot.
    assert.equal(aenderbar(SCHLUESSEL.modell), true);
    assert.equal(aenderbar(SCHLUESSEL.ichBin), true);

    delete process.env.BITS_EG_MEHRBENUTZER;
    assert.equal(aenderbar(SCHLUESSEL.apiKey), true, 'am Einzelplatz ist alles aenderbar');
  });

  it('die Anzeige verraet den Wert nicht und meldet die Sperre', () => {
    process.env.BITS_EG_MEHRBENUTZER = '1';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-aus-der-umgebung';
    setzen(SCHLUESSEL.apiKey, 'sk-ant-aus-der-datenbank');

    const zeile = anzeige().find((e) => e.schluessel === SCHLUESSEL.apiKey)!;
    assert.equal(zeile.gesperrt, true);
    assert.equal(zeile.gesetzt, true, 'die Umgebung hat einen Wert');
    assert.equal(zeile.wert, 'aus der Umgebung');
    assert.ok(
      !String(zeile.wert).includes('sk-ant'),
      'auch nicht maskiert: der Wert aus der Datenbank darf nicht auftauchen',
    );
  });
});

describe('E-19: Anmeldung, Sitzung und Rollen', () => {
  const vorher = {
    mehrbenutzer: process.env.BITS_EG_MEHRBENUTZER,
    geheimnis: process.env.SESSION_SECRET,
    rolle: process.env.BITS_EG_ROLLE_VERWALTER,
  };

  before(() => {
    process.env.SESSION_SECRET = 'nur-fuer-den-test-nicht-geheim';
    process.env.BITS_EG_ROLLE_VERWALTER = 'eg-verwalter';
  });

  after(() => {
    for (const [k, v] of Object.entries({
      BITS_EG_MEHRBENUTZER: vorher.mehrbenutzer,
      SESSION_SECRET: vorher.geheimnis,
      BITS_EG_ROLLE_VERWALTER: vorher.rolle,
    })) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('ein gefaelschtes Cookie gilt nicht', () => {
    const id = sitzungAnlegen({
      sub: 'abc', name: 'Testperson', email: null, benutzername: 'test',
      rollen: [], ablauf: Math.floor(Date.now() / 1000) + 3600,
    });

    const echt = cookieWert(id);
    assert.equal(ausCookie(echt), id, 'das eigene Cookie wird erkannt');

    // Die Kennung allein genuegt nicht: Ohne gueltige Unterschrift koennte
    // jemand eine fremde Sitzung uebernehmen, indem er Kennungen durchprobiert.
    assert.equal(ausCookie(id), null, 'ohne Unterschrift: abgelehnt');
    assert.equal(ausCookie(`${id}.falsch`), null, 'falsche Unterschrift: abgelehnt');
    assert.equal(ausCookie(`${id}x.${echt.split('.')[1]}`), null,
      'veraenderte Kennung bei gueltiger Unterschrift: abgelehnt');
    assert.equal(ausCookie(undefined), null);
    assert.equal(ausCookie(''), null);

    sitzungBeenden(id);
    assert.equal(sitzung(id), null, 'nach dem Abmelden ist die Sitzung weg');
  });

  it('eine abgelaufene Sitzung wird nicht nur ignoriert, sondern geloescht', () => {
    const id = sitzungAnlegen({
      sub: 'abc', name: 'Testperson', email: null, benutzername: 'test',
      rollen: [], ablauf: Math.floor(Date.now() / 1000) + 3600,
    });
    // Ablauf in die Vergangenheit setzen - so, wie es nach zwoelf Stunden
    // aussieht.
    schreib("UPDATE sitzung SET ablauf = datetime('now','-1 hour') WHERE id = ?", id);
    assert.equal(sitzung(id), null);
    assert.equal(
      zahl('SELECT COUNT(*) FROM sitzung WHERE id = ?', id), 0,
      'der Eintrag ist weg, nicht nur unwirksam',
    );
  });

  it('die Sitzung endet nie spaeter als das Token', () => {
    // Ein Token, das in einer Minute ablaeuft, darf keine Sitzung ueber
    // zwoelf Stunden eroeffnen.
    const id = sitzungAnlegen({
      sub: 'abc', name: 'Kurz', email: null, benutzername: 'kurz',
      rollen: [], ablauf: Math.floor(Date.now() / 1000) + 60,
    });
    const s = sitzung(id)!;
    const uebrig = new Date(s.ablauf).getTime() - Date.now();
    assert.ok(uebrig <= 61_000, `erwartet hoechstens 61 s, waren ${Math.round(uebrig / 1000)} s`);
    sitzungBeenden(id);
  });

  it('nur die Verwalterrolle darf die Verwaltung aendern', () => {
    process.env.BITS_EG_MEHRBENUTZER = '1';
    const ohne = {
      id: 'x', sub: 'a', name: 'Ohne Rolle', email: null, benutzername: 'ohne',
      rollen: ['irgendwas'], erstellt_am: '', gesehen_am: '', ablauf: '',
    };
    const mit = { ...ohne, rollen: ['eg-verwalter'] };

    assert.equal(istVerwalter(ohne), false);
    assert.equal(istVerwalter(mit), true);
    assert.equal(istVerwalter(null), false, 'ohne Sitzung: kein Verwalter');

    // Am Einzelplatz gibt es keine Rollen - der eine Mensch darf alles, sonst
    // kaeme er nicht an seine eigene Verwaltung.
    delete process.env.BITS_EG_MEHRBENUTZER;
    assert.equal(istVerwalter(null), true);
  });

  it('Lesen ist frei, Aendern nicht', () => {
    assert.equal(brauchtVerwalter('GET', '/api/verwaltung'), false);
    assert.equal(brauchtVerwalter('GET', '/api/einstellungen'), false);
    assert.equal(brauchtVerwalter('PUT', '/api/verwaltung/ziele'), true);
    assert.equal(brauchtVerwalter('PUT', '/api/verwaltung/kunden'), true);
    assert.equal(brauchtVerwalter('PUT', '/api/einstellungen'), true);
    // Eine Erfolgsgeschichte schreiben darf jeder Angemeldete - genau das ist
    // der Zweck des Werkzeugs.
    assert.equal(brauchtVerwalter('POST', '/api/storys'), false);
    assert.equal(brauchtVerwalter('POST', '/api/storys/1/interview'), false);
    assert.equal(brauchtVerwalter('PUT', '/api/storys/1/fassung/1'), false);
  });
});

describe('I-09: die Erstausstattung laeuft nur in eine leere Datenbank', () => {
  // Der Server spielt sie beim Start ein, weil ein frisches Volume im
  // Cluster sonst nie `ready` wird (/api/gesund prueft die Faktenrubriken).
  // Die Gefahr dabei ist die Gegenrichtung: Laeuft sie bei JEDEM Start, kommt
  // eine bewusst geloeschte Vorlage zurueck - und niemand findet den Grund.
  it('ruehrt einen vorhandenen Bestand nicht an', () => {
    const zieleVorher = zahl('SELECT COUNT(*) FROM ziel');
    const rubriken = zahl('SELECT COUNT(*) FROM faktenrubrik');
    assert.ok(rubriken > 0, 'Vorbedingung: der Bestand ist gefuellt');

    // Eine Vorlage bewusst entfernen, wie ein Benutzer es tun wuerde.
    schreib("DELETE FROM ziel WHERE schluessel = 'angebot'");
    assert.equal(zahl('SELECT COUNT(*) FROM ziel'), zieleVorher - 1);

    assert.equal(erstausstattungFallsLeer(), false, 'nicht leer: kein Einspielen');
    assert.equal(
      zahl("SELECT COUNT(*) FROM ziel WHERE schluessel = 'angebot'"), 0,
      'das geloeschte Ziel bleibt geloescht',
    );
  });

  it('spielt in eine leere Datenbank ein', () => {
    // „Leer" heisst: keine Faktenrubriken - dieselbe Bedingung, die
    // /api/gesund prueft. Wer alle Rubriken entfernt, hat kein benutzbares
    // Werkzeug mehr und bekommt den Lieferstand zurueck.
    schreib('DELETE FROM faktenrubrik');
    assert.equal(zahl('SELECT COUNT(*) FROM faktenrubrik'), 0);

    assert.equal(erstausstattungFallsLeer(), true, 'leer: eingespielt');
    assert.ok(zahl('SELECT COUNT(*) FROM faktenrubrik') > 0, 'Rubriken sind zurueck');
    assert.ok(
      zahl("SELECT COUNT(*) FROM ziel WHERE schluessel = 'angebot'") > 0,
      'und die Ziele ebenfalls',
    );
  });
});

describe('Thema: hell und dunkel sind beide vollstaendig', () => {
  // Die Falle: `:root` traegt die helle Palette, `:root[data-theme="dark"]`
  // die dunkle. Wer eine Farbe nur oben ergaenzt, hat sie im Dunkelmodus in
  // ihrem HELLEN Wert - und dort ist sie meist unlesbar. Der Build merkt das
  // nicht, ein Blick in den Hellmodus auch nicht.
  const THEMA_FREI = ['--papier', '--tinte', '--sans', '--serif', '--r', '--kopf'];

  function paletten() {
    const { readFileSync } = requireFs();
    const css = readFileSync(new URL('../../web/src/stil.css', import.meta.url), 'utf8');
    const block = (kopf: string) => {
      const i = css.indexOf(kopf);
      assert.ok(i >= 0, `Block fehlt: ${kopf}`);
      const ende = css.indexOf('\n}', i);
      const roh = css.slice(i, ende);
      const werte = new Map<string, string>();
      for (const m of roh.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
        werte.set(m[1], m[2].trim());
      }
      return werte;
    };
    return { hell: block(':root {'), dunkel: block(':root[data-theme="dark"] {') };
  }

  it('jede Farbe des Dunkelmodus hat ein helles Gegenstueck', () => {
    const { hell, dunkel } = paletten();
    const fehlend = [...dunkel.keys()].filter((k) => !hell.has(k));
    assert.deepEqual(fehlend, [], 'im Hellmodus nicht definiert');
  });

  it('jede themenabhaengige Farbe des Hellmodus hat ein dunkles Gegenstueck', () => {
    const { hell, dunkel } = paletten();
    const fehlend = [...hell.keys()]
      .filter((k) => !THEMA_FREI.some((frei) => k.startsWith(frei)))
      .filter((k) => !dunkel.has(k));
    assert.deepEqual(fehlend, [], 'im Dunkelmodus nicht definiert - dort gilt der helle Wert');
  });
});

describe('Thema: die Kontraste tragen', () => {
  // WCAG 2.1: 4.5:1 fuer normalen Text, 3.0:1 fuer grosse Schrift und
  // Bedienelemente. Anlass war ein Hinweis mit 1.4:1, der monatelang
  // unsichtbar war, und einer mit 2.5:1, der es nach einer Korrektur
  // beinahe geblieben waere.
  function leuchte(wert: string): number {
    const h = wert.replace('#', '').slice(0, 6);
    const voll = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
    const teil = (i: number) => {
      const k = parseInt(voll.slice(i, i + 2), 16) / 255;
      return k <= 0.04045 ? k / 12.92 : ((k + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * teil(0) + 0.7152 * teil(2) + 0.0722 * teil(4);
  }

  function verhaeltnis(a: string, b: string): number {
    const [la, lb] = [leuchte(a), leuchte(b)];
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  // [Vordergrund, Hintergrund, Mindestwert, wofuer]
  const PAARE: [string, string, number, string][] = [
    ['--text', '--bg', 4.5, 'Grundtext'],
    ['--text', '--bg-2', 4.5, 'Text in Karten und Feldern'],
    ['--text', '--bg-3', 4.5, 'Text auf gedeckter Flaeche'],
    ['--muted', '--bg', 4.5, 'Hinweistext'],
    ['--muted', '--bg-2', 4.5, 'Hinweis in Karten'],
    ['--muted-2', '--bg', 3.0, 'Nebenangabe'],
    ['--accent', '--bg', 4.5, 'Akzent als Text'],
    ['--accent', '--bg-2', 4.5, 'Akzent in Karten'],
    ['--auf-accent', '--accent', 4.5, 'Schrift auf dem Hauptknopf'],
    ['--accent-2', '--bg', 4.5, 'oeffentlich freigegeben'],
    ['--accent-3', '--bg', 4.5, 'intern'],
    ['--ph', '--bg', 4.5, 'Luecke und Warnung'],
    ['--ph', '--ph-bg', 4.5, 'Luecke auf eigener Flaeche'],
    ['--rot', '--bg', 4.5, 'vertraulich und Fehler'],
    ['--fehler-text', '--fehler-bg', 4.5, 'Fehlerbalken'],
    ['--line', '--bg', 1.25, 'Trennlinie - sichtbar, kein Text'],
  ];

  // Das Blatt ist in beiden Themen Papier, diese Paare gelten immer.
  const BLATT: [string, string, number, string][] = [
    ['--tinte', '--papier', 4.5, 'Haupttext auf dem Blatt'],
    ['--tinte-2', '--papier', 4.5, 'Nebentext auf dem Blatt'],
    ['--papier-hinweis', '--papier', 3.0, 'Hinweis auf dem leeren Blatt'],
    ['--papier-leise', '--papier', 4.5, 'Denkschritte auf dem Blatt'],
    ['--papier-link', '--papier', 4.5, 'Verweis im Blatt'],
    ['--papier-luecke-text', '--papier-luecke-bg', 4.5, 'sichtbare Luecke'],
  ];

  function pruefe(
    name: string, palette: Map<string, string>, paare: [string, string, number, string][],
  ) {
    const schlecht: string[] = [];
    for (const [vg, hg, mindest, wofuer] of paare) {
      const a = palette.get(vg);
      const b = palette.get(hg);
      assert.ok(a && b, `${name}: ${vg} oder ${hg} fehlt`);
      const v = verhaeltnis(a, b);
      if (v < mindest) {
        schlecht.push(`${vg} auf ${hg} = ${v.toFixed(2)}:1 (min ${mindest}) - ${wofuer}`);
      }
    }
    assert.deepEqual(schlecht, [], `${name}: zu schwacher Kontrast`);
  }

  function paletten() {
    const { readFileSync } = requireFs();
    const css = readFileSync(new URL('../../web/src/stil.css', import.meta.url), 'utf8');
    const block = (kopf: string) => {
      const i = css.indexOf(kopf);
      const roh = css.slice(i, css.indexOf('\n}', i));
      const werte = new Map<string, string>();
      for (const m of roh.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
        werte.set(m[1], m[2]);
      }
      return werte;
    };
    const hell = block(':root {');
    const dunkel = new Map(hell);          // das Dunkle erbt, was es nicht neu setzt
    for (const [k, v] of block(':root[data-theme="dark"] {')) dunkel.set(k, v);
    return { hell, dunkel };
  }

  it('im Hellmodus', () => {
    const { hell } = paletten();
    pruefe('hell', hell, PAARE);
  });

  it('im Dunkelmodus', () => {
    const { dunkel } = paletten();
    pruefe('dunkel', dunkel, PAARE);
  });

  it('auf dem Blatt, in beiden Themen', () => {
    const { hell } = paletten();
    pruefe('Blatt', hell, BLATT);
  });
});

describe('Keycloak: die Post-Logout-URIs sind ##-getrennt', () => {
  // Anlass: Der Abmeldeweg endete in Keycloaks „Invalid redirect uri". Im
  // Realm-Import stand die Liste LEERZEICHEN-getrennt - Keycloak liest das
  // Attribut dann als EINE URI, die nie passt. Der Anmeldeweg war in
  // Ordnung, weil `redirectUris` ein echtes JSON-Array ist; nur diese zweite
  // Liste ist eine Zeichenkette mit eigener Trennregel.
  it('enthaelt kein Leerzeichen als Trenner', async () => {
    const { readFileSync } = await import('node:fs');
    const pfad = new URL(
      '../../docker/keycloak/realm-import/erfolgsgeschichten-realm.json',
      import.meta.url,
    );
    const realm = JSON.parse(readFileSync(pfad, 'utf8')) as {
      clients: { clientId: string; attributes?: Record<string, string> }[];
    };
    const client = realm.clients.find((c) => c.clientId === 'erfolgsgeschichten');
    assert.ok(client, 'der Client steht im Realm-Import');
    const liste = client.attributes?.['post.logout.redirect.uris'] ?? '';
    assert.ok(liste.length > 0, 'die Liste ist gesetzt - sonst scheitert das Abmelden');
    assert.ok(
      !liste.includes(' '),
      `Leerzeichen in der Liste: ${liste} - Keycloak trennt mit ##`,
    );
    for (const u of liste.split('##')) {
      assert.match(u, /^https?:\/\//, `keine URL: ${u}`);
    }
  });
});

describe('CSS: content-Zeichenketten sind geschlossen', () => {
  // Steht hier, obwohl es das Frontend betrifft: Dies ist die einzige Stelle,
  // an der im Projekt Tests laufen. Anlass war ein gerades " mitten in einem
  // deutschen Zitat - `content: "… „Formulieren" drücken."`. Der CSS-String
  // endete dort, die Deklaration wurde verworfen, und der Platzhalter auf dem
  // leeren Blatt fehlte. Der Vite-Build meldet das als WARNUNG und baut
  // weiter, also faellt es sonst niemandem auf.
  it('jede content:-Deklaration hat eine gerade Zahl gerader Anfuehrungszeichen', async () => {
    const { readFileSync } = await import('node:fs');
    const pfad = new URL('../../web/src/stil.css', import.meta.url);
    const zeilen = readFileSync(pfad, 'utf8').split(/\r?\n/);
    const schief = zeilen
      .map((z, i) => ({ nr: i + 1, z }))
      .filter(({ z }) => /(^|[\s;{])content\s*:/.test(z))
      .filter(({ z }) => (z.match(/"/g) ?? []).length % 2 !== 0);
    assert.deepEqual(
      schief.map((s) => `${s.nr}: ${s.z.trim()}`), [],
      'ein unpaariges " beendet die Zeichenkette mitten im Satz',
    );
  });
});
