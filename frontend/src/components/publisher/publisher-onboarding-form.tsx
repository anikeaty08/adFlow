'use client';

import { IconArrowRight, IconShieldCheck } from '@tabler/icons-react';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ApiError } from '@/lib/api/client';
import {
  createPublisher,
  createPublisherSite,
  getPublisherProfile,
  requestSiteVerification,
} from '@/lib/api/publishers';

export function PublisherOnboardingForm() {
  const { address } = useAccount();
  const [name, setName] = useState('');
  const [origin, setOrigin] = useState('');
  const [status, setStatus] = useState('');
  const [challenge, setChallenge] = useState('');

  async function register() {
    if (!address) {
      setStatus('Connect the publisher payout wallet first.');
      return;
    }

    setStatus('Creating publisher profile...');
    try {
      try {
        await createPublisher({ name, payoutWalletAddress: address });
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 409) throw error;
        await getPublisherProfile();
      }

      const site = await createPublisherSite({ origin, verificationMethod: 'WELL_KNOWN' });
      const verification = await requestSiteVerification(site.id);
      setChallenge(verification.challenge);
      setStatus(
        'Profile created. Publish the verification challenge, then return to your sites page to check it.',
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Publisher setup could not be completed.');
    }
  }

  return (
    <div style={{ display: 'grid', gap: '1rem', maxWidth: 680 }}>
      <label>
        Publisher name
        <input onChange={(event) => setName(event.target.value)} placeholder="DevCraft Media" value={name} />
      </label>
      <label>
        Website or app origin
        <input
          onChange={(event) => setOrigin(event.target.value)}
          placeholder="https://your-site.com"
          value={origin}
        />
      </label>
      <div
        style={{
          border: '1px solid var(--line-strong)',
          borderRadius: 12,
          color: 'var(--muted)',
          display: 'flex',
          gap: 12,
          padding: '1rem',
        }}
      >
        <IconShieldCheck color="var(--accent)" />
        <span>
          Your connected wallet becomes the payout address. Site ownership is verified before inventory can be
          activated.
        </span>
      </div>
      <button className="buttonPrimary" onClick={register} type="button">
        Register and verify site <IconArrowRight size={17} />
      </button>
      {status ? <p style={{ color: 'var(--muted)', margin: 0 }}>{status}</p> : null}
      {challenge ? (
        <code
          style={{
            border: '1px solid var(--line)',
            borderRadius: 10,
            color: 'var(--accent)',
            overflowWrap: 'anywhere',
            padding: '0.8rem',
          }}
        >
          {challenge}
        </code>
      ) : null}
    </div>
  );
}
