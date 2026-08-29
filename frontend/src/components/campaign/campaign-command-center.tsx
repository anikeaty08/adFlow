'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getCampaign } from '@/lib/api/campaigns';
import { ActivityFeed, MetricRow } from '@/components/studio/studio-screen';
import { FundCampaignButton } from '@/components/wallet/fund-campaign-button';

function formatUsdc(atomic: string) {
  const amount = BigInt(atomic);
  const units = amount / 1_000_000n;
  const fraction = (amount % 1_000_000n).toString().padStart(6, '0').slice(0, 2);
  return `${units}.${fraction}`;
}

export function CampaignCommandCenter({ campaignId }: { campaignId: string }) {
  const campaign = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => getCampaign(campaignId),
    retry: false,
  });

  if (campaign.isLoading) return <p style={{ color: 'var(--muted)' }}>Loading campaign state...</p>;
  if (campaign.isError || !campaign.data)
    return (
      <p style={{ color: 'var(--muted)' }}>Connect the campaign owner wallet to view this command center.</p>
    );

  const data = campaign.data;
  const funded = formatUsdc(data.budgetPlannedAtomic);
  const maxCpc = formatUsdc(data.maxUnitPriceAtomic);
  const policy = data.policy;

  return (
    <div style={{ display: 'grid', gap: '2rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <span className="eyebrow">{data.status}</span>
        <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
          Celo Sepolia · ends{' '}
          {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(data.endAt))}
        </span>
      </div>
      <MetricRow
        metrics={[
          {
            label: 'Planned',
            value: `${funded} ${data.settlementTokenSymbol}`,
            detail: 'Campaign vault target',
          },
          {
            label: 'Maximum CPC',
            value: `${maxCpc} ${data.settlementTokenSymbol}`,
            detail: data.pricingModel,
          },
          {
            label: 'Reputation floor',
            value: policy ? `≥${policy.minReputationScore}` : 'Not set',
            detail: 'Publisher eligibility',
          },
          {
            label: 'Creative',
            value: data.onchainCampaignId ? 'On-chain funded' : 'Ready to fund',
            detail: data.landingUrl,
          },
        ]}
      />
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: '1.5rem' }}>
        <p className="eyebrow">Agent policy</p>
        <p style={{ color: 'var(--muted)', lineHeight: 1.55, margin: 0 }}>
          Targeting {policy?.allowedCategories.join(', ') || 'not configured'} · blocked{' '}
          {policy?.blockedCategories.join(', ') || 'none'}. Every allocation remains subject to deterministic
          policy checks and your wallet authorization.
        </p>
      </div>
      <ActivityFeed />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <FundCampaignButton campaignId={campaignId} />
        <Link className="buttonSecondary" href={`/app/campaigns/${campaignId}/agent`}>
          View agent decisions
        </Link>
      </div>
    </div>
  );
}
