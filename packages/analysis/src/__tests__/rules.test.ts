import { describe, it, expect, beforeEach } from 'vitest';
import {
  ruleReqWithoutCode,
  ruleCodeWithoutReq,
  ruleReqWithoutTest,
  rulePublicApiChanged,
  ruleConfigOrSchemaChanged,
  ruleTestGapOnChangedSymbol,
  ruleDocStaleOrMissing,
  ruleAmbiguousTraceability,
  resetFindingCounter,
} from '../rules/index.js';
import type { Requirement, ChangedArtifact, TestArtifact, EvidenceLink } from '@changeproof/domain';

beforeEach(() => resetFindingCounter());

const makeReq = (id: string, title = 'Title', body = 'Body'): Requirement => ({
  id,
  title,
  body,
  acceptanceCriteria: [],
  tags: [],
});

const makeArtifact = (
  id: string,
  filePath: string,
  overrides: Partial<ChangedArtifact> = {},
): ChangedArtifact => ({
  id,
  filePath,
  changeType: 'modified',
  symbols: ['someSymbol'],
  addedLines: 5,
  deletedLines: 2,
  hunks: [],
  isPublicApi: false,
  isConfig: false,
  isSchema: false,
  isTest: false,
  isDocumentation: false,
  ...overrides,
});

const makeLink = (
  id: string,
  fromType: 'requirement' | 'changed_artifact' | 'test_artifact',
  fromId: string,
  toType: 'requirement' | 'changed_artifact' | 'test_artifact',
  toId: string,
  strength: 'strong' | 'moderate' | 'weak' | 'none' = 'strong',
): EvidenceLink => ({
  id,
  fromType,
  fromId,
  toType,
  toId,
  method: 'explicit_req_id',
  strength,
  explanation: 'test link',
});

describe('ruleReqWithoutCode', () => {
  it('fires when requirement has no artifact link', () => {
    const findings = ruleReqWithoutCode([makeReq('REQ-001')], [makeArtifact('a1', 'src/x.ts')], []);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleId).toBe('REQ_WITHOUT_CODE');
    expect(findings[0]?.severity).toBe('high');
  });

  it('does not fire when strong link exists', () => {
    const links: EvidenceLink[] = [
      makeLink('l1', 'requirement', 'REQ-001', 'changed_artifact', 'a1', 'strong'),
    ];
    const findings = ruleReqWithoutCode(
      [makeReq('REQ-001')],
      [makeArtifact('a1', 'src/x.ts')],
      links,
    );
    expect(findings).toHaveLength(0);
  });

  it('does not fire when moderate link exists', () => {
    const links: EvidenceLink[] = [
      makeLink('l1', 'requirement', 'REQ-001', 'changed_artifact', 'a1', 'moderate'),
    ];
    const findings = ruleReqWithoutCode(
      [makeReq('REQ-001')],
      [makeArtifact('a1', 'src/x.ts')],
      links,
    );
    expect(findings).toHaveLength(0);
  });
});

describe('ruleCodeWithoutReq', () => {
  it('fires for production file with no req link', () => {
    const findings = ruleCodeWithoutReq([makeArtifact('a1', 'src/x.ts')], [makeReq('REQ-001')], []);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0]?.ruleId).toBe('CODE_WITHOUT_REQ');
  });

  it('does not fire for test files', () => {
    const findings = ruleCodeWithoutReq(
      [makeArtifact('a1', 'tests/x.test.ts', { isTest: true })],
      [makeReq('REQ-001')],
      [],
    );
    expect(findings).toHaveLength(0);
  });

  it('marks minor changes as informational', () => {
    const findings = ruleCodeWithoutReq(
      [makeArtifact('a1', 'src/x.ts', { addedLines: 2, deletedLines: 1 })],
      [],
      [],
    );
    expect(findings[0]?.severity).toBe('informational');
    expect(findings[0]?.status).toBe('informational');
  });
});

describe('ruleReqWithoutTest', () => {
  it('fires when no test is linked', () => {
    const findings = ruleReqWithoutTest([makeReq('REQ-001')], [], []);
    expect(findings[0]?.ruleId).toBe('REQ_WITHOUT_TEST');
  });

  it('does not fire when test link exists', () => {
    const test: TestArtifact = {
      id: 't1',
      filePath: 'tests/x.test.ts',
      testName: 'test',
      referencedSymbols: [],
      referencedRequirementIds: ['REQ-001'],
    };
    const links: EvidenceLink[] = [makeLink('l1', 'requirement', 'REQ-001', 'test_artifact', 't1')];
    const findings = ruleReqWithoutTest([makeReq('REQ-001')], [test], links);
    expect(findings).toHaveLength(0);
  });
});

describe('rulePublicApiChanged', () => {
  it('fires for public API files with symbols', () => {
    const artifact = makeArtifact('a1', 'src/export/csv.exporter.ts', {
      isPublicApi: true,
      symbols: ['exportOrdersToCsv'],
    });
    const findings = rulePublicApiChanged([artifact], [], []);
    expect(findings[0]?.ruleId).toBe('PUBLIC_API_CHANGED');
    expect(findings[0]?.severity).toBe('medium');
  });

  it('does not fire for test files', () => {
    const artifact = makeArtifact('a1', 'tests/api.test.ts', {
      isPublicApi: true,
      isTest: true,
      symbols: ['testFn'],
    });
    const findings = rulePublicApiChanged([artifact], [], []);
    expect(findings).toHaveLength(0);
  });
});

describe('ruleConfigOrSchemaChanged', () => {
  it('fires for config files', () => {
    const artifact = makeArtifact('a1', 'src/tax/tax.config.ts', { isConfig: true });
    const findings = ruleConfigOrSchemaChanged([artifact], [], []);
    expect(findings[0]?.ruleId).toBe('CONFIG_OR_SCHEMA_CHANGED');
  });
});

describe('ruleTestGapOnChangedSymbol', () => {
  it('fires when symbol has no test', () => {
    const artifact = makeArtifact('a1', 'src/orders/bulk-import.handler.ts', {
      symbols: ['processBulkImport'],
    });
    const findings = ruleTestGapOnChangedSymbol([artifact], [], []);
    expect(findings[0]?.ruleId).toBe('TEST_GAP_ON_CHANGED_SYMBOL');
    expect(findings[0]?.severity).toBe('high');
  });

  it('does not fire when test link exists', () => {
    const artifact = makeArtifact('a1', 'src/x.ts', { symbols: ['foo'] });
    const test: TestArtifact = {
      id: 't1',
      filePath: 'tests/x.test.ts',
      testName: 'foo works',
      referencedSymbols: ['foo'],
      referencedRequirementIds: [],
    };
    const links: EvidenceLink[] = [makeLink('l1', 'changed_artifact', 'a1', 'test_artifact', 't1')];
    const findings = ruleTestGapOnChangedSymbol([artifact], [test], links);
    expect(findings).toHaveLength(0);
  });
});

describe('ruleDocStaleOrMissing', () => {
  it('fires when tax calculator rounding is changed but docs say old method', () => {
    const artifact = makeArtifact('a1', 'src/tax/tax.calculator.ts', {
      symbols: ['TaxCalculator'],
    });
    const docContents = new Map([['docs/api.md', 'Rounding: round-half-up']]);
    const findings = ruleDocStaleOrMissing([artifact], docContents, [], []);
    expect(findings[0]?.ruleId).toBe('DOC_STALE_OR_MISSING');
  });
});

describe('ruleAmbiguousTraceability', () => {
  it('fires when requirement has multiple weak artifact matches', () => {
    const req = makeReq('REQ-004', 'Tax calculation', 'Tax rounds to cents.');
    const artifacts = [
      makeArtifact('a1', 'src/tax/tax.calculator.ts'),
      makeArtifact('a2', 'src/tax/tax.config.ts'),
    ];
    const links: EvidenceLink[] = [
      makeLink('l1', 'requirement', 'REQ-004', 'changed_artifact', 'a1', 'weak'),
      makeLink('l2', 'requirement', 'REQ-004', 'changed_artifact', 'a2', 'weak'),
    ];
    const findings = ruleAmbiguousTraceability([req], artifacts, links);
    expect(findings[0]?.ruleId).toBe('AMBIGUOUS_TRACEABILITY');
    expect(findings[0]?.severity).toBe('low');
  });

  it('does not fire when a single strong link exists', () => {
    const req = makeReq('REQ-001', 'Create order', '');
    const artifacts = [makeArtifact('a1', 'src/orders/order.service.ts')];
    const links: EvidenceLink[] = [
      makeLink('l1', 'requirement', 'REQ-001', 'changed_artifact', 'a1', 'strong'),
    ];
    const findings = ruleAmbiguousTraceability([req], artifacts, links);
    expect(findings).toHaveLength(0);
  });
});
