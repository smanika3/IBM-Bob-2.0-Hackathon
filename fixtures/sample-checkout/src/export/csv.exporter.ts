// Synthetic fixture — not executable by ChangeProof
// REQ-002 — CSV export with includeCancelled option
import type { Order } from '../orders/order.types.js';

export interface ExportOptions {
  includeCancelled?: boolean;
}

/**
 * Exports orders to CSV.
 *
 * @param orders - list of orders to export
 * @param options.includeCancelled - include cancelled orders (default: false)
 *
 * REQ-002: The includeCancelled option is documented in docs/api.md.
 */
export function exportOrdersToCsv(orders: Order[], options: ExportOptions = {}): string {
  const { includeCancelled = false } = options;

  const filtered = includeCancelled ? orders : orders.filter((o) => o.status !== 'cancelled');

  const header = 'id,itemId,quantity,status,createdAt';
  const rows = filtered.map((o) => `${o.id},${o.itemId},${o.quantity},${o.status},${o.createdAt}`);

  return [header, ...rows].join('\n');
}
