import { CampaignCommandCenter } from '@/components/campaign/campaign-command-center';
import { StudioScreen } from '@/components/studio/studio-screen';

export default async function CampaignDetailPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  return (
    <StudioScreen
      description="Live campaign facts come from the API. The agent proposes actions, while deterministic policy and wallet signatures keep funds bounded."
      eyebrow="Campaign command center"
      title="Campaign operations"
    >
      <CampaignCommandCenter campaignId={campaignId} />
    </StudioScreen>
  );
}
