'use client';

import Link from 'next/link';
import { ConnectWalletButton } from '@/components/wallet/connect-wallet-button';
import { StudioScreen } from '@/components/studio/studio-screen';

export default function OnboardingPage() {
  return (
    <StudioScreen
      description="Connect a wallet, choose your role, and create a profile before creating campaigns or inventory."
      title="Welcome to AdFlow"
    >
      <div style={{ display: 'grid', gap: '1rem', maxWidth: 560 }}>
        <ConnectWalletButton />
        <p style={{ color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
          Your wallet signs user writes. AdFlow never receives or stores your private key.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <Link className="buttonSecondary" href="/app/campaigns/new">
            I am an advertiser
          </Link>
          <Link className="buttonSecondary" href="/app/publisher/onboarding">
            I am a publisher
          </Link>
        </div>
      </div>
    </StudioScreen>
  );
}
