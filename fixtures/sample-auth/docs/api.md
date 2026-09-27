# Auth & Session Service API

Synthetic API documentation for the Auth & Session service.

## Endpoints

### POST /api/v1/auth/token

Issues an HS256 signed JWT token for valid credentials.

### POST /api/v1/auth/verify

Validates a provided JWT token.

### POST /api/v1/auth/password/validate

Validates password complexity against REQ-101.
