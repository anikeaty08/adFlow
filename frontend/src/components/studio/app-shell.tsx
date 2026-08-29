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
import { AdFlowLogo } from '@/components/brand/adflow-logo';
import { NetworkBadge } from '@/components/brand/network-badge';
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
          Wallet
          <br />
          <strong>0x71...39A</strong>
        </div>
      </aside>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
