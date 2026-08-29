'use client';

import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconMenu2,
  IconShieldCheck,
  IconX,
} from '@tabler/icons-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import styles from './reference-landing.module.css';

const navLinks = [
  ['Story', '#story'],
  ['How it works', '#how-it-works'],
  ['For advertisers', '#advertisers'],
  ['For publishers', '#publishers'],
  ['Contact', '#contact'],
] as const;

const capabilities = [
  [
    '01',
    'Agent-led discovery',
    'Describe the outcome once. AdFlow finds relevant publisher inventory, checks reputation, and brings back comparable quotes.',
  ],
  [
    '02',
    'Measured delivery',
    'Every impression and click is tied to a placement claim, statistical checks, and a verifiable evidence trail.',
  ],
  [
    '03',
    'Bounded optimization',
    'The campaign agent reallocates toward quality while deterministic policy keeps CPC, categories, and spend within bounds.',
  ],
  [
    '04',
    'Wallet-signed settlement',
    'USDC moves through Celo contracts only after verification. Your wallet remains the authority for every user-funded action.',
  ],
] as const;

const audiences = {
  advertisers: {
    kicker: 'For advertisers',
    title: 'Trade a goal for a living campaign.',
    copy: 'Launch with intent, not a maze of media forms. Your campaign agent discovers, negotiates, and adapts while you keep the final say over money.',
    points: [
      'Target AI, blockchain, and developer audiences',
      'Set max CPC, reputation, category, and daily limits',
      'Review agent reasoning without exposing hidden chain-of-thought',
    ],
  },
  publishers: {
    kicker: 'For publishers',
    title: 'Turn quality attention into programmable inventory.',
    copy: 'Verify your property, define hard rules, and let a publisher agent evaluate offers that fit your audience and price floor.',
    points: [
      'Verify domains before inventory is activated',
      'Set accepted and blocked categories',
      'Receive measured USDC earnings with clear claim status',
    ],
  },
} as const;

const quotes = [
  [
    '“We stopped buying blind. The campaign agent showed us why an inventory decision happened and moved budget to the placements that actually converted.”',
    'Maya Chen',
    'Growth, DevTools',
  ],
  [
    '“The rules are simple: our site, our categories, our floor. Everything else is an inspectable offer—not a black box.”',
    'Jon Bell',
    'Publisher, DevCraft',
  ],
  [
    '“Evidence, policy, settlement. That separation is what makes autonomous media feel trustworthy.”',
    'Ari Rao',
    'Protocol Partnerships',
  ],
] as const;

export function ReferenceLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [audience, setAudience] = useState<'advertisers' | 'publishers'>('advertisers');
  const [quoteIndex, setQuoteIndex] = useState(0);
  const activeAudience = audiences[audience];
  const quote = quotes[quoteIndex];

  return (
    <div className={styles.page}>
      {menuOpen ? (
        <div className={styles.mobileMenu}>
          <button
            aria-label="Close menu"
            className={styles.iconButton}
            onClick={() => setMenuOpen(false)}
            type="button"
          >
            <IconX />
          </button>
          <nav>
            {navLinks.map(([label, href]) => (
              <a href={href} key={href} onClick={() => setMenuOpen(false)}>
                {label}
              </a>
            ))}
          </nav>
          <Link className={styles.primaryButton} href="/app">
            Open Studio <IconArrowUpRight size={16} />
          </Link>
        </div>
      ) : null}

      <header className={styles.navbar}>
        <button
          aria-label="Open menu"
          className={`${styles.iconButton} ${styles.menuButton}`}
          onClick={() => setMenuOpen(true)}
          type="button"
        >
          <IconMenu2 size={20} />
        </button>
        <Link className={styles.brand} href="/">
          <Image alt="AdFlow" height={32} src="/brand/adflow-symbol.svg" width={32} />
          <span>AdFlow</span>
        </Link>
        <nav className={styles.desktopNav}>
          {navLinks.slice(0, 4).map(([label, href]) => (
            <a href={href} key={href}>
              {label}
            </a>
          ))}
        </nav>
        <Link className={styles.navAction} href="/app">
          Open Studio <IconArrowUpRight size={15} />
        </Link>
      </header>

      <main>
        <section className={styles.hero} id="story">
          <Image
            alt="Connected AdFlow agents and Celo settlement network"
            className={styles.heroImage}
            fill
            priority
            sizes="100vw"
            src="/brand/adflow-network.png"
          />
          <div className={styles.heroOverlay} />
          <div className={styles.heroContent}>
            <p className={styles.pill}>Autonomous advertising · Celo Sepolia</p>
            <h1>
              Make every media decision <em>accountable.</em>
            </h1>
            <p className={styles.heroCopy}>
              AdFlow connects campaign agents, publisher inventory, evidence, and stablecoin settlement into
              one observable marketplace.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primaryButton} href="/app/campaigns/new">
                Launch a campaign <IconArrowUpRight size={17} />
              </Link>
              <a className={styles.secondaryButton} href="#how-it-works">
                See the operating model <IconArrowDownRight size={17} />
              </a>
            </div>
          </div>
          <div className={styles.heroMeta}>
            <span>01 — 04</span>
            <span>Scroll to inspect the flow</span>
            <span>Celo / 11142220</span>
          </div>
        </section>

        <section className={styles.trustStrip}>
          <p>Built for teams that need more than a media dashboard.</p>
          <div>
            <span>AI agents</span>
            <span>ERC-8004 reputation</span>
            <span>Evidence-first delivery</span>
            <span>USDC settlement</span>
          </div>
        </section>

        <section className={styles.introSection} id="how-it-works">
          <div className={styles.sectionLabel}>The AdFlow difference</div>
          <div className={styles.introGrid}>
            <h2>
              A campaign is not a form.
              <br />
              <em>It is a system in motion.</em>
            </h2>
            <p>
              AdFlow gives the campaign a bounded operator: it searches for fit, weighs history against price,
              watches verified performance, and proposes what to do next. Policy decides what is allowed. Celo
              records what happened.
            </p>
          </div>
          <div className={styles.processLine}>
            {['Intent', 'Discovery', 'Negotiation', 'Evidence', 'Settlement'].map((step, index) => (
              <div key={step}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{step}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.capabilitySection}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionLabel}>What the network does</div>
              <h2>
                Intelligence with
                <br />
                <em>guardrails.</em>
              </h2>
            </div>
            <p>The agent handles dynamic decisions. Rules handle safety. Contracts handle value.</p>
          </div>
          <div className={styles.capabilityGrid}>
            {capabilities.map(([number, title, copy]) => (
              <article key={number}>
                <span className={styles.number}>{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
                <IconArrowUpRight className={styles.cardArrow} size={18} />
              </article>
            ))}
          </div>
        </section>

        <section className={styles.audienceSection} id="advertisers">
          <div className={styles.audienceTabs}>
            <button
              className={audience === 'advertisers' ? styles.activeTab : ''}
              onClick={() => setAudience('advertisers')}
              type="button"
            >
              Advertisers
            </button>
            <button
              className={audience === 'publishers' ? styles.activeTab : ''}
              onClick={() => setAudience('publishers')}
              type="button"
            >
              Publishers
            </button>
          </div>
          <div className={styles.audienceGrid}>
            <div>
              <div className={styles.sectionLabel}>{activeAudience.kicker}</div>
              <h2>{activeAudience.title}</h2>
              <p>{activeAudience.copy}</p>
              <Link
                className={styles.textLink}
                href={audience === 'advertisers' ? '/app/campaigns/new' : '/app/publisher/onboarding'}
              >
                Start here <IconArrowUpRight size={16} />
              </Link>
            </div>
            <div className={styles.pointList}>
              {activeAudience.points.map((point) => (
                <div key={point}>
                  <IconCheck size={17} />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.networkSection} id="publishers">
          <div className={styles.networkCopy}>
            <div className={styles.sectionLabel}>The visible network</div>
            <h2>
              Nothing important
              <br />
              <em>happens off-screen.</em>
            </h2>
            <p>
              Watch a campaign move through discovery, quote evaluation, allocation, verification, and
              settlement. The 3D layer is a lens on normalized system state—not a source of truth.
            </p>
            <Link className={styles.textLink} href="/app/network">
              Explore the network <IconArrowUpRight size={16} />
            </Link>
          </div>
          <div className={styles.networkPanel}>
            <Image
              alt="AdFlow connected agent network"
              fill
              sizes="(max-width: 900px) 100vw, 50vw"
              src="/brand/adflow-network.png"
            />
            <div className={styles.panelCaption}>
              <span>LIVE TOPOLOGY</span>
              <strong>Agents → evidence → Celo</strong>
            </div>
          </div>
        </section>

        <section className={styles.quoteSection}>
          <div className={styles.sectionLabel}>People building with AdFlow</div>
          <div className={styles.quoteRow}>
            <button
              aria-label="Previous testimonial"
              className={styles.iconButton}
              onClick={() => setQuoteIndex((quoteIndex + quotes.length - 1) % quotes.length)}
              type="button"
            >
              <IconChevronLeft />
            </button>
            <blockquote>
              <p>{quote[0]}</p>
              <footer>
                <strong>{quote[1]}</strong>
                <span>{quote[2]}</span>
              </footer>
            </blockquote>
            <button
              aria-label="Next testimonial"
              className={styles.iconButton}
              onClick={() => setQuoteIndex((quoteIndex + 1) % quotes.length)}
              type="button"
            >
              <IconChevronRight />
            </button>
          </div>
          <div className={styles.quoteDots}>
            {quotes.map((item, index) => (
              <button
                aria-label={`Show testimonial ${index + 1}`}
                className={index === quoteIndex ? styles.dotActive : ''}
                key={item[1]}
                onClick={() => setQuoteIndex(index)}
                type="button"
              />
            ))}
          </div>
        </section>

        <section className={styles.contactSection} id="contact">
          <div className={styles.contactCard}>
            <div>
              <div className={styles.sectionLabel}>Start with a clear brief</div>
              <h2>
                Give the agent
                <br />
                <em>something worth doing.</em>
              </h2>
            </div>
            <div>
              <p>
                Promote a developer tool. Find high-quality Web3 audiences. Keep max CPC at five cents. AdFlow
                turns that sentence into a policy you can inspect.
              </p>
              <Link className={styles.primaryButton} href="/app/campaigns/new">
                Create your first campaign <IconArrowUpRight size={17} />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <Link className={styles.brand} href="/">
          <Image alt="AdFlow" height={27} src="/brand/adflow-symbol.svg" width={27} />
          <span>AdFlow</span>
        </Link>
        <p>Autonomous media with an accountable trail.</p>
        <div>
          <Link href="/docs">Docs</Link>
          <Link href="/app/network">Network</Link>
          <Link href="/app">Studio</Link>
        </div>
      </footer>
    </div>
  );
}
