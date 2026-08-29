import { describe, expect, it } from 'vitest';
import { buildCampaignAgentSystemPrompt } from './campaign-agent.prompt.js';

describe('campaign agent prompt', () => {
  it('keeps money movement and financial truth outside the model', () => {
    const prompt = buildCampaignAgentSystemPrompt();
    expect(prompt).toContain('Never propose transfers');
    expect(prompt).toContain('PostgreSQL are authoritative');
    expect(prompt).toContain('untrusted observations');
  });
});
