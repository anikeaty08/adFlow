'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { checkSiteVerification, listPublisherSites, requestSiteVerification } from '@/lib/api/publishers';

export function PublisherSiteList() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const sites = useQuery({ queryKey: ['publisher-sites'], queryFn: listPublisherSites, retry: false });

  async function showChallenge(siteId: string) {
    try {
      const result = await requestSiteVerification(siteId);
      setStatus(result.instructions);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Verification challenge unavailable.');
    }
  }

  async function checkVerification(siteId: string) {
    try {
      const result = await checkSiteVerification(siteId);
      setStatus(result.verified ? 'Site verified and ready for inventory.' : 'Verification not found yet.');
      await queryClient.invalidateQueries({ queryKey: ['publisher-sites'] });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Site verification check failed.');
    }
  }

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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button className="buttonSecondary" onClick={() => void showChallenge(site.id)} type="button">
              Show challenge
            </button>
            <button className="buttonSecondary" onClick={() => void checkVerification(site.id)} type="button">
              Check verification
            </button>
          </div>
        </article>
      ))}
      {status ? <p style={{ color: 'var(--muted)' }}>{status}</p> : null}
    </div>
  );
}
