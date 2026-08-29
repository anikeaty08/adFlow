import type { ComponentType } from 'react';
import { IconArrowUpRight, IconCircleCheck, IconClock, IconShieldCheck } from '@tabler/icons-react';
import Link from 'next/link';
import styles from './studio-screen.module.css';

export type StudioScreenProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action?: { href: string; label: string };
  children?: React.ReactNode;
};

export function StudioScreen({
  action,
  children,
  description,
  eyebrow = 'AdFlow Studio',
  title,
}: StudioScreenProps) {
  return (
    <section className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {action ? (
          <Link className="buttonPrimary" href={action.href}>
            {action.label}
            <IconArrowUpRight size={17} />
          </Link>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export function MetricRow({ metrics }: { metrics: Array<{ label: string; value: string; detail: string }> }) {
  return (
    <div className={styles.metricRow}>
      {metrics.map((metric) => (
        <article key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <p>{metric.detail}</p>
        </article>
      ))}
    </div>
  );
}

export function ActivityFeed() {
  const items: Array<[ComponentType<{ size?: number }>, string, string]> = [
    [IconCircleCheck, 'Quote accepted', 'Publisher #52 at 0.031 USDC CPC'],
    [IconShieldCheck, 'Policy passed', 'Daily allocation limit and reputation rule confirmed'],
    [IconClock, 'Agent wake scheduled', 'Next performance observation in 28 minutes'],
  ];
  return (
    <div className={styles.activity}>
      {items.map(([Icon, title, detail]) => (
        <article key={title}>
          <Icon size={19} />
          <div>
            <strong>{title}</strong>
            <p>{detail}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
