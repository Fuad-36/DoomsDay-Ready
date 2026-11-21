import { z } from 'zod';
import { AppError } from '../errors.js';

const MAX_NAME_LENGTH = 200;
const MAX_BUNDLE_SIZES = 10;

/**
 * Duplicates are collapsed before the 1-10 count rule, per the final decision:
 * `[3,3,5]` is a valid two-size cinema, while eleven distinct sizes are not.
 * Sorting here also guarantees the API always returns sizes ascending.
 */
export function createCinemaSchema() {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(
        MAX_NAME_LENGTH,
        `Name must be at most ${MAX_NAME_LENGTH} characters`,
      ),
    bundleSizes: z
      .array(
        z
          .number()
          .int('Bundle sizes must be integers')
          .min(1, 'Bundle sizes must be at least 1')
          .max(500, 'Bundle sizes must be at most 500'),
      )
      .transform((sizes) => [...new Set(sizes)].sort((a, b) => a - b))
      .refine(
        (sizes) => sizes.length >= 1 && sizes.length <= MAX_BUNDLE_SIZES,
        `bundleSizes must contain between 1 and ${MAX_BUNDLE_SIZES} distinct sizes`,
      ),
  });
}

export type CreateCinemaInput = z.infer<
  ReturnType<typeof createCinemaSchema>
>;

function invalidGroupSizeError(): AppError {
  return new AppError(
    400,
    'VALIDATION_ERROR',
    'groupSize must be an integer between 1 and 10000',
  );
}

/**
 * Query values arrive as strings (or arrays for repeated params). Digits only
 * rejects decimals, signs, whitespace and text before the numeric range check.
 */
export function parseGroupSize(value: unknown): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw invalidGroupSizeError();
  }

  const groupSize = Number(value);
  if (!Number.isSafeInteger(groupSize) || groupSize < 1 || groupSize > 10000) {
    throw invalidGroupSizeError();
  }

  return groupSize;
}

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
