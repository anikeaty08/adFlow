import { ActivityFeed, MetricRow, StudioScreen } from '@/components/studio/studio-screen';

export default function PublisherPage() {
  return (
    <StudioScreen
      action={{ href: '/app/publisher/onboarding', label: 'Add a site' }}
      description="Manage verified inventory, agent negotiation preferences, delivery evidence, and claimable earnings."
      title="Publisher center"
    >
      <MetricRow
        metrics={[
          { label: 'Verified sites', value: '1', detail: 'Developer property' },
          { label: 'Live agreements', value: '2', detail: 'Accepting delivery' },
          { label: 'Claimable', value: '0.42 USDC', detail: 'Wallet-sign to claim' },
          { label: 'Agent offers', value: '1', detail: 'Awaiting policy' },
        ]}
      />
      <ActivityFeed />
    </StudioScreen>
  );
}
