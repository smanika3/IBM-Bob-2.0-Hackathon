import { describe, it, expect, afterEach } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { buildApp } from '../app.js';
import type { ChangeProofStore } from '@changeproof/storage';

let store: ChangeProofStore | null = null;
let dbPath: string;

afterEach(() => {
  if (store) {
    store.db.close();
    store = null;
  }
  try {
    fs.unlinkSync(dbPath);
  } catch {
    /* ignore */
  }
});

describe('GET /health', () => {
  it('returns status ok with version and timestamp', async () => {
    dbPath = path.join(os.tmpdir(), `cp-health-test-${Date.now()}.db`);
    const { app, store: s } = buildApp({ dbPath, logLevel: 'silent' });
    store = s;
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      status: string;
      version: string;
      timestamp: string;
    };
    expect(body.status).toBe('ok');
    expect(body.version).toBe('0.1.0');
    expect(typeof body.timestamp).toBe('string');
    await app.close();
  });
});
