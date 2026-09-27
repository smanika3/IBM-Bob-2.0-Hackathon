# ChangeProof — 3-Minute Demo Presentation Script

This script guides a 3-minute live demonstration of ChangeProof for judges, engineering leaders, and reviewers.

---

## Target Timeline

| Time          | Section                               | Key Talking Point & Visual Action                                                                                                                                                                                                                                                                                                                                                    |
| ------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **0:00–0:20** | **The Problem**                       | Modern CI/CD and pull requests show lines added and deleted, but cannot answer: _“Does this change satisfy the requirement, have test coverage on every changed symbol, and leave no undocumented public API impact?”_                                                                                                                                                               |
| **0:20–0:40** | **The Solution & Fixture**            | ChangeProof is an evidence-first change-readiness workbench. Show the synthetic e-commerce order management repository (`fixtures/sample-checkout`) containing requirements, a PR patch, source code, and tests.                                                                                                                                                                     |
| **0:40–1:40** | **Workbench Overview & Traceability** | Click **"Run Sample Analysis"**. Tour the overview cards: 5 requirements, 5 changed artifacts, 12 test suites, 48 evidence links, and 5 findings. Switch to **Traceability Matrix** to inspect the requirement-to-code and requirement-to-test links.                                                                                                                                |
| **1:40–2:15** | **Findings & Human Review**           | Switch to **Findings**. Filter by Severity (`High`) to see `TEST_GAP_ON_CHANGED_SYMBOL` on `bulk-import.handler.ts`. Open the **Evidence Drawer**. Inspect the missing test evidence. Record a human decision: select `Defer Decision`, add rationale (_"Deferred until sprint 42 batch ingestion test is written"_), and click **Save Decision**. Show the updated badge in the UI. |
| **2:15–2:40** | **Exporting Evidence**                | Click **"Export Evidence"**. Demonstrate both Markdown audit report and machine-readable JSON format conforming to schema v1.0.0. Show that human decisions and reviewer identity are embedded.                                                                                                                                                                                      |
| **2:40–3:00** | **Architecture & Safety Boundary**    | Conclude on core architectural principles: 100% deterministic AST & diff analysis, zero external LLM API calls, zero uploaded code execution, and no autonomous merge blocking. ChangeProof empowers human engineering decisions with verifiable evidence.                                                                                                                           |

---

## Detailed Step-by-Step Walkthrough

### 1. Launch Environment

Start the local API and Vite dashboard:

```bash
# Terminal 1: Start API
pnpm --filter @changeproof/api dev

# Terminal 2: Start Web Dashboard
pnpm --filter @changeproof/web dev
```

Navigate to `http://localhost:5173`. Confirm the status indicator in the top right reads:
`API Connected (Fastify)`.

_(Note: ChangeProof also operates gracefully in offline demo mode using preloaded fixture data if the API is not started)._

---

### 2. Run Sample Analysis (Click: `[▶ Run Sample Analysis]`)

- Click the primary purple action button in the header.
- The button displays `Analyzing...` with a micro-spinner as Fastify executes synchronous AST parsing, unified diff analysis, and the 8 deterministic rules.
- When analysis completes:
  - **Requirements Analyzed:** 5
  - **Indexed Code Artifacts:** 5
  - **Test Artifacts:** 12
  - **Evidence Links:** 48
  - **Needs Human Review:** 4

---

### 3. Traceability Matrix Tab (Click: `[Traceability Matrix]`)

- Click the **Traceability Matrix** tab in the top navigation.
- Highlight `REQ-001` (Order creation validation):
  - Notice the green `verified` badge.
  - Linked to `src/orders/order.service.ts` via `explicit_req_id`.
  - Linked to 3 test cases in `tests/orders/order.service.test.ts`.
- Expand the row to inspect the acceptance criteria (`AC-001-1`, `AC-001-2`, `AC-001-3`).
- Highlight `REQ-005` (Bulk order import):
  - Notice the cyan `partial` badge.
  - While `requireAdmin` has test evidence, the CSV batch ingestion handler lacks test coverage.

---

### 4. Findings & Evidence Drawer (Click: `[Findings]`)

- Click the **Findings** tab.
- Use the **Severity filter** dropdown to select `High`.
- Notice finding `finding-000004`:
  - **Rule:** `TEST_GAP_ON_CHANGED_SYMBOL`
  - **File:** `src/orders/bulk-import.handler.ts`
  - **Status:** `Missing Evidence`
- Click **"View Evidence & Decide"** to open the slide-out **Evidence Drawer**.
- Walk through the drawer sections:
  1. _Evidence & Risk Explanation_: Details which symbols lack test coverage (`BulkImportResult`, `RawOrderRow`, `RowError`, `processBulkImport`).
  2. _Changed Code Artifacts_: Shows `+78 / -0 lines`.
  3. _Test Coverage_: Shows warning banner declaring test evidence is missing.
  4. _Recommended Action_: Prescribes exact test coverage needed.
  5. _Human Review Decision_:
     - Select `Defer Decision` (or `Accept Change`).
     - Enter Reviewer: `lead-architect@changeproof.local`.
     - Enter Rationale: `Deferred pending PR #42 test suite expansion`.
     - Click **"Save Review Decision"**.
- Confirm that the success confirmation appears and that closing the drawer shows the decision badge updated on the finding card.

---

### 5. Export Evidence Packet (Click: `[⬇ Export Evidence]`)

- Click **"Export Evidence"** in the top navigation.
- In the modal:
  - View the Markdown report with disclaimer, summary counts, traceability matrix, findings, and human decisions table.
  - Toggle to `JSON Schema v1` to show machine-readable JSON.
  - Click `Copy to Clipboard` or `Download .md`.

---

### 6. Summary of Hard Constraints Verified

- **No external LLM or API keys required.**
- **No execution of fixture application code.**
- **No autonomous merge approval or blocking.**
- **Purely deterministic AST & diff rule engine.**
