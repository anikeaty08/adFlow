import { and, eq } from 'drizzle-orm';
import {
  adSlots,
  agents,
  campaignPolicies,
  campaigns,
  publishers,
  quoteRequests,
  type Database,
} from '@adflow/db';
import { id } from '@adflow/shared';

/** Persists one request per campaign inventory slot, making agent wakeups idempotent. */
export class QuoteRequestRepository {
  constructor(private readonly db: Database) {}

  async createIfMissing(input: { campaignId: string; publisherAgentId: string; slotId: string }) {
    const [created] = await this.db
      .insert(quoteRequests)
      .values({ id: id('qrq'), ...input })
      .onConflictDoNothing()
      .returning();
    return created;
  }

  markFulfilled(input: { campaignId: string; publisherAgentId: string; slotId: string }) {
    return this.db
      .update(quoteRequests)
      .set({ status: 'FULFILLED', fulfilledAt: new Date() })
      .where(
        and(
          eq(quoteRequests.campaignId, input.campaignId),
          eq(quoteRequests.publisherAgentId, input.publisherAgentId),
          eq(quoteRequests.slotId, input.slotId),
          eq(quoteRequests.status, 'PENDING'),
        ),
      );
  }

  listPendingForPublisherOwner(ownerUserId: string) {
    return this.db
      .select({ request: quoteRequests })
      .from(quoteRequests)
      .innerJoin(agents, eq(quoteRequests.publisherAgentId, agents.id))
      .innerJoin(publishers, eq(agents.publisherId, publishers.id))
      .where(and(eq(publishers.ownerUserId, ownerUserId), eq(quoteRequests.status, 'PENDING')))
      .orderBy(quoteRequests.requestedAt);
  }

  async findPendingForPublisherOwner(requestId: string, ownerUserId: string) {
    const [row] = await this.db
      .select({
        request: quoteRequests,
        campaign: campaigns,
        policy: campaignPolicies,
        slot: adSlots,
        publisher: publishers,
        agent: agents,
      })
      .from(quoteRequests)
      .innerJoin(agents, eq(quoteRequests.publisherAgentId, agents.id))
      .innerJoin(publishers, eq(agents.publisherId, publishers.id))
      .innerJoin(campaigns, eq(quoteRequests.campaignId, campaigns.id))
      .innerJoin(campaignPolicies, eq(campaigns.id, campaignPolicies.campaignId))
      .innerJoin(adSlots, eq(quoteRequests.slotId, adSlots.id))
      .where(
        and(
          eq(quoteRequests.id, requestId),
          eq(quoteRequests.status, 'PENDING'),
          eq(publishers.ownerUserId, ownerUserId),
        ),
      )
      .limit(1);
    return row;
  }
}
