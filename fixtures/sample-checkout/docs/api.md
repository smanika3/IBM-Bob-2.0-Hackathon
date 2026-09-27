# Sample Checkout — API Documentation

## OrderService

### createOrder(itemId, quantity)

Creates an order. Throws if item doesn't exist or quantity ≤ 0.

### cancelOrder(orderId)

Cancels a pending order. Throws `OrderNotCancellableError` for non-pending orders.

## CsvExporter

### exportOrdersToCsv(orders, options)

Exports orders to CSV format.

**Options:**

- `includeCancelled` (boolean, default: `false`): Include cancelled orders in the export.

## TaxCalculator

### calculate(amount)

Computes tax on the given amount using the configured rate.

**Rounding:** Results are rounded to 2 decimal places using `round-half-up`.

<!-- NOTE: This documentation is INTENTIONALLY STALE for the ChangeProof demo.
     The PR changed the rounding method to round-half-down but did not update
     this file. ChangeProof should detect DOC_STALE_OR_MISSING for this change. -->

## BulkImportHandler

### POST /api/orders/bulk

Bulk order import. Returns imported count and any row errors.
