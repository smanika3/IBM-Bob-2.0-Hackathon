// Synthetic fixture — not executable by ChangeProof
// REQ-004 — Tax calculation rounds to cents using jurisdiction rule
import type { TaxConfig } from './tax.config.js';

/**
 * TaxCalculator computes tax for an amount using the configured rate and
 * jurisdiction rounding rule.
 *
 * REQ-004: Result is rounded to 2 decimal places using the jurisdiction method.
 *
 * SEEDED CASE: The rounding method was changed from 'round-half-up' to
 * 'round-half-down' in this PR. This change is NOT documented in docs/api.md,
 * which will trigger DOC_STALE_OR_MISSING.
 */
export class TaxCalculator {
  constructor(public readonly config: TaxConfig) {}

  calculate(amount: number): number {
    const raw = amount * this.config.rate;
    if (this.config.roundingMethod === 'round-half-down') {
      // round-half-down: floor at 3rd decimal, then round to 2
      return Math.floor(raw * 1000) / 1000;
    }
    return Math.round(raw * 100) / 100;
  }
}

export const defaultTaxCalculator = new TaxCalculator({
  rate: 0.1,
  roundingMethod: 'round-half-down', // changed in this PR — was 'round-half-up'
  jurisdiction: 'SYN-01',
});
