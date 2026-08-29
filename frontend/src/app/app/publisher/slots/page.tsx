import { PublisherSlotManager } from '@/components/publisher/publisher-slot-manager';
import { StudioScreen } from '@/components/studio/studio-screen';

export default function PublisherSlotsPage() {
  return (
    <StudioScreen
      description="Create placements with transparent price floors and controlled embed credentials."
      title="Inventory slots"
    >
      <PublisherSlotManager />
    </StudioScreen>
  );
}
