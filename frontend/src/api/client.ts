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

export interface Cinema {
  id: string;
  name: string;
  bundleSizes: number[];
  createdAt: string;
}

export interface RewatchTarget {
  id: string;
  title: string;
}

export interface RewatchPlan {
  target: RewatchTarget;
  order: Movie[];
  watchedCount: number;
  totalCount: number;
  remainingMinutes: number;
}

export interface BundleCount {
  size: number;
  count: number;
}

export interface PossibleBookingQuote {
  cinemaId: string;
  groupSize: number;
  possible: true;
  totalBundles: number;
  bundles: BundleCount[];
}

export interface ImpossibleBookingQuote {
  cinemaId: string;
  groupSize: number;
  possible: false;
  totalBundles: null;
  bundles: [];
}

export type BookingQuote = PossibleBookingQuote | ImpossibleBookingQuote;

export interface HealthResponse {
  status: 'ok';
}

export interface CreateMovieInput {
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
  prerequisiteIds?: string[];
  watched?: boolean;
}

export type UpdateMovieInput = Partial<CreateMovieInput>;

export interface CreateCinemaInput {
  name: string;
  bundleSizes: number[];
}

interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const API_BASE = '/api';

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return false;
  }

  const error = (value as { error?: unknown }).error;
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as { code?: unknown; message?: unknown };
  return (
    typeof candidate.code === 'string' && typeof candidate.message === 'string'
  );
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');

  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the server');
  }

  const body = await readBody(response);

  if (!response.ok) {
    if (isApiErrorEnvelope(body)) {
      throw new ApiError(response.status, body.error.code, body.error.message);
    }

    throw new ApiError(
      response.status,
      'INTERNAL_ERROR',
      response.statusText || 'The request failed',
    );
  }

  if (body === null) {
    throw new ApiError(
      response.status,
      'INTERNAL_ERROR',
      'The server returned an invalid response',
    );
  }

  return body as T;
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health');
}

export function listMovies(): Promise<Movie[]> {
  return request<Movie[]>('/movies');
}

export function createMovie(input: CreateMovieInput): Promise<Movie> {
  return request<Movie>('/movies', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateMovie(
  id: string,
  input: UpdateMovieInput,
): Promise<Movie> {
  return request<Movie>(`/movies/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function getRewatchPlan(id: string): Promise<RewatchPlan> {
  return request<RewatchPlan>(
    `/movies/${encodeURIComponent(id)}/rewatch-order`,
  );
}

export function listCinemas(): Promise<Cinema[]> {
  return request<Cinema[]>('/cinemas');
}

export function createCinema(input: CreateCinemaInput): Promise<Cinema> {
  return request<Cinema>('/cinemas', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getBookingQuote(
  cinemaId: string,
  groupSize: number,
): Promise<BookingQuote> {
  const query = new URLSearchParams({ groupSize: String(groupSize) });
  return request<BookingQuote>(
    `/cinemas/${encodeURIComponent(cinemaId)}/booking?${query.toString()}`,
  );
}
