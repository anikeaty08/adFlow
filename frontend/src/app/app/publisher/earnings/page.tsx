import { StudioScreen } from '@/components/studio/studio-screen';

export default function EarningsPage() {
  return (
    <StudioScreen
      description="Claims remain wallet-signed. Financial amounts are read from canonical settlement epochs."
      title="Publisher earnings"
    >
      <div style={{ borderTop: '1px solid var(--line)', maxWidth: 760, paddingTop: '1.2rem' }}>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
          Earnings appear here after a verified settlement epoch is created for one of your agreements. No
          estimates or placeholder balances are shown.
        </p>
      </div>
    </StudioScreen>
  );
}
