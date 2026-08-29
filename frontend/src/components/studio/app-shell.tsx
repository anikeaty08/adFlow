'use client';

import {
  IconActivity,
  IconBuildingStore,
  IconChartBar,
  IconLayoutDashboard,
  IconNetwork,
  IconSettings,
  IconWallet,
} from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { celoSepolia } from 'viem/chains';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { AdFlowLogo } from '@/components/brand/adflow-logo';
import { NetworkBadge } from '@/components/brand/network-badge';
import { ConnectWalletButton } from '@/components/wallet/connect-wallet-button';
import { getWalletSession } from '@/lib/api/auth';
import styles from './app-shell.module.css';

const navigation = [
  ['Overview', '/app', IconLayoutDashboard],
  ['Campaigns', '/app/campaigns', IconChartBar],
  ['Publisher', '/app/publisher', IconBuildingStore],
  ['Network', '/app/network', IconNetwork],
  ['Activity', '/app/activity', IconActivity],
  ['Account', '/app/account', IconWallet],
  ['Settings', '/app/settings', IconSettings],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const account = useAccount();
  const session = useQuery({
    queryKey: ['auth-session'],
    queryFn: getWalletSession,
    enabled: Boolean(account.address) && account.chainId === celoSepolia.id,
    retry: false,
  });

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/">
          <AdFlowLogo />
        </Link>
        <div className={styles.network}>
          <NetworkBadge />
        </div>
        <nav aria-label="Studio navigation">
          {navigation.map(([label, href, Icon]) => (
            <Link
              className={
                pathname === href || (href !== '/app' && pathname.startsWith(href)) ? styles.active : ''
              }
              href={href}
              key={href}
            >
              <Icon size={18} stroke={1.7} />
              {label}
            </Link>
          ))}
        </nav>
        <div className={styles.wallet}>
          <ConnectWalletButton />
        </div>
      </aside>
      <main className={styles.content}>
        {!account.isConnected ? (
          <div
            style={{ display: 'grid', gap: '1rem', margin: '12vh auto', maxWidth: 560, textAlign: 'center' }}
          >
            <p className="eyebrow">Wallet required</p>
            <h1>Connect your wallet to enter AdFlow Studio.</h1>
            <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
              Studio data and signed actions are scoped to your wallet. The public landing page remains
              available without a connection.
            </p>
            <div>
              <ConnectWalletButton />
            </div>
          </div>
        ) : account.chainId !== celoSepolia.id ? (
          <div
            style={{ display: 'grid', gap: '1rem', margin: '12vh auto', maxWidth: 560, textAlign: 'center' }}
          >
            <p className="eyebrow">Wrong network</p>
            <h1>Switch to Celo Sepolia to continue.</h1>
            <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
              AdFlow user actions are currently enabled only on chain ID 11142220.
            </p>
            <div>
              <ConnectWalletButton />
            </div>
          </div>
        ) : session.isLoading ? (
          <p style={{ color: 'var(--muted)', margin: '12vh auto', textAlign: 'center' }}>
            Checking wallet session...
          </p>
        ) : !session.data ? (
          <div
            style={{ display: 'grid', gap: '1rem', margin: '12vh auto', maxWidth: 560, textAlign: 'center' }}
          >
            <p className="eyebrow">Signature required</p>
            <h1>Sign the AdFlow session to continue.</h1>
            <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
              This proves wallet ownership before private campaigns, inventory, analytics, or balances are
              loaded.
            </p>
            <div>
              <ConnectWalletButton />
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
