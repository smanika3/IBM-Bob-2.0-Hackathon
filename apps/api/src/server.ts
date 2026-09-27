import { buildApp } from './app.js';
import * as path from 'node:path';

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);
const HOST = process.env['HOST'] ?? '127.0.0.1';
const DB_PATH = process.env['DATABASE_PATH'] ?? path.join(process.cwd(), 'changeproof.db');

const { app } = buildApp({ dbPath: DB_PATH });

try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`ChangeProof API listening at http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
