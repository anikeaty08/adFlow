import { and, eq } from 'drizzle-orm';
import { creatives, type Database } from '@adflow/db';
import { id } from '@adflow/shared';

export class CreativeRepository {
  constructor(private readonly db: Database) {}
  async create(input: Omit<typeof creatives.$inferInsert, 'id'>) {
    const [creative] = await this.db
      .insert(creatives)
      .values({ id: id('crt'), ...input })
      .returning();
    return creative!;
  }
  async findOwned(creativeId: string, ownerUserId: string) {
    const [creative] = await this.db
      .select()
      .from(creatives)
      .where(and(eq(creatives.id, creativeId), eq(creatives.ownerUserId, ownerUserId)))
      .limit(1);
    return creative;
  }
  async softDelete(creativeId: string, ownerUserId: string) {
    const [creative] = await this.db
      .update(creatives)
      .set({ status: 'DELETED', deletedAt: new Date() })
      .where(
        and(
          eq(creatives.id, creativeId),
          eq(creatives.ownerUserId, ownerUserId),
          eq(creatives.status, 'ACTIVE'),
        ),
      )
      .returning();
    return creative;
  }
}
