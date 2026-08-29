import { MetricRow, StudioScreen } from '@/components/studio/studio-screen';

export default function AccountPage() {
  return (
    <StudioScreen
      description="Wallet identity, Celo network configuration, and balances are read from the connected account."
      title="Account"
    >
      <MetricRow
        metrics={[
          { label: 'Wallet', value: '0x71...39A', detail: 'Connected account' },
          { label: 'Network', value: 'Celo Sepolia', detail: 'Chain ID 11142220' },
          { label: 'USDC', value: '12.64', detail: 'Available balance' },
          { label: 'Identity', value: 'Ready', detail: 'ERC-8004' },
        ]}
      />
    </StudioScreen>
  );
}
