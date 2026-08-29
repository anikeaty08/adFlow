import { CampaignSettlementHistory } from '@/components/campaign/campaign-settlement-history';
import { StudioScreen } from '@/components/studio/studio-screen';

export default async function SettlementsPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  return (
    <StudioScreen
      description="Settlement epochs show the exact verified amount, token, chain state, and final receipt."
      title="Settlement history"
    >
      <CampaignSettlementHistory campaignId={campaignId} />
    </StudioScreen>
  );
}
