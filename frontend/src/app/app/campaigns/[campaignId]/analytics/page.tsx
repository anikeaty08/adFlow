import { MetricRow, StudioScreen } from '@/components/studio/studio-screen';
export default function AnalyticsPage() {
  return (
    <StudioScreen
      description="Delivery data is kept conventional and auditable. The agent uses this evidence but never changes it."
      title="Campaign analytics"
    >
      <MetricRow
        metrics={[
          { label: 'Impressions', value: '1,800', detail: 'Verified delivery' },
          { label: 'Clicks', value: '46', detail: 'Quality events' },
          { label: 'CTR', value: '2.56%', detail: 'Campaign cohort' },
          { label: 'Effective CPC', value: '0.031', detail: 'USDC' },
        ]}
      />
    </StudioScreen>
  );
}
