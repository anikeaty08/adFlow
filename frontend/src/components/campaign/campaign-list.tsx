'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { listCampaigns } from '@/lib/api/campaigns';

export function CampaignList() {
  const query = useQuery({ queryKey: ['campaigns'], queryFn: listCampaigns, retry: false });
  if (query.isLoading) return <p style={{ color: 'var(--muted)' }}>Loading campaigns...</p>;
  if (query.isError)
    return (
      <p style={{ color: 'var(--muted)' }}>
        Connect your wallet to load real campaigns. Studio demo routes remain available.
      </p>
    );
  if (!query.data?.length)
    return (
      <p style={{ color: 'var(--muted)' }}>No campaigns yet. Create one to start publisher discovery.</p>
    );
  return (
    <div style={{ borderTop: '1px solid var(--line)' }}>
      {query.data.map((campaign) => (
        <Link
          href={`/app/campaigns/${campaign.id}`}
          key={campaign.id}
          style={{
            alignItems: 'center',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            padding: '1.35rem 0',
          }}
        >
          <span>
            <strong>{campaign.name}</strong>
            <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.85rem', marginTop: 4 }}>
              {campaign.settlementTokenSymbol} funded campaign
            </span>
          </span>
          <span style={{ color: 'var(--accent)', fontFamily: 'Courier New, monospace', fontSize: '0.76rem' }}>
            {campaign.status}
          </span>
        </Link>
      ))}
    </div>
  );
}
