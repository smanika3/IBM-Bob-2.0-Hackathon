// Synthetic fixture test — not executed by ChangeProof
// REQ-201

import { describe, it, expect } from 'vitest';
import { createCharge, InvalidAmountError } from '../../src/payments/charge.service.js';

describe('REQ-201 createCharge', () => {
  it('AC-201-1: creates a new charge with unique idempotencyKey', () => {
    const res = createCharge({
      amountCents: 5000,
      currency: 'USD',
      customerId: 'cust_123',
      idempotencyKey: 'idemp_key_001',
    });
    expect(res.status).toBe('settled');
    expect(res.amountCents).toBe(5000);
  });

  it('AC-201-2: returns cached charge for duplicate idempotencyKey', () => {
    const first = createCharge({
      amountCents: 2500,
      currency: 'USD',
      customerId: 'cust_456',
      idempotencyKey: 'idemp_key_dup',
    });
    const second = createCharge({
      amountCents: 2500,
      currency: 'USD',
      customerId: 'cust_456',
      idempotencyKey: 'idemp_key_dup',
    });
    expect(first.chargeId).toBe(second.chargeId);
  });

  it('AC-201-3: throws InvalidAmountError for non-positive amount', () => {
    expect(() =>
      createCharge({
        amountCents: 0,
        currency: 'USD',
        customerId: 'cust_789',
        idempotencyKey: 'idemp_key_invalid',
      }),
    ).toThrow(InvalidAmountError);
  });
});
