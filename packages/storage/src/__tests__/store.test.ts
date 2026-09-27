import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { createStore, type ChangeProofStore } from '../store.js';
import type {
  AnalysisRun,
  Finding,
  ReviewDecision,
  Requirement,
  ChangedArtifact,
} from '@changeproof/domain';

let store: ChangeProofStore;
let dbPath: string;

beforeEach(() => {
  dbPath = path.join(os.tmpdir(), `cp-test-${Date.now()}.db`);
  store = createStore(dbPath);
});

afterEach(() => {
  store.db.close();
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

const makeRun = (id: string): AnalysisRun => ({
  id,
  name: `Run ${id}`,
  status: 'completed',
  contentFingerprint: 'abc123',
  createdAt: new Date().toISOString(),
});

describe('RunRepository', () => {
  it('saves and retrieves a run', () => {
    const run = makeRun('run-1');
    store.runs.save(run);
    const fetched = store.runs.findById('run-1');
    expect(fetched?.id).toBe('run-1');
    expect(fetched?.name).toBe('Run run-1');
    expect(fetched?.status).toBe('completed');
  });

  it('returns null for unknown run', () => {
    expect(store.runs.findById('nonexistent')).toBeNull();
  });

  it('repeated initialization is safe (idempotent schema)', () => {
    // Re-opening should not throw
    store.db.close();
    const store2 = createStore(dbPath);
    store2.db.close();
    store = createStore(dbPath); // reopen for afterEach
  });

  it('upserts on duplicate ID', () => {
    store.runs.save(makeRun('run-dup'));
    store.runs.save({ ...makeRun('run-dup'), name: 'Updated' });
    const fetched = store.runs.findById('run-dup');
    expect(fetched?.name).toBe('Updated');
  });
});

describe('RequirementsRepository', () => {
  it('saves and retrieves requirements for a run', () => {
    store.runs.save(makeRun('run-req'));
    const reqs: Requirement[] = [
      { id: 'REQ-001', title: 'Create order', body: 'body', acceptanceCriteria: [], tags: [] },
      { id: 'REQ-002', title: 'CSV export', body: 'body', acceptanceCriteria: [], tags: [] },
    ];
    store.requirements.saveAll(reqs, 'run-req');
    const fetched = store.requirements.findByRunId('run-req');
    expect(fetched).toHaveLength(2);
    expect(fetched.map((r) => r.id)).toContain('REQ-001');
    expect(fetched.map((r) => r.id)).toContain('REQ-002');
  });
});

describe('ChangedArtifactsRepository', () => {
  it('saves and retrieves artifacts', () => {
    store.runs.save(makeRun('run-art'));
    const arts: ChangedArtifact[] = [
      {
        id: 'art-1',
        filePath: 'src/orders/order.service.ts',
        changeType: 'modified',
        symbols: ['createOrder', 'cancelOrder'],
        addedLines: 10,
        deletedLines: 2,
        hunks: [],
        isPublicApi: true,
        isConfig: false,
        isSchema: false,
        isTest: false,
        isDocumentation: false,
      },
    ];
    store.changedArtifacts.saveAll(arts, 'run-art');
    const fetched = store.changedArtifacts.findByRunId('run-art');
    expect(fetched).toHaveLength(1);
    expect(fetched[0]?.symbols).toContain('createOrder');
    expect(fetched[0]?.isPublicApi).toBe(true);
  });
});

describe('FindingsRepository', () => {
  it('saves and retrieves findings', () => {
    store.runs.save(makeRun('run-findings'));
    const findings: Finding[] = [
      {
        id: 'finding-1',
        ruleId: 'REQ_WITHOUT_CODE',
        severity: 'high',
        status: 'missing_evidence',
        title: 'REQ-005 has no code',
        explanation: 'No changed file.',
        requirementIds: ['REQ-005'],
        changedArtifactIds: [],
        testArtifactIds: [],
        evidenceLinkIds: [],
        matchStrength: 'none',
        recommendedAction: 'Implement or document.',
      },
    ];
    store.findings.saveAll(findings, 'run-findings');
    const fetched = store.findings.findByRunId('run-findings');
    expect(fetched).toHaveLength(1);
    expect(fetched[0]?.ruleId).toBe('REQ_WITHOUT_CODE');
    expect(fetched[0]?.requirementIds).toContain('REQ-005');
  });
});

describe('ReviewDecisionsRepository', () => {
  it('saves and retrieves a review decision', () => {
    store.runs.save(makeRun('run-dec'));
    const decision: ReviewDecision = {
      id: 'dec-1',
      findingId: 'finding-1',
      runId: 'run-dec',
      decision: 'accepted',
      rationale: 'Reviewed and confirmed.',
      decidedAt: new Date().toISOString(),
    };
    store.decisions.save(decision);
    const fetched = store.decisions.findByFindingId('finding-1');
    expect(fetched?.decision).toBe('accepted');
    expect(fetched?.rationale).toBe('Reviewed and confirmed.');
  });

  it('retrieves decisions by run', () => {
    store.runs.save(makeRun('run-dec2'));
    store.decisions.save({
      id: 'dec-2',
      findingId: 'f1',
      runId: 'run-dec2',
      decision: 'deferred',
      decidedAt: new Date().toISOString(),
    });
    const decisions = store.decisions.findByRunId('run-dec2');
    expect(decisions).toHaveLength(1);
    expect(decisions[0]?.decision).toBe('deferred');
  });
});
