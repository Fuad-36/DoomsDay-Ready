import type Database from 'better-sqlite3';

/**
 * Runs `fn` in a SQLite transaction and returns its result. better-sqlite3
 * rolls back automatically if `fn` throws, which keeps multi-statement writes
 * (movie + prerequisites, cinema + sizes) atomic.
 */
export function withTransaction<T>(db: Database.Database, fn: () => T): T {
  return db.transaction(fn)();
}
