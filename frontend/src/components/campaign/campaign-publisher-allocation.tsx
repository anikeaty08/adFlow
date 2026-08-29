'use client';

import { useQuery } from '@tanstack/react-query';
import { getCampaignCandidates } from '@/lib/api/campaigns';

export function CampaignPublisherAllocation({ campaignId }: { campaignId: string }) {
  const query = useQuery({
    queryKey: ['campaign-candidates', campaignId],
    queryFn: () => getCampaignCandidates(campaignId),
    retry: false,
  });

  if (query.isLoading)
    return <p style={{ color: 'var(--muted)' }}>Loading eligible publisher inventory...</p>;
  if (query.isError || !query.data)
    return (
      <p style={{ color: 'var(--muted)' }}>Publisher eligibility requires the campaign wallet session.</p>
    );
  if (!query.data.length)
    return <p style={{ color: 'var(--muted)' }}>No publisher inventory is available yet.</p>;

  return (
    <div style={{ borderTop: '1px solid var(--line)' }}>
      {query.data.map((candidate) => (
        <article
          key={`${candidate.publisherAgentId}-${candidate.slotId}`}
          style={{
            borderBottom: '1px solid var(--line)',
            display: 'grid',
            gap: 12,
            gridTemplateColumns: '1.4fr 1fr 1fr',
            padding: '1.1rem 0',
          }}
        >
          <strong>{candidate.publisherAgentId}</strong>
          <span>Score {candidate.score}</span>
          <span style={{ color: candidate.hardFilter.eligible ? 'var(--accent)' : 'var(--warning)' }}>
            {candidate.hardFilter.eligible
              ? 'Eligible'
              : candidate.hardFilter.reasonCodes.join(', ') || 'Filtered'}
          </span>
        </article>
      ))}
    </div>
  );
}
