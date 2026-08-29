import { ActivityFeed, MetricRow, StudioScreen } from '@/components/studio/studio-screen';

export default function AppOverviewPage() {
  return (
    <StudioScreen
      action={{ href: '/app/campaigns/new', label: 'New campaign' }}
      description="Your campaign agents, available budget, and actions needing attention."
      title="Command center"
    >
      <MetricRow
        metrics={[
          { label: 'Active campaigns', value: '2', detail: '1 optimizing now' },
          { label: 'Funded', value: '20.00 USDC', detail: 'Celo Sepolia' },
          { label: 'Available', value: '9.32 USDC', detail: 'Ready for allocation' },
          { label: 'Approvals', value: '1', detail: 'Premium inventory' },
        ]}
      />
      <ActivityFeed />
    </StudioScreen>
  );
}
