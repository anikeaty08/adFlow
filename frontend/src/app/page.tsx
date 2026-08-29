import { LandingSections } from '@/components/marketing/landing-sections';
import { MarketingHeader } from '@/components/marketing/marketing-header';
import { StoryExperience } from '@/components/marketing/story-experience';

export default function MarketingPage() {
  return (
    <main className="pageShell" id="product">
      <MarketingHeader />
      <StoryExperience />
      <LandingSections />
    </main>
  );
}
