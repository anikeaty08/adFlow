import { and, asc, eq, gt } from 'drizzle-orm';
import { activityEvents, type Database } from '@adflow/db';

export class ActivityRepository {
  constructor(private readonly db: Database) {}

  listSince(campaignId: string, after: Date) {
    return this.db
      .select()
      .from(activityEvents)
      .where(and(eq(activityEvents.campaignId, campaignId), gt(activityEvents.createdAt, after)))
      .orderBy(asc(activityEvents.createdAt))
      .limit(100);
  }

  list(campaignId: string, after?: Date) {
    return this.db
      .select()
      .from(activityEvents)
      .where(
        after
          ? and(eq(activityEvents.campaignId, campaignId), gt(activityEvents.createdAt, after))
          : eq(activityEvents.campaignId, campaignId),
      )
      .orderBy(asc(activityEvents.createdAt))
      .limit(100);
  }
}
