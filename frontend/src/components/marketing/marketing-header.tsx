import Link from 'next/link';
import { AdFlowLogo } from '@/components/brand/adflow-logo';
import styles from './marketing-header.module.css';

export function MarketingHeader() {
  return (
    <header className={styles.header}>
      <Link href="/">
        <AdFlowLogo />
      </Link>
      <nav aria-label="Primary">
        <Link href="/#product">Product</Link>
        <Link href="/app/network">Network</Link>
        <Link href="/docs">Docs</Link>
      </nav>
      <Link className="buttonPrimary" href="/app">
        Launch App
      </Link>
    </header>
  );
}
