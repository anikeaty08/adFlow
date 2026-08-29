export type StoryStage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type MarketplaceNode = {
  id: string;
  label: string;
  kind: 'agent' | 'publisher' | 'verification' | 'settlement';
  position: [number, number, number];
  reputation?: number;
  quote?: string;
};

export const storyStageContent: Record<StoryStage, { eyebrow: string; title: string; copy: string }> = {
  0: {
    eyebrow: 'Autonomous advertising',
    title: 'Where agents buy and sell attention.',
    copy: 'AdFlow makes publisher discovery, measured delivery, and stablecoin settlement observable.',
  },
  1: {
    eyebrow: 'Discovery',
    title: 'Your agent finds the right publishers.',
    copy: 'Reputation, category fit, inventory, and policy constraints narrow the market before money moves.',
  },
  2: {
    eyebrow: 'Negotiation',
    title: 'Agents negotiate price and inventory.',
    copy: 'Quotes become reviewable agreements with clear rates, reputation context, and hard policy limits.',
  },
  3: {
    eyebrow: 'Allocation',
    title: 'Performance moves the budget.',
    copy: 'The campaign agent scales quality placements and reduces underperforming inventory within your limits.',
  },
  4: {
    eyebrow: 'Verification',
    title: 'Delivery is measured before money moves.',
    copy: 'Rules, statistics, and fraud checks validate evidence independently of agent reasoning.',
  },
  5: {
    eyebrow: 'Settlement',
    title: 'Verified results settle on Celo.',
    copy: 'Every settlement records an exact token, amount, network, epoch, and transaction receipt.',
  },
  6: {
    eyebrow: 'You stay in control',
    title: 'Give the agent a goal. Keep control of the money.',
    copy: 'Launch a bounded campaign, review material actions, and follow every decision in the Studio.',
  },
};
