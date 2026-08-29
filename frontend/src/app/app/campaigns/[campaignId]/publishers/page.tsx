import { StudioScreen } from '@/components/studio/studio-screen';

export default function CampaignPublishersPage() {
  return (
    <StudioScreen
      description="Publishers are ranked by policy eligibility, quoted rate, reputation, and measured quality."
      title="Publisher allocation"
    >
      <div style={{ borderTop: '1px solid var(--line)' }}>
        {[
          ['Publisher #52', '91', '0.031 USDC', '70%'],
          ['Publisher #83', '86', '0.028 USDC', '20%'],
          ['Publisher #18', '74', '0.022 USDC', 'Paused'],
        ].map(([name, reputation, price, allocation]) => (
          <article
            key={name}
            style={{
              borderBottom: '1px solid var(--line)',
              display: 'grid',
              gridTemplateColumns: '1.4fr repeat(3, 1fr)',
              gap: 12,
              padding: '1.1rem 0',
            }}
          >
            <strong>{name}</strong>
            <span>Rep {reputation}</span>
            <span>{price}</span>
            <span style={{ color: allocation === 'Paused' ? 'var(--warning)' : 'var(--accent)' }}>
              {allocation}
            </span>
          </article>
        ))}
      </div>
    </StudioScreen>
  );
}
