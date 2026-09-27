# Sample Payment Gateway & Webhook Service — Requirements

This is a synthetic TypeScript payment gateway integration project created for the ChangeProof demo.
No real financial or credit card data is used.

---

## REQ-201 — Idempotent payment charge execution

All payment charge requests must include an `idempotencyKey`. The charge service must cache charge responses for 24 hours. Repeating a charge with the same idempotency key must return the original transaction without issuing a duplicate bank charge.

### Acceptance criteria

- AC-201-1: Given a new idempotency key, `createCharge` issues a charge and returns a `settled` charge record.
- AC-201-2: Given an existing idempotency key within 24 hours, `createCharge` returns the cached charge record.
- AC-201-3: Given a charge request with non-positive amount, `createCharge` throws `InvalidAmountError`.

**Source:** `src/payments/charge.service.ts`

---

## REQ-202 — Webhook cryptographic signature verification

Inbound webhook events from payment networks must be signed using HMAC-SHA256 with the shared webhook secret. Unsigned or corrupted payloads must be rejected immediately before event processing.

### Acceptance criteria

- AC-202-1: Valid HMAC-SHA256 signature returns `true` from `verifyWebhookSignature`.
- AC-202-2: Missing or invalid signature returns `false` or throws `InvalidSignatureError`.
- AC-202-3: Signature timestamp must not drift by more than 300 seconds from current time.

**Source:** `src/webhooks/webhook.verifier.ts`

---

## REQ-203 — Refund processing for settled charges

Settled payment charges can be refunded partially or in full. Total refunded amounts cannot exceed the original settled charge amount.

### Acceptance criteria

- AC-203-1: Valid refund amount creates a new refund record linked to the original charge.
- AC-203-2: Attempting to refund an unsettled or failed charge throws `ChargeNotRefundableError`.
- AC-203-3: Refund amount exceeding remaining balance throws `ExceededRefundAmountError`.

**Source:** `src/refunds/refund.service.ts`

---

## REQ-204 — Processing fee calculation

The transaction fee must be computed at 2.9% plus a fixed $0.30 fee and rounded to the nearest integer cent.

### Acceptance criteria

- AC-204-1: Computes percentage fee and fixed 30-cent fee correctly for integer cent inputs.
- AC-204-2: Rounds fractional fees to the nearest whole cent using half-up rounding.

**Source:** `src/payments/fee.calculator.ts`

---

## REQ-205 — Outbound webhook event dispatch

When a payment charge or refund settles, the gateway must dispatch an outbound webhook event with retry backoff to all subscribed partner endpoints.

### Acceptance criteria

- AC-205-1: Dispatches `payment.succeeded` event on charge completion.
- AC-205-2: Dispatches `refund.created` event on refund completion.

**Source:** `src/webhooks/webhook.dispatcher.ts`
