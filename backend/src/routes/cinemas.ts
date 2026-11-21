import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { Router } from 'express';
import {
  findCinemaById,
  insertCinema,
  listCinemas,
  type Cinema,
} from '../db/cinemaRepository.js';
import { withTransaction } from '../db/transaction.js';
import { AppError } from '../errors.js';
import { getBookingQuote } from '../logic/booking.js';
import {
  createCinemaSchema,
  parseGroupSize,
  toValidationError,
} from '../validation/cinema.js';

function isUniqueNameError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }
  return (error as { code?: unknown }).code === 'SQLITE_CONSTRAINT_UNIQUE';
}

function duplicateNameError(): AppError {
  return new AppError(
    409,
    'DUPLICATE_NAME',
    'A cinema with this name already exists',
  );
}

/**
 * The only unique constraint reachable from this insert is cinemas.name.
 */
function withDuplicateNameMapping<T>(run: () => T): T {
  try {
    return run();
  } catch (error) {
    if (isUniqueNameError(error)) {
      throw duplicateNameError();
    }
    throw error;
  }
}

function readCinema(db: Database.Database, id: string): Cinema {
  const cinema = findCinemaById(db, id);
  if (!cinema) {
    throw new Error(`Cinema ${id} disappeared during the request`);
  }
  return cinema;
}

export function createCinemasRouter(db: Database.Database): Router {
  const router = Router();

  router.post('/', (req, res) => {
    const parsed = createCinemaSchema().safeParse(req.body);
    if (!parsed.success) {
      throw toValidationError(parsed.error);
    }

    const input = parsed.data;

    const cinema = withDuplicateNameMapping(() =>
      withTransaction(db, () => {
        const id = randomUUID();
        const createdAt = new Date().toISOString();

        insertCinema(db, {
          id,
          name: input.name,
          bundleSizes: input.bundleSizes,
          createdAt,
        });

        return readCinema(db, id);
      }),
    );

    res.status(201).json(cinema);
  });

  router.get('/', (_req, res) => {
    res.status(200).json(listCinemas(db));
  });

  router.get('/:id/booking', (req, res) => {
    const groupSize = parseGroupSize(req.query.groupSize);

    const cinema = findCinemaById(db, req.params.id);
    if (!cinema) {
      throw new AppError(404, 'NOT_FOUND', 'Cinema not found');
    }

    const quote = getBookingQuote(cinema.bundleSizes, groupSize);

    res.status(200).json({
      cinemaId: cinema.id,
      groupSize,
      ...quote,
    });
  });

  return router;
}
