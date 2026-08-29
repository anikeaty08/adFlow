import { StudioScreen } from '@/components/studio/studio-screen';

export default function SettingsPage() {
  return (
    <StudioScreen
      description="Set safe defaults for notifications and autonomous campaign actions."
      title="Settings"
    >
      <div style={{ borderTop: '1px solid var(--line)', maxWidth: 760 }}>
        <label
          style={{
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            padding: '1rem 0',
          }}
        >
          Notify when an agent needs approval
          <input defaultChecked style={{ width: 'auto' }} type="checkbox" />
        </label>
        <label
          style={{
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            padding: '1rem 0',
          }}
        >
          Require review above 2 USDC
          <input defaultChecked style={{ width: 'auto' }} type="checkbox" />
        </label>
      </div>
    </StudioScreen>
  );
}
