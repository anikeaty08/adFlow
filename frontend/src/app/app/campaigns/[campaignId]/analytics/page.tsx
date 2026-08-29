import { CampaignAnalyticsPanel } from '@/components/campaign/campaign-analytics-panel';
import { StudioScreen } from '@/components/studio/studio-screen';

export default async function AnalyticsPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  return (
    <StudioScreen
      description="Delivery data is kept conventional and auditable. The agent uses this evidence but never changes it."
      title="Campaign analytics"
    >
      <CampaignAnalyticsPanel campaignId={campaignId} />
    </StudioScreen>
  );
}
