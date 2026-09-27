# Bob Session 03 — Analysis Engine

**Date:** 2025  
**Handoff:** BOB_HANDOFF_03_ANALYSIS_ENGINE.md  
**Mode:** Agent

## What was built

### packages/ingestion

- `bundle.ts` — `loadBundleFromDirectory`, `buildBundleFromMap`, `computeFingerprint`, `normalizePath`, `isPathSafe`
- Path traversal rejection, file count/size limits, blocked filenames, ignored dirs
- 14 unit tests

### packages/parsers

- `requirements-parser.ts` — REQ-NNN heading detection, acceptance criteria extraction
- `diff-parser.ts` — unified diff parsing, symbol extraction from hunks
- `test-parser.ts` — describe/it/test name extraction, import symbol extraction
- `ts-source-parser.ts` — export extraction, keyword normalization
- `doc-parser.ts` — route detection, config field extraction
- 28 unit tests across 4 test files

### packages/analysis

- `matcher.ts` — deterministic evidence link builder using 5-method priority chain
- `rules/index.ts` — all 8 required rules as pure functions
- `engine.ts` — `analyzeBundle` orchestration function
- 37 unit tests including 12 fixture acceptance tests

## Rule implementation status

| Rule                       | Implemented | Tested |
| -------------------------- | ----------- | ------ |
| REQ_WITHOUT_CODE           | ✅          | ✅     |
| CODE_WITHOUT_REQ           | ✅          | ✅     |
| REQ_WITHOUT_TEST           | ✅          | ✅     |
| PUBLIC_API_CHANGED         | ✅          | ✅     |
| CONFIG_OR_SCHEMA_CHANGED   | ✅          | ✅     |
| TEST_GAP_ON_CHANGED_SYMBOL | ✅          | ✅     |
| DOC_STALE_OR_MISSING       | ✅          | ✅     |
| AMBIGUOUS_TRACEABILITY     | ✅          | ✅     |

## Fixture acceptance tests (engine.fixture.test.ts)

All 12 tests pass on the synthetic fixture:

- Detects all 5 requirements
- Detects all changed artifacts from the patch
- Deterministic fingerprint and findings
- REQ_WITHOUT_CODE fires for REQ-005
- CODE_WITHOUT_REQ fires for ADMIN_ROLE_HEADER
- TEST_GAP fires for processBulkImport
- PUBLIC_API_CHANGED fires for csv.exporter
- DOC_STALE fires for rounding method
- requireAuthenticated produces no high-severity finding (case 9)
- Summary counts consistent with findings array

## Acceptance check results

| Check                                            | Result |
| ------------------------------------------------ | ------ |
| `pnpm build`                                     | ✅     |
| `pnpm typecheck`                                 | ✅     |
| `pnpm lint`                                      | ✅     |
| `pnpm format:check`                              | ✅     |
| `pnpm test` (97 total)                           | ✅     |
| Fixture loads without network                    | ✅     |
| Deterministic on repeated runs                   | ✅     |
| No code/tests executed                           | ✅     |
| Analysis engine has no React/Fastify/SQLite deps | ✅     |

## IBM Bob capabilities used

- Agent mode for parallel package implementation
- Subagent-style focused fixes for lint/type errors

## Blockers

None. Ready for Handoff 04.
