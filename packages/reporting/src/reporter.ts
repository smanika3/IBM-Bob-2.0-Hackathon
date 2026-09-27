import type { AnalysisResult, ReviewDecision } from '@changeproof/domain';

// ---------------------------------------------------------------------------
// Markdown evidence export
// ---------------------------------------------------------------------------

export function generateMarkdownReport(
  result: AnalysisResult,
  decisions: ReviewDecision[],
): string {
  const lines: string[] = [];
  const { runMetadata: run, summary } = result;

  lines.push(`# ChangeProof Evidence Report`);
  lines.push(``);
  lines.push(`> **Disclaimer:** ChangeProof does not approve or block merges autonomously.`);
  lines.push(`> This report is an evidence packet for human review only.`);
  lines.push(``);

  // Run metadata
  lines.push(`## Run Metadata`);
  lines.push(``);
  lines.push(`| Field | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Run ID | ${run.id} |`);
  lines.push(`| Name | ${run.name} |`);
  lines.push(`| Status | ${run.status} |`);
  lines.push(`| Fingerprint | \`${run.contentFingerprint}\` |`);
  lines.push(`| Created | ${run.createdAt} |`);
  if (run.completedAt) lines.push(`| Completed | ${run.completedAt} |`);
  lines.push(``);

  // Summary counts
  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`| Metric | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| Requirements | ${summary.totalRequirements} |`);
  lines.push(`| Changed Artifacts | ${summary.totalChangedArtifacts} |`);
  lines.push(`| Test Artifacts | ${summary.totalTestArtifacts} |`);
  lines.push(`| Evidence Links | ${summary.totalEvidenceLinks} |`);
  lines.push(`| Total Findings | ${summary.totalFindings} |`);
  lines.push(`| Needs Human Review | ${summary.needsHumanReviewCount} |`);
  lines.push(``);
  lines.push(`### Findings by Severity`);
  lines.push(``);
  for (const [sev, count] of Object.entries(summary.findingsBySeverity)) {
    if (count > 0) lines.push(`- **${sev}:** ${count}`);
  }
  lines.push(``);
  lines.push(`### Findings by Status`);
  lines.push(``);
  for (const [status, count] of Object.entries(summary.findingsByStatus)) {
    if (count > 0) lines.push(`- **${status}:** ${count}`);
  }
  lines.push(``);

  // Traceability table
  lines.push(`## Traceability`);
  lines.push(``);
  lines.push(`| Requirement | Implementation evidence | Test evidence | Match strength | Status |`);
  lines.push(`|---|---|---|---|---|`);

  for (const req of result.requirements) {
    const codeLinks = result.evidenceLinks.filter(
      (l) => l.fromId === req.id && l.toType === 'changed_artifact',
    );
    const testLinks = result.evidenceLinks.filter(
      (l) => l.fromId === req.id && l.toType === 'test_artifact',
    );

    const codePaths =
      codeLinks
        .map((l) => result.changedArtifacts.find((a) => a.id === l.toId)?.filePath ?? l.toId)
        .join(', ') || '—';

    const testPaths =
      testLinks
        .map((l) => result.testArtifacts.find((t) => t.id === l.toId)?.filePath ?? l.toId)
        .join(', ') || '—';

    const strength = codeLinks.length > 0 ? (codeLinks[0]?.strength ?? 'none') : 'none';

    const finding = result.findings.find((f) => f.requirementIds.includes(req.id));
    const status = finding?.status ?? 'verified';

    lines.push(
      `| ${req.id}: ${req.title} | ${codePaths} | ${testPaths} | ${strength} | ${status} |`,
    );
  }
  lines.push(``);

  // Findings
  lines.push(`## Findings`);
  lines.push(``);

  const findingsBySeverity = groupBy(result.findings, (f) => f.severity);
  for (const sev of ['critical', 'high', 'medium', 'low', 'informational'] as const) {
    const group = findingsBySeverity.get(sev) ?? [];
    if (group.length === 0) continue;

    lines.push(`### ${sev.toUpperCase()} (${group.length})`);
    lines.push(``);

    for (const finding of group) {
      const decision = decisions.find((d) => d.findingId === finding.id);
      lines.push(`#### ${finding.title}`);
      lines.push(``);
      lines.push(`- **Rule:** ${finding.ruleId}`);
      lines.push(`- **Severity:** ${finding.severity}`);
      lines.push(`- **Status:** ${finding.status}`);
      lines.push(`- **Match strength:** ${finding.matchStrength}`);
      if (finding.requirementIds.length > 0) {
        lines.push(`- **Requirements:** ${finding.requirementIds.join(', ')}`);
      }
      if (finding.changedArtifactIds.length > 0) {
        const paths = finding.changedArtifactIds
          .map((id) => result.changedArtifacts.find((a) => a.id === id)?.filePath ?? id)
          .join(', ');
        lines.push(`- **Changed files:** ${paths}`);
      }
      if (finding.testArtifactIds.length > 0) {
        const paths = finding.testArtifactIds
          .map((id) => result.testArtifacts.find((t) => t.id === id)?.filePath ?? id)
          .join(', ');
        lines.push(`- **Tests:** ${paths}`);
      }
      lines.push(``);
      lines.push(`**Explanation:** ${finding.explanation}`);
      lines.push(``);
      lines.push(`**Recommended action:** ${finding.recommendedAction}`);
      lines.push(``);
      if (decision) {
        lines.push(
          `**Human decision:** ${decision.decision.toUpperCase()}${decision.rationale ? ` — ${decision.rationale}` : ''}`,
        );
        lines.push(``);
      }
      lines.push(`---`);
      lines.push(``);
    }
  }

  // Evidence links
  lines.push(`## Evidence Links`);
  lines.push(``);
  lines.push(`| From | To | Method | Strength | Explanation |`);
  lines.push(`|---|---|---|---|---|`);
  for (const link of result.evidenceLinks) {
    lines.push(
      `| ${link.fromType}:${link.fromId} | ${link.toType}:${link.toId} | ${link.method} | ${link.strength} | ${link.explanation} |`,
    );
  }
  lines.push(``);

  // Human decisions
  if (decisions.length > 0) {
    lines.push(`## Human Decisions`);
    lines.push(``);
    lines.push(`| Finding | Decision | Rationale | Decided by | Decided at |`);
    lines.push(`|---|---|---|---|---|`);
    for (const d of decisions) {
      lines.push(
        `| ${d.findingId} | ${d.decision} | ${d.rationale ?? '—'} | ${d.decidedBy ?? '—'} | ${d.decidedAt} |`,
      );
    }
    lines.push(``);
  }

  // Limitations
  lines.push(`## Limitations`);
  lines.push(``);
  lines.push(`- Analysis is based on the provided change bundle only.`);
  lines.push(`- Match strength is not a calibrated probability.`);
  lines.push(`- ChangeProof does not approve or block merges autonomously.`);
  lines.push(`- Deterministic rules may produce false positives for refactors and chores.`);
  lines.push(`- Human review is required for all "needs_human_review" findings.`);
  lines.push(``);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// JSON evidence export
// ---------------------------------------------------------------------------

export interface JsonEvidenceReport {
  schemaVersion: '1.0.0';
  run: AnalysisResult['runMetadata'];
  summary: AnalysisResult['summary'];
  requirements: AnalysisResult['requirements'];
  changedArtifacts: AnalysisResult['changedArtifacts'];
  testArtifacts: AnalysisResult['testArtifacts'];
  evidenceLinks: AnalysisResult['evidenceLinks'];
  findings: AnalysisResult['findings'];
  humanDecisions: ReviewDecision[];
  disclaimer: string;
}

export function generateJsonReport(
  result: AnalysisResult,
  decisions: ReviewDecision[],
): JsonEvidenceReport {
  return {
    schemaVersion: '1.0.0',
    run: result.runMetadata,
    summary: result.summary,
    requirements: result.requirements,
    changedArtifacts: result.changedArtifacts,
    testArtifacts: result.testArtifacts,
    evidenceLinks: result.evidenceLinks,
    findings: result.findings,
    humanDecisions: decisions,
    disclaimer:
      'ChangeProof does not approve or block merges autonomously. This report is for human review only.',
  };
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function groupBy<T, K>(arr: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of arr) {
    const key = keyFn(item);
    const group = map.get(key);
    if (group) group.push(item);
    else map.set(key, [item]);
  }
  return map;
}
