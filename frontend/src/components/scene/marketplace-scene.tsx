'use client';

import { OrbitControls, Sparkles } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { AdFlowHub } from './adflow-hub';
import { FlowPath } from './flow-path';
import { flowPairs, marketplaceNodes } from './marketplace-data';
import { MarketNode } from './market-node';
import { useSceneStore } from './scene-store';

function MarketplaceContents() {
  const stage = useSceneStore((state) => state.storyStage);
  const setSelectedNodeId = useSceneStore((state) => state.setSelectedNodeId);

  return (
    <>
      <color args={['#111513']} attach="background" />
      <fog args={['#111513', 8, 18]} attach="fog" />
      <ambientLight intensity={0.72} />
      <directionalLight color="#d8ffd0" intensity={2.1} position={[3, 5, 5]} />
      <pointLight color="#9bef73" intensity={stage >= 3 ? 18 : 7} position={[0, 0, 2]} />
      <Sparkles
        color="#9bef73"
        count={stage >= 3 ? 105 : 55}
        noise={1.2}
        opacity={0.42}
        scale={[10, 8, 4]}
        size={2.1}
        speed={0.18}
      />
      <group onClick={() => setSelectedNodeId(null)}>
        <AdFlowHub stage={stage} />
        {marketplaceNodes.map((node) => (
          <MarketNode key={node.id} node={node} stage={stage} />
        ))}
        {flowPairs.map(([startId, endId], index) => (
          <FlowPath
            endId={endId}
            flowIndex={index}
            key={`${startId}-${endId}`}
            stage={stage}
            startId={startId}
          />
        ))}
      </group>
      <OrbitControls
        enableDamping
        enablePan={false}
        maxDistance={11}
        maxPolarAngle={Math.PI * 0.61}
        minDistance={6.5}
        minPolarAngle={Math.PI * 0.3}
      />
    </>
  );
}

export function MarketplaceScene() {
  return (
    <Canvas
      camera={{ fov: 43, position: [0, 0.4, 9] }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <Suspense fallback={null}>
        <MarketplaceContents />
      </Suspense>
    </Canvas>
  );
}
