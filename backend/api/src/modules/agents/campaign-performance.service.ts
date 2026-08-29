import { and, count, eq } from 'drizzle-orm';
import { agreements, measurementEvents, type Database } from '@adflow/db';
import type { MonitorResult } from '@adflow/agent-core';
import {
  classifyCampaignPerformance,
  type CampaignPerformanceMetrics,
} from './campaign-performance.policy.js';

/** Reads canonical verified-delivery metrics; it has no mutation or chain-write capability. */
export class CampaignPerformanceService {
  constructor(private readonly db: Database) {}

  async monitor(campaignId: string): Promise<MonitorResult> {
    const rows = await this.db
      .select({ eventType: measurementEvents.eventType, status: measurementEvents.status, total: count() })
      .from(measurementEvents)
      .innerJoin(agreements, eq(measurementEvents.agreementId, agreements.id))
      .where(eq(agreements.campaignId, campaignId))
      .groupBy(measurementEvents.eventType, measurementEvents.status);

    return classifyCampaignPerformance(this.toMetrics(rows));
  }

  private toMetrics(
    rows: Array<{ eventType: string; status: string; total: number }>,
  ): CampaignPerformanceMetrics {
    const total = (eventType: string, status: string) =>
      Number(rows.find((row) => row.eventType === eventType && row.status === status)?.total ?? 0);
    return {
      acceptedImpressions: total('IMPRESSION', 'ACCEPTED'),
      acceptedClicks: total('CLICK', 'ACCEPTED'),
      rejectedEvents: rows
        .filter((row) => row.status === 'REJECTED')
        .reduce((sum, row) => sum + Number(row.total), 0),
    };
  }
}
