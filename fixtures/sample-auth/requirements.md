# Sample Auth & Session Service — Requirements

This is a synthetic TypeScript authentication and identity service created for the ChangeProof demo.
No real credentials, keys, or passwords are used.

---

## REQ-101 — Strong password validation

User passwords must enforce complexity constraints before account registration or credential reset. Passwords must be at least 10 characters long and contain at least one uppercase letter, one digit, and one special character.

### Acceptance criteria

- AC-101-1: Given a password of 10+ characters with uppercase, digit, and special symbol, `validatePassword` returns `true`.
- AC-101-2: Given a password shorter than 10 characters, `validatePassword` throws `WeakPasswordError`.
- AC-101-3: Given a password without special characters, `validatePassword` throws `WeakPasswordError`.

**Source:** `src/auth/password.validator.ts`

---

## REQ-102 — JWT token signature and expiration

Authentication tokens must be signed with the HS256 algorithm and contain user role claims. Access tokens must expire exactly 15 minutes after issuance.

### Acceptance criteria

- AC-102-1: `createToken` generates an HS256 signed token with expiration set to 15 minutes.
- AC-102-2: `verifyToken` decodes valid tokens and verifies expiry against the current system time.
- AC-102-3: Given an expired token, `verifyToken` throws `TokenExpiredError`.

**Source:** `src/auth/jwt.service.ts`

---

## REQ-103 — Multi-factor authentication verification

Users with multi-factor authentication enabled must submit a valid 6-digit TOTP code during session verification. Invalid or replayed codes must be rejected.

### Acceptance criteria

- AC-103-1: `verifyMfaCode` accepts valid 6-digit TOTP codes for the provisioned secret.
- AC-103-2: `verifyMfaCode` returns false for invalid, expired, or non-numeric tokens.
- AC-103-3: Generated MFA secrets must conform to base32 encoding standards.

**Source:** `src/auth/mfa.service.ts`

---

## REQ-104 — Account lockout on failed logins

After 5 consecutive failed login attempts within a 15-minute window, the user account must be temporarily locked.

### Acceptance criteria

- AC-104-1: Accounts with fewer than 5 failed attempts allow continued login attempts.
- AC-104-2: The 5th consecutive failure triggers `AccountLockedError` with unlock timestamp.
- AC-104-3: A successful login resets the consecutive failure counter to zero.

**Source:** `src/auth/lockout.service.ts`

---

## REQ-105 — Auth configuration validation

The authentication configuration module must validate required environment variables on startup and reject blank or default development secrets in non-development environments.

### Acceptance criteria

- AC-105-1: Loads configuration with valid JWT secret, issuer, and token TTL values.
- AC-105-2: Throws `ConfigValidationError` if `JWT_SECRET` is shorter than 32 characters.
- AC-105-3: Validates MFA configuration parameters when `mfaEnabled` is set to `true`.

**Source:** `src/config/auth.config.ts`, `docs/api.md`
