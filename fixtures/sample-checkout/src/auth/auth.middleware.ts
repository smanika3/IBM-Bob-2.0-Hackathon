// Synthetic fixture — not executable by ChangeProof
// REQ-005 — Admin-only middleware
// SEEDED CASE: This file was changed to add a new exported constant
// `ADMIN_ROLE_HEADER` which is not referenced in any requirement.
// This will trigger CODE_WITHOUT_REQ for the new export.

export type UserRole = 'admin' | 'user' | 'readonly';

export interface AuthContext {
  userId: string;
  role: UserRole;
}

/**
 * NEW in this PR: exported constant for the admin role header name.
 * No requirement references this symbol — triggers CODE_WITHOUT_REQ.
 */
export const ADMIN_ROLE_HEADER = 'x-changeproof-admin-role';

export function requireAdmin(context: AuthContext): void {
  if (context.role !== 'admin') {
    throw Object.assign(new Error('Forbidden: admin role required'), { statusCode: 403 });
  }
}

export function requireAuthenticated(context: AuthContext): void {
  if (!context.userId) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }
}
