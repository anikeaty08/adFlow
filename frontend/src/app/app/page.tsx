import { CampaignList } from '@/components/campaign/campaign-list';
import { StudioScreen } from '@/components/studio/studio-screen';

export default function AppOverviewPage() {
  return (
    <StudioScreen
      action={{ href: '/app/campaigns/new', label: 'New campaign' }}
      description="Your campaign agents, available budget, and actions needing attention."
      title="Command center"
    >
      <CampaignList />
    </StudioScreen>
  );
}
