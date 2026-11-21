# Doomsday Ready: project rules

Full-stack assessment app (Blinto Talent Accelerator 2027). Helps MCU fans plan a
rewatch before Avengers: Doomsday and book an opening-night watch party.

## Stack (fixed)

- Backend (/backend): Node + Express + TypeScript (strict), better-sqlite3 with raw SQL (no ORM),
  Zod for validation, Vitest + Supertest for tests, npm.
- Frontend (/frontend): React + Vite + TypeScript, Tailwind CSS, plain fetch inside custom hooks,
  simple tab state (no router, no React Query), Vitest + React Testing Library.
- No monorepo tooling, no Docker, no seed script, no DELETE endpoints, no cinema editing.

## Hard rules

- Feature 1 (cycle detection, rewatch order) and Feature 2 (booking quote) must be hand-written
  pure functions in backend/src/logic/. No graph, toposort or coin-change libraries.
  These files must not import express, the db, or zod.
- Comment the "why" of each algorithm briefly.
- Before finishing any step: run typecheck and all tests. Never leave failing tests.
- Do only what the current step asks. Do not refactor earlier steps unless told to.
- If something is unclear, ask me instead of assuming. Any choice you do make must be listed
  at the end of your reply under "Assumptions" so I can copy it into the README.

## Final decisions

1. Unknown prerequisite ID -> 400 VALIDATION_ERROR.
2. Duplicate IDs in a prerequisites list -> 400 VALIDATION_ERROR (reject, never dedupe).
   The UI never lets a user pick the same prerequisite twice.
3. Duplicate bundle sizes in a cinema request -> silently deduped before validation and saving.
   The 1-10 count limit applies after dedupe. Sizes are returned sorted ascending.
4. "Not possible" booking -> HTTP 200 with possible: false.
5. Error format everywhere: { "error": { "code": "...", "message": "..." } }
   Codes: VALIDATION_ERROR (400), NOT_FOUND (404), CIRCULAR_DEPENDENCY (409),
   DUPLICATE_TITLE (409), DUPLICATE_NAME (409), INTERNAL_ERROR (500).
   Malformed JSON -> 400 VALIDATION_ERROR. Unknown route -> 404 NOT_FOUND.
6. releaseYear: integer, 1900 to (current year + 4). Compute the upper bound at request time.
7. Title and cinema name: trimmed, non-empty, max 200 chars, unique case-insensitively.
8. IDs are UUID v4 strings generated in the app (crypto.randomUUID).
9. Rewatch order includes watched movies, excludes the target, and is deterministic: when
   several orders are valid, visit prerequisites sorted by (releaseYear, title).
10. Self-dependency (direct or indirect) -> 409 CIRCULAR_DEPENDENCY.
11. Watching a movie does NOT require its prerequisites to be watched.
12. PATCH is partial. If prerequisiteIds is provided it replaces the whole set.

## Database schema (final, do not change without asking)

```sql
PRAGMA foreign_keys = ON;  -- must run on every connection

CREATE TABLE movies (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL UNIQUE COLLATE NOCASE,
  release_year    INTEGER NOT NULL CHECK (release_year >= 1900),
  runtime_minutes INTEGER NOT NULL CHECK (runtime_minutes BETWEEN 1 AND 300),
  watched         INTEGER NOT NULL DEFAULT 0 CHECK (watched IN (0, 1)),
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE movie_prerequisites (
  movie_id         TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  prerequisite_id  TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  PRIMARY KEY (movie_id, prerequisite_id),
  CHECK (movie_id <> prerequisite_id)
);
CREATE INDEX idx_prereq_by_prerequisite ON movie_prerequisites(prerequisite_id);

CREATE TABLE cinemas (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at  TEXT NOT NULL
);

CREATE TABLE cinema_bundle_sizes (
  cinema_id  TEXT NOT NULL REFERENCES cinemas(id) ON DELETE CASCADE,
  size       INTEGER NOT NULL CHECK (size BETWEEN 1 AND 500),
  PRIMARY KEY (cinema_id, size)
);
```

## API contract (all under /api, JSON)

- POST /movies body { title, releaseYear, runtimeMinutes, prerequisiteIds?: string[], watched?: boolean } -> 201 Movie
- GET /movies -> 200 Movie[] (ordered by created_at asc)
- PATCH /movies/:id body: any subset of the POST fields -> 200 Movie
- GET /movies/:id/rewatch-order -> 200
  { target: {id,title}, order: Movie[], watchedCount, totalCount, remainingMinutes }
  (remainingMinutes = sum of runtime of unwatched movies in order)
- POST /cinemas body { name, bundleSizes: number[] } -> 201 Cinema
- GET /cinemas -> 200 Cinema[] (ordered by created_at asc)
- GET /cinemas/:id/booking?groupSize=N (integer 1-10000, otherwise 400) -> 200
  possible: { cinemaId, groupSize, possible: true, totalBundles, bundles: [{size, count}] } (sizes descending)
  impossible: { cinemaId, groupSize, possible: false, totalBundles: null, bundles: [] }
- GET /health -> 200 { status: "ok" }
- Movie = { id, title, releaseYear, runtimeMinutes, watched: boolean, prerequisiteIds: string[], createdAt, updatedAt }
- Cinema = { id, name, bundleSizes: number[], createdAt }
- Env: PORT (default 3000), DB_PATH (default ./data/doomsday.db). Tests use ":memory:".

## Sample data for tests (not an official watch guide)

Iron Man: none | Captain America: The First Avenger: none
The Avengers: Iron Man, The First Avenger | Captain America: Civil War: The Avengers
Thor: Ragnarok: none | Avengers: Infinity War: Civil War, Ragnarok
Avengers: Endgame: Infinity War | Avengers: Doomsday: Endgame
Release years for the fixtures: Iron Man 2008, First Avenger 2011, Avengers 2012,
Civil War 2016, Ragnarok 2017, Infinity War 2018, Endgame 2019, Doomsday 2026.
