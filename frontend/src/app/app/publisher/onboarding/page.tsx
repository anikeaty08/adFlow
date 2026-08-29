import { StudioScreen } from '@/components/studio/studio-screen';
export default function PublisherOnboardingPage() {
  return (
    <StudioScreen
      description="Register a site, set category rules, and verify ownership before your publisher agent can accept offers."
      title="Set up publisher inventory"
    >
      <form style={{ display: 'grid', gap: '1rem', maxWidth: 680 }}>
        <label>
          Website or app
          <input placeholder="https://your-site.com" />
        </label>
        <label>
          Audience description
          <textarea placeholder="Developer-focused AI and blockchain content" rows={3} />
        </label>
        <label>
          Minimum CPC
          <input defaultValue="0.020 USDC" />
        </label>
        <button className="buttonPrimary" type="button">
          Verify site
        </button>
      </form>
    </StudioScreen>
  );
}
