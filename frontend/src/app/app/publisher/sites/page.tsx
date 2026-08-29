import { StudioScreen } from '@/components/studio/studio-screen';
export default function PublisherSitesPage() {
  return (
    <StudioScreen
      description="Verified properties may receive inventory and submit delivery evidence."
      title="Verified sites"
    >
      <article style={{ borderTop: '1px solid var(--line)', padding: '1.2rem 0' }}>
        <strong>devcraft.io</strong>
        <p style={{ color: 'var(--accent)', fontSize: '0.82rem' }}>Ownership verified</p>
      </article>
    </StudioScreen>
  );
}
