import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import type Database from 'better-sqlite3';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { openDatabase } from '../db/connection.js';
import { applySchema } from '../db/schema.js';

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

describe('movies API', () => {
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

  async function createMovie(
    overrides: Record<string, unknown> = {},
  ): Promise<MovieBody> {
    const response = await request(app)
      .post('/api/movies')
      .send({
        title: 'Iron Man',
        releaseYear: 2008,
        runtimeMinutes: 126,
        ...overrides,
      });

    expect(response.status).toBe(201);
    return response.body as MovieBody;
  }

  async function listMovies(): Promise<MovieBody[]> {
    const response = await request(app).get('/api/movies');
    expect(response.status).toBe(200);
    return response.body as MovieBody[];
  }

  async function seedSampleChain(): Promise<{
    ironMan: string;
    endgame: string;
  }> {
    const ironMan = await createMovie({
      title: 'Iron Man',
      releaseYear: 2008,
    });
    const firstAvenger = await createMovie({
      title: 'Captain America: The First Avenger',
      releaseYear: 2011,
      runtimeMinutes: 124,
    });
    const avengers = await createMovie({
      title: 'The Avengers',
      releaseYear: 2012,
      runtimeMinutes: 143,
      prerequisiteIds: [ironMan.id, firstAvenger.id],
    });
    const civilWar = await createMovie({
      title: 'Captain America: Civil War',
      releaseYear: 2016,
      runtimeMinutes: 147,
      prerequisiteIds: [avengers.id],
    });
    const ragnarok = await createMovie({
      title: 'Thor: Ragnarok',
      releaseYear: 2017,
      runtimeMinutes: 130,
    });
    const infinityWar = await createMovie({
      title: 'Avengers: Infinity War',
      releaseYear: 2018,
      runtimeMinutes: 149,
      prerequisiteIds: [civilWar.id, ragnarok.id],
    });
    const endgame = await createMovie({
      title: 'Avengers: Endgame',
      releaseYear: 2019,
      runtimeMinutes: 181,
      prerequisiteIds: [infinityWar.id],
    });

    return { ironMan: ironMan.id, endgame: endgame.id };
  }

  describe('POST /api/movies', () => {
    it('creates a movie without prerequisites and defaults watched to false', async () => {
      const response = await request(app).post('/api/movies').send({
        title: '  Iron Man  ',
        releaseYear: 2008,
        runtimeMinutes: 126,
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: 'Iron Man',
        releaseYear: 2008,
        runtimeMinutes: 126,
        watched: false,
        prerequisiteIds: [],
      });
      expect(response.body.id).toEqual(expect.any(String));
      expect(response.body.createdAt).toEqual(expect.any(String));
      expect(response.body.updatedAt).toEqual(expect.any(String));
    });

    it('creates a movie with prerequisites', async () => {
      const ironMan = await createMovie({
        title: 'Iron Man',
        releaseYear: 2008,
      });
      const firstAvenger = await createMovie({
        title: 'Captain America: The First Avenger',
        releaseYear: 2011,
        runtimeMinutes: 124,
      });

      const avengers = await createMovie({
        title: 'The Avengers',
        releaseYear: 2012,
        runtimeMinutes: 143,
        prerequisiteIds: [ironMan.id, firstAvenger.id],
      });

      expect(avengers.prerequisiteIds).toEqual([
        ironMan.id,
        firstAvenger.id,
      ]);
    });

    const invalidBodies: Array<{
      label: string;
      body: Record<string, unknown>;
    }> = [
      {
        label: 'a missing title',
        body: { releaseYear: 2008, runtimeMinutes: 126 },
      },
      {
        label: 'a blank title',
        body: { title: '   ', releaseYear: 2008, runtimeMinutes: 126 },
      },
      {
        label: 'a title longer than 200 characters',
        body: {
          title: 'x'.repeat(201),
          releaseYear: 2008,
          runtimeMinutes: 126,
        },
      },
      {
        label: 'a release year before 1900',
        body: { title: 'Old', releaseYear: 1899, runtimeMinutes: 126 },
      },
      {
        label: 'a release year beyond current year + 4',
        body: {
          title: 'Future',
          releaseYear: new Date().getFullYear() + 5,
          runtimeMinutes: 126,
        },
      },
      {
        label: 'a non-integer release year',
        body: { title: 'Odd', releaseYear: 2008.5, runtimeMinutes: 126 },
      },
      {
        label: 'runtime below 1',
        body: { title: 'Short', releaseYear: 2008, runtimeMinutes: 0 },
      },
      {
        label: 'runtime above 300',
        body: { title: 'Long', releaseYear: 2008, runtimeMinutes: 301 },
      },
      {
        label: 'a non-boolean watched value',
        body: {
          title: 'Bad Watch',
          releaseYear: 2008,
          runtimeMinutes: 126,
          watched: 'yes',
        },
      },
      {
        label: 'prerequisiteIds that are not an array',
        body: {
          title: 'Bad Prereqs',
          releaseYear: 2008,
          runtimeMinutes: 126,
          prerequisiteIds: 'iron-man',
        },
      },
    ];

    for (const { label, body } of invalidBodies) {
      it(`rejects ${label} with 400 VALIDATION_ERROR`, async () => {
        const response = await request(app).post('/api/movies').send(body);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          error: {
            code: 'VALIDATION_ERROR',
            message: expect.any(String),
          },
        });
      });
    }

    it('rejects duplicate prerequisite IDs before writing anything', async () => {
      const ironMan = await createMovie({ title: 'Iron Man' });

      const response = await request(app)
        .post('/api/movies')
        .send({
          title: 'The Avengers',
          releaseYear: 2012,
          runtimeMinutes: 143,
          prerequisiteIds: [ironMan.id, ironMan.id],
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(await listMovies()).toHaveLength(1);
    });

    it('rejects unknown prerequisite IDs', async () => {
      const response = await request(app)
        .post('/api/movies')
        .send({
          title: 'The Avengers',
          releaseYear: 2012,
          runtimeMinutes: 143,
          prerequisiteIds: [randomUUID()],
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a duplicate title that differs only by case', async () => {
      await createMovie({ title: 'Iron Man' });

      const response = await request(app).post('/api/movies').send({
        title: 'iron man',
        releaseYear: 2008,
        runtimeMinutes: 126,
      });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('DUPLICATE_TITLE');
    });
  });

  describe('GET /api/movies', () => {
    it('returns movies ordered by created_at ascending', async () => {
      const ironMan = await createMovie({
        title: 'Iron Man',
        releaseYear: 2008,
      });
      const avengers = await createMovie({
        title: 'The Avengers',
        releaseYear: 2012,
        runtimeMinutes: 143,
        prerequisiteIds: [ironMan.id],
      });

      const movies = await listMovies();

      expect(movies.map((movie) => movie.id)).toEqual([
        ironMan.id,
        avengers.id,
      ]);
    });
  });

  describe('PATCH /api/movies/:id', () => {
    it('returns 404 for an unknown movie', async () => {
      const response = await request(app)
        .patch(`/api/movies/${randomUUID()}`)
        .send({ watched: true });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('rejects an empty patch body', async () => {
      const movie = await createMovie();

      const response = await request(app)
        .patch(`/api/movies/${movie.id}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('updates watched only and refreshes updatedAt', async () => {
      const movie = await createMovie();

      // Ensure a distinct millisecond for the ISO timestamps.
      await new Promise((resolve) => setTimeout(resolve, 5));

      const response = await request(app)
        .patch(`/api/movies/${movie.id}`)
        .send({ watched: true });

      expect(response.status).toBe(200);
      expect(response.body.watched).toBe(true);
      expect(response.body.prerequisiteIds).toEqual(movie.prerequisiteIds);
      expect(response.body.createdAt).toBe(movie.createdAt);
      expect(response.body.updatedAt).not.toBe(movie.updatedAt);
    });

    it('allows keeping its own title', async () => {
      const movie = await createMovie({ title: 'Iron Man' });

      const response = await request(app)
        .patch(`/api/movies/${movie.id}`)
        .send({ title: 'Iron Man' });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Iron Man');
    });

    it('replaces the whole prerequisite set', async () => {
      const ironMan = await createMovie({ title: 'Iron Man' });
      const firstAvenger = await createMovie({
        title: 'Captain America: The First Avenger',
        releaseYear: 2011,
      });
      const ragnarok = await createMovie({
        title: 'Thor: Ragnarok',
        releaseYear: 2017,
      });
      const avengers = await createMovie({
        title: 'The Avengers',
        releaseYear: 2012,
        prerequisiteIds: [ironMan.id],
      });

      const response = await request(app)
        .patch(`/api/movies/${avengers.id}`)
        .send({ prerequisiteIds: [firstAvenger.id, ragnarok.id] });

      expect(response.status).toBe(200);
      expect(response.body.prerequisiteIds).toEqual([
        firstAvenger.id,
        ragnarok.id,
      ]);

      const stored = (await listMovies()).find(
        (movie) => movie.id === avengers.id,
      );
      expect(stored?.prerequisiteIds).toEqual([
        firstAvenger.id,
        ragnarok.id,
      ]);
    });

    it('rejects duplicate prerequisite IDs on update', async () => {
      const movie = await createMovie();

      const response = await request(app)
        .patch(`/api/movies/${movie.id}`)
        .send({ prerequisiteIds: [movie.id, movie.id] });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects unknown prerequisite IDs on update', async () => {
      const movie = await createMovie();

      const response = await request(app)
        .patch(`/api/movies/${movie.id}`)
        .send({ prerequisiteIds: [randomUUID()] });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a movie listing itself as a prerequisite', async () => {
      const movie = await createMovie();

      const response = await request(app)
        .patch(`/api/movies/${movie.id}`)
        .send({ prerequisiteIds: [movie.id] });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CIRCULAR_DEPENDENCY');
    });

    it('rejects Endgame as a prerequisite of Iron Man', async () => {
      const { ironMan, endgame } = await seedSampleChain();

      const response = await request(app)
        .patch(`/api/movies/${ironMan}`)
        .send({ prerequisiteIds: [endgame] });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CIRCULAR_DEPENDENCY');
    });

    it('rolls back prerequisite changes when a patch fails', async () => {
      const ironMan = await createMovie({ title: 'Iron Man' });
      const firstAvenger = await createMovie({
        title: 'Captain America: The First Avenger',
        releaseYear: 2011,
      });
      const avengers = await createMovie({
        title: 'The Avengers',
        releaseYear: 2012,
        prerequisiteIds: [ironMan.id],
      });

      // The prerequisite replacement happens first, then the title update
      // collides case-insensitively and must roll the whole PATCH back.
      const response = await request(app)
        .patch(`/api/movies/${avengers.id}`)
        .send({
          title: 'iron man',
          prerequisiteIds: [firstAvenger.id],
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('DUPLICATE_TITLE');

      const stored = (await listMovies()).find(
        (movie) => movie.id === avengers.id,
      );
      expect(stored?.title).toBe('The Avengers');
      expect(stored?.prerequisiteIds).toEqual([ironMan.id]);
    });
  });
});
