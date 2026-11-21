export interface RewatchMovie {
  id: string;
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
  watched: boolean;
  prerequisiteIds: string[];
}

export interface RewatchOrder {
  order: RewatchMovie[];
  watchedCount: number;
  totalCount: number;
  remainingMinutes: number;
}

/**
 * Prerequisites are visited in (releaseYear, title) order. The title comparison
 * is code-unit based rather than locale-aware so the same data always produces
 * the same order on every machine.
 */
function compareByReleaseThenTitle(a: RewatchMovie, b: RewatchMovie): number {
  if (a.releaseYear !== b.releaseYear) {
    return a.releaseYear - b.releaseYear;
  }
  if (a.title < b.title) {
    return -1;
  }
  if (a.title > b.title) {
    return 1;
  }
  return 0;
}

/**
 * Builds the deterministic rewatch order for `targetId`.
 *
 * A post-order depth-first walk emits a movie only after all of its own
 * prerequisites, so the result is always a valid viewing order. The visited set
 * makes diamonds and shared prerequisites appear exactly once. The `visiting`
 * set is a guard: if stored data is cyclic we raise instead of recursing
 * forever or returning a misleading order.
 */
export function buildRewatchOrder(
  targetId: string,
  movies: readonly RewatchMovie[],
): RewatchOrder {
  const moviesById = new Map(movies.map((movie) => [movie.id, movie]));

  const target = moviesById.get(targetId);
  if (!target) {
    throw new Error(`Unknown movie: ${targetId}`);
  }

  const resolvePrerequisites = (movie: RewatchMovie): RewatchMovie[] =>
    movie.prerequisiteIds
      .map((prerequisiteId) => {
        const prerequisite = moviesById.get(prerequisiteId);
        if (!prerequisite) {
          throw new Error(`Unknown prerequisite: ${prerequisiteId}`);
        }
        return prerequisite;
      })
      .sort(compareByReleaseThenTitle);

  const order: RewatchMovie[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (movieId: string): void => {
    if (movieId === targetId) {
      throw new Error(
        `Cycle detected: movie ${movieId} is its own prerequisite`,
      );
    }

    if (visited.has(movieId)) {
      return;
    }
    if (visiting.has(movieId)) {
      throw new Error(
        `Cycle detected in prerequisite graph at movie ${movieId}`,
      );
    }

    const movie = moviesById.get(movieId);
    if (!movie) {
      throw new Error(`Unknown prerequisite: ${movieId}`);
    }

    visiting.add(movieId);
    for (const prerequisite of resolvePrerequisites(movie)) {
      visit(prerequisite.id);
    }
    visiting.delete(movieId);

    visited.add(movieId);
    order.push(movie);
  };

  // The target itself is never emitted, only the movies needed before it.
  for (const prerequisite of resolvePrerequisites(target)) {
    visit(prerequisite.id);
  }

  return {
    order,
    watchedCount: order.filter((movie) => movie.watched).length,
    totalCount: order.length,
    remainingMinutes: order
      .filter((movie) => !movie.watched)
      .reduce((sum, movie) => sum + movie.runtimeMinutes, 0),
  };
}
