'use client';

import { IconArrowUpRight, IconBadgeAd } from '@tabler/icons-react';
import { useState } from 'react';

export default function EmbedDemoPage() {
  const [notice, setNotice] = useState(
    'The placement preview is isolated from live measurement until a signed slot token is configured.',
  );
  return (
    <main style={{ margin: '0 auto', maxWidth: 1020, padding: '4rem 1.5rem' }}>
      <header
        style={{
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          justifyContent: 'space-between',
          paddingBottom: '1.2rem',
        }}
      >
        <strong style={{ letterSpacing: '-0.04em' }}>Devcraft journal</strong>
        <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Publisher placement demo</span>
      </header>
      <article
        style={{
          display: 'grid',
          gap: '2rem',
          gridTemplateColumns: 'minmax(0, 1fr) 300px',
          paddingTop: '3rem',
        }}
      >
        <section>
          <p className="eyebrow">Developer infrastructure</p>
          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)', letterSpacing: '-0.07em', lineHeight: 0.94 }}>
            A practical guide to reliable API design.
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: 600 }}>
            This page shows how an AdFlow publisher placement stays clearly labelled, opens a transparent
            destination, and leaves evidence to the verification layer.
          </p>
        </section>
        <aside
          style={{
            alignSelf: 'start',
            background: 'var(--surface)',
            border: '1px solid var(--line-strong)',
            borderRadius: 14,
            padding: '1rem',
          }}
        >
          <span
            style={{
              alignItems: 'center',
              color: 'var(--accent)',
              display: 'flex',
              fontFamily: 'Courier New, monospace',
              fontSize: '0.7rem',
              gap: 6,
            }}
          >
            <IconBadgeAd size={16} />
            ADVERTISEMENT
          </span>
          <h2 style={{ fontSize: '1.35rem', letterSpacing: '-0.04em' }}>
            Build API products for AI developers.
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.86rem', lineHeight: 1.55 }}>
            Developer tooling for teams building reliable AI and blockchain integrations.
          </p>
          <button
            className="buttonPrimary"
            onClick={() =>
              setNotice(
                'A production slot redirects through the AdFlow measurement endpoint using a signed placement token.',
              )
            }
            type="button"
          >
            Visit product <IconArrowUpRight size={16} />
          </button>
        </aside>
      </article>
      <p
        style={{
          borderTop: '1px solid var(--line)',
          color: 'var(--muted)',
          fontSize: '0.82rem',
          marginTop: '2rem',
          paddingTop: '1rem',
        }}
      >
        {notice}
      </p>
    </main>
  );
}
