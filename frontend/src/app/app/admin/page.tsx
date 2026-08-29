import { StudioScreen } from '@/components/studio/studio-screen';
export default function AdminPage() {
  return (
    <StudioScreen
      description="Role-gated moderation and operational tools are isolated from normal advertiser and publisher journeys."
      title="Operations"
    >
      <p style={{ color: 'var(--muted)' }}>Operator permissions are required to access moderation queues.</p>
    </StudioScreen>
  );
}
