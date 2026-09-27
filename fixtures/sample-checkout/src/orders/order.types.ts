// Synthetic fixture — not executable by ChangeProof
export type OrderStatus = 'pending' | 'fulfilled' | 'cancelled';

export interface Order {
  id: string;
  itemId: string;
  quantity: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: string;
  name: string;
  available: boolean;
}

export class ItemNotFoundError extends Error {
  constructor(itemId: string) {
    super(`Item not found: ${itemId}`);
    this.name = 'ItemNotFoundError';
  }
}

export class InvalidQuantityError extends Error {
  constructor(quantity: number) {
    super(`Invalid quantity: ${quantity}. Must be greater than zero.`);
    this.name = 'InvalidQuantityError';
  }
}

export class OrderNotCancellableError extends Error {
  constructor(orderId: string, status: OrderStatus) {
    super(`Order ${orderId} cannot be cancelled: current status is ${status}`);
    this.name = 'OrderNotCancellableError';
  }
}
