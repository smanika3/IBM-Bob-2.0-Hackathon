// Synthetic fixture — not executable by ChangeProof
// REQ-001, REQ-003
import type { Order, Item } from './order.types.js';
import {
  ItemNotFoundError,
  InvalidQuantityError,
  OrderNotCancellableError,
} from './order.types.js';

// In-memory store for fixture purposes only
const itemCatalogue: Map<string, Item> = new Map([
  ['item-apple', { id: 'item-apple', name: 'Apple', available: true }],
  ['item-banana', { id: 'item-banana', name: 'Banana', available: true }],
]);

const orderStore: Map<string, Order> = new Map();
let nextId = 1;

/** REQ-001 — Create an order when item exists and quantity > 0 */
export function createOrder(itemId: string, quantity: number): Order {
  const item = itemCatalogue.get(itemId);
  if (!item) throw new ItemNotFoundError(itemId);
  if (quantity <= 0) throw new InvalidQuantityError(quantity);

  const order: Order = {
    id: `order-${nextId++}`,
    itemId,
    quantity,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  orderStore.set(order.id, order);
  return order;
}

/** REQ-003 — Cancel only when pending */
export function cancelOrder(orderId: string): Order {
  const order = orderStore.get(orderId);
  if (!order) throw new Error(`Order not found: ${orderId}`);
  if (order.status !== 'pending') {
    throw new OrderNotCancellableError(orderId, order.status);
  }
  const updated: Order = { ...order, status: 'cancelled', updatedAt: new Date().toISOString() };
  orderStore.set(orderId, updated);
  return updated;
}

export function getOrder(orderId: string): Order | undefined {
  return orderStore.get(orderId);
}
