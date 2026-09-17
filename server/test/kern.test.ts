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

const { datenbank } = await import('../src/db/index.ts');
const {
  faktenFuerZiel, faktSetzen, fakten, fortschritt, STUFEN_RANG, stufeOderIntern,
} = await import('../src/db/fakten.ts');
const { fassung, fassungSpeichern, sicherungen, storyAnlegen } = await import('../src/db/story.ts');
const { zielNach } = await import('../src/db/vorlagen.ts');
const { formulieren } = await import('../src/ki/formulierung.ts');
const { textAus } = await import('../src/ki/importieren.ts');
const { seed } = await import('../src/seed/seed.ts');

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
