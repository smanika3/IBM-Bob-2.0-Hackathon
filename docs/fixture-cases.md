# Fixture Cases

Documents the nine deterministic seeded cases in `fixtures/sample-checkout/`.

## Overview

The synthetic order-management fixture is designed so that the ChangeProof analysis engine
produces a predictable, deterministic set of findings. Each case targets one rule.

---

## Case 1 — Mostly-verified requirement (REQ-001)

**Files:** `src/orders/order.service.ts`, `tests/orders/order.service.test.ts`

**Rule triggered:** None (positive case)

`createOrder` and `cancelOrder` are implemented in `order.service.ts` with explicit `REQ-001`
and `REQ-003` references. All three acceptance criteria in REQ-001 have corresponding test cases.
The analysis engine should produce a `verified` or `partial` evidence link — not a high-severity finding.

---

## Case 2 — Implementation without test for malformed rows (REQ-002 / AC-002-3)

**Files:** `src/orders/bulk-import.handler.ts`, `tests/export/csv.exporter.test.ts`

**Rule triggered:** `TEST_GAP_ON_CHANGED_SYMBOL`, `REQ_WITHOUT_TEST`

The `exportOrdersToCsv` function and `processBulkImport` function were changed. Tests cover
`includeCancelled` (AC-002-1 and AC-002-2) but no test exercises `processBulkImport` or the
malformed-row reporting path (AC-002-3). This is a deliberate test gap.

---

## Case 3 — Changed public export signature (REQ-002)

**Files:** `src/export/csv.exporter.ts`

**Rule triggered:** `PUBLIC_API_CHANGED`

`exportOrdersToCsv` had its signature changed to accept an `options: ExportOptions` parameter.
This is an exported function, making it a public API. ChangeProof should detect this as `PUBLIC_API_CHANGED`
and flag it for human review.

---

## Case 4 — Undocumented configuration change (REQ-004)

**Files:** `src/tax/tax.calculator.ts`, `docs/api.md`

**Rule triggered:** `DOC_STALE_OR_MISSING`

The rounding method was changed from `round-half-up` to `round-half-down` in `tax.calculator.ts`
and `tax.config.ts`. The `docs/api.md` file still documents `round-half-up`. The analysis engine
should detect the mismatch between the code change and the stale documentation.

---

## Case 5 — Unimplemented requirement (REQ-005)

**Files:** `src/orders/bulk-import.handler.ts`, `src/auth/auth.middleware.ts`

**Rule triggered:** `REQ_WITHOUT_CODE`

REQ-005 specifies that bulk import must be restricted to admin users and must report malformed rows.
The `bulk-import.handler.ts` file was added in the PR but contains no explicit REQ-005 reference
and does not enforce admin restriction within the handler itself. The analysis engine should detect
that REQ-005 has no confirmed implementation evidence.

---

## Case 6 — Changed code without requirement link (ADMIN_ROLE_HEADER)

**Files:** `src/auth/auth.middleware.ts`

**Rule triggered:** `CODE_WITHOUT_REQ`

The constant `ADMIN_ROLE_HEADER = 'x-changeproof-admin-role'` was added to `auth.middleware.ts`.
No requirement in `requirements.md` references this symbol, header name, or a matching keyword cluster.
The analysis engine should detect this as `CODE_WITHOUT_REQ`.

---

## Case 7 — Changed symbol with no test (processBulkImport)

**Files:** `src/orders/bulk-import.handler.ts`

**Rule triggered:** `TEST_GAP_ON_CHANGED_SYMBOL`

`processBulkImport` is a new function added in the PR. No test file references `processBulkImport`
or `bulk-import.handler`. The analysis engine should detect this as `TEST_GAP_ON_CHANGED_SYMBOL`.

---

## Case 8 — Ambiguous traceability (REQ-004)

**Files:** `src/tax/tax.calculator.ts`, `src/tax/tax.config.ts`

**Rule triggered:** `AMBIGUOUS_TRACEABILITY`

REQ-004 mentions "tax calculation", "rounds to cents", "jurisdiction rule", and "tax.config.ts".
Both `tax.calculator.ts` (explicit REQ-004 comment) and `tax.config.ts` (path overlap + keyword match)
are plausible matches. The analysis engine should flag this as `AMBIGUOUS_TRACEABILITY` and require
human confirmation, because two artifacts match the requirement at different strength levels.

---

## Case 9 — Unrelated low-risk change (requireAuthenticated)

**Files:** `src/auth/auth.middleware.ts`

**Rule triggered:** None at high/critical severity

`requireAuthenticated` received a minor internal change. It is covered by the auth middleware test
and is part of the existing auth chain. No requirement directly names this function, but its
low-risk nature means the analysis engine should classify any finding as `informational` rather
than `high` or `critical`. This is the false-positive guard case.

---

## Summary table

| Case | File(s)                                   | Rule                             | Expected severity |
| ---- | ----------------------------------------- | -------------------------------- | ----------------- |
| 1    | order.service.ts + tests                  | (positive — no high-sev finding) | —                 |
| 2    | bulk-import.handler.ts                    | TEST_GAP_ON_CHANGED_SYMBOL       | high              |
| 3    | csv.exporter.ts                           | PUBLIC_API_CHANGED               | medium            |
| 4    | tax.calculator.ts + docs/api.md           | DOC_STALE_OR_MISSING             | medium            |
| 5    | bulk-import.handler.ts                    | REQ_WITHOUT_CODE (REQ-005)       | high              |
| 6    | auth.middleware.ts (ADMIN_ROLE_HEADER)    | CODE_WITHOUT_REQ                 | medium            |
| 7    | bulk-import.handler.ts                    | TEST_GAP_ON_CHANGED_SYMBOL       | high              |
| 8    | tax.calculator.ts + tax.config.ts         | AMBIGUOUS_TRACEABILITY           | low               |
| 9    | auth.middleware.ts (requireAuthenticated) | informational only               | informational     |
