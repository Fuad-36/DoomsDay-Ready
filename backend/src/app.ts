import type Database from 'better-sqlite3';
import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

/**
 * Builds the Express app around an injected database so tests can use a fresh
 * in-memory database while the server uses the real one.
 */
export function createApp(db: Database.Database) {
  const app = express();

  // Route modules added in later steps can reach the connection here.
  app.locals.db = db;

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
