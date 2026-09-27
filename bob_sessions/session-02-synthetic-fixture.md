# Bob Session 02 — Synthetic Fixture

**Date:** 2025  
**Handoff:** BOB_HANDOFF_02_SYNTHETIC_FIXTURE.md  
**Mode:** Agent

## What was built

`fixtures/sample-checkout/` — a fully self-contained synthetic TypeScript order-management project with:

- `requirements.md` — 5 requirements (REQ-001..REQ-005) with acceptance criteria and source locations
- `architecture.md` — public API surface and configuration documentation
- `change.patch` — realistic unified diff covering all 9 seeded cases
- `src/orders/order.service.ts` — REQ-001, REQ-003
- `src/orders/order.types.ts` — shared types and error classes
- `src/orders/bulk-import.handler.ts` — REQ-005 partial (seeded gap)
- `src/export/csv.exporter.ts` — REQ-002
- `src/tax/tax.calculator.ts` + `tax.config.ts` — REQ-004
- `src/auth/auth.middleware.ts` — REQ-005 admin middleware
- `tests/orders/order.service.test.ts` — REQ-001, REQ-003
- `tests/export/csv.exporter.test.ts` — REQ-002 (gap on AC-002-3)
- `tests/tax/tax.calculator.test.ts` — REQ-004
- `tests/auth/auth.middleware.test.ts` — REQ-005 auth only (no bulk import test)
- `docs/api.md` — intentionally stale on rounding method
- `expected-findings.json` — test oracle with 8 expected findings
- `NOTICE.md` — synthetic data declaration
- `docs/fixture-cases.md` — explanation of all 9 seeded cases

## 9 seeded cases

| #   | Case                                | Rule                       |
| --- | ----------------------------------- | -------------------------- |
| 1   | REQ-001 mostly verified             | (positive)                 |
| 2   | No test for malformed rows          | TEST_GAP_ON_CHANGED_SYMBOL |
| 3   | Public export signature changed     | PUBLIC_API_CHANGED         |
| 4   | Rounding method changed, docs stale | DOC_STALE_OR_MISSING       |
| 5   | REQ-005 no implementation evidence  | REQ_WITHOUT_CODE           |
| 6   | ADMIN_ROLE_HEADER no req link       | CODE_WITHOUT_REQ           |
| 7   | processBulkImport no test           | TEST_GAP_ON_CHANGED_SYMBOL |
| 8   | REQ-004 ambiguous multi-match       | AMBIGUOUS_TRACEABILITY     |
| 9   | requireAuthenticated low-risk       | informational only         |

## IBM Bob capabilities used

- Agent mode for structured fixture authoring
- Document understanding of handoff to derive seeded case requirements

## Acceptance check results

| Check                                                         | Result                                  |
| ------------------------------------------------------------- | --------------------------------------- |
| All 5 requirements have stable IDs                            | ✅                                      |
| Patch references realistic paths and line ranges              | ✅                                      |
| At least one test maps to a requirement                       | ✅ (REQ-001, REQ-002, REQ-003, REQ-004) |
| expected-findings.json identifies rule IDs and evidence paths | ✅                                      |
| No secrets in fixture                                         | ✅                                      |
| NOTICE.md present                                             | ✅                                      |
| pnpm test still passes (18 tests)                             | ✅                                      |

## Blockers

None. Ready for Handoff 03.
