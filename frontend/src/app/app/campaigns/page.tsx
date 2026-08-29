import Link from 'next/link';
import { StudioScreen } from '@/components/studio/studio-screen';

export default function CampaignListPage() {
  return (
    <StudioScreen
      action={{ href: '/app/campaigns/new', label: 'New campaign' }}
      description="Campaigns stay legible: planned budget, active allocation, and the agent's latest action."
      title="Campaigns"
    >
      <div style={{ borderTop: '1px solid var(--line)' }}>
        <Link
          href="/app/campaigns/demo"
          style={{
            alignItems: 'center',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            padding: '1.35rem 0',
          }}
        >
          <span>
            <strong>Developer API Launch</strong>
            <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.85rem', marginTop: 4 }}>
              AI and blockchain developers
            </span>
          </span>
          <span style={{ color: 'var(--accent)', fontFamily: 'Courier New, monospace', fontSize: '0.76rem' }}>
            ACTIVE
          </span>
        </Link>
      </div>
    </StudioScreen>
  );
}
