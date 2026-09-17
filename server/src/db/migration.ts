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

// Version 1 ist die Erstausstattung aus schema.sql. Der erste echte Schritt
// bekommt Version 2.
const SCHRITTE: Schritt[] = [];

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

  for (const s of SCHRITTE) {
    if (s.version <= start) continue;
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
  if (von === 0) db.exec(`PRAGMA user_version = ${ziel}`);
  return { von: start, nach: ziel, schritte: gelaufen };
}
