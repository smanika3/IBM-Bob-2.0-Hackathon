// Synthetic fixture test — not executed by ChangeProof
// REQ-202

import { describe, it, expect } from 'vitest';
import * as crypto from 'node:crypto';
import { verifyWebhookSignature } from '../../src/webhooks/webhook.verifier.js';

describe('REQ-202 verifyWebhookSignature', () => {
  const secret = 'whsec_test_secret_key_12345';
  const payload = JSON.stringify({ event: 'payment.succeeded', id: 'evt_123' });
  const validSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  it('AC-202-1: returns true for valid HMAC-SHA256 signature', () => {
    expect(verifyWebhookSignature(payload, validSig, secret)).toBe(true);
  });

  it('AC-202-2: returns false for invalid signature', () => {
    const invalidSig = 'invalid_hex_signature_abcdef';
    expect(verifyWebhookSignature(payload, invalidSig, secret)).toBe(false);
  });
});
