import { useState } from 'react';
import { listMovies } from '../../api/client';
import type { Movie } from '../../api/client';
import { EmptyState } from '../../components/EmptyState';
import { ErrorMessage } from '../../components/ErrorMessage';
import { LoadingCard } from '../../components/LoadingCard';
import { useAsync } from '../../hooks/useAsync';
import { AddMovieForm } from './AddMovieForm';
import { MovieRow } from './MovieRow';

interface MoviesContentProps {
  initialMovies: Movie[];
}

function MoviesContent({ initialMovies }: MoviesContentProps) {
  const [movies, setMovies] = useState<Movie[]>(initialMovies);

  function handleCreated(movie: Movie) {
    setMovies((current) => [...current, movie]);
  }

  function handleUpdated(updated: Movie) {
    setMovies((current) =>
      current.map((movie) => (movie.id === updated.id ? updated : movie)),
    );
  }

  return (
    <div className="space-y-6">
      <AddMovieForm movies={movies} onCreated={handleCreated} />

      <section aria-labelledby="movie-list-heading" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3
            id="movie-list-heading"
            className="text-lg font-semibold text-slate-100"
          >
            Your movies
          </h3>
          <span className="text-xs text-slate-500">
            {movies.length} {movies.length === 1 ? 'movie' : 'movies'}
          </span>
        </div>

        {movies.length === 0 ? (
          <EmptyState
            title="No movies yet"
            description="Add your first movie using the form above."
          />
        ) : (
          <div className="space-y-3">
            {movies.map((movie) => (
              <MovieRow
                key={movie.id}
                movie={movie}
                movies={movies}
                onUpdated={handleUpdated}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function MoviesTab() {
  const { data, loading, error, reload } = useAsync(listMovies, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Movies</h2>
        <p className="mt-1 text-sm text-slate-400">
          Add and manage the MCU movies you plan to rewatch.
        </p>
      </div>

      {loading && data === null ? (
        <LoadingCard label="Loading movies…" />
      ) : error && data === null ? (
        <ErrorMessage message={error.message} onRetry={reload} />
      ) : (
        <MoviesContent initialMovies={data ?? []} />
      )}
    </div>
  );
}
