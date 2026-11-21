import type Database from 'better-sqlite3';

/**
 * Schema from AGENTS.md. "IF NOT EXISTS" makes startup idempotent: running the
 * server repeatedly must not fail or reset an existing database.
 */
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS movies (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL UNIQUE COLLATE NOCASE,
  release_year    INTEGER NOT NULL CHECK (release_year >= 1900),
  runtime_minutes INTEGER NOT NULL CHECK (runtime_minutes BETWEEN 1 AND 300),
  watched         INTEGER NOT NULL DEFAULT 0 CHECK (watched IN (0, 1)),
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS movie_prerequisites (
  movie_id         TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  prerequisite_id  TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  PRIMARY KEY (movie_id, prerequisite_id),
  CHECK (movie_id <> prerequisite_id)
);
CREATE INDEX IF NOT EXISTS idx_prereq_by_prerequisite ON movie_prerequisites(prerequisite_id);

CREATE TABLE IF NOT EXISTS cinemas (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cinema_bundle_sizes (
  cinema_id  TEXT NOT NULL REFERENCES cinemas(id) ON DELETE CASCADE,
  size       INTEGER NOT NULL CHECK (size BETWEEN 1 AND 500),
  PRIMARY KEY (cinema_id, size)
);
`;

export function applySchema(db: Database.Database): void {
  db.exec(SCHEMA_SQL);
}
