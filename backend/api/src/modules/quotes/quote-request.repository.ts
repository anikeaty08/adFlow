import { and, eq } from 'drizzle-orm';
import { agents, publishers, quoteRequests, type Database } from '@adflow/db';
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
}
