// Synthetic fixture — not executable by ChangeProof
// NOTE: Added in PR as internal refactor utility without an explicit product requirement.
// Triggers CODE_WITHOUT_REQ in ChangeProof analysis.

export type SupportedCurrency = 'USD' | 'EUR' | 'GBP' | 'CAD';

export function formatCurrencyAmount(
  amountCents: number,
  currency: SupportedCurrency = 'USD',
): string {
  const units = (amountCents / 100).toFixed(2);
  switch (currency) {
    case 'USD':
      return `$${units}`;
    case 'EUR':
      return `€${units}`;
    case 'GBP':
      return `£${units}`;
    case 'CAD':
      return `CA$${units}`;
  }
}
