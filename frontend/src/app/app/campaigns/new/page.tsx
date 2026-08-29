import { IconArrowRight, IconShieldCheck } from '@tabler/icons-react';
import { CreativeUpload } from '@/components/campaign/creative-upload';
import { StudioScreen } from '@/components/studio/studio-screen';

export default function NewCampaignPage() {
  return (
    <StudioScreen
      description="Describe the outcome. Your agent proposes an editable policy before any campaign is funded."
      title="Create a campaign"
    >
      <form style={{ display: 'grid', gap: '1.3rem', maxWidth: 720 }}>
        <label>
          What are you promoting?
          <input defaultValue="https://product.dev" />
        </label>
        <label>
          What should your agent accomplish?
          <textarea
            defaultValue="Promote my developer tool to AI and blockchain audiences. Optimize for quality clicks."
            rows={4}
          />
        </label>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <label>
            Budget
            <input defaultValue="20 USDC" />
          </label>
          <label>
            Maximum CPC
            <input defaultValue="0.05 USDC" />
          </label>
          <label>
            Duration
            <input defaultValue="7 days" />
          </label>
        </div>
        <div
          style={{
            border: '1px solid rgba(155, 239, 115, 0.32)',
            borderRadius: 12,
            color: 'var(--muted)',
            display: 'flex',
            gap: 12,
            padding: '1rem',
          }}
        >
          <IconShieldCheck color="var(--accent)" />
          <span>
            Agent policy will require reputation 80+, block adult and gambling inventory, and cap automated
            individual allocations at 2 USDC.
          </span>
        </div>
        <CreativeUpload />
        <button className="buttonPrimary" type="button">
          Review agent policy <IconArrowRight size={17} />
        </button>
      </form>
    </StudioScreen>
  );
}
