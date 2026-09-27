// Synthetic fixture — not executable by ChangeProof
// Tests for REQ-004 — Tax calculation
// SEEDED CASE: REQ-004 has ambiguous traceability — both TaxCalculator and
// a hypothetical discount calculator could match tax-related keywords.
// This is the AMBIGUOUS_TRACEABILITY seed.

import { describe, it, expect } from 'vitest';
import { TaxCalculator } from '../../src/tax/tax.calculator.js';

describe('REQ-004 TaxCalculator', () => {
  it('AC-004-1: rounds tax to 2 decimal places', () => {
    const calc = new TaxCalculator({
      rate: 0.1,
      roundingMethod: 'round-half-down',
      jurisdiction: 'SYN-01',
    });
    const result = calc.calculate(10.005);
    expect(Number(result.toFixed(2))).toBe(result);
  });

  it('AC-004-2: uses the configured rate', () => {
    const calc = new TaxCalculator({
      rate: 0.2,
      roundingMethod: 'round-half-up',
      jurisdiction: 'SYN-02',
    });
    expect(calc.calculate(100)).toBeCloseTo(20, 1);
  });

  // Note: AC-004-3 jurisdiction-specific rounding test is covered above but
  // the specific round-half-down behavior changed in this PR.
  // The docs/api.md has not been updated to reflect the rounding change.
});
