import { and, eq } from 'drizzle-orm';
import { agents, publishers, type Database } from '@adflow/db';
import { id } from '@adflow/shared';

export class AgentRepository {
  constructor(private readonly db: Database) {}

  async create(input: {
    ownerUserId: string;
    publisherId?: string;
    role: 'CAMPAIGN' | 'PUBLISHER';
    name: string;
    walletAddress?: string;
  }) {
    const [agent] = await this.db
      .insert(agents)
      .values({ id: id('agt'), ...input, status: 'IDLE' })
      .returning();
    return agent!;
  }

  async findOwned(agentId: string, ownerUserId: string) {
    const [agent] = await this.db
      .select()
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.ownerUserId, ownerUserId)))
      .limit(1);
    return agent;
  }

  async linkErc8004(agentId: string, chainId: number, agentIdOnChain: string, uri: string) {
    const [agent] = await this.db
      .update(agents)
      .set({ erc8004ChainId: chainId, erc8004AgentId: agentIdOnChain, erc8004Uri: uri })
      .where(eq(agents.id, agentId))
      .returning();
    return agent;
  }

  async publisherAgent(ownerUserId: string) {
    const [agent] = await this.db
      .select()
      .from(agents)
      .innerJoin(publishers, eq(agents.publisherId, publishers.id))
      .where(eq(publishers.ownerUserId, ownerUserId))
      .limit(1);
    return agent;
  }
}
