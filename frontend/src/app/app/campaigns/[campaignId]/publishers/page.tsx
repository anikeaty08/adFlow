import { CampaignPublisherAllocation } from '@/components/campaign/campaign-publisher-allocation';
import { StudioScreen } from '@/components/studio/studio-screen';

export default async function CampaignPublishersPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  return (
    <StudioScreen
      description="Publishers are ranked by policy eligibility, quoted rate, reputation, and measured quality."
      title="Publisher allocation"
    >
      <CampaignPublisherAllocation campaignId={campaignId} />
    </StudioScreen>
  );
}
