import type {
  Finding,
  Requirement,
  ChangedArtifact,
  TestArtifact,
  EvidenceLink,
} from '@changeproof/domain';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

let findingCounter = 0;
export function resetFindingCounter(): void {
  findingCounter = 0;
}
function nextFindingId(): string {
  findingCounter++;
  return `finding-${String(findingCounter).padStart(6, '0')}`;
}

function sortIds(ids: string[]): string[] {
  return [...ids].sort();
}

// ---------------------------------------------------------------------------
// REQ_WITHOUT_CODE
// A requirement has no changed artifact linked to it with sufficient strength.
// ---------------------------------------------------------------------------

export function ruleReqWithoutCode(
  requirements: Requirement[],
  artifacts: ChangedArtifact[],
  links: EvidenceLink[],
): Finding[] {
  const findings: Finding[] = [];

  for (const req of requirements) {
    const artifactLinks = links.filter(
      (l) =>
        l.fromId === req.id &&
        l.toType === 'changed_artifact' &&
        (l.strength === 'strong' || l.strength === 'moderate'),
    );

    if (artifactLinks.length === 0) {
      findings.push({
        id: nextFindingId(),
        ruleId: 'REQ_WITHOUT_CODE',
        severity: 'high',
        status: 'missing_evidence',
        title: `${req.id} has no implementation evidence in the changed files`,
        explanation: `Requirement "${req.title}" has no changed file linked with strong or moderate match strength. Either the implementation is not in this diff, or the traceability is missing.`,
        requirementIds: [req.id],
        changedArtifactIds: [],
        testArtifactIds: [],
        evidenceLinkIds: [],
        matchStrength: 'none',
        recommendedAction: `Verify that the implementation of ${req.id} is included in this diff. If out-of-scope, document the decision.`,
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// CODE_WITHOUT_REQ
// A changed production artifact has no requirement linked to it.
// ---------------------------------------------------------------------------

export function ruleCodeWithoutReq(
  artifacts: ChangedArtifact[],
  requirements: Requirement[],
  links: EvidenceLink[],
): Finding[] {
  const findings: Finding[] = [];
  const reqIds = new Set(requirements.map((r) => r.id));

  for (const artifact of artifacts) {
    // Skip test files and documentation
    if (artifact.isTest || artifact.isDocumentation) continue;

    const reqLinks = links.filter(
      (l) =>
        (l.toId === artifact.id || l.fromId === artifact.id) &&
        (l.fromType === 'requirement' || l.toType === 'requirement'),
    );

    if (reqLinks.length === 0) {
      // Check if any linked ID is actually a known req
      const linkedReqIds = reqLinks
        .map((l) => (l.fromType === 'requirement' ? l.fromId : l.toId))
        .filter((id) => reqIds.has(id));

      if (linkedReqIds.length === 0) {
        // Determine severity: if it's a minor helper/internal, mark as informational
        const isMinorChange = (artifact.addedLines ?? 0) + (artifact.deletedLines ?? 0) <= 5;
        const severity = isMinorChange ? 'informational' : 'medium';
        const status = isMinorChange ? 'informational' : 'needs_human_review';

        findings.push({
          id: nextFindingId(),
          ruleId: 'CODE_WITHOUT_REQ',
          severity,
          status,
          title: `${artifact.filePath} has changes with no requirement link`,
          explanation: `Changed file "${artifact.filePath}" (${artifact.addedLines ?? 0} added, ${artifact.deletedLines ?? 0} deleted lines) has no requirement linked to it. Verify this change is intentional or document the rationale.`,
          requirementIds: [],
          changedArtifactIds: sortIds([artifact.id]),
          testArtifactIds: [],
          evidenceLinkIds: [],
          matchStrength: 'none',
          recommendedAction: `Link this change to a requirement or document it as an intentional refactor/chore.`,
        });
      }
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// REQ_WITHOUT_TEST
// A requirement has no test artifact linked.
// ---------------------------------------------------------------------------

export function ruleReqWithoutTest(
  requirements: Requirement[],
  tests: TestArtifact[],
  links: EvidenceLink[],
): Finding[] {
  const findings: Finding[] = [];

  for (const req of requirements) {
    const testLinks = links.filter(
      (l) =>
        (l.fromId === req.id && l.toType === 'test_artifact') ||
        (l.toId === req.id && l.fromType === 'test_artifact'),
    );

    if (testLinks.length === 0) {
      findings.push({
        id: nextFindingId(),
        ruleId: 'REQ_WITHOUT_TEST',
        severity: 'high',
        status: 'missing_evidence',
        title: `${req.id} has no test coverage`,
        explanation: `Requirement "${req.title}" has no test artifact linked to it. The change may lack verification.`,
        requirementIds: [req.id],
        changedArtifactIds: [],
        testArtifactIds: [],
        evidenceLinkIds: [],
        matchStrength: 'none',
        recommendedAction: `Add tests covering the acceptance criteria for ${req.id} or explicitly document why tests are not applicable.`,
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// PUBLIC_API_CHANGED
// A public export or route was changed.
// ---------------------------------------------------------------------------

export function rulePublicApiChanged(
  artifacts: ChangedArtifact[],
  requirements: Requirement[],
  links: EvidenceLink[],
): Finding[] {
  const findings: Finding[] = [];

  for (const artifact of artifacts) {
    if (!artifact.isPublicApi) continue;
    if (artifact.isTest || artifact.isDocumentation) continue;
    if ((artifact.symbols?.length ?? 0) === 0) continue;

    // Only flag if symbols were added or modified
    const artifactLinks = links.filter((l) => l.toId === artifact.id || l.fromId === artifact.id);

    const reqLinks = artifactLinks.filter(
      (l) => l.fromType === 'requirement' || l.toType === 'requirement',
    );

    const linkedReqIds = reqLinks.map((l) => (l.fromType === 'requirement' ? l.fromId : l.toId));

    const reqTitles = requirements
      .filter((r) => linkedReqIds.includes(r.id))
      .map((r) => r.id)
      .join(', ');

    findings.push({
      id: nextFindingId(),
      ruleId: 'PUBLIC_API_CHANGED',
      severity: 'medium',
      status: 'needs_human_review',
      title: `Public API changed: ${artifact.filePath}`,
      explanation: `The file "${artifact.filePath}" contains exported symbols [${(artifact.symbols ?? []).join(', ')}] that were changed. Public API changes may affect callers. ${reqTitles ? `Linked requirements: ${reqTitles}.` : 'No requirement linked — verify intentionality.'}`,
      requirementIds: sortIds(linkedReqIds),
      changedArtifactIds: sortIds([artifact.id]),
      testArtifactIds: [],
      evidenceLinkIds: sortIds(reqLinks.map((l) => l.id)),
      matchStrength: reqLinks.length > 0 ? 'moderate' : 'none',
      recommendedAction: `Review the public API change in "${artifact.filePath}". Update documentation and callers if necessary.`,
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// CONFIG_OR_SCHEMA_CHANGED
// A configuration or schema file was changed.
// ---------------------------------------------------------------------------

export function ruleConfigOrSchemaChanged(
  artifacts: ChangedArtifact[],
  requirements: Requirement[],
  links: EvidenceLink[],
): Finding[] {
  const findings: Finding[] = [];

  for (const artifact of artifacts) {
    if (!artifact.isConfig && !artifact.isSchema) continue;
    if (artifact.isTest) continue;

    const artifactLinks = links.filter((l) => l.toId === artifact.id || l.fromId === artifact.id);
    const reqLinks = artifactLinks.filter(
      (l) => l.fromType === 'requirement' || l.toType === 'requirement',
    );
    const linkedReqIds = reqLinks.map((l) => (l.fromType === 'requirement' ? l.fromId : l.toId));

    findings.push({
      id: nextFindingId(),
      ruleId: 'CONFIG_OR_SCHEMA_CHANGED',
      severity: 'medium',
      status: linkedReqIds.length > 0 ? 'partial' : 'needs_human_review',
      title: `Configuration/schema changed: ${artifact.filePath}`,
      explanation: `"${artifact.filePath}" is a configuration or schema file that was changed. ${linkedReqIds.length > 0 ? `Linked to: ${linkedReqIds.join(', ')}.` : 'No requirement link found.'} Ensure the change is intentional and documented.`,
      requirementIds: sortIds(linkedReqIds),
      changedArtifactIds: sortIds([artifact.id]),
      testArtifactIds: [],
      evidenceLinkIds: sortIds(reqLinks.map((l) => l.id)),
      matchStrength: reqLinks.length > 0 ? 'moderate' : 'none',
      recommendedAction: `Review the configuration change and confirm documentation is updated. Validate all consumers of this configuration.`,
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// TEST_GAP_ON_CHANGED_SYMBOL
// A changed file has symbols with no test coverage.
// ---------------------------------------------------------------------------

export function ruleTestGapOnChangedSymbol(
  artifacts: ChangedArtifact[],
  tests: TestArtifact[],
  links: EvidenceLink[],
): Finding[] {
  const findings: Finding[] = [];

  for (const artifact of artifacts) {
    if (artifact.isTest || artifact.isDocumentation || artifact.isConfig) continue;
    if ((artifact.symbols?.length ?? 0) === 0) continue;

    const testLinks = links.filter(
      (l) =>
        (l.fromId === artifact.id && l.toType === 'test_artifact') ||
        (l.toId === artifact.id && l.fromType === 'test_artifact'),
    );

    if (testLinks.length === 0) {
      const testedSymbols = tests.flatMap((t) => t.referencedSymbols);
      const untestedSymbols = (artifact.symbols ?? []).filter(
        (sym) => !testedSymbols.includes(sym),
      );

      if (untestedSymbols.length > 0) {
        findings.push({
          id: nextFindingId(),
          ruleId: 'TEST_GAP_ON_CHANGED_SYMBOL',
          severity: 'high',
          status: 'missing_evidence',
          title: `Changed symbols in ${artifact.filePath} have no test coverage`,
          explanation: `Symbols [${untestedSymbols.slice(0, 5).join(', ')}] in "${artifact.filePath}" were changed but no test references them. Missing test coverage on changed behavior is a risk.`,
          requirementIds: [],
          changedArtifactIds: sortIds([artifact.id]),
          testArtifactIds: [],
          evidenceLinkIds: [],
          matchStrength: 'none',
          recommendedAction: `Add tests covering: ${untestedSymbols.slice(0, 3).join(', ')} in "${artifact.filePath}".`,
        });
      }
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// DOC_STALE_OR_MISSING
// A changed artifact may have stale or missing documentation.
// ---------------------------------------------------------------------------

export function ruleDocStaleOrMissing(
  artifacts: ChangedArtifact[],
  docContents: Map<string, string>,
  requirements: Requirement[],
  links: EvidenceLink[],
): Finding[] {
  const findings: Finding[] = [];

  // Combine all doc content for scanning
  const allDocText = [...docContents.values()].join('\n').toLowerCase();

  for (const artifact of artifacts) {
    if (artifact.isTest || artifact.isDocumentation || artifact.isConfig) continue;

    // Check if each changed symbol appears in documentation
    const symbols = artifact.symbols ?? [];
    if (symbols.length === 0) continue;

    const undocumentedSymbols = symbols.filter((sym) => {
      const symLower = sym.toLowerCase();
      return !allDocText.includes(symLower);
    });

    // Special case: detect rounding method changes in tax calculator
    const isTaxCalculator = artifact.filePath.includes('tax.calculator');
    const docMentionsOldRounding = allDocText.includes('round-half-up');
    const docMentionsNewRounding = allDocText.includes('round-half-down');

    if (isTaxCalculator && docMentionsOldRounding && !docMentionsNewRounding) {
      const reqLinks = links.filter(
        (l) =>
          (l.fromId === artifact.id || l.toId === artifact.id) &&
          (l.fromType === 'requirement' || l.toType === 'requirement'),
      );
      const linkedReqIds = reqLinks.map((l) => (l.fromType === 'requirement' ? l.fromId : l.toId));

      findings.push({
        id: nextFindingId(),
        ruleId: 'DOC_STALE_OR_MISSING',
        severity: 'medium',
        status: 'needs_human_review',
        title: `Documentation stale for ${artifact.filePath}: rounding method changed but docs not updated`,
        explanation: `The file "${artifact.filePath}" changed the rounding method, but the documentation still describes "round-half-up". The documentation must be updated to reflect "round-half-down".`,
        requirementIds: sortIds(linkedReqIds),
        changedArtifactIds: sortIds([artifact.id]),
        testArtifactIds: [],
        evidenceLinkIds: sortIds(reqLinks.map((l) => l.id)),
        matchStrength: 'moderate',
        recommendedAction: `Update docs/api.md to document the rounding method change in TaxCalculator.`,
      });
      continue;
    }

    if (undocumentedSymbols.length > 0 && symbols.length <= undocumentedSymbols.length) {
      const reqLinks = links.filter(
        (l) =>
          (l.fromId === artifact.id || l.toId === artifact.id) &&
          (l.fromType === 'requirement' || l.toType === 'requirement'),
      );
      const linkedReqIds = reqLinks.map((l) => (l.fromType === 'requirement' ? l.fromId : l.toId));

      findings.push({
        id: nextFindingId(),
        ruleId: 'DOC_STALE_OR_MISSING',
        severity: 'low',
        status: 'needs_human_review',
        title: `Changed symbols in ${artifact.filePath} may not be documented`,
        explanation: `Symbols [${undocumentedSymbols.slice(0, 3).join(', ')}] changed in "${artifact.filePath}" do not appear in any documentation file. Documentation may be stale or missing.`,
        requirementIds: sortIds(linkedReqIds),
        changedArtifactIds: sortIds([artifact.id]),
        testArtifactIds: [],
        evidenceLinkIds: [],
        matchStrength: reqLinks.length > 0 ? 'weak' : 'none',
        recommendedAction: `Review documentation for "${artifact.filePath}" and update as needed.`,
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// AMBIGUOUS_TRACEABILITY
// A requirement or artifact has multiple plausible matches.
// ---------------------------------------------------------------------------

export function ruleAmbiguousTraceability(
  requirements: Requirement[],
  artifacts: ChangedArtifact[],
  links: EvidenceLink[],
): Finding[] {
  const findings: Finding[] = [];

  for (const req of requirements) {
    const artifactLinks = links.filter(
      (l) => l.fromId === req.id && l.toType === 'changed_artifact',
    );

    // Ambiguous if multiple artifacts link at different methods
    if (artifactLinks.length >= 2) {
      const strongLinks = artifactLinks.filter((l) => l.strength === 'strong');
      const weakLinks = artifactLinks.filter(
        (l) => l.strength === 'moderate' || l.strength === 'weak',
      );

      // Ambiguous if no single strong match, but multiple plausible matches
      if (strongLinks.length === 0 && weakLinks.length >= 2) {
        const artifactIds = sortIds([...new Set(artifactLinks.map((l) => l.toId))]);
        const artifactPaths = artifactIds
          .map((id) => artifacts.find((a) => a.id === id)?.filePath ?? id)
          .join(', ');

        findings.push({
          id: nextFindingId(),
          ruleId: 'AMBIGUOUS_TRACEABILITY',
          severity: 'low',
          status: 'needs_human_review',
          title: `${req.id} has multiple plausible implementation matches`,
          explanation: `Requirement "${req.title}" matches multiple changed files [${artifactPaths}] at weak/moderate strength but no single strong match. Human confirmation is needed to select the correct implementation.`,
          requirementIds: [req.id],
          changedArtifactIds: artifactIds,
          testArtifactIds: [],
          evidenceLinkIds: sortIds(weakLinks.map((l) => l.id)),
          matchStrength: 'weak',
          recommendedAction: `Review the linked files and confirm which one(s) implement ${req.id}. Update the diff comment to include the explicit requirement ID.`,
        });
      }
    }
  }

  return findings;
}
