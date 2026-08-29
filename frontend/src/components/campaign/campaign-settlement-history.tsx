'use client';

import { useQuery } from '@tanstack/react-query';
import { listCampaignSettlements } from '@/lib/api/campaigns';

export function CampaignSettlementHistory({ campaignId }: { campaignId: string }) {
  const query = useQuery({
    queryKey: ['campaign-settlements', campaignId],
    queryFn: () => listCampaignSettlements(campaignId),
    retry: false,
  });

  if (query.isLoading) return <p style={{ color: 'var(--muted)' }}>Loading settlement epochs...</p>;
  if (query.isError || !query.data)
    return <p style={{ color: 'var(--muted)' }}>Settlement history requires the campaign wallet session.</p>;
  if (!query.data.length)
    return <p style={{ color: 'var(--muted)' }}>No settlement epochs have been recorded.</p>;

  return (
    <div style={{ borderTop: '1px solid var(--line)' }}>
      {query.data.map((epoch) => (
        <article
          key={epoch.id}
          style={{
            borderBottom: '1px solid var(--line)',
            display: 'grid',
            gap: 10,
            gridTemplateColumns: '1fr auto',
            padding: '1.2rem 0',
          }}
        >
          <span>
            <strong>{epoch.epochKey}</strong>
            <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.82rem', marginTop: 4 }}>
              {epoch.verifiedUnits} verified units · {epoch.status}
            </span>
          </span>
          <span style={{ color: 'var(--accent)', fontFamily: 'Courier New, monospace' }}>
            {epoch.onchainAmountAtomic ? `${epoch.onchainAmountAtomic} atomic` : 'Awaiting receipt'}
          </span>
        </article>
      ))}
    </div>
  );
}
