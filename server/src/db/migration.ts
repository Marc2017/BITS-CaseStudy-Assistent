// Versionierte Schemaaenderungen. Laeuft bei jedem Start und fuehrt nur aus,
// was fehlt (`PRAGMA user_version`).
//
// Ab dem Moment, in dem echte Geschichten in der Datenbank stehen, ist das der
// einzige erlaubte Weg, das Schema zu aendern - schema.sql legt nur neue
// Datenbanken an (docs/02-datenmodell.md).
import type { DatabaseSync } from 'node:sqlite';

interface Schritt {
  version: number;
  name: string;
  ausfuehren: (db: DatabaseSync) => void;
}

/** Hat eine Tabelle diese Spalte schon? */
function hatSpalte(db: DatabaseSync, tabelle: string, spalte: string): boolean {
  const spalten = db.prepare(`PRAGMA table_info(${tabelle})`).all() as { name: string }[];
  return spalten.some((s) => s.name === spalte);
}

// Version 1 ist die Erstausstattung aus schema.sql. Der erste echte Schritt
// bekommt Version 2.
const SCHRITTE: Schritt[] = [
  {
    version: 2,
    name: 'Kunden als Stammdaten',
    ausfuehren(db) {
      // Ein Kunde ist eine eigene Achse, keine Projektart (E-14): Dieselbe
      // Projektart kommt bei vielen Kunden vor, und was man bei einem
      // bestimmten Kunden fragen muss, gilt dort fuer jede Projektart.
      db.exec(`
        CREATE TABLE IF NOT EXISTS kunde (
          id           INTEGER PRIMARY KEY,
          name         TEXT NOT NULL UNIQUE,
          branche      TEXT,
          hinweise     TEXT,
          anonym       TEXT,
          lernmodus    INTEGER NOT NULL DEFAULT 1,
          sort         INTEGER NOT NULL DEFAULT 0,
          aktiv        INTEGER NOT NULL DEFAULT 1,
          erstellt_am  TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);

      // Zuordnung an der Geschichte. Steuergroesse wie projektart_id, kein
      // Inhalt - der Kundenname als Inhalt bleibt ein Fakt (I-03).
      if (!hatSpalte(db, 'story', 'kunde_id')) {
        db.exec(
          'ALTER TABLE story ADD COLUMN kunde_id INTEGER '
          + 'REFERENCES kunde(id) ON DELETE SET NULL',
        );
      }

      // Lernnotizen koennen sich jetzt auch auf einen Kunden beziehen. Ein
      // CHECK laesst sich in SQLite nicht aendern, also wird die Tabelle neu
      // gebaut - mit den vorhandenen Notizen.
      db.exec(`
        CREATE TABLE lernnotiz_neu (
          id          INTEGER PRIMARY KEY,
          bezug       TEXT NOT NULL
                      CHECK (bezug IN ('ziel','projektart','kunde','katalog')),
          bezug_id    INTEGER,
          text        TEXT NOT NULL,
          begruendung TEXT,
          story_id    INTEGER REFERENCES story(id) ON DELETE SET NULL,
          status      TEXT NOT NULL DEFAULT 'offen'
                      CHECK (status IN ('offen','uebernommen','verworfen')),
          erstellt_am TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO lernnotiz_neu
            (id, bezug, bezug_id, text, begruendung, story_id, status, erstellt_am)
          SELECT id, bezug, bezug_id, text, begruendung, story_id, status, erstellt_am
            FROM lernnotiz;
        DROP TABLE lernnotiz;
        ALTER TABLE lernnotiz_neu RENAME TO lernnotiz;
        CREATE INDEX IF NOT EXISTS lernnotiz_status ON lernnotiz(status, bezug);
      `);

      // Die Projektart „Projekt bei MAN" war ein Platzhalter fuer genau das,
      // was jetzt der Kunde traegt. Ihr Wissen zieht mit um, statt verloren zu
      // gehen; Geschichten, die auf ihr hingen, verlieren nur die Zuordnung
      // (ON DELETE SET NULL).
      const man = db
        .prepare("SELECT id, hinweise FROM projektart WHERE name = 'Projekt bei MAN'")
        .get() as { id: number; hinweise: string | null } | undefined;
      if (man) {
        db.prepare(
          `INSERT INTO kunde (name, branche, hinweise, lernmodus, sort)
           VALUES (?,?,?,1,0)
           ON CONFLICT (name) DO NOTHING`,
        ).run('MAN', 'Automotive & Zulieferer', man.hinweise ?? '');
        db.prepare('DELETE FROM projektart WHERE id = ?').run(man.id);
      }
    },
  },

  {
    version: 3,
    name: 'Benannte Versionen einer Fassung',
    ausfuehren(db) {
      // Eine Sicherung war bisher ein Nebenprodukt: Sie entstand, weil etwas
      // ersetzt wurde. Eine benannte Version ist das Gegenteil - jemand
      // entscheidet, dass DIESER Stand einen Namen verdient (E-17). Beides
      // liegt in derselben Tabelle, weil beides eine abgelegte Fassung ist;
      // `name` und `fertig` unterscheiden sie.
      if (!hatSpalte(db, 'fassung_sicherung', 'name')) {
        db.exec('ALTER TABLE fassung_sicherung ADD COLUMN name TEXT');
      }
      if (!hatSpalte(db, 'fassung_sicherung', 'kommentar')) {
        db.exec('ALTER TABLE fassung_sicherung ADD COLUMN kommentar TEXT');
      }
      if (!hatSpalte(db, 'fassung_sicherung', 'fertig')) {
        db.exec('ALTER TABLE fassung_sicherung ADD COLUMN fertig INTEGER NOT NULL DEFAULT 0');
      }
      // Die Vertraulichkeitsstufe des Ziels zum Zeitpunkt des Ablegens. Sie
      // wird MITGESCHRIEBEN und nicht nachgeschlagen: Wird die Grenze eines
      // Ziels spaeter geaendert, muss an der Version stehen, unter welcher
      // Grenze sie entstanden ist - sonst behauptet eine alte Fassung eine
      // Freigabe, die sie nie hatte.
      if (!hatSpalte(db, 'fassung_sicherung', 'stufe')) {
        db.exec('ALTER TABLE fassung_sicherung ADD COLUMN stufe TEXT');
      }
      db.exec('CREATE INDEX IF NOT EXISTS sicherung_fertig ON fassung_sicherung(fertig, id)');
    },
  },

  {
    version: 4,
    name: 'Sitzungen fuer die Anmeldung',
    ausfuehren(db) {
      // Serverseitige Sitzungen (E-19). Die Tabelle liegt in derselben
      // Datenbank wie der Bestand: ein zweiter Speicher waere ein zweiter
      // Dienst, den jemand betreiben muss.
      db.exec(`
        CREATE TABLE IF NOT EXISTS sitzung (
          id            TEXT PRIMARY KEY,
          sub           TEXT NOT NULL,
          name          TEXT NOT NULL,
          email         TEXT,
          benutzername  TEXT NOT NULL,
          rollen        TEXT NOT NULL DEFAULT '[]',
          erstellt_am   TEXT NOT NULL DEFAULT (datetime('now')),
          gesehen_am    TEXT NOT NULL DEFAULT (datetime('now')),
          ablauf        TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS sitzung_ablauf ON sitzung(ablauf);
      `);
    },
  },
];

export interface Ergebnis {
  von: number;
  nach: number;
  schritte: string[];
}

export function migrieren(db: DatabaseSync): Ergebnis {
  const zeile = db.prepare('PRAGMA user_version').get() as { user_version?: number } | undefined;
  const von = Number(zeile?.user_version ?? 0);
  // Eine frische Datenbank hat user_version 0; schema.sql ist zu diesem
  // Zeitpunkt schon gelaufen, also gilt sie als Stand 1.
  const start = von === 0 ? 1 : von;
  const gelaufen: string[] = [];

  // Auch auf einer frischen Datenbank laufen ALLE Schritte (I-07). Jeder ist
  // idempotent - `IF NOT EXISTS` und `hatSpalte()` - und nur so bekommen neue
  // und alte Datenbanken garantiert dasselbe Schema. Wer hier wieder eine
  // Abkuerzung einbaut, laesst die beiden auseinanderlaufen; genau das hat
  // schon einmal einen Start mit "no such column: fertig" abgebrochen.
  for (const s of SCHRITTE) {
    if (von !== 0 && s.version <= start) continue;
    db.exec('BEGIN');
    try {
      s.ausfuehren(db);
      db.exec(`PRAGMA user_version = ${s.version}`);
      db.exec('COMMIT');
      gelaufen.push(`${s.version}: ${s.name}`);
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }

  const ziel = SCHRITTE.length ? Math.max(start, ...SCHRITTE.map((s) => s.version)) : start;
  db.exec(`PRAGMA user_version = ${ziel}`);
  // Auf einer frischen Datenbank sind die Schritte gelaufen, aber es gab
  // nichts zu melden - das ist kein Migrationsereignis.
  return { von: start, nach: ziel, schritte: von === 0 ? [] : gelaufen };
}
