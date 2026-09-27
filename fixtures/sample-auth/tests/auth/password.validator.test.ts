// Synthetic fixture test — not executed by ChangeProof
// REQ-101

import { describe, it, expect } from 'vitest';
import { validatePassword, WeakPasswordError } from '../../src/auth/password.validator.js';

describe('REQ-101 validatePassword', () => {
  it('AC-101-1: accepts strong password with uppercase, digit, and special symbol', () => {
    expect(validatePassword('StrongP@ssw0rd!')).toBe(true);
  });

  it('AC-101-2: throws WeakPasswordError for passwords shorter than 10 characters', () => {
    expect(() => validatePassword('Sh0rt!')).toThrow(WeakPasswordError);
  });

  it('AC-101-3: throws WeakPasswordError when special characters are missing', () => {
    expect(() => validatePassword('NoSpecialChar123')).toThrow(WeakPasswordError);
  });
});
