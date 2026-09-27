// Synthetic fixture — not executable by ChangeProof
// REQ-201

export class InvalidAmountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAmountError';
  }
}

export interface ChargeRequest {
  amountCents: number;
  currency: string;
  customerId: string;
  idempotencyKey: string;
}

export interface ChargeResult {
  chargeId: string;
  amountCents: number;
  status: 'settled' | 'failed' | 'pending';
  idempotencyKey: string;
  createdAt: string;
}

const idempotencyCache = new Map<string, ChargeResult>();

/**
 * REQ-201 — Creates a charge or returns cached result for idempotent retry.
 * PUBLIC API CHANGED: requires idempotencyKey.
 */
export function createCharge(request: ChargeRequest): ChargeResult {
  if (!request.amountCents || request.amountCents <= 0) {
    throw new InvalidAmountError('Charge amount must be greater than zero.');
  }

  const cached = idempotencyCache.get(request.idempotencyKey);
  if (cached) {
    return cached;
  }

  const result: ChargeResult = {
    chargeId: `ch_${Date.now()}`,
    amountCents: request.amountCents,
    status: 'settled',
    idempotencyKey: request.idempotencyKey,
    createdAt: new Date().toISOString(),
  };

  idempotencyCache.set(request.idempotencyKey, result);
  return result;
}
