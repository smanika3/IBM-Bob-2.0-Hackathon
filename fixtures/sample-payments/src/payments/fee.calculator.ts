// Synthetic fixture — not executable by ChangeProof
// REQ-204 — Processing fee calculation (2.9% + 30¢)

export interface FeeBreakdown {
  percentageFeeCents: number;
  fixedFeeCents: number;
  totalFeeCents: number;
  netSettlementCents: number;
}

/**
 * REQ-204 — Computes payment processing fees rounded to nearest whole cent.
 */
export function calculatePaymentFee(amountCents: number): FeeBreakdown {
  const percentageFee = Math.round(amountCents * 0.029);
  const fixedFee = 30;
  const totalFee = percentageFee + fixedFee;
  const netSettlement = amountCents - totalFee;

  return {
    percentageFeeCents: percentageFee,
    fixedFeeCents: fixedFee,
    totalFeeCents: totalFee,
    netSettlementCents: netSettlement,
  };
}
