import { DomainError } from '@adflow/shared';

type AgentCreationInput = {
  role: 'CAMPAIGN' | 'PUBLISHER';
  name: string;
  publisherId?: string;
  walletAddress?: string;
};

/**
 * An agent identity is an authorization boundary: a campaign agent is owned by the authenticated
 * advertiser, while a publisher agent must be tied to that advertiser's own publisher profile.
 */
export function validateAgentCreationInput(input: AgentCreationInput, authenticatedWalletAddress: string) {
  if (input.role === 'CAMPAIGN' && input.publisherId)
    throw new DomainError('INVALID_AGENT', 'Campaign agents cannot be linked to publisher inventory.');

  if (input.role === 'PUBLISHER' && !input.publisherId)
    throw new DomainError('INVALID_AGENT', 'Publisher agents require an owned publisher profile.');

  if (input.walletAddress && input.walletAddress.toLowerCase() !== authenticatedWalletAddress.toLowerCase())
    throw new DomainError('FORBIDDEN', 'An agent wallet must match the authenticated wallet.');

  return {
    ...input,
    walletAddress: authenticatedWalletAddress.toLowerCase(),
  };
}
