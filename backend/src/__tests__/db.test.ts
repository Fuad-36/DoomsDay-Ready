import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../db/connection.js';
import { applySchema } from '../db/schema.js';
import { withTransaction } from '../db/transaction.js';

type MovieOverrides = Partial<{
  id: string;
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
  watched: number;
  createdAt: string;
  updatedAt: string;
}>;

function insertMovie(
  db: Database.Database,
  overrides: MovieOverrides = {},
): string {
  const id = overrides.id ?? randomUUID();
  const timestamp = new Date().toISOString();

  db.prepare(
    `INSERT INTO movies
       (id, title, release_year, runtime_minutes, watched, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    overrides.title ?? 'Iron Man',
    overrides.releaseYear ?? 2008,
    overrides.runtimeMinutes ?? 126,
    overrides.watched ?? 0,
    overrides.createdAt ?? timestamp,
    overrides.updatedAt ?? timestamp,
  );

  return id;
}

function insertCinema(
  db: Database.Database,
  overrides: Partial<{ id: string; name: string; createdAt: string }> = {},
): string {
  const id = overrides.id ?? randomUUID();

  db.prepare('INSERT INTO cinemas (id, name, created_at) VALUES (?, ?, ?)').run(
    id,
    overrides.name ?? 'Grand Cinema',
    overrides.createdAt ?? new Date().toISOString(),
  );

  return id;
}

function insertPrerequisite(
  db: Database.Database,
  movieId: string,
  prerequisiteId: string,
): void {
  db.prepare(
    'INSERT INTO movie_prerequisites (movie_id, prerequisite_id) VALUES (?, ?)',
  ).run(movieId, prerequisiteId);
}

function insertBundleSize(
  db: Database.Database,
  cinemaId: string,
  size: number,
): void {
  db.prepare(
    'INSERT INTO cinema_bundle_sizes (cinema_id, size) VALUES (?, ?)',
  ).run(cinemaId, size);
}

/** Runs a statement expected to fail and returns SQLite's extended error code. */
function constraintCode(run: () => unknown): string | undefined {
  try {
    run();
  } catch (error) {
    return (error as { code?: string }).code;
  }

  throw new Error('Expected the statement to violate a database constraint');
}

describe('openDatabase', () => {
  it('enables foreign key enforcement on the connection', () => {
    const db = openDatabase(':memory:');

    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);

    db.close();
  });

  it('creates the parent directory for a file-backed database', () => {
    const directory = mkdtempSync(join(tmpdir(), 'doomsday-db-'));
    const dbPath = join(directory, 'nested', 'doomsday.db');

    try {
      const db = openDatabase(dbPath);
      applySchema(db);
      db.close();

      expect(existsSync(dbPath)).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe('applySchema', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = openDatabase(':memory:');
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it('creates all four tables and the prerequisite index', () => {
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
         ORDER BY name`,
      )
      .all() as Array<{ name: string }>;

    expect(tables.map((table) => table.name)).toEqual([
      'cinema_bundle_sizes',
      'cinemas',
      'movie_prerequisites',
      'movies',
    ]);

    const index = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_prereq_by_prerequisite'",
      )
      .get();

    expect(index).toBeDefined();
  });

  it('is idempotent', () => {
    expect(() => applySchema(db)).not.toThrow();
  });
});

describe('database constraints', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = openDatabase(':memory:');
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it('enforces foreign keys on movie prerequisites', () => {
    const movieId = insertMovie(db);

    const code = constraintCode(() =>
      insertPrerequisite(db, movieId, randomUUID()),
    );

    expect(code).toBe('SQLITE_CONSTRAINT_FOREIGNKEY');
  });

  it('rejects titles that differ only by case', () => {
    insertMovie(db, { title: 'Iron Man' });

    const code = constraintCode(() => insertMovie(db, { title: 'iron man' }));

    expect(code).toBe('SQLITE_CONSTRAINT_UNIQUE');
  });

  it('rejects runtime minutes outside 1-300', () => {
    expect(
      constraintCode(() =>
        insertMovie(db, { title: 'Too Short', runtimeMinutes: 0 }),
      ),
    ).toBe('SQLITE_CONSTRAINT_CHECK');

    expect(
      constraintCode(() =>
        insertMovie(db, { title: 'Too Long', runtimeMinutes: 301 }),
      ),
    ).toBe('SQLITE_CONSTRAINT_CHECK');
  });

  it('rejects release years before 1900', () => {
    const code = constraintCode(() =>
      insertMovie(db, { title: 'Ancient', releaseYear: 1899 }),
    );

    expect(code).toBe('SQLITE_CONSTRAINT_CHECK');
  });

  it('rejects a movie being its own prerequisite', () => {
    const movieId = insertMovie(db);

    const code = constraintCode(() =>
      insertPrerequisite(db, movieId, movieId),
    );

    expect(code).toBe('SQLITE_CONSTRAINT_CHECK');
  });

  it('rejects a duplicate movie/prerequisite pair', () => {
    const movieId = insertMovie(db, { title: 'The Avengers' });
    const prerequisiteId = insertMovie(db, { title: 'Iron Man' });

    insertPrerequisite(db, movieId, prerequisiteId);

    const code = constraintCode(() =>
      insertPrerequisite(db, movieId, prerequisiteId),
    );

    expect(code).toBe('SQLITE_CONSTRAINT_PRIMARYKEY');
  });

  it('rejects bundle sizes outside 1-500', () => {
    const cinemaId = insertCinema(db);

    expect(
      constraintCode(() => insertBundleSize(db, cinemaId, 0)),
    ).toBe('SQLITE_CONSTRAINT_CHECK');

    expect(
      constraintCode(() => insertBundleSize(db, cinemaId, 501)),
    ).toBe('SQLITE_CONSTRAINT_CHECK');
  });

  it('rejects a duplicate cinema/bundle size pair', () => {
    const cinemaId = insertCinema(db);

    insertBundleSize(db, cinemaId, 100);

    const code = constraintCode(() => insertBundleSize(db, cinemaId, 100));

    expect(code).toBe('SQLITE_CONSTRAINT_PRIMARYKEY');
  });
});

describe('withTransaction', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = openDatabase(':memory:');
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it('commits work when the function succeeds', () => {
    const movieId = withTransaction(db, () => insertMovie(db, { title: 'Thor' }));

    expect(
      db.prepare('SELECT id FROM movies WHERE id = ?').get(movieId),
    ).toBeDefined();
  });

  it('rolls back work when the function throws', () => {
    expect(() =>
      withTransaction(db, () => {
        insertMovie(db, { title: 'Thor' });
        throw new Error('boom');
      }),
    ).toThrow('boom');

    const row = db
      .prepare('SELECT COUNT(*) AS count FROM movies')
      .get() as { count: number };

    expect(row.count).toBe(0);
  });
});
