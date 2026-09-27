// Synthetic fixture — not executable by ChangeProof
// REQ-004 — Tax calculation rounds to cents

export interface TaxConfig {
  rate: number;
  roundingMethod: 'round-half-down' | 'round-half-up';
  jurisdiction: string;
}
