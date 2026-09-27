import { describe, it, expect } from 'vitest';
import { generateMarkdownReport, generateJsonReport } from '../reporter.js';
import type { AnalysisResult, ReviewDecision } from '@changeproof/domain';

function makeMockResult(): AnalysisResult {
  return {
    runMetadata: {
      id: 'run-123',
      name: 'Sample Run',
      status: 'completed',
      contentFingerprint: 'abc123fingerprint',
      bundleId: 'sample',
      createdAt: '2026-09-27T00:00:00.000Z',
      completedAt: '2026-09-27T00:00:01.000Z',
    },
    summary: {
      totalRequirements: 1,
      totalChangedArtifacts: 1,
      totalTestArtifacts: 1,
      totalEvidenceLinks: 1,
      totalFindings: 1,
      needsHumanReviewCount: 1,
      findingsBySeverity: {
        critical: 0,
        high: 0,
        medium: 1,
        low: 0,
        informational: 0,
      },
      findingsByStatus: {
        verified: 0,
        partial: 0,
        missing_evidence: 0,
        needs_human_review: 1,
        informational: 0,
      },
    },
    requirements: [
      {
        id: 'REQ-001',
        title: 'Create an order',
        body: 'Requirement description',
        acceptanceCriteria: [
          {
            id: 'AC-001-1',
            requirementId: 'REQ-001',
            text: 'Creates pending order',
          },
        ],
        tags: ['orders'],
      },
    ],
    changedArtifacts: [
      {
        id: 'artifact-1',
        filePath: 'src/orders/order.service.ts',
        changeType: 'modified',
        symbols: ['createOrder'],
        addedLines: 10,
        deletedLines: 2,
        hunks: [],
        isPublicApi: true,
        isConfig: false,
        isSchema: false,
        isTest: false,
        isDocumentation: false,
      },
    ],
    testArtifacts: [
      {
        id: 'test-1',
        filePath: 'tests/orders/order.service.test.ts',
        testName: 'createOrder works',
        referencedSymbols: ['createOrder'],
        referencedRequirementIds: ['REQ-001'],
      },
    ],
    evidenceLinks: [
      {
        id: 'link-1',
        fromType: 'requirement',
        fromId: 'REQ-001',
        toType: 'changed_artifact',
        toId: 'artifact-1',
        method: 'explicit_req_id',
        strength: 'strong',
        explanation: 'Explicit reference in source',
        sourceLocation: {
          filePath: 'src/orders/order.service.ts',
          startLine: 1,
          endLine: 10,
        },
      },
    ],
    findings: [
      {
        id: 'finding-1',
        ruleId: 'PUBLIC_API_CHANGED',
        severity: 'medium',
        status: 'needs_human_review',
        title: 'Public API changed',
        explanation: 'The order service public API changed.',
        requirementIds: ['REQ-001'],
        changedArtifactIds: ['artifact-1'],
        testArtifactIds: ['test-1'],
        evidenceLinkIds: ['link-1'],
        matchStrength: 'strong',
        recommendedAction: 'Review order service API changes',
      },
    ],
  };
}

const mockDecisions: ReviewDecision[] = [
  {
    id: 'dec-1',
    findingId: 'finding-1',
    runId: 'run-123',
    decision: 'accepted',
    rationale: 'Approved change after manual verification',
    decidedBy: 'reviewer@example.com',
    decidedAt: '2026-09-27T01:00:00.000Z',
  },
];

describe('generateMarkdownReport', () => {
  it('generates a complete markdown report with metadata, summary, traceability, and decisions', () => {
    const result = makeMockResult();
    const md = generateMarkdownReport(result, mockDecisions);

    expect(md).toContain('# ChangeProof Evidence Report');
    expect(md).toContain('ChangeProof does not approve or block merges autonomously');
    expect(md).toContain('run-123');
    expect(md).toContain('abc123fingerprint');
    expect(md).toContain('Total Findings | 1');
    expect(md).toContain('REQ-001: Create an order');
    expect(md).toContain('PUBLIC_API_CHANGED');
    expect(md).toContain('Approved change after manual verification');
    expect(md).toContain('reviewer@example.com');
  });

  it('handles empty decisions gracefully', () => {
    const result = makeMockResult();
    const md = generateMarkdownReport(result, []);

    expect(md).toContain('# ChangeProof Evidence Report');
    expect(md).not.toContain('Review Decisions');
  });
});

describe('generateJsonReport', () => {
  it('generates valid machine-readable JSON matching the analysis result and decisions', () => {
    const result = makeMockResult();
    const report = generateJsonReport(result, mockDecisions);

    expect(report.schemaVersion).toBe('1.0.0');
    expect(report.run.id).toBe('run-123');
    expect(report.summary.totalFindings).toBe(1);
    expect(report.findings[0]?.id).toBe('finding-1');
    expect(report.humanDecisions[0]?.decision).toBe('accepted');
    expect(report.humanDecisions[0]?.decidedBy).toBe('reviewer@example.com');

    // Verify it serializes to valid JSON
    const serialized = JSON.stringify(report);
    expect(JSON.parse(serialized)).toEqual(report);
  });
});
