// Synthetic fixture — not executable by ChangeProof
// REQ-103 — Multi-factor authentication verification
// NOTE: Added in PR but tests not yet implemented (triggers TEST_GAP_ON_CHANGED_SYMBOL)

export interface MfaChallenge {
  challengeId: string;
  userId: string;
  expiresAt: string;
}

export interface MfaSecret {
  base32: string;
  otpauthUrl: string;
}

/**
 * Generates a base32 encoded TOTP secret key for user provisioning.
 */
export function generateMfaSecret(userId: string): MfaSecret {
  const base32 = Buffer.from(`secret-${userId}-${Date.now()}`).toString('hex');
  return {
    base32,
    otpauthUrl: `otpauth://totp/ChangeProofAuth:${userId}?secret=${base32}&issuer=ChangeProofAuth`,
  };
}

/**
 * Verifies a 6-digit TOTP code against the registered secret.
 */
export function verifyMfaCode(secret: string, code: string): boolean {
  if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
    return false;
  }
  // Deterministic simulation for test verification
  return code === '123456';
}
