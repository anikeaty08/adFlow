export type PublisherCandidate = {
  categories: string[];
  floorRateAtomic: string;
  reputationScore?: number;
  siteStatus: string;
  slotStatus: string;
};

export type CampaignEligibilityPolicy = {
  allowedCategories: string[];
  blockedCategories: string[];
  maxUnitPriceAtomic: string;
  minReputationScore: string;
};

export type PublisherEligibility = {
  eligible: boolean;
  reasonCodes: string[];
  score: {
    total: number;
    components: Record<string, number>;
  };
};

/**
 * Applies non-negotiable marketplace rules before a candidate is returned to an API caller or an
 * agent. A missing reputation score cannot satisfy a campaign that explicitly requires one.
 */
export function evaluatePublisherEligibility(
  campaign: CampaignEligibilityPolicy,
  candidate: PublisherCandidate,
): PublisherEligibility {
  const reasonCodes: string[] = [];
  const allowed = normalized(campaign.allowedCategories);
  const blocked = normalized(campaign.blockedCategories);
  const categories = normalized(candidate.categories);
  const reputationScore = candidate.reputationScore;

  if (candidate.siteStatus !== 'VERIFIED') reasonCodes.push('SITE_NOT_VERIFIED');
  if (candidate.slotStatus !== 'ACTIVE') reasonCodes.push('SLOT_NOT_ACTIVE');
  if (BigInt(candidate.floorRateAtomic) > BigInt(campaign.maxUnitPriceAtomic))
    reasonCodes.push('PRICE_CAP_EXCEEDED');
  if (blocked.some((category) => categories.includes(category))) reasonCodes.push('BLOCKED_CATEGORY');
  if (allowed.length > 0 && !allowed.some((category) => categories.includes(category)))
    reasonCodes.push('TARGETING_CATEGORY_MISMATCH');

  const minimumReputation = Number(campaign.minReputationScore);
  if (minimumReputation > 0 && reputationScore === undefined) reasonCodes.push('REPUTATION_UNAVAILABLE');
  if (reputationScore !== undefined && reputationScore < minimumReputation)
    reasonCodes.push('REPUTATION_BELOW_MINIMUM');

  const components = {
    reputation: reputationScore ?? 0,
    targetingMatch:
      allowed.length === 0 || allowed.some((category) => categories.includes(category)) ? 100 : 0,
    priceHeadroom: priceHeadroom(campaign.maxUnitPriceAtomic, candidate.floorRateAtomic),
  };

  return {
    eligible: reasonCodes.length === 0,
    reasonCodes,
    score: {
      total: Math.round(
        components.reputation * 0.6 + components.targetingMatch * 0.25 + components.priceHeadroom * 0.15,
      ),
      components,
    },
  };
}

function normalized(categories: string[]) {
  return categories.map((category) => category.trim().toLowerCase()).filter(Boolean);
}

function priceHeadroom(maxUnitPriceAtomic: string, floorRateAtomic: string) {
  const maximum = BigInt(maxUnitPriceAtomic);
  if (maximum === 0n) return 0;
  const floor = BigInt(floorRateAtomic);
  if (floor >= maximum) return 0;
  return Number(((maximum - floor) * 100n) / maximum);
}
