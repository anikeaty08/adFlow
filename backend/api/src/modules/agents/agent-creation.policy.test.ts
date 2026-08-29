import { describe, expect, it } from 'vitest';
import { validateAgentCreationInput } from './agent-creation.policy.js';

const ownerWallet = '0x1111111111111111111111111111111111111111';

describe('validateAgentCreationInput', () => {
  it('binds a publisher agent to the authenticated wallet', () => {
    expect(
      validateAgentCreationInput(
        {
          role: 'PUBLISHER',
          name: 'Publisher Agent',
          publisherId: 'pub_owned',
          walletAddress: ownerWallet.toUpperCase(),
        },
        ownerWallet,
      ),
    ).toMatchObject({ publisherId: 'pub_owned', walletAddress: ownerWallet });
  });

  it('rejects role, inventory, and wallet-ownership violations', () => {
    expect(() =>
      validateAgentCreationInput({ role: 'PUBLISHER', name: 'Publisher Agent' }, ownerWallet),
    ).toThrow('Publisher agents require an owned publisher profile.');
    expect(() =>
      validateAgentCreationInput(
        { role: 'CAMPAIGN', name: 'Campaign Agent', publisherId: 'pub_other' },
        ownerWallet,
      ),
    ).toThrow('Campaign agents cannot be linked to publisher inventory.');
    expect(() =>
      validateAgentCreationInput(
        {
          role: 'CAMPAIGN',
          name: 'Campaign Agent',
          walletAddress: '0x2222222222222222222222222222222222222222',
        },
        ownerWallet,
      ),
    ).toThrow('An agent wallet must match the authenticated wallet.');
  });
});
