'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { createPublisherSlot, listPublisherSites, listPublisherSlots } from '@/lib/api/publishers';

const toAtomic = (value: string) => String(Math.round(Number(value) * 1_000_000));

export function PublisherSlotManager() {
  const queryClient = useQueryClient();
  const sites = useQuery({ queryKey: ['publisher-sites'], queryFn: listPublisherSites, retry: false });
  const slots = useQuery({ queryKey: ['publisher-slots'], queryFn: listPublisherSlots, retry: false });
  const [siteId, setSiteId] = useState('');
  const [name, setName] = useState('Technical article sidebar');
  const [floorCpc, setFloorCpc] = useState('0.020');
  const [status, setStatus] = useState('');

  async function createSlot() {
    if (!siteId) {
      setStatus('Choose a verified site first.');
      return;
    }
    try {
      await createPublisherSlot(siteId, {
        categories: ['developer-tools'],
        floorCpcAtomic: toAtomic(floorCpc),
        floorCpmAtomic: '0',
        format: 'RECTANGLE',
        height: 250,
        name,
        width: 300,
      });
      setStatus('Inventory slot created. Activate it after site verification.');
      await queryClient.invalidateQueries({ queryKey: ['publisher-slots'] });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Slot could not be created.');
    }
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gap: '1rem', maxWidth: 680 }}>
        <label>
          Site
          <select onChange={(event) => setSiteId(event.target.value)} value={siteId}>
            <option value="">Choose verified site</option>
            {sites.data
              ?.filter((site) => site.status === 'VERIFIED')
              .map((site) => (
                <option key={site.id} value={site.id}>
                  {site.normalizedDomain}
                </option>
              ))}
          </select>
        </label>
        <label>
          Placement name
          <input onChange={(event) => setName(event.target.value)} value={name} />
        </label>
        <label>
          Minimum CPC (USDC)
          <input
            onChange={(event) => setFloorCpc(event.target.value)}
            step="0.001"
            type="number"
            value={floorCpc}
          />
        </label>
        <button className="buttonPrimary" onClick={createSlot} type="button">
          Create 300 × 250 slot
        </button>
        {status ? <p style={{ color: 'var(--muted)', margin: 0 }}>{status}</p> : null}
      </div>
      <div style={{ borderTop: '1px solid var(--line)' }}>
        {slots.data?.map(({ site, slot }) => (
          <article key={slot.id} style={{ borderBottom: '1px solid var(--line)', padding: '1.2rem 0' }}>
            <strong>{slot.name}</strong>
            <p style={{ color: 'var(--muted)', marginBottom: 0 }}>
              {site.normalizedDomain} · {slot.width} × {slot.height} · {slot.status}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
