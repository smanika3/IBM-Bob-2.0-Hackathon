# ChangeProof — Analysis Rules

This document describes each deterministic rule, its matching logic, expected findings, and known limitations.

---

## REQ_WITHOUT_CODE

**Severity:** high  
**Status:** missing_evidence

Fires when a requirement has no changed artifact linked to it with strong or moderate match strength.

### Detection logic

1. For each requirement, find all evidence links where `fromId = req.id` and `toType = changed_artifact`.
2. If no link with `strength = strong | moderate` exists, fire the finding.

### Example

REQ-005 has no changed file containing an explicit `REQ-005` comment or a direct path reference to the admin enforcement handler. ChangeProof fires this finding.

### Limitations

- Does not detect implementations in files outside the diff.
- Only matches against the change bundle provided — existing code is not scanned.

---

## CODE_WITHOUT_REQ

**Severity:** medium (informational for minor changes ≤ 5 lines)  
**Status:** needs_human_review

Fires when a changed production file has no requirement linked to it.

### Detection logic

1. For each non-test, non-doc changed artifact, check for evidence links to any requirement.
2. If none exist, fire. Minor changes (≤5 total lines) are classified informational.

### Example

`ADMIN_ROLE_HEADER` was added to `auth.middleware.ts` but no requirement mentions this symbol. ChangeProof fires this finding.

### Limitations

- Internal refactors, chores, and dependency bumps will fire this rule. Human review is expected.

---

## REQ_WITHOUT_TEST

**Severity:** high  
**Status:** missing_evidence

Fires when a requirement has no test artifact linked to it.

### Detection logic

1. For each requirement, find evidence links to `test_artifact`.
2. If none exist, fire.

### Example

REQ-005 has no test file referencing its acceptance criteria or the bulk-import handler. ChangeProof fires this finding.

### Limitations

- Tests in the fixture but outside the diff are not detected unless they are in the bundle.

---

## PUBLIC_API_CHANGED

**Severity:** medium  
**Status:** needs_human_review

Fires when an exported function, class, or constant in a public-facing file was changed.

### Detection logic

1. For each changed artifact marked `isPublicApi = true` with at least one symbol.
2. Fire a finding with any linked requirement IDs.

### Example

`exportOrdersToCsv` changed its signature in `csv.exporter.ts`. ChangeProof fires this finding.

### Limitations

- Heuristic path-based detection — false positives possible for internal utilities.

---

## CONFIG_OR_SCHEMA_CHANGED

**Severity:** medium  
**Status:** partial | needs_human_review

Fires when a configuration or schema file was changed.

### Detection logic

1. For each changed artifact marked `isConfig = true` or `isSchema = true`.
2. Fire with any linked requirement IDs.

### Example

`tax.config.ts` contains configuration and was changed. ChangeProof fires this finding.

---

## TEST_GAP_ON_CHANGED_SYMBOL

**Severity:** high  
**Status:** missing_evidence

Fires when a changed file has exported symbols that are not referenced in any test.

### Detection logic

1. For each non-test, non-doc, non-config artifact with symbols.
2. Find all tests that reference any of those symbols.
3. If none found and no artifact→test link exists, fire.

### Example

`processBulkImport` was added to `bulk-import.handler.ts` but no test file imports or calls it. ChangeProof fires this finding.

### Limitations

- Symbol comparison is by name only — aliased imports are not detected.

---

## DOC_STALE_OR_MISSING

**Severity:** medium (low for general undocumented symbols)  
**Status:** needs_human_review

Fires when a changed behavior is not reflected in documentation.

### Detection logic

1. Detect rounding method change in tax calculator: if `docs/api.md` mentions `round-half-up` and the source changed to `round-half-down`, fire.
2. For other files: if all changed symbols are absent from all documentation files, fire a low-severity finding.

### Example

`tax.calculator.ts` changed the rounding method. `docs/api.md` still says `round-half-up`. ChangeProof fires this finding.

### Limitations

- Limited to keyword-level documentation scanning.
- Cannot verify semantic correctness of documentation.

---

## AMBIGUOUS_TRACEABILITY

**Severity:** low  
**Status:** needs_human_review

Fires when a requirement has multiple changed artifacts matching at weak/moderate strength with no single strong match.

### Detection logic

1. For each requirement, find all artifact links.
2. If ≥ 2 links exist and no link has `strength = strong`, fire.

### Example

REQ-004 matches both `tax.calculator.ts` and `tax.config.ts` via path overlap and keyword overlap. Neither has an explicit REQ-004 comment on both files simultaneously.

### Limitations

- May fire for legitimate shared implementations.
- Human confirmation is always expected for this rule.

---

## Matching method priority

| Priority | Method          | Strength |
| -------- | --------------- | -------- |
| 1        | explicit_req_id | strong   |
| 2        | direct_file_ref | strong   |
| 3        | symbol_overlap  | moderate |
| 4        | path_overlap    | moderate |
| 5        | keyword_overlap | weak     |

Match strength is not a calibrated probability. It reflects the reliability of the matching evidence.
