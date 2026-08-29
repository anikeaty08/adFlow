import { StudioScreen } from '@/components/studio/studio-screen';
export default function PublisherSlotsPage() {
  return (
    <StudioScreen
      description="Create placements with transparent price floors and controlled embed credentials."
      title="Inventory slots"
    >
      <article style={{ borderTop: '1px solid var(--line)', padding: '1.2rem 0' }}>
        <strong>Technical article sidebar</strong>
        <p style={{ color: 'var(--muted)', marginBottom: 0 }}>300 × 250, 0.020 USDC minimum CPC, active</p>
      </article>
    </StudioScreen>
  );
}
