import { and, desc, eq } from 'drizzle-orm';
import { quotes, type Database } from '@adflow/db';
import { canonicalJson, DomainError, hash, id } from '@adflow/shared';

export type QuoteInput = {
  campaignId: string;
  publisherAgentId: string;
  slotId: string;
  pricingModel: 'CPC' | 'CPM';
  rateAtomic: string;
  unitScale: number;
  maxAllocationAtomic: string;
  publisherWallet: string;
  quoteNonce: string;
  validUntil: Date;
  signature: string;
};

export class QuoteRepository {
  constructor(private readonly db: Database) {}

  async create(input: QuoteInput) {
    const canonicalHash = hash(canonicalJson(input));
    try {
      const [quote] = await this.db
        .insert(quotes)
        .values({ id: id('qte'), ...input, canonicalHash })
        .returning();
      return quote!;
    } catch (error) {
      if ((error as { code?: string }).code === '23505')
        throw new DomainError('QUOTE_REPLAYED', 'This publisher quote nonce has already been used.');
      throw error;
    }
  }

  listForCampaign(campaignId: string) {
    return this.db
      .select()
      .from(quotes)
      .where(eq(quotes.campaignId, campaignId))
      .orderBy(desc(quotes.validUntil));
  }

  async find(quoteId: string, campaignId: string) {
    const [quote] = await this.db
      .select()
      .from(quotes)
      .where(and(eq(quotes.id, quoteId), eq(quotes.campaignId, campaignId)))
      .limit(1);
    return quote;
  }
}
