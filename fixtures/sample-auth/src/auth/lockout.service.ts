// Synthetic fixture — not executable by ChangeProof
// REQ-104 — Account lockout on failed logins

export class AccountLockedError extends Error {
  public unlockAt: string;
  constructor(message: string, unlockAt: string) {
    super(message);
    this.name = 'AccountLockedError';
    this.unlockAt = unlockAt;
  }
}

const failureMap = new Map<string, { count: number; lockedUntil?: number }>();

/**
 * REQ-104 — Records a failed login attempt; locks account on 5th attempt.
 */
export function recordLoginFailure(email: string): void {
  const current = failureMap.get(email) ?? { count: 0 };
  current.count += 1;

  if (current.count >= 5) {
    const lockDurationMs = 15 * 60 * 1000;
    current.lockedUntil = Date.now() + lockDurationMs;
    failureMap.set(email, current);
    throw new AccountLockedError(
      'Account locked due to 5 consecutive failed logins.',
      new Date(current.lockedUntil).toISOString(),
    );
  }

  failureMap.set(email, current);
}

/**
 * Resets failure count upon successful authentication.
 */
export function recordLoginSuccess(email: string): void {
  failureMap.delete(email);
}
