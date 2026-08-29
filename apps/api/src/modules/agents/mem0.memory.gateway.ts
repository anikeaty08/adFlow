import type { Config } from '../../config.js';

export type AgentMemory = { memory: string; score?: number; metadata?: Record<string, unknown> };

export interface AgentMemoryGateway {
  search(
    query: string,
    scope: { userId?: string; agentId?: string; campaignId?: string },
  ): Promise<AgentMemory[]>;
  add(memory: string, scope: { userId?: string; agentId?: string; campaignId?: string }): Promise<void>;
}

export class Mem0MemoryGateway implements AgentMemoryGateway {
  constructor(private readonly config: Config) {}

  private filters(scope: { userId?: string; agentId?: string; campaignId?: string }) {
    return {
      ...(scope.userId ? { user_id: scope.userId } : {}),
      ...(scope.agentId ? { agent_id: scope.agentId } : {}),
      ...(scope.campaignId ? { run_id: scope.campaignId } : {}),
    };
  }

  async search(query: string, scope: { userId?: string; agentId?: string; campaignId?: string }) {
    if (!this.config.MEM0_API_KEY) return [];
    const response = await fetch(`${this.config.MEM0_BASE_URL}/v3/memories/search/`, {
      method: 'POST',
      headers: { Authorization: `Token ${this.config.MEM0_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, filters: this.filters(scope), top_k: 10 }),
    });
    if (!response.ok) throw new Error(`Mem0 search failed with HTTP ${response.status}`);
    const body = (await response.json()) as { results?: AgentMemory[] };
    return body.results ?? [];
  }

  async add(memory: string, scope: { userId?: string; agentId?: string; campaignId?: string }) {
    if (!this.config.MEM0_API_KEY) return;
    const response = await fetch(`${this.config.MEM0_BASE_URL}/v3/memories/add/`, {
      method: 'POST',
      headers: { Authorization: `Token ${this.config.MEM0_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'assistant', content: memory }], ...this.filters(scope) }),
    });
    if (!response.ok) throw new Error(`Mem0 add failed with HTTP ${response.status}`);
  }
}
