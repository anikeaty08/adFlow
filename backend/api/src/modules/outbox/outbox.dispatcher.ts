import type { Database } from '@adflow/db';
import { OutboxRepository } from './outbox.repository.js';

export interface OutboxPublisher {
  publish(event: {
    eventId: string;
    topic: string;
    aggregateId: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
}

/** Publishes only committed records. Postgres remains authoritative if a queue delivery fails. */
export class OutboxDispatcher {
  private readonly repository: OutboxRepository;

  constructor(
    db: Database,
    private readonly publisher: OutboxPublisher,
  ) {
    this.repository = new OutboxRepository(db);
  }

  async dispatchPending(limit = 50) {
    const events = await this.repository.claimPending(limit);
    for (const event of events) {
      try {
        await this.publisher.publish({
          eventId: event.id,
          topic: event.topic,
          aggregateId: event.aggregateId,
          payload: event.payload,
        });
        await this.repository.markPublished(event.id);
      } catch (error) {
        await this.repository.recordAttempt(event.id, event.attempts + 1);
        throw error;
      }
    }
    return events.length;
  }
}
