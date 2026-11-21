import Database from 'better-sqlite3';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);

// Placeholder until the DB step wires DB_PATH and the schema. An in-memory
// database keeps the scaffold runnable without creating files on disk.
const db = new Database(':memory:');
const app = createApp(db);

app.listen(port, () => {
  console.log(`Doomsday Ready API listening on http://localhost:${port}`);
});
