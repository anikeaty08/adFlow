import { and, eq, gte, inArray, isNotNull, isNull, lt } from 'drizzle-orm';
import { agreements, measurementEvents, settlementEpochs, type Database } from '@adflow/db';
import { hash, id } from '@adflow/shared';
import { settlementEpochWindow } from './settlement-epoch-window.js';

/**
 * Builds settlement epochs from locked, deterministic measurement rows. The database lock and
 * `settlement_epoch_id is null` predicate ensure an accepted event belongs to at most one epoch.
 */
export class SettlementEpochService {
  constructor(private readonly db: Database) {}

  async prepareEligibleEpochs(limitPerAgreement = 1_000) {
    const activeAgreements = await this.db
      .select({ id: agreements.id, pricingModel: agreements.pricingModel })
      .from(agreements)
      .where(and(eq(agreements.status, 'ACTIVE'), isNotNull(agreements.onchainAgreementId)));

    const epochIds: string[] = [];
    for (const agreement of activeAgreements) {
      const epochId = await this.prepareAgreementEpoch(
        agreement.id,
        agreement.pricingModel === 'CPC' ? 'CLICK' : 'IMPRESSION',
        limitPerAgreement,
      );
      if (epochId) epochIds.push(epochId);
    }
    return epochIds;
  }

  private async prepareAgreementEpoch(
    agreementId: string,
    eventType: string,
    limit: number,
  ): Promise<string | undefined> {
    return this.db.transaction(async (tx) => {
      const [first] = await tx
        .select({ occurredAt: measurementEvents.occurredAt })
        .from(measurementEvents)
        .where(
          and(
            eq(measurementEvents.agreementId, agreementId),
            eq(measurementEvents.eventType, eventType),
            eq(measurementEvents.status, 'ACCEPTED'),
            isNull(measurementEvents.settlementEpochId),
          ),
        )
        .orderBy(measurementEvents.occurredAt)
        .limit(1)
        .for('update', { skipLocked: true });
      if (!first) return undefined;

      const window = settlementEpochWindow(agreementId, first.occurredAt);
      const events = await tx
        .select({ id: measurementEvents.id })
        .from(measurementEvents)
        .where(
          and(
            eq(measurementEvents.agreementId, agreementId),
            eq(measurementEvents.eventType, eventType),
            eq(measurementEvents.status, 'ACCEPTED'),
            isNull(measurementEvents.settlementEpochId),
            gte(measurementEvents.occurredAt, window.windowStart),
            lt(measurementEvents.occurredAt, window.windowEnd),
          ),
        )
        .orderBy(measurementEvents.occurredAt)
        .limit(limit)
        .for('update', { skipLocked: true });
      if (events.length === 0) return undefined;

      const epochId = id('epc');
      const evidenceRoot = hash(events.map((event) => event.id).join(':'));
      await tx.insert(settlementEpochs).values({
        id: epochId,
        agreementId,
        // A window can be split into deterministic, non-overlapping batches under load.
        epochKey: `${window.epochKey}:${events[0]!.id}:${events.at(-1)!.id}`,
        windowStart: window.windowStart,
        windowEnd: window.windowEnd,
        verifiedUnits: events.length,
        evidenceRoot,
        status: 'PREPARED',
      });
      await tx
        .update(measurementEvents)
        .set({ settlementEpochId: epochId })
        .where(
          and(
            inArray(
              measurementEvents.id,
              events.map((event) => event.id),
            ),
            isNull(measurementEvents.settlementEpochId),
          ),
        );
      return epochId;
    });
  }
}
