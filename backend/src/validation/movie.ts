import { z } from 'zod';
import { AppError } from '../errors.js';

const MIN_RELEASE_YEAR = 1900;
const MAX_TITLE_LENGTH = 200;

/**
 * A factory, not a module constant: AGENTS.md requires the upper release-year
 * bound to be computed at request time.
 */
function releaseYearSchema() {
  return z
    .number()
    .int('releaseYear must be an integer')
    .min(MIN_RELEASE_YEAR, `releaseYear must be at least ${MIN_RELEASE_YEAR}`)
    .max(
      new Date().getFullYear() + 4,
      'releaseYear cannot be more than 4 years in the future',
    );
}

const titleSchema = z
  .string()
  .trim()
  .min(1, 'Title is required')
  .max(MAX_TITLE_LENGTH, `Title must be at most ${MAX_TITLE_LENGTH} characters`);

const runtimeMinutesSchema = z
  .number()
  .int('runtimeMinutes must be an integer')
  .min(1, 'runtimeMinutes must be at least 1')
  .max(300, 'runtimeMinutes must be at most 300');

const prerequisiteIdsSchema = z.array(z.string());

export function createMovieSchema() {
  return z.object({
    title: titleSchema,
    releaseYear: releaseYearSchema(),
    runtimeMinutes: runtimeMinutesSchema,
    watched: z.boolean().optional().default(false),
    prerequisiteIds: prerequisiteIdsSchema.optional().default([]),
  });
}

export function updateMovieSchema() {
  return z
    .object({
      title: titleSchema.optional(),
      releaseYear: releaseYearSchema().optional(),
      runtimeMinutes: runtimeMinutesSchema.optional(),
      watched: z.boolean().optional(),
      prerequisiteIds: prerequisiteIdsSchema.optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field must be provided',
    });
}

export type CreateMovieInput = z.infer<ReturnType<typeof createMovieSchema>>;
export type UpdateMovieInput = z.infer<ReturnType<typeof updateMovieSchema>>;

/** Turns a Zod failure into the standard API error without leaking internals. */
export function toValidationError(error: z.ZodError): AppError {
  const message = error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'body';
      return `${path}: ${issue.message}`;
    })
    .join('; ');

  return new AppError(400, 'VALIDATION_ERROR', message);
}
