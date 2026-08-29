import { CampaignCreationForm } from '@/components/campaign/campaign-creation-form';
import { StudioScreen } from '@/components/studio/studio-screen';

export default function NewCampaignPage() {
  return (
    <StudioScreen
      description="Describe the outcome. Your agent proposes an editable policy before any campaign is funded."
      title="Create a campaign"
    >
      <CampaignCreationForm />
    </StudioScreen>
  );
}
