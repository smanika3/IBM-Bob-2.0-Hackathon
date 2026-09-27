// Synthetic fixture — not executable by ChangeProof
// REQ-202

import * as crypto from 'node:crypto';

export class InvalidSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSignatureError';
  }
}

/**
 * REQ-202 — Verifies HMAC-SHA256 signature for incoming webhooks.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !payload || !secret) {
    return false;
  }

  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
