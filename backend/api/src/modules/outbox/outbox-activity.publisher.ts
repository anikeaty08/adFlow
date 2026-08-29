import { activityEvents, type Database } from '@adflow/db';
import type { OutboxPublisher } from './outbox.dispatcher.js';

/**
 * Projects committed agent events into the activity timeline. The outbox ID is also the activity
 * row ID, making this projection idempotent if the process stops before `published_at` is saved.
 */
export class OutboxActivityPublisher implements OutboxPublisher {
  constructor(private readonly db: Database) {}

  async publish(event: {
    eventId: string;
    topic: string;
    aggregateId: string;
    payload: Record<string, unknown>;
  }) {
    const campaignId =
      typeof event.payload.campaignId === 'string' ? event.payload.campaignId : event.aggregateId;
    const actionId = typeof event.payload.actionId === 'string' ? event.payload.actionId : event.aggregateId;
    const agentRunId = typeof event.payload.agentRunId === 'string' ? event.payload.agentRunId : null;
    await this.db
      .insert(activityEvents)
      .values({
        id: event.eventId,
        campaignId,
        actorType: 'SYSTEM',
        actorId: agentRunId,
        eventType: event.topic,
        title: this.title(event.topic),
        summary: this.summary(event.topic),
        entityType: 'OUTBOX_EVENT',
        entityId: actionId,
        visibility: 'PRIVATE',
      })
      .onConflictDoNothing({ target: activityEvents.id });
  }

  private title(topic: string) {
    if (topic === 'agent.action.ready') return 'Agent action ready for approval';
    if (topic === 'agent.pause.recommended') return 'Campaign pause recommended';
    if (topic === 'settlement.proposal.requested') return 'Settlement proposal requested';
    return 'AdFlow operational event';
  }

  private summary(topic: string) {
    if (topic === 'agent.action.ready')
      return 'A policy-approved agent proposal is ready for the applicable wallet or human approval flow.';
    if (topic === 'agent.pause.recommended')
      return 'Verified delivery rules detected poor or suspicious performance; a wallet or human must approve any pause.';
    if (topic === 'settlement.proposal.requested')
      return 'AdFlow is evaluating verified delivery for a possible settlement epoch.';
    return 'A committed AdFlow event was processed.';
  }
}
