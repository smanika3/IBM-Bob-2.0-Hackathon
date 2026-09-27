# Sample Checkout — Architecture

Synthetic TypeScript order-management service created for the ChangeProof demo.

## Public API surface

### OrderService

```
createOrder(itemId: string, quantity: number): Promise<Order>
cancelOrder(orderId: string): Promise<Order>
getOrder(orderId: string): Promise<Order>
```

### CsvExporter

```
exportOrders(options: ExportOptions): Promise<string>
```

`ExportOptions`:

- `includeCancelled: boolean` — whether to include cancelled orders (default: `false`)

### TaxCalculator

```
calculate(amount: number): number
```

Rounds to 2 decimal places. Rounding method: round-half-down per jurisdiction rule in `tax.config.ts`.

### BulkImportHandler

```
POST /api/orders/bulk
Authorization: Bearer <admin-token>
Body: { rows: RawOrderRow[] }
Response: { imported: number, errors: RowError[] }
```

Admin-only. Rejects non-admin callers with HTTP 403.

## Configuration

`src/tax/tax.config.ts` — jurisdiction tax rates and rounding method.

## Status values

`pending` | `fulfilled` | `cancelled`

## Error types

- `ItemNotFoundError`
- `InvalidQuantityError`
- `OrderNotCancellableError`
