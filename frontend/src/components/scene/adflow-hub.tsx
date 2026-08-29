'use client';

import { Float, Ring } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import type { StoryStage } from './scene-types';

export function AdFlowHub({ stage }: { stage: StoryStage }) {
  const group = useRef<Group>(null);
  const intensity = stage === 5 ? 2.8 : stage >= 2 ? 1.7 : 1.15;

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = clock.elapsedTime * 0.25;
    const pulse = 1 + Math.sin(clock.elapsedTime * intensity) * 0.035;
    group.current.scale.setScalar(pulse);
  });

  return (
    <Float floatIntensity={0.7} rotationIntensity={0.1} speed={1.2}>
      <group ref={group}>
        <mesh>
          <icosahedronGeometry args={[0.72, 2]} />
          <meshStandardMaterial
            color="#26302a"
            emissive="#9bef73"
            emissiveIntensity={0.055 * intensity}
            metalness={0.9}
            roughness={0.23}
          />
        </mesh>
        <mesh scale={0.31}>
          <icosahedronGeometry args={[0.72, 1]} />
          <meshStandardMaterial
            color="#9bef73"
            emissive="#9bef73"
            emissiveIntensity={0.65 * intensity}
            metalness={0.55}
            roughness={0.2}
          />
        </mesh>
        <Ring args={[0.98, 1.01, 64]} rotation={[Math.PI / 2.6, 0, 0]}>
          <meshBasicMaterial color="#9bef73" opacity={0.52} transparent />
        </Ring>
        <Ring args={[1.12, 1.135, 64]} rotation={[Math.PI / 1.8, Math.PI / 4.2, 0]}>
          <meshBasicMaterial color="#d8ffd0" opacity={0.26} transparent />
        </Ring>
        {stage === 5 ? (
          <Ring args={[1.25, 1.27, 64]} rotation={[Math.PI / 2.6, 0, 0]}>
            <meshBasicMaterial color="#9bef73" opacity={0.25} transparent />
          </Ring>
        ) : null}
      </group>
    </Float>
  );
}
