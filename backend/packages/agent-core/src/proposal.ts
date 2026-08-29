import { z } from 'zod';

export const proposalSchema = z.object({
  kind: z.enum(['REQUEST_QUOTES', 'PREPARE_AGREEMENT', 'PAUSE_ALLOCATION', 'NO_ACTION', 'WAIT_FOR_QUOTES']),
  candidateId: z.string().min(1).optional(),
});

export type CampaignProposal = z.infer<typeof proposalSchema>;
