import type {
  AnalysisResult,
  AnalysisRun,
  AnalysisSummary,
  ChangedArtifact,
  EvidenceLink,
  Finding,
  FindingStatus,
  Requirement,
  Severity,
  TestArtifact,
} from '@changeproof/domain';
import type { ChangeBundle } from '@changeproof/ingestion';
import {
  parseRequirementsMarkdown,
  parseDiff,
  parseTestFile,
  parseDocumentation,
} from '@changeproof/parsers';
import {
  buildReqToArtifactLinks,
  buildReqToTestLinks,
  buildArtifactToTestLinks,
  resetLinkCounter,
} from './matcher.js';
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
} from './rules/index.js';

// ---------------------------------------------------------------------------
// Analysis engine entry point
// ---------------------------------------------------------------------------

function isTestFile(filePath: string): boolean {
  return (
    filePath.includes('.test.') ||
    filePath.includes('.spec.') ||
    filePath.includes('/tests/') ||
    filePath.includes('/test/')
  );
}

function isDocFile(filePath: string): boolean {
  return filePath.endsWith('.md') || filePath.includes('/docs/');
}

function isPatchFile(filePath: string): boolean {
  return filePath.endsWith('.patch') || filePath.endsWith('.diff');
}

function isRequirementsFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return lower.includes('requirements') || lower === 'requirements.md';
}

/**
 * Run the deterministic analysis on a change bundle.
 * Pure function over the bundle — no I/O after this point.
 */
export function analyzeBundle(
  bundle: ChangeBundle,
  runId: string,
  runName: string,
): AnalysisResult {
  // Reset counters for deterministic output
  resetLinkCounter();
  resetFindingCounter();

  // -------------------------------------------------------------------------
  // 1. Parse requirements
  // -------------------------------------------------------------------------
  const requirementsFile = bundle.files.find((f) => isRequirementsFile(f.path));
  const requirements: Requirement[] = requirementsFile
    ? parseRequirementsMarkdown(requirementsFile.content, requirementsFile.path)
    : [];

  // -------------------------------------------------------------------------
  // 2. Parse diff
  // -------------------------------------------------------------------------
  const patchFile = bundle.files.find((f) => isPatchFile(f.path));
  const parsedDiff = patchFile ? parseDiff(patchFile.content, patchFile.path) : { artifacts: [] };

  // Merge metadata from actual source files into diff artifacts
  const changedArtifacts: ChangedArtifact[] = parsedDiff.artifacts.map((artifact) => {
    // If source file exists in bundle, extract symbols from it too
    const sourceFile = bundle.files.find((f) => f.path === artifact.filePath);
    if (sourceFile) {
      // Merge symbols detected in current source with those from diff
      const diffSymbols = new Set(artifact.symbols ?? []);
      // Simple symbol extraction from source
      const sourceSymbols = extractExportedSymbols(sourceFile.content);
      for (const sym of sourceSymbols) diffSymbols.add(sym);
      return { ...artifact, symbols: [...diffSymbols].sort() };
    }
    return artifact;
  });

  // -------------------------------------------------------------------------
  // 3. Parse test files
  // -------------------------------------------------------------------------
  const testFiles = bundle.files.filter((f) => isTestFile(f.path));
  const testArtifacts: TestArtifact[] = testFiles.flatMap((f) => {
    const parsed = parseTestFile(f.content, f.path);
    return parsed.tests;
  });

  // -------------------------------------------------------------------------
  // 4. Parse documentation
  // -------------------------------------------------------------------------
  const docFiles = bundle.files.filter((f) => isDocFile(f.path) && !isRequirementsFile(f.path));
  const docContents = new Map<string, string>();
  for (const f of docFiles) {
    docContents.set(f.path, f.content);
    const parsed = parseDocumentation(f.content, f.path);
    // Store parsed doc content for rule consumption
    docContents.set(f.path, f.content);
    void parsed; // parsed fields used indirectly through docContents map
  }

  // -------------------------------------------------------------------------
  // 5. Build artifact content map for matching
  // -------------------------------------------------------------------------
  const artifactContents = new Map<string, string>();
  for (const f of bundle.files) {
    artifactContents.set(f.path, f.content);
  }

  // -------------------------------------------------------------------------
  // 6. Build evidence links
  // -------------------------------------------------------------------------
  const reqToArtifactLinks = buildReqToArtifactLinks(
    requirements,
    changedArtifacts,
    artifactContents,
  );
  const reqToTestLinks = buildReqToTestLinks(requirements, testArtifacts);
  const artifactToTestLinks = buildArtifactToTestLinks(changedArtifacts, testArtifacts);

  const evidenceLinks: EvidenceLink[] = [
    ...reqToArtifactLinks,
    ...reqToTestLinks,
    ...artifactToTestLinks,
  ].sort((a, b) => a.id.localeCompare(b.id));

  // -------------------------------------------------------------------------
  // 7. Run rules
  // -------------------------------------------------------------------------
  const allFindings: Finding[] = [
    ...ruleReqWithoutCode(requirements, changedArtifacts, evidenceLinks),
    ...ruleCodeWithoutReq(changedArtifacts, requirements, evidenceLinks),
    ...ruleReqWithoutTest(requirements, testArtifacts, evidenceLinks),
    ...rulePublicApiChanged(changedArtifacts, requirements, evidenceLinks),
    ...ruleConfigOrSchemaChanged(changedArtifacts, requirements, evidenceLinks),
    ...ruleTestGapOnChangedSymbol(changedArtifacts, testArtifacts, evidenceLinks),
    ...ruleDocStaleOrMissing(changedArtifacts, docContents, requirements, evidenceLinks),
    ...ruleAmbiguousTraceability(requirements, changedArtifacts, evidenceLinks),
  ].sort((a, b) => a.id.localeCompare(b.id));

  // -------------------------------------------------------------------------
  // 8. Compute summary
  // -------------------------------------------------------------------------
  const summary = computeSummary(
    requirements,
    changedArtifacts,
    testArtifacts,
    evidenceLinks,
    allFindings,
  );

  // -------------------------------------------------------------------------
  // 9. Assemble result
  // -------------------------------------------------------------------------
  const now = new Date().toISOString();
  const runMetadata: AnalysisRun = {
    id: runId,
    name: runName,
    status: 'completed',
    contentFingerprint: bundle.fingerprint,
    bundleId: bundle.id,
    createdAt: now,
    completedAt: now,
    summary,
  };

  return {
    runMetadata,
    requirements,
    changedArtifacts,
    testArtifacts,
    evidenceLinks,
    findings: allFindings,
    summary,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractExportedSymbols(content: string): string[] {
  const patterns = [
    /export\s+(?:async\s+)?function\s+(\w+)/g,
    /export\s+(?:abstract\s+)?class\s+(\w+)/g,
    /export\s+const\s+(\w+)/g,
    /export\s+interface\s+(\w+)/g,
    /export\s+type\s+(\w+)/g,
    /export\s+enum\s+(\w+)/g,
  ];
  const symbols = new Set<string>();
  for (const pattern of patterns) {
    for (const m of content.matchAll(pattern)) {
      if (m[1]) symbols.add(m[1]);
    }
  }
  return [...symbols];
}

function computeSummary(
  requirements: Requirement[],
  changedArtifacts: ChangedArtifact[],
  testArtifacts: TestArtifact[],
  evidenceLinks: EvidenceLink[],
  findings: Finding[],
): AnalysisSummary {
  const findingsBySeverity: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    informational: 0,
  };
  const findingsByStatus: Record<FindingStatus, number> = {
    verified: 0,
    partial: 0,
    missing_evidence: 0,
    needs_human_review: 0,
    informational: 0,
  };
  let needsHumanReviewCount = 0;

  for (const f of findings) {
    findingsBySeverity[f.severity] = (findingsBySeverity[f.severity] ?? 0) + 1;
    findingsByStatus[f.status] = (findingsByStatus[f.status] ?? 0) + 1;
    if (f.status === 'needs_human_review') needsHumanReviewCount++;
  }

  return {
    totalRequirements: requirements.length,
    totalChangedArtifacts: changedArtifacts.length,
    totalTestArtifacts: testArtifacts.length,
    totalEvidenceLinks: evidenceLinks.length,
    totalFindings: findings.length,
    findingsBySeverity,
    findingsByStatus,
    needsHumanReviewCount,
  };
}
