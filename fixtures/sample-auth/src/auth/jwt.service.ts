// Synthetic fixture — not executable by ChangeProof
// REQ-102

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  exp: number;
  iat: number;
}

export class TokenExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

export interface VerifyTokenOptions {
  ignoreExpiration?: boolean;
  clockToleranceSeconds?: number;
}

/**
 * REQ-102 — Issues HS256 signed JWT tokens
 */
export function createToken(userId: string, email: string, roles: string[]): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 15 * 60; // 15 minutes TTL

  const payload: JwtPayload = { sub: userId, email, roles, exp, iat };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

/**
 * REQ-102 — Verifies JWT token and checks expiration
 * PUBLIC API CHANGED in this PR: accepts VerifyTokenOptions parameter.
 */
export function verifyToken(token: string, options?: VerifyTokenOptions): JwtPayload {
  const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as JwtPayload;
  const now = Math.floor(Date.now() / 1000);

  if (!options?.ignoreExpiration && decoded.exp < now) {
    throw new TokenExpiredError('JWT token has expired.');
  }

  return decoded;
}
