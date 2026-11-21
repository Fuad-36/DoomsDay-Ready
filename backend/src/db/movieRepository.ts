import type Database from 'better-sqlite3';

export interface Movie {
  id: string;
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
  watched: boolean;
  prerequisiteIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NewMovie {
  id: string;
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
  watched: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MovieChanges {
  title?: string;
  releaseYear?: number;
  runtimeMinutes?: number;
  watched?: boolean;
  updatedAt: string;
}

interface MovieRow {
  id: string;
  title: string;
  release_year: number;
  runtime_minutes: number;
  watched: number;
  created_at: string;
  updated_at: string;
}

interface PrerequisiteRow {
  movie_id: string;
  prerequisite_id: string;
}

// One column list for SELECT and INSERT so the mapping cannot drift.
const MOVIE_COLUMNS =
  'id, title, release_year, runtime_minutes, watched, created_at, updated_at';

function mapMovie(row: MovieRow, prerequisiteIds: string[]): Movie {
  return {
    id: row.id,
    title: row.title,
    releaseYear: row.release_year,
    runtimeMinutes: row.runtime_minutes,
    watched: row.watched === 1,
    prerequisiteIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function groupByMovie(rows: PrerequisiteRow[]): Map<string, string[]> {
  const byMovie = new Map<string, string[]>();
  for (const row of rows) {
    const prerequisites = byMovie.get(row.movie_id);
    if (prerequisites) {
      prerequisites.push(row.prerequisite_id);
    } else {
      byMovie.set(row.movie_id, [row.prerequisite_id]);
    }
  }
  return byMovie;
}

export function listMovies(db: Database.Database): Movie[] {
  const rows = db
    .prepare(
      `SELECT ${MOVIE_COLUMNS} FROM movies ORDER BY created_at ASC, rowid ASC`,
    )
    .all() as MovieRow[];

  const prerequisiteRows = db
    .prepare(
      'SELECT movie_id, prerequisite_id FROM movie_prerequisites ORDER BY rowid',
    )
    .all() as PrerequisiteRow[];

  const byMovie = groupByMovie(prerequisiteRows);

  return rows.map((row) => mapMovie(row, byMovie.get(row.id) ?? []));
}

export function findMovieById(
  db: Database.Database,
  id: string,
): Movie | null {
  const row = db
    .prepare(`SELECT ${MOVIE_COLUMNS} FROM movies WHERE id = ?`)
    .get(id) as MovieRow | undefined;

  if (!row) {
    return null;
  }

  // rowid preserves the order the client supplied when the set was saved.
  const prerequisiteRows = db
    .prepare(
      'SELECT prerequisite_id FROM movie_prerequisites WHERE movie_id = ? ORDER BY rowid',
    )
    .all(id) as Array<{ prerequisite_id: string }>;

  return mapMovie(
    row,
    prerequisiteRows.map((prerequisite) => prerequisite.prerequisite_id),
  );
}

export function insertMovie(db: Database.Database, movie: NewMovie): void {
  db.prepare(
    `INSERT INTO movies (${MOVIE_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    movie.id,
    movie.title,
    movie.releaseYear,
    movie.runtimeMinutes,
    movie.watched ? 1 : 0,
    movie.createdAt,
    movie.updatedAt,
  );
}

export function updateMovie(
  db: Database.Database,
  id: string,
  changes: MovieChanges,
): void {
  const assignments: string[] = [];
  const values: Array<string | number> = [];

  if (changes.title !== undefined) {
    assignments.push('title = ?');
    values.push(changes.title);
  }
  if (changes.releaseYear !== undefined) {
    assignments.push('release_year = ?');
    values.push(changes.releaseYear);
  }
  if (changes.runtimeMinutes !== undefined) {
    assignments.push('runtime_minutes = ?');
    values.push(changes.runtimeMinutes);
  }
  if (changes.watched !== undefined) {
    assignments.push('watched = ?');
    values.push(changes.watched ? 1 : 0);
  }

  assignments.push('updated_at = ?');
  values.push(changes.updatedAt);
  values.push(id);

  db.prepare(`UPDATE movies SET ${assignments.join(', ')} WHERE id = ?`).run(
    ...values,
  );
}

export function replaceMoviePrerequisites(
  db: Database.Database,
  movieId: string,
  prerequisiteIds: string[],
): void {
  db.prepare('DELETE FROM movie_prerequisites WHERE movie_id = ?').run(movieId);

  const insert = db.prepare(
    'INSERT INTO movie_prerequisites (movie_id, prerequisite_id) VALUES (?, ?)',
  );
  for (const prerequisiteId of prerequisiteIds) {
    insert.run(movieId, prerequisiteId);
  }
}

/** Returns IDs from `ids` that no movie owns, preserving input order. */
export function findMissingMovieIds(
  db: Database.Database,
  ids: string[],
): string[] {
  if (ids.length === 0) {
    return [];
  }

  const placeholders = ids.map(() => '?').join(', ');
  const rows = db
    .prepare(`SELECT id FROM movies WHERE id IN (${placeholders})`)
    .all(...ids) as Array<{ id: string }>;

  const existing = new Set(rows.map((row) => row.id));
  return ids.filter((id) => !existing.has(id));
}

/** The graph shape expected by wouldCreateCycle: movie -> direct prerequisites. */
export function getPrerequisiteGraph(
  db: Database.Database,
): Map<string, string[]> {
  const rows = db
    .prepare('SELECT movie_id, prerequisite_id FROM movie_prerequisites')
    .all() as PrerequisiteRow[];

  return groupByMovie(rows);
}
