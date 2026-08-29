export type PublisherOffer = {
  proposedRateAtomic: string;
  categories: string[];
  advertiserReputationScore?: number;
  inventoryAvailable: boolean;
};

export type PublisherNegotiationPolicy = {
  minimumRateAtomic: string;
  blockedCategories: string[];
  acceptedCategories: string[];
  minimumAdvertiserReputationScore: number;
};

export type PublisherOfferDecision = {
  decision: 'ACCEPT' | 'COUNTER' | 'REJECT';
  counterRateAtomic?: string;
  reasonCodes: string[];
};

/**
 * Deterministic publisher-side market rules. This deliberately has no model, database, or chain
 * dependency: the caller supplies canonical facts and the decision is safe to replay in tests.
 */
export function evaluatePublisherOffer(
  policy: PublisherNegotiationPolicy,
  offer: PublisherOffer,
): PublisherOfferDecision {
  const reasonCodes: string[] = [];
  const offeredCategories = normalizeCategories(offer.categories);
  const blockedCategories = normalizeCategories(policy.blockedCategories);
  const acceptedCategories = normalizeCategories(policy.acceptedCategories);

  if (!offer.inventoryAvailable) reasonCodes.push('INVENTORY_UNAVAILABLE');
  if (blockedCategories.some((category) => offeredCategories.includes(category)))
    reasonCodes.push('PUBLISHER_CATEGORY_BLOCKED');
  if (
    acceptedCategories.length > 0 &&
    !acceptedCategories.some((category) => offeredCategories.includes(category))
  )
    reasonCodes.push('PUBLISHER_CATEGORY_NOT_ACCEPTED');

  if (policy.minimumAdvertiserReputationScore > 0 && offer.advertiserReputationScore === undefined) {
    reasonCodes.push('ADVERTISER_REPUTATION_UNAVAILABLE');
  }
  if (
    offer.advertiserReputationScore !== undefined &&
    offer.advertiserReputationScore < policy.minimumAdvertiserReputationScore
  ) {
    reasonCodes.push('ADVERTISER_REPUTATION_BELOW_MINIMUM');
  }

  if (reasonCodes.length > 0) return { decision: 'REJECT', reasonCodes };

  const offeredRate = BigInt(offer.proposedRateAtomic);
  const minimumRate = BigInt(policy.minimumRateAtomic);
  if (offeredRate < minimumRate) {
    return {
      decision: 'COUNTER',
      counterRateAtomic: policy.minimumRateAtomic,
      reasonCodes: ['RATE_BELOW_PUBLISHER_FLOOR'],
    };
  }

  return { decision: 'ACCEPT', reasonCodes: [] };
}

function normalizeCategories(categories: string[]) {
  return categories.map((category) => category.trim().toLowerCase()).filter(Boolean);
}
