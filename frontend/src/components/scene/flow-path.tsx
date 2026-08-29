'use client';

import { QuadraticBezierLine } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Vector3, type Mesh } from 'three';
import { marketplaceNodes } from './marketplace-data';
import type { StoryStage } from './scene-types';

function packetVisible(stage: StoryStage, flowIndex: number) {
  return (stage >= 1 && flowIndex < 3) || (stage >= 4 && flowIndex === 3) || (stage >= 5 && flowIndex === 4);
}

export function FlowPath({
  endId,
  flowIndex,
  startId,
  stage,
}: {
  endId: string;
  flowIndex: number;
  startId: string;
  stage: StoryStage;
}) {
  const packet = useRef<Mesh>(null);
  const points = useMemo(() => {
    const start = marketplaceNodes.find((node) => node.id === startId);
    const end = marketplaceNodes.find((node) => node.id === endId);

    if (!start || !end) throw new Error('Invalid marketplace flow path.');

    const startPoint = new Vector3(...start.position);
    const endPoint = new Vector3(...end.position);
    const midpoint = startPoint
      .clone()
      .lerp(endPoint, 0.5)
      .add(new Vector3(0, 0.35 + flowIndex * 0.08, -0.35));

    return { endPoint, midpoint, startPoint };
  }, [endId, flowIndex, startId]);

  const active = packetVisible(stage, flowIndex);
  const accepted = stage >= 3 && flowIndex === 0;

  useFrame(({ clock }) => {
    if (!packet.current) return;
    packet.current.visible = active;
    if (!active) return;
    const progress = (clock.elapsedTime * (stage >= 5 ? 0.45 : 0.32) + flowIndex * 0.19) % 1;
    const inverse = 1 - progress;
    const point = points.startPoint
      .clone()
      .multiplyScalar(inverse * inverse)
      .add(points.midpoint.clone().multiplyScalar(2 * inverse * progress))
      .add(points.endPoint.clone().multiplyScalar(progress * progress));
    packet.current.position.copy(point);
  });

  return (
    <>
      <QuadraticBezierLine
        color={accepted ? '#9bef73' : '#718076'}
        end={points.endPoint}
        lineWidth={accepted ? 2.2 : 1.15}
        mid={points.midpoint}
        opacity={active ? (accepted ? 0.82 : 0.42) : 0.08}
        start={points.startPoint}
        transparent
      />
      <mesh ref={packet} visible={active}>
        <sphereGeometry args={[stage >= 5 && flowIndex === 4 ? 0.1 : 0.066, 16, 16]} />
        <meshBasicMaterial color="#9bef73" />
      </mesh>
    </>
  );
}
