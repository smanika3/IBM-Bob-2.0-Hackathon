# ChangeProof API Documentation

ChangeProof exposes a local Fastify API for executing change analysis, retrieving evidence, recording human review decisions, and exporting audit packets.

No external LLM APIs, cloud credentials, tokens, or external network connections are required.

## Base URL

By default, the API listens at:

```
http://127.0.0.1:3001
```

Set the port and host using environment variables:

- `PORT` (default: `3001`)
- `HOST` (default: `127.0.0.1`)
- `DATABASE_PATH` (default: `./changeproof.db`)
- `LOG_LEVEL` (default: `info`)

---

## Endpoints

### 1. Health Check

Check service health and version.

- **Method:** `GET`
- **Path:** `/health`
- **Response:** `200 OK`

```json
{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": "2026-09-27T01:25:00.000Z"
}
```

---

### 2. Get Sample Fixture Metadata

Returns metadata about the bundled synthetic checkout fixture.

- **Method:** `GET`
- **Path:** `/api/sample`
- **Response:** `200 OK`

```json
{
  "bundleId": "sample",
  "name": "Sample Checkout",
  "description": "Synthetic e-commerce order management system with seeded change scenarios.",
  "fileCount": 16,
  "fingerprint": "71f88d7a9f57c54b4c1b645198d18fa768c50d93776392a5e1cb17053aa948e4"
}
```

---

### 3. Create Analysis Run

Triggers a synchronous analysis run on a change bundle.

- **Method:** `POST`
- **Path:** `/api/runs`
- **Headers:** `Content-Type: application/json`
- **Request Body:**

```json
{
  "bundleId": "sample"
}
```

- **Response:** `201 Created`

```json
{
  "id": "437f7a47-1ecc-4252-ab27-adb1ea8f3473",
  "name": "Analysis: sample",
  "status": "completed",
  "contentFingerprint": "71f88d7a9f57c54b4c1b645198d18fa768c50d93776392a5e1cb17053aa948e4",
  "bundleId": "sample",
  "createdAt": "2026-09-27T01:25:00.000Z",
  "completedAt": "2026-09-27T01:25:01.000Z",
  "summary": {
    "totalRequirements": 5,
    "totalChangedArtifacts": 5,
    "totalTestArtifacts": 12,
    "totalEvidenceLinks": 48,
    "totalFindings": 5,
    "needsHumanReviewCount": 4,
    "findingsBySeverity": {
      "critical": 0,
      "high": 1,
      "medium": 3,
      "low": 1,
      "informational": 0
    },
    "findingsByStatus": {
      "verified": 0,
      "partial": 0,
      "missing_evidence": 1,
      "needs_human_review": 4,
      "informational": 0
    }
  }
}
```

- **Errors:**
  - `400 Bad Request` if `bundleId` is missing or unknown.

---

### 4. Get Analysis Run

Retrieve run metadata and summary counts by run ID.

- **Method:** `GET`
- **Path:** `/api/runs/:runId`
- **Response:** `200 OK` (AnalysisRun object)
- **Errors:**
  - `404 Not Found` if the run ID does not exist.

---

### 5. Get Run Findings

Retrieve all deterministic findings produced for a run, sorted deterministically.

- **Method:** `GET`
- **Path:** `/api/runs/:runId/findings`
- **Response:** `200 OK`

```json
{
  "runId": "437f7a47-1ecc-4252-ab27-adb1ea8f3473",
  "findings": [
    {
      "id": "finding-000001",
      "ruleId": "PUBLIC_API_CHANGED",
      "severity": "medium",
      "status": "needs_human_review",
      "title": "Public API changed: src/orders/order.service.ts",
      "explanation": "The file \"src/orders/order.service.ts\" contains exported symbols [cancelOrder, createOrder, getOrder] that were changed. Public API changes may affect callers.",
      "requirementIds": ["REQ-001", "REQ-003", "REQ-005"],
      "changedArtifactIds": ["artifact-1"],
      "testArtifactIds": [],
      "evidenceLinkIds": ["link-000001", "link-000005"],
      "matchStrength": "moderate",
      "recommendedAction": "Review the public API change in \"src/orders/order.service.ts\". Update documentation and callers if necessary.",
      "reviewDecision": null
    }
  ]
}
```

---

### 6. Get Traceability Matrix

Retrieve requirement-to-code and requirement-to-test traceability mappings for a run.

- **Method:** `GET`
- **Path:** `/api/runs/:runId/traceability`
- **Response:** `200 OK`

```json
{
  "runId": "437f7a47-1ecc-4252-ab27-adb1ea8f3473",
  "requirements": [
    {
      "id": "REQ-001",
      "title": "Create an order only when the item exists and quantity is greater than zero.",
      "body": "...",
      "acceptanceCriteria": [...],
      "tags": ["orders", "validation"],
      "linkedCodeArtifacts": [...],
      "linkedTestArtifacts": [...],
      "status": "verified"
    }
  ]
}
```

---

### 7. Record Review Decision

Record a human reviewer's decision on a specific finding.

- **Method:** `POST`
- **Path:** `/api/findings/:findingId/decision`
- **Headers:** `Content-Type: application/json`
- **Request Body:**

```json
{
  "decision": "accepted",
  "rationale": "Verified caller compatibility manually; breaking changes are acceptable.",
  "decidedBy": "auditor@example.com"
}
```

- **Allowed `decision` values:**
  - `accepted`
  - `waived`
  - `needs_clarification`
  - `rejected`
- **Response:** `201 Created`

```json
{
  "id": "3f9c5d1e-...",
  "findingId": "finding-000001",
  "runId": "437f7a47-...",
  "decision": "accepted",
  "rationale": "Verified caller compatibility manually...",
  "decidedBy": "auditor@example.com",
  "decidedAt": "2026-09-27T01:30:00.000Z"
}
```

---

### 8. Export Evidence Packet

Export the full evidence packet for audit, compliance, or human review.

- **Method:** `GET`
- **Path:** `/api/runs/:runId/export?format=markdown`
  - **Content-Type:** `text/markdown; charset=utf-8`
  - Returns a structured Markdown document with disclaimer, summary, traceability table, findings, evidence links, and human decisions.
- **Path:** `/api/runs/:runId/export?format=json`
  - **Content-Type:** `application/json; charset=utf-8`
  - Returns a machine-readable JSON document conforming to `JsonEvidenceReport` v1.0.0.

---

## CLI Usage

ChangeProof CLI shares the same domain, analysis engine, storage, and reporting packages:

```bash
# Analyze bundled fixture
pnpm --filter @changeproof/cli dev analyze --fixture sample

# Analyze local change bundle directory
pnpm --filter @changeproof/cli dev analyze --path ./my-bundle

# Export evidence packet as Markdown
pnpm --filter @changeproof/cli dev export --run <run-id> --format markdown

# Export evidence packet as JSON
pnpm --filter @changeproof/cli dev export --run <run-id> --format json
```
