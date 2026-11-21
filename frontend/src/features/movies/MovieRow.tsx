import { useEffect, useState } from 'react';
import { updateMovie } from '../../api/client';
import type { Movie } from '../../api/client';
import { ErrorMessage } from '../../components/ErrorMessage';
import { toErrorMessage } from './errors';
import { PrerequisitePicker } from './PrerequisitePicker';

interface MovieRowProps {
  movie: Movie;
  movies: readonly Movie[];
  onUpdated: (movie: Movie) => void;
}

export function MovieRow({ movie, movies, onUpdated }: MovieRowProps) {
  const [watched, setWatched] = useState(movie.watched);
  const [watchedPending, setWatchedPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftIds, setDraftIds] = useState<string[]>(movie.prerequisiteIds);
  const [editingError, setEditingError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setWatched(movie.watched);
  }, [movie.watched]);

  const prerequisiteMovies = movie.prerequisiteIds
    .map((id) => movies.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is Movie => candidate !== undefined);

  async function handleWatchedChange(nextWatched: boolean) {
    const previousWatched = movie.watched;
    setWatched(nextWatched);
    setWatchedPending(true);
    setActionError(null);

    try {
      const updated = await updateMovie(movie.id, { watched: nextWatched });
      setWatched(updated.watched);
      onUpdated(updated);
    } catch (reason: unknown) {
      setWatched(previousWatched);
      setActionError(
        toErrorMessage(
          reason,
          'Could not update the watched status. Please try again.',
        ),
      );
    } finally {
      setWatchedPending(false);
    }
  }

  function startEditing() {
    setDraftIds(movie.prerequisiteIds);
    setEditingError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setDraftIds(movie.prerequisiteIds);
    setEditingError(null);
    setEditing(false);
  }

  async function savePrerequisites() {
    setSaving(true);
    setEditingError(null);

    try {
      const updated = await updateMovie(movie.id, {
        prerequisiteIds: draftIds,
      });
      setDraftIds(updated.prerequisiteIds);
      onUpdated(updated);
      setEditing(false);
    } catch (reason: unknown) {
      setEditingError(
        toErrorMessage(
          reason,
          'Could not update the prerequisites. Please try again.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h4 className="truncate text-base font-semibold text-slate-100">
            {movie.title}
          </h4>
          <p className="mt-1 text-sm text-slate-400">
            {movie.releaseYear} · {movie.runtimeMinutes} min
          </p>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={watched}
            disabled={watchedPending}
            onChange={(event) => {
              void handleWatchedChange(event.target.checked);
            }}
            aria-label={`Mark ${movie.title} as watched`}
            className="h-4 w-4 rounded border-slate-600 bg-slate-950 accent-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          />
          {watchedPending ? 'Saving…' : 'Watched'}
        </label>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Prerequisites
        </p>
        {prerequisiteMovies.length > 0 ? (
          <ul
            aria-label={`Prerequisites for ${movie.title}`}
            className="mt-2 flex flex-wrap gap-2"
          >
            {prerequisiteMovies.map((prerequisite) => (
              <li
                key={prerequisite.id}
                className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300"
              >
                {prerequisite.title}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No prerequisites</p>
        )}
      </div>

      <div className="mt-4">
        {!editing ? (
          <button
            type="button"
            onClick={startEditing}
            aria-expanded={false}
            aria-controls={`prerequisite-editor-${movie.id}`}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            Edit prerequisites
          </button>
        ) : null}
      </div>

      {actionError ? (
        <div className="mt-3">
          <ErrorMessage message={actionError} />
        </div>
      ) : null}

      {editing ? (
        <div
          id={`prerequisite-editor-${movie.id}`}
          className="mt-4 space-y-4 rounded-lg border border-slate-800 bg-slate-950/50 p-4"
        >
          <PrerequisitePicker
            movies={movies}
            selectedIds={draftIds}
            onChange={(ids) => {
              setDraftIds(ids);
              setEditingError(null);
            }}
            excludeId={movie.id}
            label={`Add prerequisite to ${movie.title}`}
          />

          {editingError ? <ErrorMessage message={editingError} /> : null}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={cancelEditing}
              disabled={saving}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                void savePrerequisites();
              }}
              disabled={saving}
              className="rounded-md bg-amber-400 px-3 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save prerequisites'}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
