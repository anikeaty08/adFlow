import { and, eq } from 'drizzle-orm';
import { agreements, campaigns, quotes, type Database } from '@adflow/db';
import { canonicalJson, hash, id } from '@adflow/shared';

export class AgreementRepository {
  constructor(private readonly db: Database) {}
  async quoteForCampaign(quoteId: string, campaignId: string) {
    const [quote] = await this.db
      .select()
      .from(quotes)
      .where(and(eq(quotes.id, quoteId), eq(quotes.campaignId, campaignId)))
      .limit(1);
    return quote;
  }
  async campaign(campaignId: string, ownerUserId: string) {
    const [campaign] = await this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.ownerUserId, ownerUserId)))
      .limit(1);
    return campaign;
  }
  async createFromQuote(quoteId: string, campaignId: string) {
    const quote = await this.quoteForCampaign(quoteId, campaignId);
    if (!quote) return undefined;
    const agreementId = id('agr');
    const agreementHash = hash(
      canonicalJson({
        campaignId,
        quoteId,
        rate: quote.rateAtomic,
        allocation: quote.maxAllocationAtomic,
        validUntil: quote.validUntil.toISOString(),
      }),
    );
    const [agreement] = await this.db
      .insert(agreements)
      .values({
        id: agreementId,
        campaignId,
        quoteId,
        publisherAgentId: quote.publisherAgentId,
        slotId: quote.slotId,
        pricingModel: quote.pricingModel,
        rateAtomic: quote.rateAtomic,
        unitScale: quote.unitScale,
        allocationCapAtomic: quote.maxAllocationAtomic,
        startAt: new Date(),
        endAt: quote.validUntil,
        agreementHash,
      })
      .returning();
    return agreement!;
  }
}
