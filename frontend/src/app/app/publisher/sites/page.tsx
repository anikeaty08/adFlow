import { PublisherSiteList } from '@/components/publisher/publisher-site-list';
import { StudioScreen } from '@/components/studio/studio-screen';
export default function PublisherSitesPage() {
  return (
    <StudioScreen
      description="Verified properties may receive inventory and submit delivery evidence."
      title="Verified sites"
    >
      <PublisherSiteList />
    </StudioScreen>
  );
}
