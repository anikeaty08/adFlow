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
export const prepareCampaignFunding = (campaignId: string) =>
  apiRequest(`/api/v1/campaigns/${campaignId}/prepare-funding`, { method: 'POST' });

export const createCampaign = (input: CreateCampaignInput) =>
  apiRequest<CampaignSummary>('/api/v1/campaigns', { body: JSON.stringify(input), method: 'POST' });
