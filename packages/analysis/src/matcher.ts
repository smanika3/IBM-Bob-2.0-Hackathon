import type {
  EvidenceLink,
  Requirement,
  ChangedArtifact,
  TestArtifact,
  MatchMethod,
  MatchStrength,
} from '@changeproof/domain';
import { extractRequirementIds } from '@changeproof/parsers';
import { extractKeywords } from '@changeproof/parsers';

// ---------------------------------------------------------------------------
// Deterministic matching engine
// ---------------------------------------------------------------------------

let linkCounter = 0;
function nextLinkId(): string {
  linkCounter++;
  return `link-${String(linkCounter).padStart(6, '0')}`;
}

export function resetLinkCounter(): void {
  linkCounter = 0;
}

interface MatchResult {
  method: MatchMethod;
  strength: MatchStrength;
  explanation: string;
}

// ---------------------------------------------------------------------------
// Requirement → Changed Artifact matching
// ---------------------------------------------------------------------------

/**
 * Attempt to link a requirement to a changed artifact using the ordered
 * matching strategy from the handoff.
 *
 * Order:
 * 1. Explicit requirement ID in file content
 * 2. Explicit issue/reference token
 * 3. Direct file reference in requirement body
 * 4. Symbol overlap (requirement body mentions symbol names)
 * 5. Path overlap (file path segments match requirement title words)
 * 6. Keyword overlap
 */
export function matchRequirementToArtifact(
  req: Requirement,
  artifact: ChangedArtifact,
  artifactContent: string,
): MatchResult | null {
  // 1. Explicit requirement ID in file content
  const mentionedIds = extractRequirementIds(artifactContent);
  if (mentionedIds.includes(req.id)) {
    return {
      method: 'explicit_req_id',
      strength: 'strong',
      explanation: `${req.id} is explicitly mentioned in ${artifact.filePath}`,
    };
  }

  // 2. Direct file reference in requirement body
  const bodyLower = (req.body + ' ' + req.title).toLowerCase();
  const pathParts = artifact.filePath.toLowerCase().split('/');
  const fileBase = pathParts[pathParts.length - 1]?.replace(/\.[^.]+$/, '') ?? '';
  if (fileBase.length > 3 && bodyLower.includes(fileBase)) {
    return {
      method: 'direct_file_ref',
      strength: 'strong',
      explanation: `Requirement body mentions "${fileBase}" which matches file path ${artifact.filePath}`,
    };
  }

  // 3. Symbol overlap — req body mentions one of the artifact's symbols
  const symbols = artifact.symbols ?? [];
  const symbolMatch = symbols.find((sym) => {
    const symLower = sym.toLowerCase();
    return symLower.length > 4 && bodyLower.includes(symLower);
  });
  if (symbolMatch) {
    return {
      method: 'symbol_overlap',
      strength: 'moderate',
      explanation: `Requirement body mentions symbol "${symbolMatch}" found in ${artifact.filePath}`,
    };
  }

  // 4. Path overlap
  const titleWords = req.title
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length >= 3);
  const pathOverlap = titleWords.filter((w) =>
    pathParts.some((p) => p.includes(w) || w.includes(p.replace(/\.[^.]+$/, ''))),
  );
  if (pathOverlap.length >= 1) {
    return {
      method: 'path_overlap',
      strength: 'moderate',
      explanation: `Requirement title words [${pathOverlap.join(', ')}] overlap with path segments in ${artifact.filePath}`,
    };
  }

  // 5. Keyword overlap
  const reqKeywords = new Set(extractKeywords(req.title + ' ' + req.body));
  const fileKeywords = new Set(extractKeywords(artifact.filePath + ' ' + symbols.join(' ')));
  const overlap = [...reqKeywords].filter((k) => fileKeywords.has(k));
  if (overlap.length >= 2) {
    return {
      method: 'keyword_overlap',
      strength: 'weak',
      explanation: `Keyword overlap [${overlap.slice(0, 3).join(', ')}] between requirement and ${artifact.filePath}`,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Requirement → Test Artifact matching
// ---------------------------------------------------------------------------

export function matchRequirementToTest(req: Requirement, test: TestArtifact): MatchResult | null {
  // 1. Explicit REQ ID in test's referenced IDs
  if (test.referencedRequirementIds.includes(req.id)) {
    return {
      method: 'explicit_req_id',
      strength: 'strong',
      explanation: `Test "${test.testName}" in ${test.filePath} explicitly references ${req.id}`,
    };
  }

  // 2. Test name matches requirement title words
  const titleWords = req.title
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);
  const testNameLower = test.testName.toLowerCase();
  const nameMatches = titleWords.filter((w) => testNameLower.includes(w));
  if (nameMatches.length >= 2) {
    return {
      method: 'test_name_match',
      strength: 'moderate',
      explanation: `Test name matches requirement words [${nameMatches.join(', ')}]`,
    };
  }

  // 3. Path overlap
  const reqPathHints = req.body.match(/`src\/[\w/.-]+`/g) ?? [];
  for (const hint of reqPathHints) {
    const clean = hint.replace(/`/g, '');
    if (test.filePath.includes(clean.split('/').pop() ?? '')) {
      return {
        method: 'path_overlap',
        strength: 'moderate',
        explanation: `Test file path overlaps with requirement source hint "${clean}"`,
      };
    }
  }

  // 4. Keyword overlap
  const reqKeywords = new Set(extractKeywords(req.title + ' ' + req.body));
  const testKeywords = new Set(
    extractKeywords(test.testName + ' ' + test.referencedSymbols.join(' ')),
  );
  const overlap = [...reqKeywords].filter((k) => testKeywords.has(k));
  if (overlap.length >= 2) {
    return {
      method: 'keyword_overlap',
      strength: 'weak',
      explanation: `Keyword overlap [${overlap.slice(0, 3).join(', ')}] between requirement and test`,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Changed Artifact → Test matching (for TEST_GAP detection)
// ---------------------------------------------------------------------------

export function matchArtifactToTest(
  artifact: ChangedArtifact,
  test: TestArtifact,
): MatchResult | null {
  // 1. Test imports from artifact's path
  const artifactBase =
    artifact.filePath
      .split('/')
      .pop()
      ?.replace(/\.[^.]+$/, '') ?? '';
  if (
    artifactBase.length > 3 &&
    test.referencedSymbols.some(
      (s) =>
        artifact.symbols?.includes(s) ||
        test.filePath.toLowerCase().includes(artifactBase.toLowerCase()),
    )
  ) {
    return {
      method: 'symbol_overlap',
      strength: 'strong',
      explanation: `Test "${test.testName}" references symbols from ${artifact.filePath}`,
    };
  }

  // 2. Path-based match: tests/orders/x.test.ts → src/orders/x.ts
  const testPathNorm = test.filePath.toLowerCase().replace('tests/', '').replace('.test.', '.');
  const artPathNorm = artifact.filePath.toLowerCase().replace('src/', '');
  if (testPathNorm === artPathNorm || testPathNorm.includes(artifactBase.toLowerCase())) {
    return {
      method: 'path_overlap',
      strength: 'moderate',
      explanation: `Test file path "${test.filePath}" corresponds to artifact "${artifact.filePath}"`,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Build evidence links
// ---------------------------------------------------------------------------

export function buildReqToArtifactLinks(
  requirements: Requirement[],
  artifacts: ChangedArtifact[],
  artifactContents: Map<string, string>,
): EvidenceLink[] {
  const links: EvidenceLink[] = [];

  for (const req of requirements) {
    for (const artifact of artifacts) {
      const content = artifactContents.get(artifact.filePath) ?? '';
      const match = matchRequirementToArtifact(req, artifact, content);
      if (match) {
        links.push({
          id: nextLinkId(),
          fromType: 'requirement',
          fromId: req.id,
          toType: 'changed_artifact',
          toId: artifact.id,
          method: match.method,
          strength: match.strength,
          explanation: match.explanation,
          sourceLocation: { filePath: artifact.filePath },
        });
      }
    }
  }

  return links;
}

export function buildReqToTestLinks(
  requirements: Requirement[],
  tests: TestArtifact[],
): EvidenceLink[] {
  const links: EvidenceLink[] = [];

  for (const req of requirements) {
    for (const test of tests) {
      const match = matchRequirementToTest(req, test);
      if (match) {
        links.push({
          id: nextLinkId(),
          fromType: 'requirement',
          fromId: req.id,
          toType: 'test_artifact',
          toId: test.id,
          method: match.method,
          strength: match.strength,
          explanation: match.explanation,
          sourceLocation: { filePath: test.filePath },
        });
      }
    }
  }

  return links;
}

export function buildArtifactToTestLinks(
  artifacts: ChangedArtifact[],
  tests: TestArtifact[],
): EvidenceLink[] {
  const links: EvidenceLink[] = [];

  for (const artifact of artifacts) {
    if (artifact.isTest || artifact.isDocumentation) continue;
    for (const test of tests) {
      const match = matchArtifactToTest(artifact, test);
      if (match) {
        links.push({
          id: nextLinkId(),
          fromType: 'changed_artifact',
          fromId: artifact.id,
          toType: 'test_artifact',
          toId: test.id,
          method: match.method,
          strength: match.strength,
          explanation: match.explanation,
          sourceLocation: { filePath: test.filePath },
        });
      }
    }
  }

  return links;
}
