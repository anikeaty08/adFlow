import { IconArrowUpRight } from '@tabler/icons-react';
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
