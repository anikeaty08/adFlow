import { IconArrowUpRight, IconShieldCheck, IconSparkles, IconWallet } from '@tabler/icons-react';
import Link from 'next/link';
import styles from './landing-sections.module.css';

const activity = [
  ['Publisher #52', 'Quote accepted at 0.031 USDC CPC', 'Negotiation'],
  ['Campaign agent', 'Reallocated 1.40 USDC to higher-quality inventory', 'Optimization'],
  ['Verification', 'Validated 14 delivery units for settlement', 'Evidence'],
];

export function LandingSections() {
  return (
    <div className={styles.sections}>
      <section className={styles.activitySection}>
        <div>
          <p className="eyebrow">Live activity</p>
          <h2>A marketplace you can inspect.</h2>
        </div>
        <div className={styles.activityList}>
          {activity.map(([actor, detail, type]) => (
            <article key={detail}>
              <span>{type}</span>
              <strong>{actor}</strong>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      </section>
      <section className={styles.flowSection}>
        <p className="eyebrow">The operating model</p>
        <div className={styles.flowGrid}>
          <article>
            <IconSparkles size={27} />
            <h3>Agents decide</h3>
            <p>They discover, compare, negotiate, and optimize within your campaign intent.</p>
          </article>
          <article>
            <IconShieldCheck size={27} />
            <h3>Policies protect</h3>
            <p>Deterministic checks enforce budget, reputation, category, and price constraints.</p>
          </article>
          <article>
            <IconWallet size={27} />
            <h3>Celo enforces</h3>
            <p>Wallet-signed actions and settlement contracts keep financial authority explicit.</p>
          </article>
        </div>
      </section>
      <section className={styles.ctaSection}>
        <div>
          <p className="eyebrow">AdFlow Studio</p>
          <h2>Set the goal. Observe every decision.</h2>
        </div>
        <Link className="buttonPrimary" href="/app">
          Open Studio <IconArrowUpRight size={17} />
        </Link>
      </section>
    </div>
  );
}
