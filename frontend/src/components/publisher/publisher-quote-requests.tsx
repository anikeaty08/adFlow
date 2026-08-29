'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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
  const queryClient = useQueryClient();
  const [rates, setRates] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('');
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

  async function evaluate(requestId: string) {
    setStatus('Submitting publisher decision...');
    try {
      const rate = Number(rates[requestId] ?? '0.02');
      if (!Number.isFinite(rate) || rate <= 0) throw new Error('Enter a positive USDC rate.');
      await apiRequest(`/api/v1/publishers/me/quote-requests/${requestId}/evaluate`, {
        body: JSON.stringify({ proposedRateAtomic: String(Math.round(rate * 1_000_000)) }),
        method: 'POST',
      });
      setStatus('Decision evaluated against publisher policy.');
      await queryClient.invalidateQueries({ queryKey: ['publisher-quote-requests'] });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Decision could not be evaluated.');
    }
  }

  return (
    <div style={{ borderTop: '1px solid var(--line)' }}>
      {query.data.map((request) => (
        <article key={request.id} style={{ borderBottom: '1px solid var(--line)', padding: '1.2rem 0' }}>
          <strong>{request.campaignId}</strong>
          <p style={{ color: 'var(--muted)', margin: '0.5rem 0 0' }}>
            Slot {request.slotId} · {request.status} · requested{' '}
            {new Date(request.requestedAt).toLocaleString()}
          </p>
          <div style={{ alignItems: 'end', display: 'flex', gap: 10, marginTop: '0.8rem' }}>
            <label style={{ maxWidth: 180 }}>
              Rate (USDC)
              <input
                min="0.000001"
                onChange={(event) =>
                  setRates((current) => ({ ...current, [request.id]: event.target.value }))
                }
                step="0.001"
                type="number"
                value={rates[request.id] ?? '0.020'}
              />
            </label>
            <button className="buttonSecondary" onClick={() => void evaluate(request.id)} type="button">
              Evaluate offer
            </button>
          </div>
        </article>
      ))}
      {status ? <p style={{ color: 'var(--muted)' }}>{status}</p> : null}
    </div>
  );
}
