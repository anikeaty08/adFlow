import { AccountPanel } from '@/components/wallet/account-panel';
import { StudioScreen } from '@/components/studio/studio-screen';

export default function AccountPage() {
  return (
    <StudioScreen
      description="Wallet identity, Celo network configuration, and balances are read from the connected account."
      title="Account"
    >
      <AccountPanel />
    </StudioScreen>
  );
}
