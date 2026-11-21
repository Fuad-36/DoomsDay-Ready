import type { RewatchMovie } from '../../logic/rewatchOrder.js';

/**
 * Shared sample data from AGENTS.md. Runtimes are fixture values (AGENTS.md only
 * fixes titles, release years and prerequisite edges); they are chosen so the
 * seven movies before Doomsday total 1000 minutes.
 */
export const sampleMovieIds = {
  ironMan: 'iron-man',
  firstAvenger: 'captain-america-the-first-avenger',
  avengers: 'the-avengers',
  civilWar: 'captain-america-civil-war',
  ragnarok: 'thor-ragnarok',
  infinityWar: 'avengers-infinity-war',
  endgame: 'avengers-endgame',
  doomsday: 'avengers-doomsday',
} as const;

export const sampleMovies: RewatchMovie[] = [
  {
    id: sampleMovieIds.ironMan,
    title: 'Iron Man',
    releaseYear: 2008,
    runtimeMinutes: 126,
    watched: false,
    prerequisiteIds: [],
  },
  {
    id: sampleMovieIds.firstAvenger,
    title: 'Captain America: The First Avenger',
    releaseYear: 2011,
    runtimeMinutes: 124,
    watched: false,
    prerequisiteIds: [],
  },
  {
    id: sampleMovieIds.avengers,
    title: 'The Avengers',
    releaseYear: 2012,
    runtimeMinutes: 143,
    watched: false,
    prerequisiteIds: [
      sampleMovieIds.ironMan,
      sampleMovieIds.firstAvenger,
    ],
  },
  {
    id: sampleMovieIds.civilWar,
    title: 'Captain America: Civil War',
    releaseYear: 2016,
    runtimeMinutes: 147,
    watched: false,
    prerequisiteIds: [sampleMovieIds.avengers],
  },
  {
    id: sampleMovieIds.ragnarok,
    title: 'Thor: Ragnarok',
    releaseYear: 2017,
    runtimeMinutes: 130,
    watched: false,
    prerequisiteIds: [],
  },
  {
    id: sampleMovieIds.infinityWar,
    title: 'Avengers: Infinity War',
    releaseYear: 2018,
    runtimeMinutes: 149,
    watched: false,
    prerequisiteIds: [sampleMovieIds.civilWar, sampleMovieIds.ragnarok],
  },
  {
    id: sampleMovieIds.endgame,
    title: 'Avengers: Endgame',
    releaseYear: 2019,
    runtimeMinutes: 181,
    watched: false,
    prerequisiteIds: [sampleMovieIds.infinityWar],
  },
  {
    id: sampleMovieIds.doomsday,
    title: 'Avengers: Doomsday',
    releaseYear: 2026,
    runtimeMinutes: 180,
    watched: false,
    prerequisiteIds: [sampleMovieIds.endgame],
  },
];

/** Fresh map so tests can mutate their own copy without affecting others. */
export function samplePrerequisitesByMovie(): Map<string, string[]> {
  return new Map(
    sampleMovies.map((movie) => [movie.id, [...movie.prerequisiteIds]]),
  );
}
