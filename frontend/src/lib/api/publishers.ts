import { apiRequest } from './client';

export type PublisherProfile = {
  id: string;
  name: string;
  payoutWalletAddress: string;
  status: string;
  acceptedCategories: string[];
  blockedCategories: string[];
  minimumAdvertiserReputationScore: string;
};

export type PublisherSite = {
  id: string;
  origin: string;
  normalizedDomain: string;
  verificationMethod: 'DNS_TXT' | 'WELL_KNOWN' | 'META_TAG';
  verificationChallengeHash: string;
  status: string;
  verifiedAt: string | null;
};

export type PublisherSlot = {
  slot: {
    id: string;
    name: string;
    format: 'BANNER' | 'RECTANGLE' | 'NATIVE';
    width: number | null;
    height: number | null;
    floorCpcAtomic: string;
    floorCpmAtomic: string;
    status: string;
    categories: string[];
  };
  site: PublisherSite;
};

export const getPublisherProfile = () => apiRequest<PublisherProfile>('/api/v1/publishers/me');

export const listPublisherSites = async () => {
  const rows = await apiRequest<Array<{ site: PublisherSite }>>('/api/v1/publishers/sites');
  return rows.map(({ site }) => site);
};

export const listPublisherSlots = () => apiRequest<PublisherSlot[]>('/api/v1/publishers/slots');

export const createPublisher = (input: { name: string; payoutWalletAddress: string }) =>
  apiRequest<PublisherProfile>('/api/v1/publishers', { body: JSON.stringify(input), method: 'POST' });

export const createPublisherSite = (input: {
  origin: string;
  verificationMethod: 'DNS_TXT' | 'WELL_KNOWN' | 'META_TAG';
}) => apiRequest<PublisherSite>('/api/v1/publishers/sites', { body: JSON.stringify(input), method: 'POST' });

export const requestSiteVerification = (siteId: string) =>
  apiRequest<{ siteId: string; method: string; challenge: string; instructions: string }>(
    `/api/v1/publishers/sites/${siteId}/verification`,
    { method: 'POST' },
  );

export const createPublisherSlot = (
  siteId: string,
  input: {
    name: string;
    format: 'BANNER' | 'RECTANGLE' | 'NATIVE';
    width?: number;
    height?: number;
    floorCpcAtomic: string;
    floorCpmAtomic: string;
    categories: string[];
  },
) =>
  apiRequest<PublisherSlot['slot']>(`/api/v1/publishers/sites/${siteId}/slots`, {
    body: JSON.stringify(input),
    method: 'POST',
  });
