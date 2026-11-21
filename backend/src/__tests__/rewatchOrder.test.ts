import { describe, expect, it } from 'vitest';
import {
  buildRewatchOrder,
  type RewatchMovie,
} from '../logic/rewatchOrder.js';
import { sampleMovieIds, sampleMovies } from './fixtures/sampleMovies.js';

/**
 * Asserts the order contains no duplicates and that every movie comes after
 * each of its prerequisites (which must themselves be present).
 */
function expectValidOrder(
  order: RewatchMovie[],
  allMovies: readonly RewatchMovie[],
): void {
  const positionById = new Map(
    order.map((movie, index) => [movie.id, index]),
  );

  expect(positionById.size).toBe(order.length);

  const knownIds = new Set(allMovies.map((movie) => movie.id));
  for (const movie of order) {
    expect(knownIds.has(movie.id)).toBe(true);
  }

  for (const movie of order) {
    const moviePosition = positionById.get(movie.id);
    if (moviePosition === undefined) {
      throw new Error(`Movie ${movie.id} is missing from the order`);
    }

    for (const prerequisiteId of movie.prerequisiteIds) {
      const prerequisitePosition = positionById.get(prerequisiteId);
      if (prerequisitePosition === undefined) {
        throw new Error(
          `${movie.id} depends on ${prerequisiteId}, which is missing from the order`,
        );
      }

      expect(prerequisitePosition).toBeLessThan(moviePosition);
    }
  }
}

describe('buildRewatchOrder', () => {
  it('returns all seven other movies for Doomsday, target excluded', () => {
    const result = buildRewatchOrder(sampleMovieIds.doomsday, sampleMovies);

    expect(result.order).toHaveLength(7);
    expect(result.totalCount).toBe(7);
    expect(result.watchedCount).toBe(0);
    expect(result.remainingMinutes).toBe(1000);

    const orderedIds = result.order.map((movie) => movie.id);
    expect(orderedIds).not.toContain(sampleMovieIds.doomsday);
    expect(new Set(orderedIds)).toEqual(
      new Set(
        sampleMovies
          .map((movie) => movie.id)
          .filter((id) => id !== sampleMovieIds.doomsday),
      ),
    );

    expectValidOrder(result.order, sampleMovies);
  });

  it('returns Iron Man and First Avenger before The Avengers for Civil War', () => {
    const result = buildRewatchOrder(sampleMovieIds.civilWar, sampleMovies);

    expect(result.order.map((movie) => movie.id)).toEqual([
      sampleMovieIds.ironMan,
      sampleMovieIds.firstAvenger,
      sampleMovieIds.avengers,
    ]);
    expect(result.totalCount).toBe(3);
    expect(result.watchedCount).toBe(0);
    expect(result.remainingMinutes).toBe(126 + 124 + 143);
    expectValidOrder(result.order, sampleMovies);
  });

  it('returns an empty order for Ragnarok, which has no prerequisites', () => {
    const result = buildRewatchOrder(sampleMovieIds.ragnarok, sampleMovies);

    expect(result.order).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.watchedCount).toBe(0);
    expect(result.remainingMinutes).toBe(0);
  });

  it('includes a diamond-shaped prerequisite exactly once', () => {
    const diamondMovies: RewatchMovie[] = [
      {
        id: 'diamond-target',
        title: 'Diamond Target',
        releaseYear: 2026,
        runtimeMinutes: 120,
        watched: false,
        prerequisiteIds: ['left', 'right'],
      },
      {
        id: 'left',
        title: 'Left',
        releaseYear: 2011,
        runtimeMinutes: 100,
        watched: false,
        prerequisiteIds: ['root'],
      },
      {
        id: 'right',
        title: 'Right',
        releaseYear: 2012,
        runtimeMinutes: 110,
        watched: false,
        prerequisiteIds: ['root'],
      },
      {
        id: 'root',
        title: 'Root',
        releaseYear: 2008,
        runtimeMinutes: 90,
        watched: false,
        prerequisiteIds: [],
      },
    ];

    const result = buildRewatchOrder('diamond-target', diamondMovies);

    expect(result.order.filter((movie) => movie.id === 'root')).toHaveLength(1);
    expect(result.order.map((movie) => movie.id)).toEqual([
      'root',
      'left',
      'right',
    ]);
    expect(result.totalCount).toBe(3);
    expectValidOrder(result.order, diamondMovies);
  });

  it('counts watched movies and only the unwatched minutes that remain', () => {
    const movies = sampleMovies.map((movie) =>
      movie.id === sampleMovieIds.ironMan ||
      movie.id === sampleMovieIds.civilWar
        ? { ...movie, watched: true }
        : movie,
    );

    const result = buildRewatchOrder(sampleMovieIds.doomsday, movies);

    const orderedIds = result.order.map((movie) => movie.id);
    expect(orderedIds).toContain(sampleMovieIds.ironMan);
    expect(orderedIds).toContain(sampleMovieIds.civilWar);
    expect(result.watchedCount).toBe(2);
    expect(result.totalCount).toBe(7);
    expect(result.remainingMinutes).toBe(1000 - 126 - 147);
  });

  it('throws a clear error when the target does not exist', () => {
    expect(() => buildRewatchOrder('missing-movie', sampleMovies)).toThrow(
      'Unknown movie: missing-movie',
    );
  });
});
