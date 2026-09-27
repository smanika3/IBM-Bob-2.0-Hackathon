# ChangeProof

**Evidence-first change-readiness workbench.**

ChangeProof consumes a bounded change bundle — requirements, a pull-request diff, source files, tests, and optional architecture documentation — and produces an explainable traceability and risk report.

> Can we prove that this change satisfies the requirement, is covered by tests, and has no obvious undocumented impact?

---

## Problem

Developer tools produce artifacts — PRs, CI results, issue trackers — but leave an evidence gap: no single view links a requirement to its implementation, its test, and its documentation impact. A reviewer must manually navigate multiple systems to build that picture.

ChangeProof closes the evidence gap with deterministic, auditable rules.

---

## Architecture

```
changeproof/
├── apps/
│   ├── web/         React/Vite dashboard
│   ├── api/         Fastify local API
│   └── cli/         CLI for batch/offline use
├── packages/
│   ├── domain/      Shared Zod schemas (no framework deps)
│   ├── ingestion/   Bundle normalization
│   ├── parsers/     Markdown, diff, TypeScript, test parsers
│   ├── analysis/    Deterministic matching and rule engine
│   ├── storage/     SQLite typed repository layer
│   └── reporting/   Markdown and JSON evidence exports
├── fixtures/
│   └── sample-checkout/  Synthetic TypeScript project fixture
├── docs/
└── bob_sessions/    IBM Bob task-session summaries
```

The analysis engine (`packages/analysis`) is independent from React, Fastify, and SQLite.

---

## Required analysis rules

| Rule ID                      | Description                                |
| ---------------------------- | ------------------------------------------ |
| `REQ_WITHOUT_CODE`           | Requirement has no implementation evidence |
| `CODE_WITHOUT_REQ`           | Changed code links to no requirement       |
| `REQ_WITHOUT_TEST`           | Requirement has no test coverage           |
| `PUBLIC_API_CHANGED`         | Public export or route changed             |
| `CONFIG_OR_SCHEMA_CHANGED`   | Configuration or schema changed            |
| `TEST_GAP_ON_CHANGED_SYMBOL` | Changed symbol has no test coverage        |
| `DOC_STALE_OR_MISSING`       | Documentation is stale or missing          |
| `AMBIGUOUS_TRACEABILITY`     | Multiple plausible requirement matches     |

---

## Setup

```bash
# Install dependencies
pnpm install

# Type-check all packages
pnpm typecheck

# Lint all packages
pnpm lint

# Run all unit and contract tests (133 tests)
pnpm test

# Run Playwright end-to-end browser tests
pnpm test:e2e

# Build all packages and applications
pnpm build

# Start the Fastify API (port 3001)
pnpm --filter @changeproof/api dev:ts

# Start the web dashboard (port 5173)
pnpm --filter @changeproof/web dev

# Run CLI analysis on bundled fixture
pnpm --filter @changeproof/cli dev analyze --fixture sample
```

---

## 3-Minute Demo Walkthrough

ChangeProof includes a self-contained synthetic fixture at `fixtures/sample-checkout` with 9 seeded engineering change scenarios.

1. Start API: `pnpm --filter @changeproof/api dev`
2. Start Dashboard: `pnpm --filter @changeproof/web dev`
3. Navigate to `http://localhost:5173`
4. Click **[▶ Run Sample Analysis]** to evaluate the change bundle.
5. Inspect the **Traceability Matrix** to verify requirement-to-code and requirement-to-test links.
6. Switch to **Findings**, open the **Evidence Drawer** on the high-severity test gap (`TEST_GAP_ON_CHANGED_SYMBOL`), and record a human decision.
7. Click **[⬇ Export Evidence]** to generate Markdown or machine-readable JSON v1 evidence packets.

See [docs/demo-script.md](docs/demo-script.md) for the exact 3-minute presentation timeline.

---

## Documentation

- [Architecture & Design](docs/architecture.md)
- [Evidence Model & Matching Hierarchy](docs/evidence-model.md)
- [Deterministic Rule Catalog](docs/rules.md)
- [API & CLI Reference](docs/api.md)
- [Seeded Fixture Cases](docs/fixture-cases.md)
- [3-Minute Demo Script](docs/demo-script.md)
- [IBM Bob Development Sessions](bob_sessions/README.md)

---

## Safety Boundary

- No external LLM API, cloud credentials, or paid services required.
- No uploaded code is executed.
- No autonomous merge approval or blocking.
- Every finding traces directly to source evidence or explicitly flags missing evidence.
- Uses only synthetic, purpose-built fixture data.

---

## Limitations

- Prototype evaluation — not intended as an autonomous gatekeeper.
- Metrics are evaluated on a controlled synthetic fixture only.
- Direct git provider webhooks (GitHub/GitLab) are not yet integrated.
- Single-tenant local SQLite persistence.

---

## IBM Bob usage

This project was built with IBM Bob 2.0. Task-session summaries are in `bob_sessions/`.
