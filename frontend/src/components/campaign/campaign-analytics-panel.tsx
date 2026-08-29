'use client';

import { useQuery } from '@tanstack/react-query';
import { getCampaignAnalytics } from '@/lib/api/campaigns';
import { MetricRow } from '@/components/studio/studio-screen';

export function CampaignAnalyticsPanel({ campaignId }: { campaignId: string }) {
  const query = useQuery({
    queryKey: ['campaign-analytics', campaignId],
    queryFn: () => getCampaignAnalytics(campaignId),
    retry: false,
  });

  if (query.isLoading) return <p style={{ color: 'var(--muted)' }}>Loading verified analytics...</p>;
  if (query.isError || !query.data)
    return (
      <p style={{ color: 'var(--muted)' }}>Analytics are available after connecting the campaign wallet.</p>
    );

  const analytics = query.data;
  return (
    <MetricRow
      metrics={[
        {
          label: 'Impressions',
          value: String(analytics.impressions),
          detail: `${analytics.verifiedImpressions} verified`,
        },
        { label: 'Clicks', value: String(analytics.clicks), detail: `${analytics.verifiedClicks} verified` },
        { label: 'CTR', value: `${(analytics.ctr * 100).toFixed(2)}%`, detail: 'Observed campaign cohort' },
      ]}
    />
  );
}
