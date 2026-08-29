import { asc, eq, isNull } from 'drizzle-orm';
import { outboxEvents, type Database } from '@adflow/db';
import { id } from '@adflow/shared';

export class OutboxRepository {
  constructor(private readonly db: Database) {}

  enqueue(topic: string, aggregateType: string, aggregateId: string, payload: Record<string, unknown>) {
    return this.db.insert(outboxEvents).values({
      id: id('act'),
      topic,
      aggregateType,
      aggregateId,
      payload,
    });
  }

  claimPending(limit: number) {
    return this.db
      .select()
      .from(outboxEvents)
      .where(isNull(outboxEvents.publishedAt))
      .orderBy(asc(outboxEvents.createdAt))
      .limit(limit);
  }

  markPublished(eventId: string) {
    return this.db.update(outboxEvents).set({ publishedAt: new Date() }).where(eq(outboxEvents.id, eventId));
  }

  recordAttempt(eventId: string, attempts: number) {
    return this.db.update(outboxEvents).set({ attempts }).where(eq(outboxEvents.id, eventId));
  }
}
