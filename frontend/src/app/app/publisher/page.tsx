import { PublisherSiteList } from '@/components/publisher/publisher-site-list';
import { StudioScreen } from '@/components/studio/studio-screen';

export default function PublisherPage() {
  return (
    <StudioScreen
      action={{ href: '/app/publisher/onboarding', label: 'Add a site' }}
      description="Manage verified inventory, agent negotiation preferences, delivery evidence, and claimable earnings."
      title="Publisher center"
    >
      <PublisherSiteList />
    </StudioScreen>
  );
}
