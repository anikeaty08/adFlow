'use client';

import { IconArrowUpRight, IconPlayerPlay } from '@tabler/icons-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { MarketplaceSceneClient } from '@/components/scene/marketplace-scene-client';
import { useSceneStore } from '@/components/scene/scene-store';
import { storyStageContent, type StoryStage } from '@/components/scene/scene-types';
import styles from './story-experience.module.css';

gsap.registerPlugin(ScrollTrigger);

export function StoryExperience() {
  const root = useRef<HTMLElement>(null);
  const [webglReady, setWebglReady] = useState(true);
  const stage = useSceneStore((state) => state.storyStage);
  const setStoryStage = useSceneStore((state) => state.setStoryStage);
  const content = storyStageContent[stage];

  useEffect(() => {
    if (!root.current) return;

    const context = gsap.context(() => {
      ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          const nextStage = Math.min(6, Math.floor(self.progress * 7)) as StoryStage;
          setStoryStage(nextStage);
        },
      });
    }, root);

    return () => context.revert();
  }, [setStoryStage]);

  return (
    <section className={styles.story} ref={root}>
      <div className={styles.stickyFrame}>
        <div className={styles.copyColumn}>
          <p className="eyebrow">{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p className={styles.description}>{content.copy}</p>
          <div className={styles.actions}>
            <Link className="buttonPrimary" href="/app/campaigns/new">
              Launch a campaign <IconArrowUpRight size={17} />
            </Link>
            <Link className="buttonSecondary" href="/app/network">
              <IconPlayerPlay size={16} /> Explore network
            </Link>
          </div>
          <p className={styles.stageReadout}>Story state {stage + 1} of 7</p>
        </div>
        <div className={styles.sceneColumn}>
          {webglReady ? <MarketplaceSceneClient /> : <StaticNetworkFallback />}
          <button
            className={styles.fallbackButton}
            onClick={() => setWebglReady((current) => !current)}
            type="button"
          >
            {webglReady ? 'Use static view' : 'Enable interactive view'}
          </button>
        </div>
      </div>
    </section>
  );
}

function StaticNetworkFallback() {
  return (
    <div className={styles.staticFallback}>
      <div className={styles.staticHub}>A</div>
      <span className={styles.staticNodeOne}>Campaign agent</span>
      <span className={styles.staticNodeTwo}>Publisher #52</span>
      <span className={styles.staticNodeThree}>Verification</span>
      <p>Interactive 3D is optional. The campaign lifecycle remains fully visible.</p>
    </div>
  );
}
