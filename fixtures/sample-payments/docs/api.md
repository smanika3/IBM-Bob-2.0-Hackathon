# Payment Gateway API Documentation

Documentation for the Payment Gateway integration.

## Endpoints

### POST /v1/charges

Creates a new payment charge against a customer payment method.
Requires `idempotencyKey` to avoid double charges.

### POST /v1/webhooks/verify

Cryptographically verifies an incoming webhook payload signature.
