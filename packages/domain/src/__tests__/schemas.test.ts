import { describe, it, expect } from 'vitest';
import {
  RequirementSchema,
  FindingSchema,
  EvidenceLinkSchema,
  AnalysisRunSchema,
  ReviewDecisionSchema,
  ChangedArtifactSchema,
  TestArtifactSchema,
  AcceptanceCriterionSchema,
} from '../schemas.js';

describe('RequirementSchema', () => {
  it('parses a valid requirement', () => {
    const result = RequirementSchema.safeParse({
      id: 'REQ-001',
      title: 'Create order',
      body: 'Create an order only when item exists and quantity > 0.',
      acceptanceCriteria: [],
      tags: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a requirement without title', () => {
    const result = RequirementSchema.safeParse({
      id: 'REQ-001',
      body: 'body',
      acceptanceCriteria: [],
    });
    expect(result.success).toBe(false);
  });

  it('parses requirement with acceptance criteria', () => {
    const result = RequirementSchema.safeParse({
      id: 'REQ-001',
      title: 'Create order',
      body: 'body',
      acceptanceCriteria: [
        {
          id: 'AC-001-1',
          requirementId: 'REQ-001',
          text: 'Given a valid item, when quantity > 0, then order is created.',
        },
      ],
      tags: ['orders'],
    });
    expect(result.success).toBe(true);
  });
});

describe('AcceptanceCriterionSchema', () => {
  it('parses a valid acceptance criterion', () => {
    const result = AcceptanceCriterionSchema.safeParse({
      id: 'AC-001-1',
      requirementId: 'REQ-001',
      text: 'Order is created when item exists.',
    });
    expect(result.success).toBe(true);
  });
});

describe('FindingSchema', () => {
  it('parses a valid finding', () => {
    const result = FindingSchema.safeParse({
      id: 'finding-1',
      ruleId: 'REQ_WITHOUT_CODE',
      severity: 'high',
      status: 'missing_evidence',
      title: 'REQ-005 has no implementation evidence',
      explanation: 'No changed file or symbol maps to REQ-005.',
      requirementIds: ['REQ-005'],
      changedArtifactIds: [],
      testArtifactIds: [],
      evidenceLinkIds: [],
      matchStrength: 'none',
      recommendedAction: 'Implement REQ-005 or mark as out-of-scope.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid ruleId', () => {
    const result = FindingSchema.safeParse({
      id: 'f1',
      ruleId: 'UNKNOWN_RULE',
      severity: 'high',
      status: 'missing_evidence',
      title: 'title',
      explanation: 'explanation',
      matchStrength: 'none',
      recommendedAction: 'action',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid severity', () => {
    const result = FindingSchema.safeParse({
      id: 'f1',
      ruleId: 'REQ_WITHOUT_CODE',
      severity: 'catastrophic',
      status: 'missing_evidence',
      title: 'title',
      explanation: 'explanation',
      matchStrength: 'none',
      recommendedAction: 'action',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid status', () => {
    const result = FindingSchema.safeParse({
      id: 'f1',
      ruleId: 'REQ_WITHOUT_CODE',
      severity: 'high',
      status: 'unknown_status',
      title: 'title',
      explanation: 'explanation',
      matchStrength: 'none',
      recommendedAction: 'action',
    });
    expect(result.success).toBe(false);
  });

  it('all rule IDs are valid', () => {
    const ruleIds = [
      'REQ_WITHOUT_CODE',
      'CODE_WITHOUT_REQ',
      'REQ_WITHOUT_TEST',
      'PUBLIC_API_CHANGED',
      'CONFIG_OR_SCHEMA_CHANGED',
      'TEST_GAP_ON_CHANGED_SYMBOL',
      'DOC_STALE_OR_MISSING',
      'AMBIGUOUS_TRACEABILITY',
    ] as const;

    for (const ruleId of ruleIds) {
      const result = FindingSchema.safeParse({
        id: 'f1',
        ruleId,
        severity: 'medium',
        status: 'informational',
        title: 'title',
        explanation: 'explanation',
        matchStrength: 'weak',
        recommendedAction: 'action',
      });
      expect(result.success, `ruleId ${ruleId} should be valid`).toBe(true);
    }
  });
});

describe('EvidenceLinkSchema', () => {
  it('parses a valid evidence link', () => {
    const result = EvidenceLinkSchema.safeParse({
      id: 'link-1',
      fromType: 'requirement',
      fromId: 'REQ-001',
      toType: 'changed_artifact',
      toId: 'artifact-1',
      method: 'explicit_req_id',
      strength: 'strong',
      explanation: 'The diff comment mentions REQ-001 directly.',
    });
    expect(result.success).toBe(true);
  });
});

describe('ChangedArtifactSchema', () => {
  it('parses a valid changed artifact', () => {
    const result = ChangedArtifactSchema.safeParse({
      id: 'art-1',
      filePath: 'src/orders/order.service.ts',
      changeType: 'modified',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid changeType', () => {
    const result = ChangedArtifactSchema.safeParse({
      id: 'art-1',
      filePath: 'src/orders/order.service.ts',
      changeType: 'updated',
    });
    expect(result.success).toBe(false);
  });
});

describe('TestArtifactSchema', () => {
  it('parses a valid test artifact', () => {
    const result = TestArtifactSchema.safeParse({
      id: 'test-1',
      filePath: 'tests/orders/order.service.test.ts',
      testName: 'should create an order when item exists',
    });
    expect(result.success).toBe(true);
  });
});

describe('AnalysisRunSchema', () => {
  it('parses a valid run', () => {
    const result = AnalysisRunSchema.safeParse({
      id: 'run-1',
      name: 'Sample run',
      status: 'completed',
      contentFingerprint: 'abc123',
      createdAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid status', () => {
    const result = AnalysisRunSchema.safeParse({
      id: 'run-1',
      name: 'Sample run',
      status: 'unknown',
      contentFingerprint: 'abc123',
      createdAt: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });
});

describe('ReviewDecisionSchema', () => {
  it('parses a valid review decision', () => {
    const result = ReviewDecisionSchema.safeParse({
      id: 'decision-1',
      findingId: 'finding-1',
      runId: 'run-1',
      decision: 'accepted',
      decidedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid decision value', () => {
    const result = ReviewDecisionSchema.safeParse({
      id: 'decision-1',
      findingId: 'finding-1',
      runId: 'run-1',
      decision: 'approved',
      decidedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });
});
