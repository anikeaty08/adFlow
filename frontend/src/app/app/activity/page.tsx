import { ActivityFeed, StudioScreen } from '@/components/studio/studio-screen';

export default function ActivityPage() {
  return (
    <StudioScreen
      description="A normalized, account-scoped record of agent actions, policy decisions, verification, and chain settlement."
      title="Activity"
    >
      <ActivityFeed />
    </StudioScreen>
  );
}
