// Erstausstattung einspielen: Faktenkatalog, Ziele, Projektarten.
//
// Idempotent: Ein Lauf ohne Argumente schreibt nur, was FEHLT - eine von Hand
// geaenderte Vorlage wird nicht zurueckgesetzt. `--ersetzen` hebt das auf und
// ist eine Entscheidung je Lauf.
//
//   npm run seed              nur Fehlendes
//   npm run seed -- --ersetzen  Vorlagen auf den Lieferstand zuruecksetzen
import { alle, datenbank, eine, schreib } from '../db/index.ts';
import { KATALOG } from './katalog.ts';
import { PROJEKTARTEN, ZIELE } from './ziele.ts';

const ersetzen = process.argv.includes('--ersetzen');

function katalogEinspielen(): { neu: number; ersetzt: number } {
  let neu = 0;
  let ersetzt = 0;
  KATALOG.forEach((k, i) => {
    const da = eine<{ id: number }>(
      'SELECT id FROM faktenrubrik WHERE schluessel = ?', k.schluessel,
    );
    if (da && !ersetzen) return;
    if (da) {
      schreib(
        `UPDATE faktenrubrik SET rubrik = ?, label = ?, hinweis = ?, pflicht = ?,
            mehrfach = ?, stufe_vorschlag = ?, sort = ?, aktiv = 1 WHERE id = ?`,
        k.rubrik, k.label, k.hinweis, k.pflicht ? 1 : 0,
        k.mehrfach ? 1 : 0, k.stufe, i * 10, da.id,
      );
      ersetzt += 1;
      return;
    }
    schreib(
      `INSERT INTO faktenrubrik (schluessel, rubrik, label, hinweis, pflicht, mehrfach,
          stufe_vorschlag, sort) VALUES (?,?,?,?,?,?,?,?)`,
      k.schluessel, k.rubrik, k.label, k.hinweis, k.pflicht ? 1 : 0,
      k.mehrfach ? 1 : 0, k.stufe, i * 10,
    );
    neu += 1;
  });
  return { neu, ersetzt };
}

function zieleEinspielen(): { neu: number; ersetzt: number } {
  let neu = 0;
  let ersetzt = 0;
  ZIELE.forEach((z, i) => {
    const da = eine<{ id: number }>('SELECT id FROM ziel WHERE schluessel = ?', z.schluessel);
    const struktur = JSON.stringify(z.struktur);
    if (da && !ersetzen) return;
    if (da) {
      schreib(
        `UPDATE ziel SET name = ?, beschreibung = ?, prompt = ?, struktur = ?,
            stufe = ?, laenge = ?, sort = ?, aktiv = 1 WHERE id = ?`,
        z.name, z.beschreibung, z.prompt, struktur, z.stufe, z.laenge, i * 10, da.id,
      );
      ersetzt += 1;
      return;
    }
    schreib(
      `INSERT INTO ziel (schluessel, name, beschreibung, prompt, struktur, stufe,
          laenge, lernmodus, sort) VALUES (?,?,?,?,?,?,?,1,?)`,
      z.schluessel, z.name, z.beschreibung, z.prompt, struktur, z.stufe, z.laenge, i * 10,
    );
    neu += 1;
  });
  return { neu, ersetzt };
}

function projektartenEinspielen(): { neu: number; ersetzt: number } {
  let neu = 0;
  let ersetzt = 0;
  PROJEKTARTEN.forEach((a, i) => {
    const da = eine<{ id: number }>('SELECT id FROM projektart WHERE name = ?', a.name);
    if (da && !ersetzen) return;
    if (da) {
      schreib(
        'UPDATE projektart SET beschreibung = ?, hinweise = ?, sort = ?, aktiv = 1 WHERE id = ?',
        a.beschreibung, a.hinweise, i * 10, da.id,
      );
      ersetzt += 1;
      return;
    }
    schreib(
      'INSERT INTO projektart (name, beschreibung, hinweise, lernmodus, sort) VALUES (?,?,?,1,?)',
      a.name, a.beschreibung, a.hinweise, i * 10,
    );
    neu += 1;
  });
  return { neu, ersetzt };
}

export function seed(): void {
  datenbank();
  const k = katalogEinspielen();
  const z = zieleEinspielen();
  const p = projektartenEinspielen();

  console.log('Erstausstattung eingespielt:');
  console.log(`  Faktenkatalog: ${k.neu} neu, ${k.ersetzt} ersetzt `
    + `(im Bestand: ${alle('SELECT id FROM faktenrubrik').length})`);
  console.log(`  Ziele:         ${z.neu} neu, ${z.ersetzt} ersetzt `
    + `(im Bestand: ${alle('SELECT id FROM ziel').length})`);
  console.log(`  Projektarten:  ${p.neu} neu, ${p.ersetzt} ersetzt `
    + `(im Bestand: ${alle('SELECT id FROM projektart').length})`);
  if (!ersetzen && (k.neu + z.neu + p.neu === 0)) {
    console.log('  Nichts zu tun. Mit --ersetzen den Lieferstand wiederherstellen.');
  }
}

// Direkt aufgerufen? Dann ausfuehren.
if (process.argv[1]?.endsWith('seed.ts')) seed();
