import { createApp } from './app.js';
import { openDatabase } from './db/connection.js';
import { applySchema } from './db/schema.js';

const port = Number(process.env.PORT ?? 3000);

const db = openDatabase();
applySchema(db);

const app = createApp(db);

app.listen(port, () => {
  console.log(`Doomsday Ready API listening on http://localhost:${port}`);
});
