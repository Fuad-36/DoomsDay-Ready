import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { Router } from 'express';
import {
  findMissingMovieIds,
  findMovieById,
  getPrerequisiteGraph,
  insertMovie,
  listMovies,
  replaceMoviePrerequisites,
  updateMovie,
  type Movie,
} from '../db/movieRepository.js';
import { withTransaction } from '../db/transaction.js';
import { AppError } from '../errors.js';
import { wouldCreateCycle } from '../logic/cycle.js';
import {
  createMovieSchema,
  toValidationError,
  updateMovieSchema,
} from '../validation/movie.js';

function isUniqueTitleError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }
  return (error as { code?: unknown }).code === 'SQLITE_CONSTRAINT_UNIQUE';
}

function duplicateTitleError(): AppError {
  return new AppError(
    409,
    'DUPLICATE_TITLE',
    'A movie with this title already exists',
  );
}

function circularDependencyError(): AppError {
  return new AppError(
    409,
    'CIRCULAR_DEPENDENCY',
    'The proposed prerequisites would create a circular dependency',
  );
}

function ensureNoDuplicatePrerequisites(ids: string[]): void {
  if (new Set(ids).size !== ids.length) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Duplicate prerequisite IDs are not allowed',
    );
  }
}

function ensurePrerequisitesExist(
  db: Database.Database,
  ids: string[],
): void {
  const missing = findMissingMovieIds(db, ids);
  if (missing.length > 0) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      `Unknown prerequisite ID(s): ${missing.join(', ')}`,
    );
  }
}

/**
 * The only unique constraint reachable from these writes is movies.title, so
 * translating that SQLite error keeps the API contract consistent.
 */
function withDuplicateTitleMapping<T>(run: () => T): T {
  try {
    return run();
  } catch (error) {
    if (isUniqueTitleError(error)) {
      throw duplicateTitleError();
    }
    throw error;
  }
}

function readMovie(db: Database.Database, id: string): Movie {
  const movie = findMovieById(db, id);
  if (!movie) {
    throw new Error(`Movie ${id} disappeared during the request`);
  }
  return movie;
}

export function createMoviesRouter(db: Database.Database): Router {
  const router = Router();

  router.post('/', (req, res) => {
    const parsed = createMovieSchema().safeParse(req.body);
    if (!parsed.success) {
      throw toValidationError(parsed.error);
    }

    const input = parsed.data;
    ensureNoDuplicatePrerequisites(input.prerequisiteIds);

    const movie = withDuplicateTitleMapping(() =>
      withTransaction(db, () => {
        // Fake data is FK-guarded, but the API must answer 400, not 500.
        ensurePrerequisitesExist(db, input.prerequisiteIds);

        const id = randomUUID();
        const graph = getPrerequisiteGraph(db);
        if (wouldCreateCycle(graph, id, input.prerequisiteIds)) {
          throw circularDependencyError();
        }

        const now = new Date().toISOString();
        insertMovie(db, {
          id,
          title: input.title,
          releaseYear: input.releaseYear,
          runtimeMinutes: input.runtimeMinutes,
          watched: input.watched,
          createdAt: now,
          updatedAt: now,
        });
        replaceMoviePrerequisites(db, id, input.prerequisiteIds);

        return readMovie(db, id);
      }),
    );

    res.status(201).json(movie);
  });

  router.get('/', (_req, res) => {
    res.status(200).json(listMovies(db));
  });

  router.patch('/:id', (req, res) => {
    const parsed = updateMovieSchema().safeParse(req.body);
    if (!parsed.success) {
      throw toValidationError(parsed.error);
    }

    const input = parsed.data;
    if (input.prerequisiteIds !== undefined) {
      ensureNoDuplicatePrerequisites(input.prerequisiteIds);
    }

    const movie = withDuplicateTitleMapping(() =>
      withTransaction(db, () => {
        const id = req.params.id;

        if (!findMovieById(db, id)) {
          throw new AppError(404, 'NOT_FOUND', 'Movie not found');
        }

        const prerequisiteIds = input.prerequisiteIds;
        if (prerequisiteIds !== undefined) {
          ensurePrerequisitesExist(db, prerequisiteIds);

          // Check against the stored graph inside the same transaction as the
          // write, so a concurrent write cannot slip a cycle in between.
          const graph = getPrerequisiteGraph(db);
          if (wouldCreateCycle(graph, id, prerequisiteIds)) {
            throw circularDependencyError();
          }

          // Replace before updating the row: if the row update fails (e.g.
          // duplicate title), the rollback also restores the old prerequisites.
          replaceMoviePrerequisites(db, id, prerequisiteIds);
        }

        updateMovie(db, id, {
          title: input.title,
          releaseYear: input.releaseYear,
          runtimeMinutes: input.runtimeMinutes,
          watched: input.watched,
          updatedAt: new Date().toISOString(),
        });

        return readMovie(db, id);
      }),
    );

    res.status(200).json(movie);
  });

  return router;
}
