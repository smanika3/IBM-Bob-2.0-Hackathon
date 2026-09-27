// Synthetic fixture — not executable by ChangeProof
// Tests for REQ-002 — CSV export
// SEEDED CASE: Tests cover the includeCancelled filter behavior but NOT malformed-row reporting
// This creates a TEST_GAP_ON_CHANGED_SYMBOL for the bulk import error-reporting path

import { describe, it, expect } from 'vitest';
import { exportOrdersToCsv } from '../../src/export/csv.exporter.js';
import type { Order } from '../../src/orders/order.types.js';

const SAMPLE_ORDERS: Order[] = [
  {
    id: 'o1',
    itemId: 'item-apple',
    quantity: 2,
    status: 'pending',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'o2',
    itemId: 'item-banana',
    quantity: 1,
    status: 'cancelled',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'o3',
    itemId: 'item-apple',
    quantity: 5,
    status: 'fulfilled',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
];

describe('REQ-002 exportOrdersToCsv', () => {
  it('AC-002-1: excludes cancelled orders by default', () => {
    const csv = exportOrdersToCsv(SAMPLE_ORDERS);
    expect(csv).not.toContain('cancelled');
    expect(csv).toContain('o1');
    expect(csv).toContain('o3');
  });

  it('AC-002-2: includes cancelled orders when includeCancelled is true', () => {
    const csv = exportOrdersToCsv(SAMPLE_ORDERS, { includeCancelled: true });
    expect(csv).toContain('o2');
    expect(csv).toContain('cancelled');
  });

  // NOTE: AC-002-3 (malformed row reporting) is NOT tested here.
  // The processBulkImport function in bulk-import.handler.ts has no test coverage.
  // This is a deliberate test gap seeded for REQ_WITHOUT_TEST / TEST_GAP_ON_CHANGED_SYMBOL.
});
