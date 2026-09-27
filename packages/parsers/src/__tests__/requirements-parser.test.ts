import { describe, it, expect } from 'vitest';
import { parseRequirementsMarkdown, extractRequirementIds } from '../requirements-parser.js';

const SAMPLE_REQUIREMENTS = `
# Sample Checkout — Requirements

## REQ-001 — Create order validation

An order may only be created when the referenced item exists.

### Acceptance criteria

- AC-001-1: Given a valid item ID and quantity > 0, createOrder returns a new order.
- AC-001-2: Given a non-existent item ID, throws ItemNotFoundError.

**Source:** \`src/orders/order.service.ts\`

## REQ-002 — CSV export with includeCancelled option

Orders can be exported to CSV with an includeCancelled option.

### Acceptance criteria

- AC-002-1: Given includeCancelled: false, the CSV does not contain cancelled orders.
`;

describe('parseRequirementsMarkdown', () => {
  it('extracts REQ-001 and REQ-002', () => {
    const reqs = parseRequirementsMarkdown(SAMPLE_REQUIREMENTS);
    const ids = reqs.map((r) => r.id);
    expect(ids).toContain('REQ-001');
    expect(ids).toContain('REQ-002');
  });

  it('extracts requirement titles', () => {
    const reqs = parseRequirementsMarkdown(SAMPLE_REQUIREMENTS);
    const req001 = reqs.find((r) => r.id === 'REQ-001');
    expect(req001?.title).toContain('Create order');
  });

  it('extracts acceptance criteria', () => {
    const reqs = parseRequirementsMarkdown(SAMPLE_REQUIREMENTS);
    const req001 = reqs.find((r) => r.id === 'REQ-001');
    expect(req001?.acceptanceCriteria.length).toBeGreaterThanOrEqual(2);
    expect(req001?.acceptanceCriteria[0]?.id).toBe('AC-001-1');
  });

  it('records source line numbers', () => {
    const reqs = parseRequirementsMarkdown(SAMPLE_REQUIREMENTS, 'requirements.md');
    const req001 = reqs.find((r) => r.id === 'REQ-001');
    expect(req001?.sourceLocation?.filePath).toBe('requirements.md');
    expect(req001?.sourceLocation?.startLine).toBeGreaterThan(0);
  });

  it('parses all 5 fixture requirements', () => {
    // Simulate the fixture requirements structure
    const text = `
## REQ-001 — Title One
Body one.
## REQ-002 — Title Two
Body two.
## REQ-003 — Title Three
Body three.
## REQ-004 — Title Four
Body four.
## REQ-005 — Title Five
Body five.
    `;
    const reqs = parseRequirementsMarkdown(text);
    expect(reqs).toHaveLength(5);
  });
});

describe('extractRequirementIds', () => {
  it('finds REQ IDs in text', () => {
    const text = 'This implements REQ-001 and REQ-003 per the spec.';
    const ids = extractRequirementIds(text);
    expect(ids).toContain('REQ-001');
    expect(ids).toContain('REQ-003');
  });

  it('deduplicates IDs', () => {
    const text = 'REQ-001 is mentioned twice: REQ-001.';
    const ids = extractRequirementIds(text);
    expect(ids).toHaveLength(1);
  });

  it('returns empty array for no IDs', () => {
    expect(extractRequirementIds('no requirements here')).toEqual([]);
  });
});
