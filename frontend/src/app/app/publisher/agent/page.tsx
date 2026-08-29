import { StudioScreen } from '@/components/studio/studio-screen';
export default function PublisherAgentPage() {
  return (
    <StudioScreen
      description="Publisher rules are hard constraints. The agent may recommend but cannot override them."
      title="Publisher agent"
    >
      <article
        style={{ border: '1px solid var(--line-strong)', borderRadius: 14, maxWidth: 740, padding: '1.5rem' }}
      >
        <p className="eyebrow">Offer recommendation</p>
        <h2>AI Dev Toolkit at 0.031 USDC CPC</h2>
        <p style={{ color: 'var(--muted)' }}>
          Category match is strong. Advertiser payment history is reliable. Recommendation: accept.
        </p>
        <button className="buttonPrimary" type="button">
          Accept offer
        </button>
      </article>
    </StudioScreen>
  );
}
