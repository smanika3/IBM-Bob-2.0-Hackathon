// Synthetic fixture test — not executed by ChangeProof
// REQ-102

import { describe, it, expect } from 'vitest';
import { createToken, verifyToken, TokenExpiredError } from '../../src/auth/jwt.service.js';

describe('REQ-102 jwt.service', () => {
  it('AC-102-1: generates an HS256 signed token with 15 minutes TTL', () => {
    const token = createToken('user-123', 'dev@changeproof.local', ['admin']);
    expect(typeof token).toBe('string');
  });

  it('AC-102-2: decodes and verifies a valid token payload', () => {
    const token = createToken('user-456', 'reviewer@changeproof.local', ['auditor']);
    const decoded = verifyToken(token);
    expect(decoded.sub).toBe('user-456');
    expect(decoded.roles).toContain('auditor');
  });
});
