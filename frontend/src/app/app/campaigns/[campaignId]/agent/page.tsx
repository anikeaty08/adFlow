import { CampaignLiveActivity } from '@/components/agent/campaign-live-activity';
import { StudioScreen } from '@/components/studio/studio-screen';

export default async function AgentDecisionsPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  return (
    <StudioScreen
      description="Reason summaries expose evidence and policy outcomes, never private chain-of-thought."
      title="Campaign agent decisions"
    >
      <CampaignLiveActivity campaignId={campaignId} />
    </StudioScreen>
  );
}
