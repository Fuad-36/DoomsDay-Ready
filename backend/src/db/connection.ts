import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';

export const DEFAULT_DB_PATH = './data/doomsday.db';

/**
 * The single place that opens SQLite connections. Foreign keys are off by
 * default in SQLite and the setting is per connection, so enabling it here
 * guarantees every connection the app creates enforces them.
 */
export function openDatabase(
  dbPath: string = process.env.DB_PATH ?? DEFAULT_DB_PATH,
): Database.Database {
  // ":memory:" has no parent directory to create.
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(resolve(dbPath)), { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  return db;
}
