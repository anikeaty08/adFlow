'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

type ActivityEvent = { id: string; type: string; createdAt: string; payload?: Record<string, unknown> };
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function CampaignLiveActivity({ campaignId }: { campaignId: string }) {
  const queryClient = useQueryClient();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [connection, setConnection] = useState<'connecting' | 'live' | 'reconnecting'>('connecting');

  useEffect(() => {
    const stream = new EventSource(`${apiUrl}/api/v1/campaigns/${campaignId}/activity/stream`, {
      withCredentials: true,
    });
    stream.addEventListener('ready', () => setConnection('live'));
    stream.addEventListener('activity', (message) => {
      const event = JSON.parse((message as MessageEvent<string>).data) as ActivityEvent;
      setEvents((current) => [event, ...current].slice(0, 5));
      void queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      void queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
    });
    stream.onerror = () => setConnection('reconnecting');
    return () => stream.close();
  }, [campaignId, queryClient]);

  return (
    <section
      style={{ borderTop: '1px solid var(--line)', marginTop: '2.5rem', maxWidth: 780, paddingTop: '1.2rem' }}
    >
      <p className="eyebrow">Live agent activity</p>
      <p
        style={{
          color: connection === 'live' ? 'var(--accent)' : 'var(--warning)',
          fontFamily: 'Courier New, monospace',
          fontSize: '0.76rem',
        }}
      >
        {connection === 'live' ? 'Connected to campaign stream' : 'Live updates reconnecting...'}
      </p>
      {events.length ? (
        events.map((event) => (
          <article key={event.id} style={{ borderTop: '1px solid var(--line)', padding: '0.85rem 0' }}>
            <strong>{event.type.replaceAll('.', ' ')}</strong>
            <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.82rem', marginTop: 4 }}>
              {new Date(event.createdAt).toLocaleTimeString()}
            </span>
          </article>
        ))
      ) : (
        <p style={{ color: 'var(--muted)' }}>
          New discovery, policy, and settlement activity will appear here.
        </p>
      )}
    </section>
  );
}
