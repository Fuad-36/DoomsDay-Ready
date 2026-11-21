import Database from 'better-sqlite3';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';

describe('app', () => {
  const db = new Database(':memory:');
  const app = createApp(db);

  afterAll(() => {
    db.close();
  });

  it('exposes the injected database on app.locals', () => {
    expect(app.locals.db).toBe(db);
  });

  it('responds to GET /api/health with 200 and an ok status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns a standard 404 error for an unknown route', async () => {
    const response = await request(app).get('/api/unknown-route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Route GET /api/unknown-route not found',
      },
    });
  });

  it('returns a standard 400 error for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"title":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Malformed JSON body',
      },
    });
  });
});
