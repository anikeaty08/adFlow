import { and, desc, eq, inArray } from 'drizzle-orm';
import { campaignCreatives, campaignPolicies, campaigns, creatives, type Database } from '@adflow/db';
import { DomainError, id } from '@adflow/shared';

export type NewCampaign = {
  ownerUserId: string;
  ownerWalletId: string;
  name: string;
  objectiveText: string;
  landingUrl: string;
  pricingModel: 'CPC' | 'CPM';
  settlementToken: { symbol: string; address: string };
  budgetPlannedAtomic: string;
  maxUnitPriceAtomic: string;
  startAt: Date;
  endAt: Date;
  allowedCategories: string[];
  blockedCategories: string[];
  minReputationScore: number;
  maxPublisherAllocationAtomic?: string;
  explorationRatioBasisPoints: number;
  creativeIds?: string[];
};

export class CampaignRepository {
  constructor(private readonly db: Database) {}

  async create(input: NewCampaign) {
    const campaignId = id('cmp');
    const creativeIds = [...new Set(input.creativeIds ?? [])];
    await this.db.transaction(async (tx) => {
      await tx.insert(campaigns).values({
        id: campaignId,
        ownerUserId: input.ownerUserId,
        ownerWalletId: input.ownerWalletId,
        name: input.name,
        objectiveText: input.objectiveText,
        landingUrl: input.landingUrl,
        pricingModel: input.pricingModel,
        settlementTokenSymbol: input.settlementToken.symbol,
        settlementTokenAddress: input.settlementToken.address,
        budgetPlannedAtomic: input.budgetPlannedAtomic,
        maxUnitPriceAtomic: input.maxUnitPriceAtomic,
        startAt: input.startAt,
        endAt: input.endAt,
      });
      await tx.insert(campaignPolicies).values({
        campaignId,
        allowedCategories: input.allowedCategories,
        blockedCategories: input.blockedCategories,
        minReputationScore: input.minReputationScore.toString(),
        maxPublisherAllocationAtomic: input.maxPublisherAllocationAtomic,
        explorationRatioBasisPoints: input.explorationRatioBasisPoints,
      });

      if (!creativeIds.length) return;

      const ownedCreatives = await tx
        .select({ id: creatives.id })
        .from(creatives)
        .where(
          and(
            eq(creatives.ownerUserId, input.ownerUserId),
            eq(creatives.status, 'ACTIVE'),
            inArray(creatives.id, creativeIds),
          ),
        );

      if (ownedCreatives.length !== creativeIds.length)
        throw new DomainError('INVALID_CREATIVE', 'One or more selected creatives are unavailable.');

      await tx
        .insert(campaignCreatives)
        .values(creativeIds.map((creativeId) => ({ campaignId, creativeId })));
    });
    return this.findById(campaignId, input.ownerUserId);
  }

  async findById(campaignId: string, ownerUserId: string) {
    const [campaign] = await this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.ownerUserId, ownerUserId)))
      .limit(1);
    if (!campaign) return undefined;
    const [policy] = await this.db
      .select()
      .from(campaignPolicies)
      .where(eq(campaignPolicies.campaignId, campaignId))
      .limit(1);
    return { ...campaign, policy };
  }

  listByOwner(ownerUserId: string) {
    return this.db
      .select()
      .from(campaigns)
      .where(eq(campaigns.ownerUserId, ownerUserId))
      .orderBy(desc(campaigns.createdAt));
  }

  async updateDraft(
    campaignId: string,
    ownerUserId: string,
    update: { name?: string; objectiveText?: string; landingUrl?: string },
  ) {
    const [campaign] = await this.db
      .update(campaigns)
      .set({ ...update, updatedAt: new Date() })
      .where(
        and(
          eq(campaigns.id, campaignId),
          eq(campaigns.ownerUserId, ownerUserId),
          eq(campaigns.status, 'DRAFT'),
        ),
      )
      .returning();
    return campaign;
  }
}
