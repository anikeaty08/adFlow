import type { MarketplaceNode } from './scene-types';

export const marketplaceNodes: MarketplaceNode[] = [
  { id: 'campaign-agent', kind: 'agent', label: 'Campaign agent', position: [-2.7, -0.7, 0.3] },
  {
    id: 'publisher-52',
    kind: 'publisher',
    label: 'Publisher #52',
    position: [2.4, 1.25, -0.1],
    quote: '0.031 USDC CPC',
    reputation: 91,
  },
  {
    id: 'publisher-18',
    kind: 'publisher',
    label: 'Publisher #18',
    position: [2.8, -1.5, -0.6],
    quote: '0.022 USDC CPC',
    reputation: 74,
  },
  {
    id: 'publisher-83',
    kind: 'publisher',
    label: 'Publisher #83',
    position: [0.4, 2.65, -0.85],
    quote: '0.028 USDC CPC',
    reputation: 86,
  },
  { id: 'verification', kind: 'verification', label: 'Verification', position: [0.1, -2.65, 0.2] },
  { id: 'settlement', kind: 'settlement', label: 'Celo settlement', position: [3.2, -3.05, -0.2] },
];

export const flowPairs = [
  ['campaign-agent', 'publisher-52'],
  ['campaign-agent', 'publisher-18'],
  ['campaign-agent', 'publisher-83'],
  ['publisher-52', 'verification'],
  ['verification', 'settlement'],
] as const;
