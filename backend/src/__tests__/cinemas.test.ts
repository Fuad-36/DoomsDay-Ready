import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { Express } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { openDatabase } from '../db/connection.js';
import { applySchema } from '../db/schema.js';

interface CinemaBody {
  id: string;
  name: string;
  bundleSizes: number[];
  createdAt: string;
}

describe('cinemas API', () => {
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

  async function createCinema(
    overrides: Record<string, unknown> = {},
  ): Promise<CinemaBody> {
    const response = await request(app)
      .post('/api/cinemas')
      .send({
        name: 'Grand Cinema',
        bundleSizes: [1, 3, 4],
        ...overrides,
      });

    expect(response.status).toBe(201);
    return response.body as CinemaBody;
  }

  describe('POST /api/cinemas', () => {
    it('creates a cinema with trimmed name and ascending sizes', async () => {
      const response = await request(app).post('/api/cinemas').send({
        name: '  Grand Cinema  ',
        bundleSizes: [5, 1, 3],
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: 'Grand Cinema',
        bundleSizes: [1, 3, 5],
      });
      expect(response.body.id).toEqual(expect.any(String));
      expect(response.body.createdAt).toEqual(expect.any(String));
    });

    it('silently dedupes duplicate bundle sizes', async () => {
      const cinema = await createCinema({ bundleSizes: [3, 3, 5] });

      expect(cinema.bundleSizes).toEqual([3, 5]);

      const list = await request(app).get('/api/cinemas');
      expect(list.body[0].bundleSizes).toEqual([3, 5]);
    });

    it('dedupes before applying the 1-10 limit', async () => {
      const cinema = await createCinema({
        bundleSizes: Array.from({ length: 11 }, () => 3),
      });

      expect(cinema.bundleSizes).toEqual([3]);
    });

    it('rejects more than 10 distinct bundle sizes', async () => {
      const response = await request(app)
        .post('/api/cinemas')
        .send({
          name: 'Too Many Sizes',
          bundleSizes: Array.from({ length: 11 }, (_, index) => index + 1),
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects bundle sizes outside 1-500', async () => {
      const zero = await request(app)
        .post('/api/cinemas')
        .send({ name: 'Zero Size', bundleSizes: [0] });

      expect(zero.status).toBe(400);
      expect(zero.body.error.code).toBe('VALIDATION_ERROR');

      const tooLarge = await request(app)
        .post('/api/cinemas')
        .send({ name: 'Huge Size', bundleSizes: [501] });

      expect(tooLarge.status).toBe(400);
      expect(tooLarge.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects non-integer bundle sizes', async () => {
      const response = await request(app)
        .post('/api/cinemas')
        .send({ name: 'Decimal Size', bundleSizes: [2.5] });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects an empty bundle size list', async () => {
      const response = await request(app)
        .post('/api/cinemas')
        .send({ name: 'Empty Sizes', bundleSizes: [] });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a duplicate name differing only by case', async () => {
      await createCinema({ name: 'Grand Cinema' });

      const response = await request(app)
        .post('/api/cinemas')
        .send({ name: 'grand cinema', bundleSizes: [2] });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('DUPLICATE_NAME');
    });
  });

  describe('GET /api/cinemas', () => {
    it('returns cinemas ordered by created_at ascending', async () => {
      const first = await createCinema({
        name: 'First Cinema',
        bundleSizes: [4, 2],
      });
      const second = await createCinema({
        name: 'Second Cinema',
        bundleSizes: [6],
      });

      const response = await request(app).get('/api/cinemas');

      expect(response.status).toBe(200);
      const cinemas = response.body as CinemaBody[];
      expect(cinemas.map((cinema) => cinema.id)).toEqual([
        first.id,
        second.id,
      ]);
      expect(cinemas[0].bundleSizes).toEqual([2, 4]);
    });
  });

  describe('GET /api/cinemas/:id/booking', () => {
    const bookingExamples = [
      {
        label: '1,3,4 for group 6',
        bundleSizes: [1, 3, 4],
        groupSize: 6,
        totalBundles: 2,
        bundles: [{ size: 3, count: 2 }],
      },
      {
        label: '2,5 for group 11',
        bundleSizes: [2, 5],
        groupSize: 11,
        totalBundles: 4,
        bundles: [
          { size: 5, count: 1 },
          { size: 2, count: 3 },
        ],
      },
      {
        label: '6,9,20 for group 44',
        bundleSizes: [6, 9, 20],
        groupSize: 44,
        totalBundles: 4,
        bundles: [
          { size: 20, count: 1 },
          { size: 9, count: 2 },
          { size: 6, count: 1 },
        ],
      },
    ];

    for (const example of bookingExamples) {
      it(`quotes ${example.label} end to end`, async () => {
        const cinema = await createCinema({
          name: 'Example Cinema',
          bundleSizes: example.bundleSizes,
        });

        const response = await request(app).get(
          `/api/cinemas/${cinema.id}/booking?groupSize=${example.groupSize}`,
        );

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          cinemaId: cinema.id,
          groupSize: example.groupSize,
          possible: true,
          totalBundles: example.totalBundles,
          bundles: example.bundles,
        });
      });
    }

    it('returns possible:false with HTTP 200 for 4,6 and group 7', async () => {
      const cinema = await createCinema({
        name: 'Impossible Cinema',
        bundleSizes: [4, 6],
      });

      const response = await request(app).get(
        `/api/cinemas/${cinema.id}/booking?groupSize=7`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        cinemaId: cinema.id,
        groupSize: 7,
        possible: false,
        totalBundles: null,
        bundles: [],
      });
    });

    const invalidGroupSizes = [
      { label: 'missing', suffix: '' },
      { label: 'decimal', suffix: '?groupSize=1.5' },
      { label: 'text', suffix: '?groupSize=abc' },
      { label: 'zero', suffix: '?groupSize=0' },
      { label: 'above 10000', suffix: '?groupSize=10001' },
    ];

    for (const variant of invalidGroupSizes) {
      it(`rejects a ${variant.label} groupSize`, async () => {
        const cinema = await createCinema({
          name: 'Validation Cinema',
          bundleSizes: [1],
        });

        const response = await request(app).get(
          `/api/cinemas/${cinema.id}/booking${variant.suffix}`,
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    }

    it('returns 404 NOT_FOUND for an unknown cinema', async () => {
      const response = await request(app).get(
        `/api/cinemas/${randomUUID()}/booking?groupSize=4`,
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: {
          code: 'NOT_FOUND',
          message: 'Cinema not found',
        },
      });
    });
  });
});
