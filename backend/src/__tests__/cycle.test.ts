import { describe, expect, it } from 'vitest';
import { wouldCreateCycle } from '../logic/cycle.js';
import {
  sampleMovieIds,
  samplePrerequisitesByMovie,
} from './fixtures/sampleMovies.js';

describe('wouldCreateCycle', () => {
  it('rejects a movie listing itself as a prerequisite', () => {
    expect(
      wouldCreateCycle(
        samplePrerequisitesByMovie(),
        sampleMovieIds.ironMan,
        [sampleMovieIds.ironMan],
      ),
    ).toBe(true);
  });

  it('rejects Endgame as a prerequisite of Iron Man', () => {
    // Endgame -> Infinity War -> Civil War -> The Avengers -> Iron Man.
    expect(
      wouldCreateCycle(
        samplePrerequisitesByMovie(),
        sampleMovieIds.ironMan,
        [sampleMovieIds.endgame],
      ),
    ).toBe(true);
  });

  it('detects a three-node indirect cycle', () => {
    // a depends on b, b depends on c; making c depend on a closes the loop.
    const graph = new Map<string, string[]>([
      ['a', ['b']],
      ['b', ['c']],
      ['c', []],
    ]);

    expect(wouldCreateCycle(graph, 'c', ['a'])).toBe(true);
  });

  it('allows a prerequisite that cannot reach the movie', () => {
    expect(
      wouldCreateCycle(
        samplePrerequisitesByMovie(),
        sampleMovieIds.doomsday,
        [sampleMovieIds.endgame],
      ),
    ).toBe(false);
  });

  it('allows an empty prerequisite list', () => {
    expect(
      wouldCreateCycle(
        samplePrerequisitesByMovie(),
        sampleMovieIds.doomsday,
        [],
      ),
    ).toBe(false);
  });

  it('terminates when the existing graph already contains a cycle', () => {
    // Corrupt data (x <-> y) must not hang the traversal for an unrelated movie.
    const graph = new Map<string, string[]>([
      ['x', ['y']],
      ['y', ['x']],
      ['z', []],
    ]);

    expect(wouldCreateCycle(graph, 'z', ['x'])).toBe(false);
  });
});
