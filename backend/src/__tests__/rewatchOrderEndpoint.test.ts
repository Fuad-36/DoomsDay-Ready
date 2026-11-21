import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { Express } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { openDatabase } from '../db/connection.js';
import { applySchema } from '../db/schema.js';
import {
  sampleMovieIds,
  sampleMovies,
} from './fixtures/sampleMovies.js';

interface MovieBody {
  id: string;
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
  watched: boolean;
  prerequisiteIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface RewatchPlanBody {
  target: { id: string; title: string };
  order: MovieBody[];
  watchedCount: number;
  totalCount: number;
  remainingMinutes: number;
}

describe('GET /api/movies/:id/rewatch-order', () => {
  let db: Database.Database;
  let app: Express;

  beforeEach(() => {
    db = openDatabase(':memory:');
    applySchema(db);
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
  });

  /** Seeds AGENTS.md sample data through the real POST endpoint. */
  async function seedSampleData(): Promise<Map<string, string>> {
    const idsBySlug = new Map<string, string>();

    for (const movie of sampleMovies) {
      const prerequisiteIds = movie.prerequisiteIds.map((slug) => {
        const id = idsBySlug.get(slug);
        if (!id) {
          throw new Error(
            `Fixture ${movie.id} depends on unseeded movie ${slug}`,
          );
        }
        return id;
      });

      const response = await request(app).post('/api/movies').send({
        title: movie.title,
        releaseYear: movie.releaseYear,
        runtimeMinutes: movie.runtimeMinutes,
        prerequisiteIds,
      });

      expect(response.status).toBe(201);
      idsBySlug.set(movie.id, (response.body as MovieBody).id);
    }

    return idsBySlug;
  }

  function idFor(idsBySlug: Map<string, string>, slug: string): string {
    const id = idsBySlug.get(slug);
    if (!id) {
      throw new Error(`No seeded id for fixture ${slug}`);
    }
    return id;
  }

  async function getPlan(movieId: string): Promise<RewatchPlanBody> {
    const response = await request(app).get(
      `/api/movies/${movieId}/rewatch-order`,
    );
    expect(response.status).toBe(200);
    return response.body as RewatchPlanBody;
  }

  function expectValidOrder(
    order: MovieBody[],
    allMovieIds: Set<string>,
  ): void {
    const positions = new Map(
      order.map((movie, index) => [movie.id, index]),
    );

    expect(positions.size).toBe(order.length);

    for (const movie of order) {
      expect(allMovieIds.has(movie.id)).toBe(true);

      const moviePosition = positions.get(movie.id);
      if (moviePosition === undefined) {
        throw new Error(`Movie ${movie.id} is missing from the order`);
      }

      for (const prerequisiteId of movie.prerequisiteIds) {
        const prerequisitePosition = positions.get(prerequisiteId);
        if (prerequisitePosition === undefined) {
          throw new Error(
            `${movie.id} depends on ${prerequisiteId}, which is missing from the order`,
          );
        }
        expect(prerequisitePosition).toBeLessThan(moviePosition);
      }
    }
  }

  it('returns all seven other movies for Doomsday in a valid order', async () => {
    const ids = await seedSampleData();
    const doomsdayId = idFor(ids, sampleMovieIds.doomsday);

    const plan = await getPlan(doomsdayId);

    expect(plan.target).toEqual({
      id: doomsdayId,
      title: 'Avengers: Doomsday',
    });
    expect(plan.totalCount).toBe(7);
    expect(plan.watchedCount).toBe(0);
    expect(plan.remainingMinutes).toBe(1000);
    expect(plan.order).toHaveLength(7);
    expect(plan.order.map((movie) => movie.id)).not.toContain(doomsdayId);
    expectValidOrder(plan.order, new Set(ids.values()));
  });

  it('returns Iron Man and First Avenger before The Avengers for Civil War', async () => {
    const ids = await seedSampleData();
    const civilWarId = idFor(ids, sampleMovieIds.civilWar);

    const plan = await getPlan(civilWarId);

    expect(plan.order.map((movie) => movie.id)).toEqual([
      idFor(ids, sampleMovieIds.ironMan),
      idFor(ids, sampleMovieIds.firstAvenger),
      idFor(ids, sampleMovieIds.avengers),
    ]);
    expect(plan.totalCount).toBe(3);
    expect(plan.watchedCount).toBe(0);
    expect(plan.remainingMinutes).toBe(126 + 124 + 143);
  });

  it('returns an empty order for a movie with no prerequisites', async () => {
    const ids = await seedSampleData();
    const ragnarokId = idFor(ids, sampleMovieIds.ragnarok);

    const plan = await getPlan(ragnarokId);

    expect(plan.target.title).toBe('Thor: Ragnarok');
    expect(plan.order).toEqual([]);
    expect(plan.totalCount).toBe(0);
    expect(plan.watchedCount).toBe(0);
    expect(plan.remainingMinutes).toBe(0);
  });

  it('still rejects Endgame as a prerequisite of Iron Man with 409', async () => {
    const ids = await seedSampleData();
    const ironManId = idFor(ids, sampleMovieIds.ironMan);
    const endgameId = idFor(ids, sampleMovieIds.endgame);

    const cycleResponse = await request(app)
      .patch(`/api/movies/${ironManId}`)
      .send({ prerequisiteIds: [endgameId] });

    expect(cycleResponse.status).toBe(409);
    expect(cycleResponse.body.error.code).toBe('CIRCULAR_DEPENDENCY');

    const plan = await getPlan(idFor(ids, sampleMovieIds.doomsday));
    expect(plan.totalCount).toBe(7);
  });

  it('counts watched movies and drops their runtime from remainingMinutes', async () => {
    const ids = await seedSampleData();
    const doomsdayId = idFor(ids, sampleMovieIds.doomsday);
    const ironManId = idFor(ids, sampleMovieIds.ironMan);
    const civilWarId = idFor(ids, sampleMovieIds.civilWar);

    const before = await getPlan(doomsdayId);
    expect(before.watchedCount).toBe(0);
    expect(before.remainingMinutes).toBe(1000);

    const ironManPatch = await request(app)
      .patch(`/api/movies/${ironManId}`)
      .send({ watched: true });
    expect(ironManPatch.status).toBe(200);

    const civilWarPatch = await request(app)
      .patch(`/api/movies/${civilWarId}`)
      .send({ watched: true });
    expect(civilWarPatch.status).toBe(200);

    const after = await getPlan(doomsdayId);
    const orderedIds = after.order.map((movie) => movie.id);

    expect(after.totalCount).toBe(7);
    expect(after.watchedCount).toBe(2);
    expect(after.remainingMinutes).toBe(1000 - 126 - 147);
    expect(orderedIds).toContain(ironManId);
    expect(orderedIds).toContain(civilWarId);
  });

  it('returns 404 NOT_FOUND for an unknown movie', async () => {
    const response = await request(app).get(
      `/api/movies/${randomUUID()}/rewatch-order`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Movie not found',
      },
    });
  });
});
