/**
 * A vote is guaranteed if it has an active listing or a purchased promise.
 * Guaranteed votes cannot be sold, and their color cannot be broken.
 */

export interface GuaranteeRef {
  id: number;
  voteId: number;
  isActive: boolean;
}

export interface PurchaseRef {
  guaranteeId: number;
}

export function isVoteGuaranteed(
  voteId: number,
  guarantees: GuaranteeRef[],
  purchases: PurchaseRef[],
): boolean {
  return guarantees.some((g) => {
    if (g.voteId !== voteId) return false;
    if (g.isActive) return true;
    return purchases.some((p) => p.guaranteeId === g.id);
  });
}
