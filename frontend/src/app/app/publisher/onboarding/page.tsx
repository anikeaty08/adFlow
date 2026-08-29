import { PublisherOnboardingForm } from '@/components/publisher/publisher-onboarding-form';
import { StudioScreen } from '@/components/studio/studio-screen';
export default function PublisherOnboardingPage() {
  return (
    <StudioScreen
      description="Register a site, set category rules, and verify ownership before your publisher agent can accept offers."
      title="Set up publisher inventory"
    >
      <PublisherOnboardingForm />
    </StudioScreen>
  );
}
