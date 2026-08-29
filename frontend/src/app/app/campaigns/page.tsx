import { CampaignList } from '@/components/campaign/campaign-list';
import { StudioScreen } from '@/components/studio/studio-screen';

export default function CampaignListPage() {
  return (
    <StudioScreen
      action={{ href: '/app/campaigns/new', label: 'New campaign' }}
      description="Campaigns stay legible: planned budget, active allocation, and the agent's latest action."
      title="Campaigns"
    >
      <CampaignList />
    </StudioScreen>
  );
}
