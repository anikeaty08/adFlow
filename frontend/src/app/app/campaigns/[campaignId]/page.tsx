import { ActivityFeed, MetricRow, StudioScreen } from '@/components/studio/studio-screen';
import { FundCampaignButton } from '@/components/wallet/fund-campaign-button';

export default async function CampaignDetailPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  return (
    <StudioScreen
      action={{ href: '/app/campaigns/demo/agent', label: 'Agent decisions' }}
      description="Developer API Launch is active. The agent is evaluating performance inside your approved policy."
      eyebrow="Campaign active"
      title="Developer API Launch"
    >
      <MetricRow
        metrics={[
          { label: 'Funded', value: '20.00 USDC', detail: 'Campaign vault' },
          { label: 'Spent', value: '7.28 USDC', detail: 'Verified delivery' },
          { label: 'Committed', value: '3.40 USDC', detail: 'Active agreements' },
          { label: 'Available', value: '9.32 USDC', detail: 'Not allocated' },
        ]}
      />
      <ActivityFeed />
      <div style={{ marginTop: '2rem', maxWidth: 260 }}>
        <FundCampaignButton campaignId={campaignId} />
      </div>
    </StudioScreen>
  );
}
