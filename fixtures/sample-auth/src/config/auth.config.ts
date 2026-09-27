// Synthetic fixture — not executable by ChangeProof
// REQ-105 — Auth configuration validation
// Triggers CONFIG_OR_SCHEMA_CHANGED

export interface AuthConfig {
  jwtSecret: string;
  jwtIssuer: string;
  tokenTtlMinutes: number;
  mfaEnabled: boolean; // Added in this PR
  maxFailedAttempts: number;
}

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  jwtSecret: 'change-proof-super-secure-production-jwt-key-256',
  jwtIssuer: 'changeproof-auth-service',
  tokenTtlMinutes: 15,
  mfaEnabled: true,
  maxFailedAttempts: 5,
};

export function loadAuthConfig(): AuthConfig {
  return DEFAULT_AUTH_CONFIG;
}
