import { StudioScreen } from '@/components/studio/studio-screen';

export default function ActivityPage() {
  return (
    <StudioScreen
      description="Activity is attached to each campaign so every event remains account-scoped and traceable."
      title="Activity"
    >
      <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
        Open a campaign command center to view its live agent, policy, verification, and settlement events.
      </p>
    </StudioScreen>
  );
}
