# Doomsday Ready

Doomsday Ready is a full-stack MCU rewatch planner and watch-party booking app. It helps a fan
prepare for *Avengers: Doomsday* by tracking movies and their prerequisites, generating a
deterministic rewatch order, and calculating the cheapest cinema bundle quote for an
opening-night group.

The app has three features:

1. **Movies** - create, list, and edit movies, including prerequisite links and watched state.
2. **Rewatch order** - calculate the movies to watch before a target movie in a valid,
   deterministic order.
3. **Cinemas with watch-party booking** - create cinemas with bundle sizes and calculate the
   fewest bundles needed for a group.

## Tech stack

**Backend (`/backend`)**

- Node.js, Express 5, TypeScript (strict, ESM)
- SQLite through `better-sqlite3` with raw SQL and no ORM
- Zod validation
- Vitest + Supertest
- npm

**Frontend (`/frontend`)**

- React 19 + Vite
- TypeScript
- Tailwind CSS
- Native `fetch` inside custom hooks
- Simple tab state, with no router and no React Query
- Vitest + React Testing Library

There is no monorepo tooling, Docker, seed script, DELETE endpoint, or cinema editing.

## Prerequisites

- Node.js 20.19+ or 22.12+
- npm
- If `better-sqlite3` has no prebuilt binary for your platform, install Python and a C++ build
  toolchain so it can build from source.

The backend creates its SQLite database automatically. The default file is
`backend/data/doomsday.db`; that directory is created on first startup.

## Setup and run

Use two terminals: one for the backend and one for the frontend.

### Terminal 1 - backend

```bash
cd backend
npm install
npm run dev
```

The API starts at `http://localhost:3000`.

Health check:

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{ "status": "ok" }
```

On Windows PowerShell, use `Invoke-RestMethod` instead if `curl` is not available:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

### Terminal 2 - frontend

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

The frontend calls `/api` and Vite proxies that to `http://localhost:3000` (see
`frontend/vite.config.ts`). Keep the backend on port `3000` while developing, or update the
proxy target if you change the backend port.



### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Backend HTTP port |
| `DB_PATH` | `./data/doomsday.db` | SQLite database file; tests use `:memory:` |

Set them in the shell before starting the backend.

PowerShell:

```powershell
$env:PORT = "3001"
$env:DB_PATH = ".\data\doomsday.db"
npm run dev
```

macOS/Linux:

```bash
PORT=3001 DB_PATH=./data/doomsday.db npm run dev
```

`.env` is gitignored but is not loaded automatically.

## Tests and verification

Backend:

```bash
cd backend
npm test
npm run typecheck
```

Frontend:

```bash
cd frontend
npm test
npm run typecheck
npm run build
```

Backend tests use a fresh in-memory SQLite database per test and apply the real schema.

## API reference

All endpoints are JSON and live under `/api`.

### Resource shapes

`Movie`:

```json
{
  "id": "uuid-v4",
  "title": "Iron Man",
  "releaseYear": 2008,
  "runtimeMinutes": 126,
  "watched": false,
  "prerequisiteIds": [],
  "createdAt": "2026-11-21T12:00:00.000Z",
  "updatedAt": "2026-11-21T12:00:00.000Z"
}
```

`Cinema`:

```json
{
  "id": "uuid-v4",
  "name": "Grand Cinema",
  "bundleSizes": [1, 3, 4],
  "createdAt": "2026-11-21T12:00:00.000Z"
}
```

### Endpoints

| Method | Path | Request | Success response |
|---|---|---|---|
| `POST` | `/api/movies` | `{ "title": "Iron Man", "releaseYear": 2008, "runtimeMinutes": 126, "prerequisiteIds": [], "watched": false }` (last two optional) | `201 Movie` |
| `GET` | `/api/movies` | - | `200 Movie[]`, ordered by `createdAt` ascending |
| `PATCH` | `/api/movies/:id` | Any subset of the `POST` fields | `200 Movie` |
| `GET` | `/api/movies/:id/rewatch-order` | - | `200 RewatchPlan` |
| `POST` | `/api/cinemas` | `{ "name": "Grand Cinema", "bundleSizes": [1, 3, 4] }` | `201 Cinema` |
| `GET` | `/api/cinemas` | - | `200 Cinema[]`, ordered by `createdAt` ascending |
| `GET` | `/api/cinemas/:id/booking?groupSize=N` | `N` = integer 1-10000 | `200 BookingQuote` |
| `GET` | `/api/health` | - | `200 { "status": "ok" }` |

### Create a movie

```http
POST /api/movies
Content-Type: application/json

{
  "title": "The Avengers",
  "releaseYear": 2012,
  "runtimeMinutes": 143,
  "prerequisiteIds": ["<iron-man-id>", "<first-avenger-id>"]
}
```

`201 Created`:

```json
{
  "id": "2f6f3a3e-0c7b-4f4d-8f4f-0c5e6d7a8b9c",
  "title": "The Avengers",
  "releaseYear": 2012,
  "runtimeMinutes": 143,
  "watched": false,
  "prerequisiteIds": [
    "8f0d3a2b-5c1e-4a6f-9b7d-1e2f3a4b5c6d",
    "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"
  ],
  "createdAt": "2026-11-21T12:00:00.000Z",
  "updatedAt": "2026-11-21T12:00:00.000Z"
}
```

### Partially update a movie

```http
PATCH /api/movies/:id
Content-Type: application/json

{
  "watched": true
}
```

The response is the updated `Movie`. If `prerequisiteIds` is supplied, it replaces the whole
set.

### Get a rewatch order

```http
GET /api/movies/:doomsdayId/rewatch-order
```

`200 OK`:

```json
{
  "target": {
    "id": "doomsday-id",
    "title": "Avengers: Doomsday"
  },
  "order": [
    {
      "id": "iron-man-id",
      "title": "Iron Man",
      "releaseYear": 2008,
      "runtimeMinutes": 126,
      "watched": false,
      "prerequisiteIds": [],
      "createdAt": "2026-11-21T12:00:00.000Z",
      "updatedAt": "2026-11-21T12:00:00.000Z"
    }
  ],
  "watchedCount": 0,
  "totalCount": 7,
  "remainingMinutes": 1000
}
```

Each item in `order` is a full `Movie`. The target is excluded. `remainingMinutes` is the sum of
the runtimes of unwatched movies in the order.

### Create a cinema

```http
POST /api/cinemas
Content-Type: application/json

{
  "name": "Grand Cinema",
  "bundleSizes": [3, 1, 4]
}
```

`201 Created`:

```json
{
  "id": "5b0f8f0f-7a8c-4f7f-9d0e-1a2b3c4d5e6f",
  "name": "Grand Cinema",
  "bundleSizes": [1, 3, 4],
  "createdAt": "2026-11-21T12:00:00.000Z"
}
```

Bundle sizes are deduplicated and returned sorted ascending.

### Get a booking quote

Possible:

```http
GET /api/cinemas/:cinemaId/booking?groupSize=6
```

```json
{
  "cinemaId": "5b0f8f0f-7a8c-4f7f-9d0e-1a2b3c4d5e6f",
  "groupSize": 6,
  "possible": true,
  "totalBundles": 2,
  "bundles": [{ "size": 3, "count": 2 }]
}
```

Impossible:

```http
GET /api/cinemas/:cinemaId/booking?groupSize=7
```

For a cinema with bundle sizes `[4, 6]`, the response is still HTTP 200:

```json
{
  "cinemaId": "5b0f8f0f-7a8c-4f7f-9d0e-1a2b3c4d5e6f",
  "groupSize": 7,
  "possible": false,
  "totalBundles": null,
  "bundles": []
}
```

When possible, bundles are sorted by size descending.

### Error format

Every error uses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "releaseYear must be at least 1900"
  }
}
```

| Code | HTTP status | Used for |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Invalid body, query, malformed JSON, or unknown prerequisite |
| `NOT_FOUND` | 404 | Unknown movie, cinema, or route |
| `CIRCULAR_DEPENDENCY` | 409 | Direct or indirect prerequisite cycle |
| `DUPLICATE_TITLE` | 409 | Duplicate movie title, case-insensitive |
| `DUPLICATE_NAME` | 409 | Duplicate cinema name, case-insensitive |
| `INTERNAL_ERROR` | 500 | Unexpected server failure |

## Design decisions and assumptions

### Errors and lookup behavior

- Errors always use `{ "error": { "code": "...", "message": "..." } }`.
- Malformed JSON returns `400 VALIDATION_ERROR`.
- An unknown route returns `404 NOT_FOUND`.
- An unknown movie or cinema ID returns `404 NOT_FOUND`.
- An unknown **prerequisite** ID returns `400 VALIDATION_ERROR`, not 404.
- Booking validates `groupSize` before checking whether the cinema exists.
- Unexpected database errors become `500 INTERNAL_ERROR` without exposing a stack trace.

### Movies and prerequisites

- Titles are trimmed, non-empty, at most 200 characters, and unique case-insensitively.
- `releaseYear` is an integer from 1900 through the current year + 4. The upper bound is
  calculated at request time.
- `runtimeMinutes` is an integer from 1 to 300.
- Duplicate IDs in `prerequisiteIds` are rejected with `400 VALIDATION_ERROR`; they are never
  deduplicated. The UI prevents picking the same prerequisite twice.
- A direct or indirect self-dependency returns `409 CIRCULAR_DEPENDENCY`.
- `PATCH` is partial. An empty patch is rejected. If `prerequisiteIds` is provided, it replaces
  the whole existing set.
- Prerequisite replacement and the movie update happen in one transaction, so a later failure
  rolls back the prerequisite change too.
- `updatedAt` is refreshed on every PATCH, including when values are unchanged.
- Movie prerequisite IDs must be strings, but UUID formatting is not enforced by validation;
  existence and cycle checks still apply.

### Rewatch semantics

- The target movie is excluded from the plan.
- Watched movies are included in the plan, not removed from it.
- `watchedCount` counts watched entries in the order.
- `remainingMinutes` sums only the runtimes of unwatched entries.
- Watching a movie does not require its prerequisites to be watched.
- The order is deterministic. When several orders are valid, prerequisites are visited sorted
  by `(releaseYear, title)`. Title comparison is code-unit based, not locale-aware.

### Cinemas and booking

- Cinema names are trimmed, non-empty, at most 200 characters, and unique case-insensitively.
- Duplicate bundle sizes are silently deduplicated before the 1-10 distinct-size limit and
  before saving. The limit applies after deduplication.
- Bundle sizes must be integers from 1 to 500.
- Saved bundle sizes are returned sorted ascending.
- An impossible booking returns HTTP 200 with `possible: false`, `totalBundles: null`, and
  `bundles: []`.
- `groupSize` must be a digits-only query string from 1 to 10000. Missing, decimal, text, zero,
  above-10000, repeated, and array values return 400.
- When multiple bundle combinations tie on total bundle count, the larger bundle size is
  preferred. Returned bundles are sorted by size descending.

### Persistence and API behavior

- IDs are UUID v4 strings generated with `crypto.randomUUID()`.
- `createdAt` and `updatedAt` are UTC ISO 8601 strings.
- `PRAGMA foreign_keys = ON` runs on every connection.
- The schema is applied idempotently at startup with `CREATE TABLE IF NOT EXISTS` and
  `CREATE INDEX IF NOT EXISTS`.
- List endpoints order by `created_at ASC, rowid ASC` for stable ordering when timestamps
  collide.
- Prerequisite arrays are returned in the order they were last saved.
- Zod strips unknown JSON body keys rather than rejecting them.
- Only the movie-title and cinema-name unique violations are translated to 409; other
  unexpected database errors become 500.
- There is no authentication, pagination, CORS configuration, rate limiting, DELETE endpoint,
  cinema editing, seed script, WAL mode, or graceful-shutdown handler.

## Algorithms

### Rewatch order: topological sort in a directed acyclic graph

The prerequisite graph is a DAG: an edge from a movie to each movie that must be watched first.
`buildRewatchOrder` performs a **post-order depth-first traversal** starting from the target's
prerequisites. A movie is emitted only after all of its own prerequisites, which guarantees a
valid viewing order.

- A `visited` set makes diamonds and shared prerequisites appear exactly once.
- A `visiting` set detects a cycle if stored data is unexpectedly cyclic.
- Prerequisites are sorted by `(releaseYear, title)` before traversal, so the result is
  deterministic.
- The target itself is never emitted.

Every movie and edge in the reachable prerequisite closure is visited once. Sorting each
movie's prerequisite list adds at most `O(E log E)` work in the worst case, so the overall time
is `O(V + E log E)`; space is `O(V + E)` for the map, sets, recursion stack, and output.

The cycle check used by create/update (`wouldCreateCycle`) is an iterative DFS from each
proposed prerequisite, looking for the movie being edited. It runs in `O(V + E)` time and uses
`O(V)` space for the visited set and stack.

### Booking quote: minimum coin change with dynamic programming

The booking problem is a **minimum coin change** problem: pick the fewest bundle sizes whose
counts sum exactly to the group size. Greedy is not correct here. For example, with sizes
`[1, 3, 4]` and group `6`, greedy takes `4 + 1 + 1` (three bundles), while the optimum is
`3 + 3` (two bundles).

`getBookingQuote` fills a bottom-up table:

- `best[n]` = fewest bundles that sum exactly to `n`.
- `choice[n]` = the bundle size that produced that best value.

It considers every reachable `best[n - size]`, preferring the larger size on equal bundle
counts, then reconstructs the combination by walking backwards. If `best[groupSize]` remains
infinite, the booking is impossible.

With `G = groupSize` and `S` distinct bundle sizes, time is `O(G * S)` and memory is `O(G)`.
Input sizes are deduplicated and sorted before the DP, and returned bundles are sorted by size
descending.

## Database schema

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

The runtime schema in `backend/src/db/schema.ts` uses the same definitions with
`IF NOT EXISTS` so startup is idempotent.

## AI Usage

I used AI tools in this project, as permitted by the assessment. I made the major design and technical decisions, directed the development process, and used an AI coding agent to implement the code under my guidance.

### Tools and Workflow

**1. Claude Chat — Planning, Technical Discussions & Prompt Design**

I used Claude Chat to plan the application and discuss technical decisions before implementation. I proposed my own solutions, asked Claude to evaluate their trade-offs, and explored alternative approaches suggested by Claude. I made the major decisions based on these discussions.

This process helped us finalize the technology stack, project architecture, database schema, API contracts, validation rules, and algorithm requirements. Once the decisions were finalized, Claude helped turn them into a sequence of detailed, step-by-step implementation prompts for the coding agent.

**2. OpenCode CLI — Code Implementation**

I used OpenCode CLI with the **DeepSeek v4.1 Flash (Free)** model as the coding agent. It implemented the application incrementally, following the prompts prepared through Claude Chat.

### My Approach to the Core Algorithms

I identified the underlying algorithmic problems and directed the coding agent toward the approaches to use:

- **Feature 1 — Movies and Rewatch Order:** I identified this as a Directed Acyclic Graph (DAG) problem. I instructed the agent to represent movie dependencies using movie IDs as keys and lists of prerequisite movie IDs as values. For cycle detection when adding or updating prerequisites, I directed it to use DFS. For generating the rewatch order, I specified a topological ordering approach that handles transitive and shared prerequisites.
- **Feature 2 — Booking Quote:** I identified this as a minimum coin change problem, where bundle sizes represent coin denominations and the group size represents the target amount. I directed the agent to use Dynamic Programming to find the exact combination requiring the fewest bundles.



### Project Context and Implementation Control

I created an `AGENTS.md` file at the repository root to provide shared context and persistent instructions to the coding agent. It documented the finalized technology stack, database schema, API contracts, validation decisions, and implementation constraints.

I also structured the implementation workflow around these rules:

- One implementation step per OpenCode session.
- Review the proposed plan before allowing implementation.
- Run type-checking and all relevant tests before completing each step.
- Stop after each step so I could review the changes before proceeding.
- Avoid unrelated changes outside the scope of the current step.

I reviewed the generated code, implementation reports, and test results throughout development.


