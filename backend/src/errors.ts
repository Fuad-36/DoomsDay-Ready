export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CIRCULAR_DEPENDENCY'
  | 'DUPLICATE_TITLE'
  | 'DUPLICATE_NAME'
  | 'INTERNAL_ERROR';

/**
 * Carries the HTTP status and API error code so handlers can throw instead of
 * formatting responses inline. The error handler is the single place that maps
 * these onto the wire format from AGENTS.md.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;

  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}
