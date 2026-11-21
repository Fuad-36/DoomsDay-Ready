import { useId } from 'react';
import type { ChangeEvent } from 'react';

export interface MovieOption {
  id: string;
  title: string;
}

interface PrerequisitePickerProps {
  movies: readonly MovieOption[];
  selectedIds: readonly string[];
  onChange: (ids: string[]) => void;
  excludeId?: string;
  label?: string;
}

export function PrerequisitePicker({
  movies,
  selectedIds,
  onChange,
  excludeId,
  label = 'Add prerequisite',
}: PrerequisitePickerProps) {
  const selectId = useId();

  const selectedMovies = selectedIds
    .map((id) => movies.find((movie) => movie.id === id))
    .filter((movie): movie is MovieOption => movie !== undefined);

  const selectedSet = new Set(selectedIds);
  const availableMovies = movies.filter(
    (movie) => movie.id !== excludeId && !selectedSet.has(movie.id),
  );
  const hasAvailableMovies = availableMovies.length > 0;

  function handleSelect(event: ChangeEvent<HTMLSelectElement>) {
    const candidateId = event.target.value;

    if (
      candidateId.length === 0 ||
      candidateId === excludeId ||
      selectedSet.has(candidateId)
    ) {
      return;
    }

    onChange([...selectedIds, candidateId]);
  }

  function handleRemove(movieId: string) {
    onChange(selectedIds.filter((id) => id !== movieId));
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor={selectId}
        className="block text-sm font-medium text-slate-300"
      >
        {label}
      </label>

      {selectedMovies.length > 0 ? (
        <ul
          aria-label="Selected prerequisites"
          className="flex flex-wrap gap-2"
        >
          {selectedMovies.map((movie) => (
            <li
              key={movie.id}
              className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-200"
            >
              <span className="min-w-0 break-words">{movie.title}</span>
              <button
                type="button"
                aria-label={`Remove ${movie.title}`}
                onClick={() => handleRemove(movie.id)}
                className="shrink-0 rounded-full p-0.5 text-amber-200/80 transition hover:bg-amber-400/20 hover:text-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <select
        id={selectId}
        value=""
        onChange={handleSelect}
        disabled={!hasAvailableMovies}
        className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 transition focus:border-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
      >
        <option value="" disabled>
          {hasAvailableMovies ? 'Select a movie…' : 'No movies available'}
        </option>
        {availableMovies.map((movie) => (
          <option key={movie.id} value={movie.id}>
            {movie.title}
          </option>
        ))}
      </select>
    </div>
  );
}
