import { and, eq } from 'drizzle-orm';
import { agentDecisionReceipts, agentRuns, type Database } from '@adflow/db';
import { id } from '@adflow/shared';

export class AgentRunRepository {
  constructor(private readonly db: Database) {}

  async begin(input: { campaignId: string; trigger: string; idempotencyKey: string }) {
    const [created] = await this.db
      .insert(agentRuns)
      .values({
        id: id('run'),
        campaignId: input.campaignId,
        trigger: input.trigger,
        idempotencyKey: input.idempotencyKey,
        status: 'RUNNING',
        startedAt: new Date(),
      })
      .onConflictDoNothing({ target: agentRuns.idempotencyKey })
      .returning();

    if (created) return { run: created, created: true };

    const [existing] = await this.db
      .select()
      .from(agentRuns)
      .where(eq(agentRuns.idempotencyKey, input.idempotencyKey))
      .limit(1);
    return { run: existing!, created: false };
  }

  updateState(
    runId: string,
    status: (typeof agentRuns.status.enumValues)[number],
    graphState: Record<string, unknown>,
  ) {
    const completedAt = status === 'COMPLETED' ? new Date() : undefined;
    return this.db
      .update(agentRuns)
      .set({ status, graphState, completedAt, updatedAt: new Date() })
      .where(eq(agentRuns.id, runId));
  }

  fail(runId: string, failureCode: string) {
    return this.db
      .update(agentRuns)
      .set({ status: 'FAILED', failureCode, completedAt: new Date(), updatedAt: new Date() })
      .where(eq(agentRuns.id, runId));
  }

  recordDecision(input: {
    agentRunId: string;
    campaignId: string;
    decisionType: string;
    proposal: Record<string, unknown>;
    policyDecision: 'ALLOW' | 'DENY' | 'REQUIRES_APPROVAL';
    reasonCodes: string[];
    resultStatus: string;
    executedActionId?: string;
  }) {
    return this.db.insert(agentDecisionReceipts).values({ id: id('dec'), ...input });
  }

  findForCampaign(runId: string, campaignId: string) {
    return this.db
      .select()
      .from(agentRuns)
      .where(and(eq(agentRuns.id, runId), eq(agentRuns.campaignId, campaignId)))
      .limit(1);
  }
}
