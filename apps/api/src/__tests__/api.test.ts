import { describe, it, expect, afterEach } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { buildApp } from '../app.js';
import type { ChangeProofStore } from '@changeproof/storage';
import type { FastifyInstance } from 'fastify';

let store: ChangeProofStore | null = null;
let testApp: FastifyInstance | null = null;
let dbPath: string;

afterEach(async () => {
  if (testApp) {
    await testApp.close();
    testApp = null;
  }
  if (store) {
    store.db.close();
    store = null;
  }
  try {
    fs.unlinkSync(dbPath);
  } catch {
    /* ignore */
  }
  try {
    fs.unlinkSync(dbPath + '-shm');
  } catch {
    /* ignore */
  }
  try {
    fs.unlinkSync(dbPath + '-wal');
  } catch {
    /* ignore */
  }
});

function makeTestApp(): FastifyInstance {
  dbPath = path.join(os.tmpdir(), `cp-api-test-${Date.now()}.db`);
  const built = buildApp({ dbPath, logLevel: 'silent' });
  store = built.store;
  testApp = built.app;
  return built.app;
}

describe('GET /health', () => {
  it('returns status ok with version and timestamp', async () => {
    const app = makeTestApp();
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      status: string;
      version: string;
      timestamp: string;
    };
    expect(body.status).toBe('ok');
    expect(body.version).toBe('0.1.0');
  });
});

describe('GET /api/sample', () => {
  it('returns sample bundle metadata', async () => {
    const app = makeTestApp();
    const response = await app.inject({ method: 'GET', url: '/api/sample' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { bundleId: string };
    expect(body.bundleId).toBe('sample');
  });
});

describe('POST /api/runs', () => {
  it('creates a run and returns run metadata', async () => {
    const app = makeTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundleId: 'sample' }),
    });
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as { id: string; status: string };
    expect(body.status).toBe('completed');
    expect(typeof body.id).toBe('string');
  });

  it('returns 400 for empty bundleId', async () => {
    const app = makeTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundleId: '' }),
    });
    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for unknown bundleId', async () => {
    const app = makeTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundleId: 'nonexistent-bundle' }),
    });
    expect(response.statusCode).toBe(400);
  });
});

describe('GET /api/runs/:runId', () => {
  it('fetches a created run', async () => {
    const app = makeTestApp();
    const createResp = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundleId: 'sample' }),
    });
    const runId = (JSON.parse(createResp.body) as { id: string }).id;

    const resp = await app.inject({ method: 'GET', url: `/api/runs/${runId}` });
    expect(resp.statusCode).toBe(200);
    expect((JSON.parse(resp.body) as { id: string }).id).toBe(runId);
  });

  it('returns 404 for unknown run', async () => {
    const app = makeTestApp();
    const resp = await app.inject({ method: 'GET', url: '/api/runs/nonexistent' });
    expect(resp.statusCode).toBe(404);
  });
});

describe('GET /api/runs/:runId/findings', () => {
  it('returns findings for a run', async () => {
    const app = makeTestApp();
    const createResp = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundleId: 'sample' }),
    });
    const runId = (JSON.parse(createResp.body) as { id: string }).id;

    const resp = await app.inject({ method: 'GET', url: `/api/runs/${runId}/findings` });
    expect(resp.statusCode).toBe(200);
    const body = JSON.parse(resp.body) as { findings: unknown[] };
    expect(Array.isArray(body.findings)).toBe(true);
    expect(body.findings.length).toBeGreaterThan(0);
  });
});

describe('GET /api/runs/:runId/traceability', () => {
  it('returns traceability data for a run', async () => {
    const app = makeTestApp();
    const createResp = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundleId: 'sample' }),
    });
    const runId = (JSON.parse(createResp.body) as { id: string }).id;

    const resp = await app.inject({ method: 'GET', url: `/api/runs/${runId}/traceability` });
    expect(resp.statusCode).toBe(200);
    const body = JSON.parse(resp.body) as {
      requirements: Array<{
        id: string;
        linkedCodeArtifacts: unknown[];
        linkedTestArtifacts: unknown[];
        status: string;
      }>;
    };
    expect(Array.isArray(body.requirements)).toBe(true);
    expect(body.requirements.length).toBeGreaterThan(0);
    const req1 = body.requirements.find((r) => r.id === 'REQ-001');
    expect(req1).toBeDefined();
    expect(Array.isArray(req1?.linkedCodeArtifacts)).toBe(true);
    expect(Array.isArray(req1?.linkedTestArtifacts)).toBe(true);
    expect(req1?.status).toBeDefined();
  });
});

describe('POST /api/findings/:findingId/decision', () => {
  it('records a decision', async () => {
    const app = makeTestApp();
    const createResp = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundleId: 'sample' }),
    });
    const runId = (JSON.parse(createResp.body) as { id: string }).id;
    const findingsResp = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}/findings`,
    });
    const findings = (JSON.parse(findingsResp.body) as { findings: Array<{ id: string }> })
      .findings;
    const findingId = findings[0]?.id ?? 'test-finding';

    const decResp = await app.inject({
      method: 'POST',
      url: `/api/findings/${findingId}/decision`,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'accepted', rationale: 'Reviewed OK' }),
    });
    expect(decResp.statusCode).toBe(201);
    const dec = JSON.parse(decResp.body) as { decision: string };
    expect(dec.decision).toBe('accepted');
  });
});

describe('GET /api/runs/:runId/export', () => {
  it('exports markdown report', async () => {
    const app = makeTestApp();
    const createResp = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundleId: 'sample' }),
    });
    const runId = (JSON.parse(createResp.body) as { id: string }).id;

    const resp = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}/export?format=markdown`,
    });
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toContain('ChangeProof Evidence Report');
  });

  it('exports JSON report', async () => {
    const app = makeTestApp();
    const createResp = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundleId: 'sample' }),
    });
    const runId = (JSON.parse(createResp.body) as { id: string }).id;

    const resp = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}/export?format=json`,
    });
    expect(resp.statusCode).toBe(200);
    const body = JSON.parse(resp.body) as { schemaVersion: string };
    expect(body.schemaVersion).toBe('1.0.0');
  });
});
