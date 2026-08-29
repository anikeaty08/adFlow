'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';

type LiveInventory = {
  slotId: string;
  slotName: string;
  format: string;
  categories: string[];
  floorCpcAtomic: string;
  siteDomain: string;
  publisherName: string;
  publisherAgentId: string | null;
  publisherStatus: string;
};

export function LiveInventoryList() {
  const query = useQuery({
    queryKey: ['network-inventory'],
    queryFn: () => apiRequest<LiveInventory[]>('/api/v1/network/inventory'),
    retry: false,
  });

  if (query.isLoading) return <p>Loading verified inventory…</p>;
  if (query.isError || !query.data)
    return <p>Connect and sign in with a wallet to inspect live inventory.</p>;
  if (!query.data.length) return <p>No verified active inventory is available yet.</p>;

  return (
    <div style={{ borderTop: '1px solid var(--line)', marginTop: '1.5rem' }}>
      {query.data.map((slot) => (
        <article key={slot.slotId} style={{ borderBottom: '1px solid var(--line)', padding: '1rem 0' }}>
          <strong>{slot.slotName}</strong>
          <span style={{ color: 'var(--muted)', display: 'block', marginTop: 4 }}>
            {slot.publisherName} · {slot.siteDomain} · {slot.format}
          </span>
          <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.8rem', marginTop: 4 }}>
            {slot.categories.join(', ') || 'Uncategorized'} · floor {slot.floorCpcAtomic} atomic CPC
          </span>
          <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.8rem', marginTop: 4 }}>
            Publisher agent: {slot.publisherAgentId ?? 'Not registered'}
          </span>
        </article>
      ))}
    </div>
  );
}
