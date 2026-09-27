import { describe, it, expect } from 'vitest';
import { analyzeBundle } from '../engine.js';
import { loadBundleFromDirectory } from '@changeproof/ingestion';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.resolve(__dirname, '../../../../../fixtures/sample-checkout');

function fixtureAvailable(): boolean {
  return fs.existsSync(FIXTURE_DIR);
}

describe('analyzeBundle — fixture acceptance test', () => {
  it('loads the fixture without network access', () => {
    if (!fixtureAvailable()) return;
    const bundle = loadBundleFromDirectory(FIXTURE_DIR, 'sample', 'Sample Checkout');
    expect(bundle.files.length).toBeGreaterThan(5);
    expect(bundle.fingerprint).toHaveLength(64);
  });

  it('produces deterministic fingerprint on repeated runs', () => {
    if (!fixtureAvailable()) return;
    const b1 = loadBundleFromDirectory(FIXTURE_DIR, 'sample', 'Sample Checkout');
    const b2 = loadBundleFromDirectory(FIXTURE_DIR, 'sample', 'Sample Checkout');
    expect(b1.fingerprint).toBe(b2.fingerprint);
  });

  it('detects all 5 requirements', () => {
    if (!fixtureAvailable()) return;
    const bundle = loadBundleFromDirectory(FIXTURE_DIR, 'sample', 'Sample Checkout');
    const result = analyzeBundle(bundle, 'test-run-1', 'Test Run');
    const reqIds = result.requirements.map((r) => r.id);
    expect(reqIds).toContain('REQ-001');
    expect(reqIds).toContain('REQ-002');
    expect(reqIds).toContain('REQ-003');
    expect(reqIds).toContain('REQ-004');
    expect(reqIds).toContain('REQ-005');
  });

  it('detects changed artifacts from the patch', () => {
    if (!fixtureAvailable()) return;
    const bundle = loadBundleFromDirectory(FIXTURE_DIR, 'sample', 'Sample Checkout');
    const result = analyzeBundle(bundle, 'test-run-2', 'Test Run');
    const paths = result.changedArtifacts.map((a) => a.filePath);
    expect(paths.some((p) => p.includes('order.service'))).toBe(true);
    expect(paths.some((p) => p.includes('csv.exporter'))).toBe(true);
    expect(paths.some((p) => p.includes('tax.calculator'))).toBe(true);
    expect(paths.some((p) => p.includes('auth.middleware'))).toBe(true);
  });

  it('produces same findings on repeated runs (determinism)', () => {
    if (!fixtureAvailable()) return;
    const bundle = loadBundleFromDirectory(FIXTURE_DIR, 'sample', 'Sample Checkout');
    const r1 = analyzeBundle(bundle, 'run-det-1', 'Run 1');
    const r2 = analyzeBundle(bundle, 'run-det-1', 'Run 1');
    // Same finding IDs and rule IDs
    const ruleIds1 = r1.findings.map((f) => f.ruleId).sort();
    const ruleIds2 = r2.findings.map((f) => f.ruleId).sort();
    expect(ruleIds1).toEqual(ruleIds2);
    expect(r1.summary.totalFindings).toBe(r2.summary.totalFindings);
  });

  it('detects REQ_WITHOUT_CODE (REQ-005)', () => {
    if (!fixtureAvailable()) return;
    const bundle = loadBundleFromDirectory(FIXTURE_DIR, 'sample', 'Sample Checkout');
    const result = analyzeBundle(bundle, 'test-run-3', 'Test Run');
    const finding = result.findings.find(
      (f) => f.ruleId === 'REQ_WITHOUT_CODE' && f.requirementIds.includes('REQ-005'),
    );
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe('high');
  });

  it('detects CODE_WITHOUT_REQ (ADMIN_ROLE_HEADER)', () => {
    if (!fixtureAvailable()) return;
    const bundle = loadBundleFromDirectory(FIXTURE_DIR, 'sample', 'Sample Checkout');
    const result = analyzeBundle(bundle, 'test-run-4', 'Test Run');
    const finding = result.findings.find((f) => f.ruleId === 'CODE_WITHOUT_REQ');
    expect(finding).toBeDefined();
  });

  it('detects TEST_GAP_ON_CHANGED_SYMBOL (processBulkImport)', () => {
    if (!fixtureAvailable()) return;
    const bundle = loadBundleFromDirectory(FIXTURE_DIR, 'sample', 'Sample Checkout');
    const result = analyzeBundle(bundle, 'test-run-5', 'Test Run');
    const finding = result.findings.find((f) => f.ruleId === 'TEST_GAP_ON_CHANGED_SYMBOL');
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe('high');
  });

  it('detects PUBLIC_API_CHANGED (csv.exporter)', () => {
    if (!fixtureAvailable()) return;
    const bundle = loadBundleFromDirectory(FIXTURE_DIR, 'sample', 'Sample Checkout');
    const result = analyzeBundle(bundle, 'test-run-6', 'Test Run');
    const finding = result.findings.find((f) => f.ruleId === 'PUBLIC_API_CHANGED');
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe('medium');
  });

  it('detects DOC_STALE_OR_MISSING (rounding method)', () => {
    if (!fixtureAvailable()) return;
    const bundle = loadBundleFromDirectory(FIXTURE_DIR, 'sample', 'Sample Checkout');
    const result = analyzeBundle(bundle, 'test-run-7', 'Test Run');
    const finding = result.findings.find((f) => f.ruleId === 'DOC_STALE_OR_MISSING');
    expect(finding).toBeDefined();
  });

  it('does not produce high-severity finding for the low-risk change (requireAuthenticated)', () => {
    if (!fixtureAvailable()) return;
    const bundle = loadBundleFromDirectory(FIXTURE_DIR, 'sample', 'Sample Checkout');
    const result = analyzeBundle(bundle, 'test-run-8', 'Test Run');
    const highFindings = result.findings.filter(
      (f) =>
        (f.severity === 'critical' || f.severity === 'high') &&
        f.changedArtifactIds.some((id) => {
          const artifact = result.changedArtifacts.find((a) => a.id === id);
          return artifact?.filePath.includes('auth.middleware') ?? false;
        }) &&
        f.explanation.includes('requireAuthenticated'),
    );
    expect(highFindings).toHaveLength(0);
  });

  it('summary counts are consistent with findings array', () => {
    if (!fixtureAvailable()) return;
    const bundle = loadBundleFromDirectory(FIXTURE_DIR, 'sample', 'Sample Checkout');
    const result = analyzeBundle(bundle, 'test-run-9', 'Test Run');
    expect(result.summary.totalFindings).toBe(result.findings.length);
    expect(result.summary.totalRequirements).toBe(result.requirements.length);
    expect(result.summary.totalChangedArtifacts).toBe(result.changedArtifacts.length);
  });
});
