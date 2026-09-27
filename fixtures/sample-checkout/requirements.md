# Sample Checkout — Requirements

This is a synthetic TypeScript order-management project created solely for the ChangeProof public demo.
No real customer or order data is used.

---

## REQ-001 — Create order validation

An order may only be created when the referenced item exists in the catalogue and the requested quantity is greater than zero.

### Acceptance criteria

- AC-001-1: Given a valid item ID and quantity > 0, `OrderService.createOrder` returns a new order in `pending` status.
- AC-001-2: Given a non-existent item ID, `OrderService.createOrder` throws `ItemNotFoundError`.
- AC-001-3: Given quantity ≤ 0, `OrderService.createOrder` throws `InvalidQuantityError`.

**Source:** `src/orders/order.service.ts`, `src/orders/order.types.ts`

---

## REQ-002 — CSV export with includeCancelled option

Orders can be exported to CSV. The export function accepts an `includeCancelled` boolean option.
When `includeCancelled` is `false` (default), cancelled orders are excluded.
When `includeCancelled` is `true`, all orders including cancelled ones are included.
The option must be documented in `docs/api.md`.

### Acceptance criteria

- AC-002-1: Given `includeCancelled: false`, the CSV does not contain cancelled orders.
- AC-002-2: Given `includeCancelled: true`, the CSV contains cancelled orders.
- AC-002-3: Malformed rows in a bulk import are reported with row number and error description.

**Source:** `src/export/csv.exporter.ts`, `docs/api.md`

---

## REQ-003 — Cancellation allowed only when pending

An order may only be cancelled while it is in `pending` status.
Attempting to cancel a non-pending order must throw `OrderNotCancellableError`.

### Acceptance criteria

- AC-003-1: Given a pending order, `OrderService.cancelOrder` transitions it to `cancelled`.
- AC-003-2: Given a fulfilled order, `OrderService.cancelOrder` throws `OrderNotCancellableError`.
- AC-003-3: Given a cancelled order, `OrderService.cancelOrder` throws `OrderNotCancellableError`.

**Source:** `src/orders/order.service.ts`

---

## REQ-004 — Tax calculation rounds to cents

The tax calculation module rounds the computed tax to the nearest cent (2 decimal places) using the jurisdiction rule specified in `src/tax/tax.config.ts`.
The rounding method is documented in `docs/api.md`.

### Acceptance criteria

- AC-004-1: `TaxCalculator.calculate` returns a value rounded to exactly 2 decimal places.
- AC-004-2: The rounding method matches the jurisdiction rule in `TaxCalculator.config`.
- AC-004-3: Given a tax rate of 0.1 and amount of 10.005, the result is 1.00 (round half-down per jurisdiction rule).

**Source:** `src/tax/tax.calculator.ts`, `src/tax/tax.config.ts`, `docs/api.md`

---

## REQ-005 — Bulk order import restricted to administrators

The bulk order import endpoint is restricted to users with the `admin` role.
Non-administrator calls must be rejected with a 403 response.
Malformed rows must be reported with the row number and a human-readable error description.

### Acceptance criteria

- AC-005-1: Given an authenticated admin user, the bulk import endpoint accepts and processes the payload.
- AC-005-2: Given a non-admin user, the endpoint returns HTTP 403.
- AC-005-3: Given a payload with malformed rows, the endpoint returns a report listing each bad row.

**Source:** `src/auth/auth.middleware.ts`, `src/orders/bulk-import.handler.ts`
