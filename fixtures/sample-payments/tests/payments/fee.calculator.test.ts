// Synthetic fixture test — not executed by ChangeProof
// REQ-204

import { describe, it, expect } from 'vitest';
import { calculatePaymentFee } from '../../src/payments/fee.calculator.js';

describe('REQ-204 fee.calculator', () => {
  it('AC-204-1: computes 2.9% + 30¢ fee accurately', () => {
    // $100.00 = 10000 cents -> 2.9% is 290 cents + 30 cents = 320 cents fee
    const fee = calculatePaymentFee(10000);
    expect(fee.percentageFeeCents).toBe(290);
    expect(fee.fixedFeeCents).toBe(30);
    expect(fee.totalFeeCents).toBe(320);
    expect(fee.netSettlementCents).toBe(9680);
  });
});
