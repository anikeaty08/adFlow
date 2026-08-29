import OpenAI from 'openai';
import { z } from 'zod';
import type { CampaignProposal } from '@adflow/agent-core';
import { buildCampaignAgentSystemPrompt } from './campaign-agent.prompt.js';

export type CampaignPlanningInput = {
  campaignId: string;
  candidateIds: string[];
  candidates?: Array<{
    id: string;
    publisherAgentId: string;
    rateAtomic: string;
    maxAllocationAtomic: string;
    validUntil: string;
    reputationScore?: number;
    deterministicScore?: number;
  }>;
  memories?: string[];
  objective: string;
};

export interface CampaignModelGateway {
  propose(input: CampaignPlanningInput): Promise<CampaignProposal>;
}

const responseSchema = z.object({
  kind: z.enum(['REQUEST_QUOTES', 'PREPARE_AGREEMENT', 'PAUSE_ALLOCATION', 'NO_ACTION']),
  candidateId: z.string().min(1).nullable().optional(),
});

/** GPT-4o mini is limited to bounded planning; it does not receive an executor or wallet. */
export class OpenAiCampaignModelGateway implements CampaignModelGateway {
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    private readonly model = 'gpt-4o-mini',
  ) {
    this.client = new OpenAI({ apiKey, timeout: 12_000, maxRetries: 1 });
  }

  async propose(input: CampaignPlanningInput): Promise<CampaignProposal> {
    const observation = JSON.stringify({
      campaignId: input.campaignId,
      objective: input.objective,
      candidates: input.candidates ?? input.candidateIds.map((id) => ({ id, publisherAgentId: 'unknown' })),
      contextualMemories: input.memories ?? [],
    });
    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'campaign_proposal',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              kind: {
                type: 'string',
                enum: ['REQUEST_QUOTES', 'PREPARE_AGREEMENT', 'PAUSE_ALLOCATION', 'NO_ACTION'],
              },
              candidateId: { type: ['string', 'null'] },
            },
            required: ['kind', 'candidateId'],
          },
        },
      } as never,
      messages: [
        { role: 'system', content: buildCampaignAgentSystemPrompt() },
        { role: 'user', content: `<UNTRUSTED_OBSERVATION>${observation}</UNTRUSTED_OBSERVATION>` },
      ],
    });
    const content = completion.choices[0]?.message.content;
    if (!content) throw new Error('OpenAI returned no structured campaign proposal');
    try {
      const parsed = responseSchema.parse(JSON.parse(content));
      return parsed.candidateId
        ? { kind: parsed.kind, candidateId: parsed.candidateId }
        : { kind: parsed.kind };
    } catch {
      // Invalid model output is treated as an unavailable planner, never as an executable action.
      const candidateId = input.candidateIds[0];
      return candidateId ? { kind: 'REQUEST_QUOTES', candidateId } : { kind: 'NO_ACTION' };
    }
  }
}

/** Safe fallback when an external model is disabled, unavailable, or invalid. */
export class DeterministicCampaignModelGateway implements CampaignModelGateway {
  async propose(input: CampaignPlanningInput): Promise<CampaignProposal> {
    const candidateId = input.candidateIds[0];
    return candidateId ? { kind: 'REQUEST_QUOTES', candidateId } : { kind: 'NO_ACTION' };
  }
}
