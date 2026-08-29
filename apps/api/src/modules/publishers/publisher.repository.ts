import { and, eq } from 'drizzle-orm';
import { adSlots, publishers, publisherSites, type Database } from '@adflow/db';
import { id } from '@adflow/shared';

export class PublisherRepository {
  constructor(private readonly db: Database) {}

  async createPublisher(ownerUserId: string, name: string, payoutWalletAddress: string) {
    const [publisher] = await this.db
      .insert(publishers)
      .values({ id: id('pub'), ownerUserId, name, payoutWalletAddress })
      .returning();
    return publisher!;
  }

  async findMine(ownerUserId: string) {
    const [publisher] = await this.db
      .select()
      .from(publishers)
      .where(eq(publishers.ownerUserId, ownerUserId))
      .limit(1);
    return publisher;
  }

  async addSite(publisherId: string, origin: string, method: string) {
    const normalizedDomain = new URL(origin).hostname.toLowerCase();
    const [site] = await this.db
      .insert(publisherSites)
      .values({
        id: id('site'),
        publisherId,
        origin: new URL(origin).origin,
        normalizedDomain,
        verificationMethod: method,
        verificationChallengeHash: crypto.randomUUID(),
      })
      .returning();
    return site!;
  }

  async addSlot(input: {
    siteId: string;
    name: string;
    format: string;
    width?: number;
    height?: number;
    floorCpcAtomic: string;
    floorCpmAtomic: string;
    categories: string[];
  }) {
    const [slot] = await this.db
      .insert(adSlots)
      .values({ id: id('slot'), publicKey: crypto.randomUUID(), ...input })
      .returning();
    return slot!;
  }

  async findSiteOwned(siteId: string, ownerUserId: string) {
    const [row] = await this.db
      .select({ site: publisherSites })
      .from(publisherSites)
      .innerJoin(publishers, eq(publisherSites.publisherId, publishers.id))
      .where(and(eq(publisherSites.id, siteId), eq(publishers.ownerUserId, ownerUserId)));
    return row?.site;
  }

  async listSlots(ownerUserId: string) {
    return this.db
      .select({ slot: adSlots, site: publisherSites })
      .from(adSlots)
      .innerJoin(publisherSites, eq(adSlots.siteId, publisherSites.id))
      .innerJoin(publishers, eq(publisherSites.publisherId, publishers.id))
      .where(eq(publishers.ownerUserId, ownerUserId));
  }

  async findSlotOwned(slotId: string, ownerUserId: string) {
    const [row] = await this.db
      .select({ slot: adSlots })
      .from(adSlots)
      .innerJoin(publisherSites, eq(adSlots.siteId, publisherSites.id))
      .innerJoin(publishers, eq(publisherSites.publisherId, publishers.id))
      .where(eq(publishers.ownerUserId, ownerUserId));
    return row?.slot;
  }

  async setSlotStatus(slotId: string, status: 'ACTIVE' | 'PAUSED') {
    const [slot] = await this.db.update(adSlots).set({ status }).where(eq(adSlots.id, slotId)).returning();
    return slot;
  }
}
