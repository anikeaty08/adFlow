'use client';

import { IconAdjustments, IconX } from '@tabler/icons-react';
import { LiveInventoryList } from '@/components/network/live-inventory-list';
import { MarketplaceSceneClient } from '@/components/scene/marketplace-scene-client';
import { useSceneStore } from '@/components/scene/scene-store';
import { marketplaceNodes } from '@/components/scene/marketplace-data';
import styles from './network.module.css';

export default function NetworkPage() {
  const selectedNodeId = useSceneStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useSceneStore((state) => state.setSelectedNodeId);
  const selectedNode = marketplaceNodes.find((node) => node.id === selectedNodeId);

  return (
    <section className={styles.page}>
      <header>
        <div>
          <p className="eyebrow">Network topology</p>
          <h1>Network explorer</h1>
        </div>
        <button className="buttonSecondary" type="button">
          <IconAdjustments size={17} /> Filters
        </button>
      </header>
      <div className={styles.canvas}>
        <MarketplaceSceneClient />
      </div>
      <aside className={styles.legend}>
        <strong>Visible topology</strong>
        <span>Illustrative graph · live inventory below</span>
        <span>Campaign agent</span>
        <span>Publisher agents</span>
        <span>Verification evidence</span>
        <span>Celo settlement</span>
      </aside>
      <LiveInventoryList />
      {selectedNode ? (
        <aside className={styles.drawer}>
          <button aria-label="Close node detail" onClick={() => setSelectedNodeId(null)} type="button">
            <IconX size={18} />
          </button>
          <p className="eyebrow">Node selected</p>
          <h2>{selectedNode.label}</h2>
          <p>{selectedNode.quote ?? 'Live system entity'}</p>
          {selectedNode.reputation ? <p>Reputation {selectedNode.reputation}</p> : null}
        </aside>
      ) : null}
    </section>
  );
}
