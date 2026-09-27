import { describe, it, expect } from 'vitest';
import {
  SAMPLE_RUN,
  SAMPLE_FINDINGS,
  SAMPLE_TRACEABILITY,
  SAMPLE_EVIDENCE_LINKS,
} from '../sample-data.js';

describe('Sample Data Integrity', () => {
  it('contains valid sample run metadata', () => {
    expect(SAMPLE_RUN.id).toBe('sample-run-fixture');
    expect(SAMPLE_RUN.contentFingerprint).toHaveLength(64);
    expect(SAMPLE_RUN.summary?.totalRequirements).toBe(5);
  });

  it('contains 5 deterministic findings', () => {
    expect(SAMPLE_FINDINGS).toHaveLength(5);
    const ruleIds = SAMPLE_FINDINGS.map((f) => f.ruleId);
    expect(ruleIds).toContain('PUBLIC_API_CHANGED');
    expect(ruleIds).toContain('TEST_GAP_ON_CHANGED_SYMBOL');
    expect(ruleIds).toContain('DOC_STALE_OR_MISSING');
  });

  it('contains 5 traceable requirements', () => {
    expect(SAMPLE_TRACEABILITY).toHaveLength(5);
    const reqIds = SAMPLE_TRACEABILITY.map((r) => r.id);
    expect(reqIds).toContain('REQ-001');
    expect(reqIds).toContain('REQ-002');
    expect(reqIds).toContain('REQ-003');
    expect(reqIds).toContain('REQ-004');
    expect(reqIds).toContain('REQ-005');
  });

  it('contains evidence links', () => {
    expect(SAMPLE_EVIDENCE_LINKS.length).toBeGreaterThan(0);
  });
});
