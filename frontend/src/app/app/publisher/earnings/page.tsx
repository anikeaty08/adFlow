import { MetricRow, StudioScreen } from '@/components/studio/studio-screen';
export default function EarningsPage() {
  return (
    <StudioScreen
      description="Claims remain wallet-signed. Financial amounts are read from canonical system state."
      title="Publisher earnings"
    >
      <MetricRow
        metrics={[
          { label: 'Earned', value: '0.84 USDC', detail: 'All time' },
          { label: 'Settled', value: '0.42 USDC', detail: 'Confirmed epochs' },
          { label: 'Claimable', value: '0.42 USDC', detail: 'Available now' },
          { label: 'Claimed', value: '0.00 USDC', detail: 'Wallet receipts' },
        ]}
      />
    </StudioScreen>
  );
}
