// Synthetic fixture — not executable by ChangeProof
// REQ-005 — Bulk import restricted to administrators
// NOTE: This handler was added in the PR but has no implementation for REQ-005
// admin restriction (seeded case: CODE_WITHOUT_REQ trigger for internal refactor)

export interface RawOrderRow {
  itemId: string;
  quantity: string;
  note?: string;
}

export interface RowError {
  row: number;
  message: string;
}

export interface BulkImportResult {
  imported: number;
  errors: RowError[];
}

/**
 * Processes a bulk order import payload.
 * Admin authorization is enforced by the auth middleware (see auth.middleware.ts).
 * Malformed rows are collected and returned rather than throwing.
 *
 * NOTE: The REQ-005 admin restriction is not yet enforced inside this handler —
 * it relies entirely on the upstream middleware. This is a known gap flagged by
 * ChangeProof as CODE_WITHOUT_REQ because the handler itself has no reference
 * to REQ-005 and the middleware wiring is undocumented.
 */
export function processBulkImport(rows: RawOrderRow[]): BulkImportResult {
  const errors: RowError[] = [];
  let imported = 0;

  rows.forEach((row, index) => {
    const qty = parseInt(row.itemId, 10);
    if (!row.itemId || row.itemId.trim() === '') {
      errors.push({ row: index + 1, message: 'itemId is required' });
      return;
    }
    if (isNaN(qty)) {
      errors.push({ row: index + 1, message: `quantity "${row.quantity}" is not a valid number` });
      return;
    }
    imported++;
  });

  return { imported, errors };
}
