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

export const listCampaigns = () => apiRequest<CampaignSummary[]>('/api/v1/campaigns');
export const listCampaignActivity = (campaignId: string) =>
  apiRequest<CampaignActivity[]>(`/api/v1/campaigns/${campaignId}/activity`);
export const prepareCampaignFunding = (campaignId: string) =>
  apiRequest(`/api/v1/campaigns/${campaignId}/prepare-funding`, { method: 'POST' });
