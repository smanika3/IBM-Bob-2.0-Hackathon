// Synthetic fixture — not executable by ChangeProof
// REQ-203 — Refund processing for settled charges
// NOTE: Added in PR without unit tests (triggers TEST_GAP_ON_CHANGED_SYMBOL)

export class ChargeNotRefundableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChargeNotRefundableError';
  }
}

export class ExceededRefundAmountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExceededRefundAmountError';
  }
}

export interface RefundRequest {
  chargeId: string;
  amountCents: number;
  reason?: string;
}

export interface RefundResult {
  refundId: string;
  chargeId: string;
  amountCents: number;
  status: 'succeeded' | 'failed';
  processedAt: string;
}

/**
 * REQ-203 — Processes partial or full refunds against settled transactions.
 */
export function processRefund(request: RefundRequest): RefundResult {
  if (request.amountCents <= 0) {
    throw new ExceededRefundAmountError('Refund amount must be positive.');
  }

  return {
    refundId: `re_${Date.now()}`,
    chargeId: request.chargeId,
    amountCents: request.amountCents,
    status: 'succeeded',
    processedAt: new Date().toISOString(),
  };
}
