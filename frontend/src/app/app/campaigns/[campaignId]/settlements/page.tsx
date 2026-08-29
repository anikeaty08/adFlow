import { StudioScreen } from '@/components/studio/studio-screen';
export default function SettlementsPage() {
  return (
    <StudioScreen
      description="Settlement epochs show the exact verified amount, token, chain state, and final receipt."
      title="Settlement history"
    >
      <article
        style={{
          borderTop: '1px solid var(--line)',
          display: 'grid',
          gap: 10,
          gridTemplateColumns: '1fr auto',
          padding: '1.2rem 0',
        }}
      >
        <span>
          <strong>Epoch 0004</strong>
          <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.82rem', marginTop: 4 }}>
            14 verified clicks at 0.031 USDC
          </span>
        </span>
        <span style={{ color: 'var(--accent)', fontFamily: 'Courier New, monospace' }}>
          0.434 USDC confirmed
        </span>
      </article>
    </StudioScreen>
  );
}
