import type Database from 'better-sqlite3';

export interface Cinema {
  id: string;
  name: string;
  bundleSizes: number[];
  createdAt: string;
}

export interface NewCinema {
  id: string;
  name: string;
  bundleSizes: number[];
  createdAt: string;
}

interface CinemaRow {
  id: string;
  name: string;
  created_at: string;
}

interface BundleSizeRow {
  cinema_id: string;
  size: number;
}

function groupSizesByCinema(rows: BundleSizeRow[]): Map<string, number[]> {
  const byCinema = new Map<string, number[]>();
  for (const row of rows) {
    const sizes = byCinema.get(row.cinema_id);
    if (sizes) {
      sizes.push(row.size);
    } else {
      byCinema.set(row.cinema_id, [row.size]);
    }
  }
  return byCinema;
}

export function listCinemas(db: Database.Database): Cinema[] {
  const rows = db
    .prepare(
      'SELECT id, name, created_at FROM cinemas ORDER BY created_at ASC, rowid ASC',
    )
    .all() as CinemaRow[];

  const sizeRows = db
    .prepare('SELECT cinema_id, size FROM cinema_bundle_sizes ORDER BY size')
    .all() as BundleSizeRow[];

  const byCinema = groupSizesByCinema(sizeRows);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    bundleSizes: byCinema.get(row.id) ?? [],
    createdAt: row.created_at,
  }));
}

export function findCinemaById(
  db: Database.Database,
  id: string,
): Cinema | null {
  const row = db
    .prepare('SELECT id, name, created_at FROM cinemas WHERE id = ?')
    .get(id) as CinemaRow | undefined;

  if (!row) {
    return null;
  }

  const sizeRows = db
    .prepare(
      'SELECT size FROM cinema_bundle_sizes WHERE cinema_id = ? ORDER BY size ASC',
    )
    .all(id) as Array<{ size: number }>;

  return {
    id: row.id,
    name: row.name,
    bundleSizes: sizeRows.map((sizeRow) => sizeRow.size),
    createdAt: row.created_at,
  };
}

/**
 * Inserts the cinema and its bundle rows. The caller is responsible for running
 * this inside a transaction so a partial cinema can never be persisted.
 */
export function insertCinema(
  db: Database.Database,
  cinema: NewCinema,
): void {
  db.prepare(
    'INSERT INTO cinemas (id, name, created_at) VALUES (?, ?, ?)',
  ).run(cinema.id, cinema.name, cinema.createdAt);

  const insertSize = db.prepare(
    'INSERT INTO cinema_bundle_sizes (cinema_id, size) VALUES (?, ?)',
  );
  for (const size of cinema.bundleSizes) {
    insertSize.run(cinema.id, size);
  }
}
