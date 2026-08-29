import { eq } from 'drizzle-orm';
import { measurementEvents, type Database } from '@adflow/db';
import { id } from '@adflow/shared';

export class MeasurementRepository {
  constructor(private readonly db: Database) {}

  async insert(event: Omit<typeof measurementEvents.$inferInsert, 'id'>) {
    try {
      const [created] = await this.db
        .insert(measurementEvents)
        .values({ id: id('evt'), ...event })
        .returning();
      return { duplicate: false, event: created! };
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code !== '23505') throw error;
      const [existing] = await this.db
        .select()
        .from(measurementEvents)
        .where(eq(measurementEvents.eventKey, event.eventKey))
        .limit(1);
      return { duplicate: true, event: existing! };
    }
  }
}
