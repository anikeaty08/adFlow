import { IconShieldCheck } from '@tabler/icons-react';
import { StudioScreen } from '@/components/studio/studio-screen';

export default function AgentDecisionsPage() {
  return (
    <StudioScreen
      description="Reason summaries expose evidence and policy outcomes, never private chain-of-thought."
      title="Campaign agent decisions"
    >
      <article
        style={{ border: '1px solid var(--line-strong)', borderRadius: 14, maxWidth: 780, padding: '1.5rem' }}
      >
        <p className="eyebrow">Allocation changed</p>
        <h2 style={{ letterSpacing: '-0.05em', margin: '0.7rem 0' }}>
          Publisher #52 increased from 2.00 to 4.00 USDC.
        </h2>
        <p style={{ color: 'var(--muted)', lineHeight: 1.55 }}>
          Evidence: 2.4x campaign-cohort CTR, effective CPC 0.031 USDC, reputation 91, and no active fraud
          flags.
        </p>
        <div
          style={{
            alignItems: 'center',
            color: 'var(--accent)',
            display: 'flex',
            fontSize: '0.85rem',
            gap: 8,
          }}
        >
          <IconShieldCheck size={18} /> Policy passed: CPC, allocation, category, and reputation thresholds
          respected.
        </div>
      </article>
    </StudioScreen>
  );
}
