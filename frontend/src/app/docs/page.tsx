import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing/marketing-header';

export default function DocsPage() {
  return (
    <main className="pageShell">
      <MarketingHeader />
      <section style={{ margin: '0 auto', maxWidth: 1000, padding: '9rem 1.5rem 5rem' }}>
        <p className="eyebrow">Protocol documentation</p>
        <h1
          style={{
            fontSize: 'clamp(3rem, 6vw, 6rem)',
            letterSpacing: '-0.08em',
            lineHeight: 0.92,
            maxWidth: '9ch',
          }}
        >
          Controlled autonomy for advertising.
        </h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6, maxWidth: 620 }}>
          AdFlow separates strategic AI reasoning, deterministic policy checks, canonical database state, and
          Celo contract enforcement.
        </p>
        <Link className="buttonPrimary" href="/app" style={{ marginTop: '2rem' }}>
          Open Studio
        </Link>
      </section>
    </main>
  );
}
