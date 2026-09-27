// Synthetic fixture test — not executed by ChangeProof
// REQ-104

import { describe, it, expect } from 'vitest';
import {
  recordLoginFailure,
  recordLoginSuccess,
  AccountLockedError,
} from '../../src/auth/lockout.service.js';

describe('REQ-104 lockout.service', () => {
  it('AC-104-1: allows login attempts below threshold', () => {
    expect(() => {
      recordLoginFailure('test@changeproof.local');
      recordLoginFailure('test@changeproof.local');
    }).not.toThrow();
  });

  it('AC-104-2: locks account after 5 consecutive failures', () => {
    const email = 'lockout-test@changeproof.local';
    recordLoginFailure(email);
    recordLoginFailure(email);
    recordLoginFailure(email);
    recordLoginFailure(email);
    expect(() => recordLoginFailure(email)).toThrow(AccountLockedError);
  });

  it('AC-104-3: resets failure counter on successful login', () => {
    const email = 'reset-test@changeproof.local';
    recordLoginFailure(email);
    recordLoginSuccess(email);
    expect(() => recordLoginFailure(email)).not.toThrow();
  });
});
