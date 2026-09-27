# ChangeProof Evidence Model

ChangeProof implements an **evidence-first** data and traceability model. Rather than computing opaque percentage scores or relying on stochastic LLM inferences, ChangeProof establishes verifiable, auditable relationships between requirements, code modifications, and test suites.

---

## 1. Core Entities

### Requirement (`packages/domain/src/schemas.ts`)

A documented product specification, compliance standard, or acceptance threshold.

- `id`: Stable identifier (e.g., `REQ-001`).
- `title`: Concise summary of the requirement.
- `body`: Detailed specification text.
- `acceptanceCriteria`: Array of discrete, verifiable criteria (`AC-001-1`, `AC-001-2`).
- `sourceLocation`: File path and line range where the requirement is specified.
- `tags`: Domain taxonomy labels (e.g., `['orders', 'validation', 'tax']`).

### ChangedArtifact (`packages/domain/src/schemas.ts`)

A source, test, or documentation file modified within the pull-request diff.

- `id`: Deterministic artifact identifier (e.g., `artifact-1`).
- `filePath`: Repository-relative normalized path.
- `changeType`: `added` | `modified` | `deleted` | `renamed`.
- `symbols`: Array of functions, classes, types, and interfaces touched in the change.
- `addedLines` / `deletedLines`: Line count deltas.
- `hunks`: Unified diff hunks (`oldStart`, `oldCount`, `newStart`, `newCount`, `lines`).
- `flags`:
  - `isPublicApi`: Exported symbol or API route modified.
  - `isConfig`: Configuration file touched (e.g., `.env`, `*.config.ts`).
  - `isSchema`: Database migration or data transfer schema modified.
  - `isTest`: Unit, contract, or end-to-end test file.
  - `isDocumentation`: Markdown, OpenAPI, or architecture guide.

### TestArtifact (`packages/domain/src/schemas.ts`)

An automated test case extracted from test files.

- `id`: Deterministic test identifier (e.g., `test-1`).
- `filePath`: Test suite file path.
- `testName`: Full describe/it/test name.
- `referencedSymbols`: Symbols imported or invoked by the test.
- `referencedRequirementIds`: Requirements explicitly cited in the test title or comments.
- `sourceLocation`: Line range within the test file.

### EvidenceLink (`packages/domain/src/schemas.ts`)

A directed, typed, explainable edge between two entities.

- `fromType`: `requirement` | `changed_artifact` | `test_artifact`.
- `fromId`: Source entity identifier.
- `toType`: `requirement` | `changed_artifact` | `test_artifact`.
- `toId`: Target entity identifier.
- `method`: Priority-ranked matching method used to form the link.
- `strength`: Categorical confidence (`strong` | `moderate` | `weak` | `none`).
- `explanation`: Human-readable description of why this link was established.
- `sourceLocation`: Precise file and line location supporting the link.

### Finding (`packages/domain/src/schemas.ts`)

A concrete risk, gap, or change impact flagged for human review.

- `ruleId`: Deterministic rule identifier (e.g., `TEST_GAP_ON_CHANGED_SYMBOL`).
- `severity`: `critical` | `high` | `medium` | `low` | `informational`.
- `status`: `verified` | `partial` | `missing_evidence` | `needs_human_review` | `informational`.
- `title`: Concise summary of the risk.
- `explanation`: Detailed evidence-based rationale.
- `requirementIds`: Linked requirements.
- `changedArtifactIds`: Linked changed files.
- `testArtifactIds`: Linked tests.
- `evidenceLinkIds`: Supporting evidence links.
- `matchStrength`: Lowest strength among linked evidence.
- `recommendedAction`: Prescriptive engineering remediation.

### ReviewDecision (`packages/domain/src/schemas.ts`)

An explicit human reviewer audit decision recorded for a finding.

- `findingId`: Finding being reviewed.
- `runId`: Analysis run identifier.
- `decision`: `accepted` | `deferred` | `rejected`.
- `rationale`: Reviewer's documented reasoning.
- `decidedBy`: Reviewer email or username.
- `decidedAt`: ISO timestamp.

---

## 2. Deterministic Matching Hierarchy

Evidence links are established through a strict 5-tier priority chain in `packages/analysis/src/matcher.ts`:

```
Tier 1: Explicit Requirement Identifier (explicit_req_id)
        ↳ Test or source code explicitly cites REQ-NNN
        ↳ Strength: STRONG

Tier 2: Direct File / Symbol Reference (direct_file_ref)
        ↳ Requirement or architecture doc explicitly names the modified file/class
        ↳ Strength: STRONG

Tier 3: AST Exported Symbol Overlap (symbol_overlap)
        ↳ Test imports or calls the exact changed symbol from the diff hunk
        ↳ Strength: STRONG

Tier 4: Path & Directory Conventions (path_convention)
        ↳ Tests located in matching mirror path (e.g., src/orders -> tests/orders)
        ↳ Strength: MODERATE

Tier 5: Lexical Keyword Overlap (keyword_overlap)
        ↳ Normalized semantic keywords appear in both requirement and symbol names
        ↳ Strength: WEAK (or NONE if below threshold)
```

---

## 3. Why No Probabilistic AI Scores?

1. **Auditability:** Compliance, safety, and security reviews require explainable evidence. An AI confidence score (e.g., _"91% ready"_) cannot be cross-examined or tested in CI.
2. **Reproducibility:** Two runs over identical commits must produce byte-for-byte identical fingerprints and findings.
3. **Accountability:** ChangeProof informs human judgment; it never autonomously approves or blocks merges.
