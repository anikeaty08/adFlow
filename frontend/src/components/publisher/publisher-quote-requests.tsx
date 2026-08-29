'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';

type QuoteRequest = {
  id: string;
  campaignId: string;
  publisherAgentId: string;
  slotId: string;
  status: string;
  requestedAt: string;
  fulfilledAt: string | null;
};

export function PublisherQuoteRequests() {
  const query = useQuery({
    queryKey: ['publisher-quote-requests'],
    queryFn: () => apiRequest<QuoteRequest[]>('/api/v1/publishers/me/quote-requests'),
    retry: false,
  });

  if (query.isLoading) return <p style={{ color: 'var(--muted)' }}>Loading incoming quote requests...</p>;
  if (query.isError || !query.data)
    return (
      <p style={{ color: 'var(--muted)' }}>Connect and sign in with a publisher wallet to load offers.</p>
    );
  if (!query.data.length) return <p style={{ color: 'var(--muted)' }}>No pending quote requests.</p>;

  return (
    <div style={{ borderTop: '1px solid var(--line)' }}>
      {query.data.map((request) => (
        <article key={request.id} style={{ borderBottom: '1px solid var(--line)', padding: '1.2rem 0' }}>
          <strong>{request.campaignId}</strong>
          <p style={{ color: 'var(--muted)', margin: '0.5rem 0 0' }}>
            Slot {request.slotId} · {request.status} · requested{' '}
            {new Date(request.requestedAt).toLocaleString()}
          </p>
        </article>
      ))}
    </div>
  );
}
