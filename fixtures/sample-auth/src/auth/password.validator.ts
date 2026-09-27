// Synthetic fixture — not executable by ChangeProof
// REQ-101

export class WeakPasswordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WeakPasswordError';
  }
}

export interface PasswordValidationResult {
  valid: boolean;
  score: number;
}

/**
 * REQ-101 — Validates password strength
 * Requires at least 10 chars, uppercase, digit, and special char.
 */
export function validatePassword(password: string): boolean {
  if (!password || password.length < 10) {
    throw new WeakPasswordError('Password must be at least 10 characters in length.');
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpper || !hasDigit || !hasSpecial) {
    throw new WeakPasswordError('Password must contain uppercase letters, numbers, and symbols.');
  }

  return true;
}
