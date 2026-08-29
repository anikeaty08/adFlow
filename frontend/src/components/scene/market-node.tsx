'use client';

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import type { Group } from 'three';
import { useSceneStore } from './scene-store';
import type { MarketplaceNode, StoryStage } from './scene-types';

const nodeColor = {
  agent: '#d8ffd0',
  publisher: '#9bef73',
  verification: '#d0d8d0',
  settlement: '#9bef73',
};

export function MarketNode({ node, stage }: { node: MarketplaceNode; stage: StoryStage }) {
  const group = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const selectedNodeId = useSceneStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useSceneStore((state) => state.setSelectedNodeId);
  const isSelected = selectedNodeId === node.id;
  const visible =
    node.kind === 'publisher'
      ? stage >= 1
      : node.kind === 'verification'
        ? stage >= 4
        : node.kind === 'settlement'
          ? stage >= 5
          : true;

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.visible = visible;
    group.current.rotation.z = clock.elapsedTime * (node.kind === 'publisher' ? 0.25 : -0.17);
    const scale = isSelected || hovered ? 1.18 : 1;
    group.current.scale.setScalar(scale);
  });

  return (
    <group position={node.position} ref={group}>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          setSelectedNodeId(isSelected ? null : node.id);
        }}
        onPointerOut={() => setHovered(false)}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
      >
        {node.kind === 'verification' ? (
          <octahedronGeometry args={[0.42, 1]} />
        ) : (
          <sphereGeometry args={[0.34, 28, 28]} />
        )}
        <meshStandardMaterial
          color="#1d261f"
          emissive={nodeColor[node.kind]}
          emissiveIntensity={isSelected || hovered ? 0.7 : 0.21}
          metalness={0.68}
          roughness={0.28}
        />
      </mesh>
      {hovered || isSelected ? (
        <Html center distanceFactor={9} position={[0, 0.66, 0]} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              background: 'rgba(20, 25, 22, 0.94)',
              border: '1px solid rgba(155, 239, 115, 0.42)',
              borderRadius: 10,
              color: '#f1f5ef',
              fontFamily: 'Arial, sans-serif',
              fontSize: 12,
              minWidth: 145,
              padding: '10px 12px',
            }}
          >
            <strong>{node.label}</strong>
            {node.reputation ? (
              <div style={{ color: '#aeb8b0', marginTop: 4 }}>Reputation {node.reputation}</div>
            ) : null}
            {node.quote ? <div style={{ color: '#9bef73', marginTop: 3 }}>{node.quote}</div> : null}
          </div>
        </Html>
      ) : null}
    </group>
  );
}
