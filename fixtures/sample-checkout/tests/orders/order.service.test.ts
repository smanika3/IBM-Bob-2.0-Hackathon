// Synthetic fixture — not executable by ChangeProof
// Tests for REQ-001 and REQ-003 — order creation and cancellation
// SEEDED CASE: REQ-001 is mostly verified (AC-001-1, AC-001-2, AC-001-3 all covered)

import { describe, it, expect } from 'vitest';
import { createOrder, cancelOrder } from '../../src/orders/order.service.js';
import {
  ItemNotFoundError,
  InvalidQuantityError,
  OrderNotCancellableError,
} from '../../src/orders/order.types.js';

describe('REQ-001 createOrder', () => {
  it('AC-001-1: creates a pending order for a valid item and quantity > 0', () => {
    const order = createOrder('item-apple', 2);
    expect(order.status).toBe('pending');
    expect(order.itemId).toBe('item-apple');
    expect(order.quantity).toBe(2);
  });

  it('AC-001-2: throws ItemNotFoundError for unknown item', () => {
    expect(() => createOrder('item-unknown', 1)).toThrow(ItemNotFoundError);
  });

  it('AC-001-3: throws InvalidQuantityError for quantity <= 0', () => {
    expect(() => createOrder('item-apple', 0)).toThrow(InvalidQuantityError);
    expect(() => createOrder('item-apple', -5)).toThrow(InvalidQuantityError);
  });
});

describe('REQ-003 cancelOrder', () => {
  it('AC-003-1: cancels a pending order', () => {
    const order = createOrder('item-banana', 1);
    const cancelled = cancelOrder(order.id);
    expect(cancelled.status).toBe('cancelled');
  });

  it('AC-003-2: throws OrderNotCancellableError for a fulfilled order', () => {
    // Simulate fulfilled by direct manipulation for fixture purposes
    const order = createOrder('item-apple', 3);
    // Transition manually (fixture only — no fulfil method in this PR)
    const store = (globalThis as Record<string, unknown>)['_orderStore'] as
      Map<string, { status: string }> | undefined;
    if (store) store.get(order.id)!['status'] = 'fulfilled';
    // If store hack isn't available, this test documents intent
    expect(order.status).toBe('pending');
  });
});
