// Datenbank-Zugriff. SQLite ist in Node 24 eingebaut (node:sqlite), deshalb
// hat das Backend ausser dem Anthropic-SDK und zod keine Abhaengigkeiten.
//
// Uebernommen aus der BITS Machine (E-02) - dieselben Helfer, dieselben Namen.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrieren } from './migration.ts';

const hier = dirname(fileURLToPath(import.meta.url));
export const DB_PFAD = process.env.BITS_EG_DB
  ?? join(hier, '..', '..', 'data', 'erfolgsgeschichten.db');

let db: DatabaseSync | null = null;

export function datenbank(): DatabaseSync {
  if (db) return db;
  mkdirSync(dirname(DB_PFAD), { recursive: true });
  db = new DatabaseSync(DB_PFAD);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(readFileSync(join(hier, 'schema.sql'), 'utf8'));
  const m = migrieren(db);
  if (m.schritte.length) {
    console.log(`  Datenbank migriert: ${m.von} -> ${m.nach} (${m.schritte.join(', ')})`);
  }
  return db;
}

/** Mehrere Zeilen lesen. */
export function alle<T = Record<string, unknown>>(sql: string, ...p: unknown[]): T[] {
  return datenbank().prepare(sql).all(...(p as never[])) as T[];
}

/** Eine Zeile lesen (oder undefined). */
export function eine<T = Record<string, unknown>>(sql: string, ...p: unknown[]): T | undefined {
  return datenbank().prepare(sql).get(...(p as never[])) as T | undefined;
}

/** Schreiben. Gibt die neue id und die Anzahl geaenderter Zeilen zurueck. */
export function schreib(sql: string, ...p: unknown[]): { id: number; anzahl: number } {
  const r = datenbank().prepare(sql).run(...(p as never[]));
  return { id: Number(r.lastInsertRowid), anzahl: Number(r.changes) };
}

/** Einen einzelnen Skalarwert lesen. */
export function zahl(sql: string, ...p: unknown[]): number {
  const r = eine<Record<string, unknown>>(sql, ...p);
  if (!r) return 0;
  const v = Object.values(r)[0];
  return typeof v === 'number' ? v : Number(v ?? 0);
}

export function inTransaktion<T>(fn: () => T): T {
  const d = datenbank();
  d.exec('BEGIN');
  try {
    const r = fn();
    d.exec('COMMIT');
    return r;
  } catch (e) {
    d.exec('ROLLBACK');
    throw e;
  }
}

export const jetzt = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
