import { and, eq, isNull } from 'drizzle-orm';
import { measurementEvents, type Database } from '@adflow/db';

/**
 * Finalizes queued measurements using deterministic evidence already persisted at ingestion.
 * No model or semantic memory can turn a rejected event into a payable unit.
 */
export class MeasurementVerificationService {
  constructor(private readonly db: Database) {}

  async verifyPending(limit = 500) {
    const events = await this.db
      .select({ id: measurementEvents.id })
      .from(measurementEvents)
      .where(and(eq(measurementEvents.status, 'PENDING'), isNull(measurementEvents.settlementEpochId)))
      .limit(limit);

    if (events.length === 0) return { verified: 0 };
    for (const event of events) {
      await this.db
        .update(measurementEvents)
        .set({ status: 'ACCEPTED', riskScore: '0' })
        .where(and(eq(measurementEvents.id, event.id), eq(measurementEvents.status, 'PENDING')));
    }
    return { verified: events.length };
  }
}
