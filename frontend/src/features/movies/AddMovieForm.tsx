import { useState } from 'react';
import type { FormEvent } from 'react';
import { createMovie } from '../../api/client';
import type { CreateMovieInput, Movie } from '../../api/client';
import { ErrorMessage } from '../../components/ErrorMessage';
import { MAX_RELEASE_YEAR, MIN_RELEASE_YEAR } from '../../constants';
import { toErrorMessage } from './errors';
import { PrerequisitePicker } from './PrerequisitePicker';

const MAX_TITLE_LENGTH = 200;
const MIN_RUNTIME_MINUTES = 1;
const MAX_RUNTIME_MINUTES = 300;

interface FieldErrors {
  title?: string;
  releaseYear?: string;
  runtimeMinutes?: string;
}

interface AddMovieFormProps {
  movies: readonly Movie[];
  onCreated: (movie: Movie) => void;
}

interface ValidatedValues {
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
}

function validateForm(
  title: string,
  releaseYear: string,
  runtimeMinutes: string,
): { errors: FieldErrors; values: ValidatedValues | null } {
  const errors: FieldErrors = {};
  const trimmedTitle = title.trim();

  if (trimmedTitle.length === 0) {
    errors.title = 'Title is required.';
  } else if (trimmedTitle.length > MAX_TITLE_LENGTH) {
    errors.title = `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`;
  }

  const year = Number(releaseYear);
  if (releaseYear.trim().length === 0) {
    errors.releaseYear = 'Release year is required.';
  } else if (!Number.isInteger(year)) {
    errors.releaseYear = 'Release year must be a whole number.';
  } else if (year < MIN_RELEASE_YEAR || year > MAX_RELEASE_YEAR) {
    errors.releaseYear = `Release year must be between ${MIN_RELEASE_YEAR} and ${MAX_RELEASE_YEAR}.`;
  }

  const runtime = Number(runtimeMinutes);
  if (runtimeMinutes.trim().length === 0) {
    errors.runtimeMinutes = 'Runtime is required.';
  } else if (!Number.isInteger(runtime)) {
    errors.runtimeMinutes = 'Runtime must be a whole number.';
  } else if (runtime < MIN_RUNTIME_MINUTES || runtime > MAX_RUNTIME_MINUTES) {
    errors.runtimeMinutes = `Runtime must be between ${MIN_RUNTIME_MINUTES} and ${MAX_RUNTIME_MINUTES} minutes.`;
  }

  if (Object.keys(errors).length > 0) {
    return { errors, values: null };
  }

  return {
    errors,
    values: {
      title: trimmedTitle,
      releaseYear: year,
      runtimeMinutes: runtime,
    },
  };
}

export function AddMovieForm({ movies, onCreated }: AddMovieFormProps) {
  const [title, setTitle] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [runtimeMinutes, setRuntimeMinutes] = useState('');
  const [prerequisiteIds, setPrerequisiteIds] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function clearFeedback() {
    setServerError(null);
    setFieldErrors({});
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = validateForm(title, releaseYear, runtimeMinutes);
    setFieldErrors(result.errors);
    setServerError(null);

    if (!result.values) {
      return;
    }

    setSubmitting(true);

    try {
      const input: CreateMovieInput = {
        title: result.values.title,
        releaseYear: result.values.releaseYear,
        runtimeMinutes: result.values.runtimeMinutes,
        prerequisiteIds,
      };
      const created = await createMovie(input);

      setTitle('');
      setReleaseYear('');
      setRuntimeMinutes('');
      setPrerequisiteIds([]);
      setFieldErrors({});
      onCreated(created);
    } catch (reason: unknown) {
      setServerError(
        toErrorMessage(reason, 'Could not add the movie. Please try again.'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <h3 className="text-lg font-semibold text-slate-100">Add a movie</h3>
      <p className="mt-1 text-sm text-slate-400">
        Add a title, its runtime, and any movies you should watch first.
      </p>

      <form className="mt-5 space-y-5" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label
              htmlFor="add-movie-title"
              className="block text-sm font-medium text-slate-300"
            >
              Title
            </label>
            <input
              id="add-movie-title"
              type="text"
              value={title}
              maxLength={MAX_TITLE_LENGTH}
              autoComplete="off"
              placeholder="e.g. Iron Man"
              onChange={(event) => {
                setTitle(event.target.value);
                clearFeedback();
              }}
              aria-invalid={Boolean(fieldErrors.title)}
              aria-describedby={
                fieldErrors.title ? 'add-movie-title-error' : undefined
              }
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
            />
            {fieldErrors.title ? (
              <p
                id="add-movie-title-error"
                className="mt-1 text-xs text-red-300"
              >
                {fieldErrors.title}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="add-movie-year"
              className="block text-sm font-medium text-slate-300"
            >
              Release year
            </label>
            <input
              id="add-movie-year"
              type="number"
              value={releaseYear}
              min={MIN_RELEASE_YEAR}
              max={MAX_RELEASE_YEAR}
              step={1}
              inputMode="numeric"
              placeholder="e.g. 2008"
              onChange={(event) => {
                setReleaseYear(event.target.value);
                clearFeedback();
              }}
              aria-invalid={Boolean(fieldErrors.releaseYear)}
              aria-describedby={
                fieldErrors.releaseYear ? 'add-movie-year-error' : undefined
              }
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
            />
            {fieldErrors.releaseYear ? (
              <p
                id="add-movie-year-error"
                className="mt-1 text-xs text-red-300"
              >
                {fieldErrors.releaseYear}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="add-movie-runtime"
              className="block text-sm font-medium text-slate-300"
            >
              Runtime (minutes)
            </label>
            <input
              id="add-movie-runtime"
              type="number"
              value={runtimeMinutes}
              min={MIN_RUNTIME_MINUTES}
              max={MAX_RUNTIME_MINUTES}
              step={1}
              inputMode="numeric"
              placeholder="e.g. 126"
              onChange={(event) => {
                setRuntimeMinutes(event.target.value);
                clearFeedback();
              }}
              aria-invalid={Boolean(fieldErrors.runtimeMinutes)}
              aria-describedby={
                fieldErrors.runtimeMinutes
                  ? 'add-movie-runtime-error'
                  : undefined
              }
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
            />
            {fieldErrors.runtimeMinutes ? (
              <p
                id="add-movie-runtime-error"
                className="mt-1 text-xs text-red-300"
              >
                {fieldErrors.runtimeMinutes}
              </p>
            ) : null}
          </div>
        </div>

        <PrerequisitePicker
          movies={movies}
          selectedIds={prerequisiteIds}
          onChange={(ids) => {
            setPrerequisiteIds(ids);
            clearFeedback();
          }}
        />

        {serverError ? <ErrorMessage message={serverError} /> : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Adding…' : 'Add movie'}
          </button>
        </div>
      </form>
    </section>
  );
}
