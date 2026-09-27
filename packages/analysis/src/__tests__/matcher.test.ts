import { describe, it, expect, beforeEach } from 'vitest';
import {
  matchRequirementToArtifact,
  matchRequirementToTest,
  matchArtifactToTest,
  resetLinkCounter,
} from '../matcher.js';
import type { Requirement, ChangedArtifact, TestArtifact } from '@changeproof/domain';

const makeReq = (id: string, title: string, body: string): Requirement => ({
  id,
  title,
  body,
  acceptanceCriteria: [],
  tags: [],
});

const makeArtifact = (id: string, filePath: string, symbols: string[] = []): ChangedArtifact => ({
  id,
  filePath,
  changeType: 'modified',
  symbols,
  addedLines: 3,
  deletedLines: 1,
  hunks: [],
  isPublicApi: false,
  isConfig: false,
  isSchema: false,
  isTest: false,
  isDocumentation: false,
});

beforeEach(() => resetLinkCounter());

describe('matchRequirementToArtifact', () => {
  it('matches by explicit req ID in content', () => {
    const req = makeReq('REQ-001', 'Create order', 'Creates an order.');
    const artifact = makeArtifact('a1', 'src/orders/order.service.ts');
    const content = '// REQ-001: order creation\nexport function createOrder() {}';
    const result = matchRequirementToArtifact(req, artifact, content);
    expect(result?.method).toBe('explicit_req_id');
    expect(result?.strength).toBe('strong');
  });

  it('matches by direct file reference in requirement body', () => {
    const req = makeReq('REQ-002', 'CSV Export', 'See csv.exporter for implementation.');
    const artifact = makeArtifact('a2', 'src/export/csv.exporter.ts');
    const result = matchRequirementToArtifact(req, artifact, 'no req id here');
    expect(result?.method).toBe('direct_file_ref');
    expect(result?.strength).toBe('strong');
  });

  it('matches by symbol overlap', () => {
    const req = makeReq('REQ-003', 'Cancellation', 'The cancelOrder function must check status.');
    const artifact = makeArtifact('a3', 'src/orders/service.ts', ['cancelOrder']);
    const result = matchRequirementToArtifact(req, artifact, 'no req id');
    expect(result?.method).toBe('symbol_overlap');
    expect(result?.strength).toBe('moderate');
  });

  it('matches by path overlap', () => {
    const req = makeReq('REQ-004', 'Tax calculation', 'Tax must round to cents.');
    const artifact = makeArtifact('a4', 'src/tax/tax.calculator.ts');
    const result = matchRequirementToArtifact(req, artifact, 'no req id');
    expect(result?.method).toBe('path_overlap');
  });

  it('returns null when no match', () => {
    const req = makeReq('REQ-005', 'Unrelated feature', 'Nothing here.');
    const artifact = makeArtifact('a5', 'src/totally/different/path.ts');
    const result = matchRequirementToArtifact(req, artifact, 'no connection');
    expect(result).toBeNull();
  });
});

describe('matchRequirementToTest', () => {
  it('matches by explicit req ID in test references', () => {
    const req = makeReq('REQ-001', 'Create order', '');
    const test: TestArtifact = {
      id: 't1',
      filePath: 'tests/orders/order.service.test.ts',
      testName: 'REQ-001 createOrder > creates a pending order',
      referencedSymbols: ['createOrder'],
      referencedRequirementIds: ['REQ-001'],
    };
    const result = matchRequirementToTest(req, test);
    expect(result?.method).toBe('explicit_req_id');
    expect(result?.strength).toBe('strong');
  });

  it('matches by test name keywords', () => {
    const req = makeReq('REQ-003', 'Cancel order status', 'Order cancellation logic.');
    const test: TestArtifact = {
      id: 't2',
      filePath: 'tests/orders/cancel.test.ts',
      testName: 'cancel order when status is pending',
      referencedSymbols: ['cancelOrder'],
      referencedRequirementIds: [],
    };
    const result = matchRequirementToTest(req, test);
    expect(result?.method).toBe('test_name_match');
  });

  it('returns null when no match', () => {
    const req = makeReq('REQ-005', 'Bulk import', 'Bulk import handler.');
    const test: TestArtifact = {
      id: 't3',
      filePath: 'tests/auth/auth.test.ts',
      testName: 'auth does not throw for admin',
      referencedSymbols: ['requireAdmin'],
      referencedRequirementIds: [],
    };
    const result = matchRequirementToTest(req, test);
    expect(result).toBeNull();
  });
});

describe('matchArtifactToTest', () => {
  it('matches by symbol overlap', () => {
    const artifact = makeArtifact('a1', 'src/orders/order.service.ts', [
      'createOrder',
      'cancelOrder',
    ]);
    const test: TestArtifact = {
      id: 't1',
      filePath: 'tests/orders/order.service.test.ts',
      testName: 'createOrder creates pending order',
      referencedSymbols: ['createOrder', 'cancelOrder', 'ItemNotFoundError'],
      referencedRequirementIds: ['REQ-001'],
    };
    const result = matchArtifactToTest(artifact, test);
    expect(result).not.toBeNull();
  });
});
