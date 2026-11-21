import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../errors.js';

/**
 * body-parser surfaces invalid JSON as a SyntaxError tagged with
 * `type: 'entity.parse.failed'`. Treat it as a client validation problem rather
 * than an internal failure.
 */
function isJsonParseError(err: unknown): boolean {
  if (!(err instanceof SyntaxError)) {
    return false;
  }

  const candidate = err as SyntaxError & { type?: string; status?: number };
  return candidate.type === 'entity.parse.failed' || candidate.status === 400;
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  // If headers already went out, only Express can finish the response.
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  if (isJsonParseError(err)) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Malformed JSON body',
      },
    });
    return;
  }

  // Log the real error server-side, but never leak it to the client.
  console.error('Unexpected error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
  });
};
