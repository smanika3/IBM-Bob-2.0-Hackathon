// Synthetic fixture — not executable by ChangeProof
// Tests for REQ-005 — auth middleware
// SEEDED CASE: REQ-005 (bulk import admin restriction) has NO test coverage here.
// bulk-import.handler.ts is changed in the PR but has no test referencing admin enforcement.
// The auth middleware tests cover requireAdmin but don't tie back to REQ-005 or bulk import.
// This triggers REQ_WITHOUT_TEST for REQ-005.

import { describe, it, expect } from 'vitest';
import { requireAdmin, requireAuthenticated } from '../../src/auth/auth.middleware.js';
import type { AuthContext } from '../../src/auth/auth.middleware.js';

describe('requireAdmin', () => {
  it('does not throw for admin context', () => {
    const ctx: AuthContext = { userId: 'user-1', role: 'admin' };
    expect(() => requireAdmin(ctx)).not.toThrow();
  });

  it('throws 403 for non-admin context', () => {
    const ctx: AuthContext = { userId: 'user-2', role: 'user' };
    expect(() => requireAdmin(ctx)).toThrow('Forbidden');
  });
});

describe('requireAuthenticated', () => {
  it('does not throw for authenticated user', () => {
    const ctx: AuthContext = { userId: 'user-1', role: 'user' };
    expect(() => requireAuthenticated(ctx)).not.toThrow();
  });
});

// NOTE: No test exercises the bulk import endpoint with admin/non-admin scenarios.
// No test references processBulkImport or REQ-005 acceptance criteria.
