import { describe, it, expect } from 'vitest';
import { parseTestFile } from '../test-parser.js';

const SAMPLE_TEST = `
// REQ-001 tests
import { describe, it, expect } from 'vitest';
import { createOrder, cancelOrder } from '../../src/orders/order.service.js';
import { ItemNotFoundError } from '../../src/orders/order.types.js';

describe('REQ-001 createOrder', () => {
  it('creates a pending order for valid item', () => {
    const order = createOrder('item-apple', 2);
    expect(order.status).toBe('pending');
  });

  it('throws ItemNotFoundError for unknown item', () => {
    expect(() => createOrder('item-unknown', 1)).toThrow(ItemNotFoundError);
  });
});
`;

describe('parseTestFile', () => {
  it('extracts test names', () => {
    const result = parseTestFile(SAMPLE_TEST, 'tests/orders/order.service.test.ts');
    const names = result.tests.map((t) => t.testName);
    expect(names.some((n) => n.includes('creates a pending order'))).toBe(true);
    expect(names.some((n) => n.includes('throws ItemNotFoundError'))).toBe(true);
  });

  it('extracts requirement IDs from file comment', () => {
    const result = parseTestFile(SAMPLE_TEST, 'tests/orders/order.service.test.ts');
    expect(result.tests.some((t) => t.referencedRequirementIds.includes('REQ-001'))).toBe(true);
  });

  it('extracts imported symbols', () => {
    const result = parseTestFile(SAMPLE_TEST, 'tests/orders/order.service.test.ts');
    const allSymbols = result.tests.flatMap((t) => t.referencedSymbols);
    expect(allSymbols).toContain('createOrder');
    expect(allSymbols).toContain('cancelOrder');
  });

  it('returns correct file path', () => {
    const result = parseTestFile(SAMPLE_TEST, 'tests/orders/order.service.test.ts');
    expect(result.filePath).toBe('tests/orders/order.service.test.ts');
  });
});
