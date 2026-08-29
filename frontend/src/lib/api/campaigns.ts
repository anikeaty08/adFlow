import { apiRequest } from './client';

export type CampaignSummary = {
  id: string;
  name: string;
  status: string;
  budgetPlannedAtomic: string;
  settlementTokenSymbol: string;
};
export type CampaignActivity = {
  id: string;
  type: string;
  createdAt: string;
  payload: Record<string, unknown>;
};

export type CampaignDetail = CampaignSummary & {
  objectiveText: string;
  landingUrl: string;
  pricingModel: 'CPC' | 'CPM';
  settlementTokenAddress: string;
  maxUnitPriceAtomic: string;
  startAt: string;
  endAt: string;
  chainId: number;
  onchainCampaignId: string | null;
  policy: {
    allowedCategories: string[];
    blockedCategories: string[];
    minReputationScore: string;
    maxPublisherAllocationAtomic: string | null;
  } | null;
};

export type CampaignAnalytics = {
  impressions: number;
  verifiedImpressions: number;
  clicks: number;
  verifiedClicks: number;
  ctr: number;
};

export type CampaignCandidate = {
  publisherAgentId: string;
  slotId: string;
  walletAddress: string;
  hardFilter: { eligible: boolean; reasonCodes: string[] };
  score: number;
};

export type SettlementEpoch = {
  id: string;
  agreementId: string;
  epochKey: string;
  windowStart: string;
  windowEnd: string;
  verifiedUnits: number;
  evidenceRoot: string;
  status: string;
  chainTxHash: string | null;
  onchainAmountAtomic: string | null;
  createdAt: string;
  confirmedAt: string | null;
};

export type CreateCampaignInput = {
  name: string;
  objectiveText: string;
  landingUrl: string;
  pricingModel: 'CPC' | 'CPM';
  targeting: { categories: string[] };
  creativeIds?: string[];
  blockedCategories: string[];
  maxUnitPriceAtomic: string;
  settlementToken: { symbol: string; address: string };
  budgetPlannedAtomic: string;
  startAt: string;
  endAt: string;
  strategy: { minReputationScore: number; explorationRatioBasisPoints: number };
};

export const listCampaigns = () => apiRequest<CampaignSummary[]>('/api/v1/campaigns');
export const listCampaignActivity = (campaignId: string) =>
  apiRequest<CampaignActivity[]>(`/api/v1/campaigns/${campaignId}/activity`);
export const getCampaign = (campaignId: string) =>
  apiRequest<CampaignDetail>(`/api/v1/campaigns/${campaignId}`);
export const getCampaignAnalytics = (campaignId: string) =>
  apiRequest<CampaignAnalytics>(`/api/v1/campaigns/${campaignId}/analytics/summary`);
export const getCampaignCandidates = (campaignId: string) =>
  apiRequest<CampaignCandidate[]>(`/api/v1/campaigns/${campaignId}/candidates`);
export const listCampaignSettlements = (campaignId: string) =>
  apiRequest<SettlementEpoch[]>(`/api/v1/campaigns/${campaignId}/settlements`);
export const prepareCampaignFunding = (campaignId: string) =>
  apiRequest(`/api/v1/campaigns/${campaignId}/prepare-funding`, { method: 'POST' });

export const createCampaign = (input: CreateCampaignInput) =>
  apiRequest<CampaignSummary>('/api/v1/campaigns', { body: JSON.stringify(input), method: 'POST' });
