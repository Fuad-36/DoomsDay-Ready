import { getRewatchPlan, listMovies } from '../../api/client';
import type { RewatchPlan } from '../../api/client';
import { EmptyState } from '../../components/EmptyState';
import { ErrorMessage } from '../../components/ErrorMessage';
import { LoadingCard } from '../../components/LoadingCard';
import { useAsync } from '../../hooks/useAsync';
import { formatDuration } from './formatDuration';
import { RewatchProgress } from './RewatchProgress';

interface RewatchTabProps {
  targetId: string;
  onTargetChange: (id: string) => void;
}

function PlanContent({ plan }: { plan: RewatchPlan }) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <h3 className="text-lg font-semibold text-slate-100">
            Path to {plan.target.title}
          </h3>
          <p className="text-sm text-slate-400">
            Remaining watch time:{' '}
            <span className="font-semibold text-slate-200">
              {plan.remainingMinutes} min
            </span>{' '}
            ({formatDuration(plan.remainingMinutes)})
          </p>
        </div>

        <div className="mt-4">
          <RewatchProgress
            watchedCount={plan.watchedCount}
            totalCount={plan.totalCount}
          />
        </div>
      </section>

      {plan.order.length === 0 ? (
        <EmptyState
          title="No prerequisites"
          description={`${plan.target.title} has no prerequisite movies, so you're clear to watch it.`}
        />
      ) : (
        <section aria-labelledby="rewatch-order-heading" className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3
              id="rewatch-order-heading"
              className="text-lg font-semibold text-slate-100"
            >
              Watch order
            </h3>
            <span className="text-xs text-slate-500">
              {plan.totalCount} {plan.totalCount === 1 ? 'movie' : 'movies'}
            </span>
          </div>

          <ol
            aria-label={`Rewatch order before ${plan.target.title}`}
            className="list-none space-y-3"
          >
            {plan.order.map((movie, index) => (
              <li
                key={movie.id}
                className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-sm font-semibold text-amber-300"
                >
                  {index + 1}
                </span>

                <span
                  role="img"
                  aria-label={movie.watched ? 'Watched' : 'Not watched'}
                  title={movie.watched ? 'Watched' : 'Not watched'}
                  className={
                    movie.watched
                      ? 'flex h-5 w-5 shrink-0 items-center justify-center rounded border border-amber-400/60 bg-amber-400/20 text-xs font-bold text-amber-300'
                      : 'flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-700 text-xs font-bold text-slate-600'
                  }
                >
                  {movie.watched ? '✓' : ''}
                </span>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">
                    {movie.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {movie.releaseYear} · {movie.runtimeMinutes} min
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function RewatchPlanPanel({ targetId }: { targetId: string }) {
  const { data: plan, loading, error, reload } = useAsync(
    () => getRewatchPlan(targetId),
    [targetId],
  );

  if (loading) {
    return <LoadingCard label="Building rewatch order…" />;
  }

  if (error) {
    return <ErrorMessage message={error.message} onRetry={reload} />;
  }

  if (!plan) {
    return <LoadingCard label="Building rewatch order…" />;
  }

  return <PlanContent plan={plan} />;
}

export function RewatchTab({ targetId, onTargetChange }: RewatchTabProps) {
  const {
    data: movies,
    loading: moviesLoading,
    error: moviesError,
    reload: reloadMovies,
  } = useAsync(listMovies, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Rewatch Plan</h2>
        <p className="mt-1 text-sm text-slate-400">
          Pick a target movie and see the order to watch everything before it.
        </p>
      </div>

      {moviesLoading && movies === null ? (
        <LoadingCard label="Loading movies…" />
      ) : moviesError && movies === null ? (
        <ErrorMessage message={moviesError.message} onRetry={reloadMovies} />
      ) : !movies || movies.length === 0 ? (
        <EmptyState
          title="No movies yet"
          description="Add a movie in the Movies tab to build a rewatch plan."
        />
      ) : (
        <>
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <label
              htmlFor="rewatch-target"
              className="block text-sm font-medium text-slate-300"
            >
              Target movie
            </label>
            <select
              id="rewatch-target"
              value={targetId}
              onChange={(event) => onTargetChange(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
            >
              <option value="">Select a target movie</option>
              {movies.map((movie) => (
                <option key={movie.id} value={movie.id}>
                  {movie.title}
                </option>
              ))}
            </select>
          </section>

          {targetId.length === 0 ? (
            <EmptyState
              title="Choose a target movie"
              description="Select the movie you want to watch to see the rewatch order before it."
            />
          ) : (
            <RewatchPlanPanel key={targetId} targetId={targetId} />
          )}
        </>
      )}
    </div>
  );
}
