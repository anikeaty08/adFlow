'use client';

import dynamic from 'next/dynamic';

const MarketplaceScene = dynamic(
  () => import('./marketplace-scene').then((module) => module.MarketplaceScene),
  {
    ssr: false,
    loading: () => (
      <div
        aria-label="Loading marketplace visual"
        style={{
          background: 'radial-gradient(circle at center, rgba(155, 239, 115, 0.15), transparent 55%)',
          height: '100%',
        }}
      />
    ),
  },
);

export function MarketplaceSceneClient() {
  return <MarketplaceScene />;
}
