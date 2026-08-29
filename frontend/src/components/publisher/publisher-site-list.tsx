'use client';

import { useQuery } from '@tanstack/react-query';
import { listPublisherSites, requestSiteVerification } from '@/lib/api/publishers';

export function PublisherSiteList() {
  const sites = useQuery({ queryKey: ['publisher-sites'], queryFn: listPublisherSites, retry: false });

  if (sites.isLoading) return <p style={{ color: 'var(--muted)' }}>Loading publisher sites...</p>;
  if (sites.isError)
    return <p style={{ color: 'var(--muted)' }}>Connect the publisher wallet to view sites.</p>;
  if (!sites.data?.length)
    return <p style={{ color: 'var(--muted)' }}>No sites yet. Add one before creating inventory.</p>;

  return (
    <div style={{ borderTop: '1px solid var(--line)' }}>
      {sites.data.map((site) => (
        <article
          key={site.id}
          style={{
            alignItems: 'center',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            gap: 16,
            justifyContent: 'space-between',
            padding: '1.2rem 0',
          }}
        >
          <div>
            <strong>{site.normalizedDomain}</strong>
            <p style={{ color: 'var(--muted)', marginBottom: 0 }}>
              {site.verificationMethod} · {site.status}
            </p>
          </div>
          <button className="buttonSecondary" onClick={() => requestSiteVerification(site.id)} type="button">
            Show challenge
          </button>
        </article>
      ))}
    </div>
  );
}
