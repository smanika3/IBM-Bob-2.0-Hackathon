import { describe, it, expect } from 'vitest';
import { parseTypeScriptSource, extractKeywords } from '../ts-source-parser.js';

const SAMPLE_SOURCE = `
// REQ-001, REQ-003
import type { Order, Item } from './order.types.js';
import { ItemNotFoundError } from './order.types.js';

export function createOrder(itemId: string, quantity: number): Order {
  return { id: 'o1', itemId, quantity, status: 'pending', createdAt: '', updatedAt: '' };
}

export function cancelOrder(orderId: string): Order {
  return { id: orderId, itemId: '', quantity: 0, status: 'cancelled', createdAt: '', updatedAt: '' };
}

export const ADMIN_ROLE_HEADER = 'x-admin-role';
`;

describe('parseTypeScriptSource', () => {
  it('extracts exported function names', () => {
    const result = parseTypeScriptSource(SAMPLE_SOURCE, 'src/orders/order.service.ts');
    expect(result.exports).toContain('createOrder');
    expect(result.exports).toContain('cancelOrder');
  });

  it('extracts exported constants', () => {
    const result = parseTypeScriptSource(SAMPLE_SOURCE, 'src/auth/auth.middleware.ts');
    expect(result.exports).toContain('ADMIN_ROLE_HEADER');
  });

  it('extracts requirement ID references', () => {
    const result = parseTypeScriptSource(SAMPLE_SOURCE, 'src/orders/order.service.ts');
    expect(result.referencedRequirementIds).toContain('REQ-001');
    expect(result.referencedRequirementIds).toContain('REQ-003');
  });

  it('extracts imports', () => {
    const result = parseTypeScriptSource(SAMPLE_SOURCE, 'src/orders/order.service.ts');
    expect(result.imports.some((i) => i.includes('order.types'))).toBe(true);
  });

  it('marks service files as having public exports', () => {
    const result = parseTypeScriptSource(SAMPLE_SOURCE, 'src/orders/order.service.ts');
    expect(result.hasPublicExports).toBe(true);
  });

  it('identifies config files', () => {
    const result = parseTypeScriptSource('export const rate = 0.1;', 'src/tax/tax.config.ts');
    expect(result.isConfigFile).toBe(true);
  });
});

describe('extractKeywords', () => {
  it('splits camelCase and normalizes', () => {
    const kws = extractKeywords('createOrder cancelOrder taxCalculator');
    expect(kws).toContain('create');
    expect(kws).toContain('order');
    expect(kws).toContain('cancel');
    expect(kws).toContain('tax');
    expect(kws).toContain('calculator');
  });

  it('filters stop words', () => {
    const kws = extractKeywords('the and for are this that');
    expect(kws).not.toContain('the');
    expect(kws).not.toContain('and');
  });

  it('removes words shorter than 3 chars', () => {
    const kws = extractKeywords('a or it is');
    expect(kws.every((k) => k.length >= 3)).toBe(true);
  });
});
