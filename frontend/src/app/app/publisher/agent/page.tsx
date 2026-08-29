import { PublisherQuoteRequests } from '@/components/publisher/publisher-quote-requests';
import { StudioScreen } from '@/components/studio/studio-screen';

export default function PublisherAgentPage() {
  return (
    <StudioScreen
      description="Publisher rules are hard constraints. The agent may recommend but cannot override them."
      title="Publisher agent"
    >
      <PublisherQuoteRequests />
    </StudioScreen>
  );
}
