import React, { useEffect, useMemo, useRef } from 'react';
import { useGLTF, useAnimations, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TacticalUnit } from '@/store/use-game-store';
import type { AnimState } from '@/lib/character-model-map';
import {
  computeVoxelScale,
  centerVoxelPivot,
  generateSyntheticSkeleton,
  getVoxelProceduralClips,
  VOXEL_ANIM_MAP,
} from '@/lib/voxel-loader';

const BASE = import.meta.env.BASE_URL;

export interface VoxelCharacterModelProps {
  unit: TacticalUnit;
  position: [number, number, number];
  facingAngle?: number;
  isSelected: boolean;
  animState: AnimState;
  modelUrl: string;
  voxelScale?: number;
}

export function VoxelCharacterModel({
  unit,
  position,
  facingAngle = Math.PI,
  isSelected,
  animState,
  modelUrl,
  voxelScale: configScale,
}: VoxelCharacterModelProps) {
  const url = modelUrl.startsWith('http') ? modelUrl : `${BASE}${modelUrl}`;
  const { scene: rawScene, animations: embeddedAnims } = useGLTF(url);

  const groupRef = useRef<THREE.Group>(null!);
  const innerRef = useRef<THREE.Group>(null!);
  const targetPos = useRef(new THREE.Vector3(...position));
  const targetFacing = useRef(facingAngle);

  useEffect(() => { targetPos.current.set(...position); }, [position]);
  useEffect(() => { targetFacing.current = facingAngle; }, [facingAngle]);

  // Clone scene, auto-scale, center pivot
  const { voxelScene, scale } = useMemo(() => {
    const clone = rawScene.clone(true);
    clone.traverse((n) => {
      if ((n as THREE.Mesh).isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
      }
    });
    const autoScale = configScale ?? computeVoxelScale(clone, 1.4);
    clone.scale.setScalar(autoScale);
    centerVoxelPivot(clone);
    return { voxelScene: clone, scale: autoScale };
  }, [rawScene, configScale]);

  // Procedural skeleton + animation clips
  const { syntheticRoot, clips } = useMemo(() => {
    const skeleton = generateSyntheticSkeleton(voxelScene);
    const proceduralClips = getVoxelProceduralClips();
    // Use embedded animations if available, otherwise procedural
    const finalClips = embeddedAnims.length > 0 ? embeddedAnims : proceduralClips;
    return { syntheticRoot: skeleton.root, clips: finalClips };
  }, [voxelScene, embeddedAnims]);

  const { actions } = useAnimations(clips, groupRef);

  // Play animation based on state
  useEffect(() => {
    if (!actions) return;
    const clipName = VOXEL_ANIM_MAP[animState] ?? 'VoxelIdle';
    // Try procedural name first, then embedded clip name
    const action = actions[clipName] ?? Object.values(actions).find(a => a);
    if (!action) return;

    Object.values(actions).forEach((a) => { if (a && a !== action) a.fadeOut(0.25); });

    if (animState === 'dead') {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    } else if (['attack1', 'attack2', 'attack3', 'attack4', 'cast', 'hurt', 'special1', 'special2', 'emote'].includes(animState)) {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = false;
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
    }

    action.timeScale = animState === 'frozen' ? 0.06 : animState === 'run' ? 1.5 : 1.0;
    action.reset().fadeIn(0.2).play();
  }, [animState, actions]);

  const isDead = unit.hp <= 0 || animState === 'dead';
  const hpPct = unit.hp / unit.maxHp;
  const hpColor = hpPct > 0.5 ? '#00ff88' : hpPct > 0.2 ? '#ffdd00' : '#ff3300';

  // Smooth position & rotation lerp
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetFacing.current,
      1 - Math.exp(-delta * 8),
    );
    groupRef.current.position.lerp(targetPos.current, 1 - Math.exp(-delta * 5));

    if (isDead) {
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -Math.PI / 2, delta * 2);
    } else {
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, delta * 8);
    }
  });

  const labelY = scale * 2.2;
  const hpRingY = scale * 2.0;
  const ringRad = scale * 0.55;

  return (
    <group ref={groupRef} position={position}>
      <group ref={innerRef}>
        <primitive object={voxelScene} />
        <primitive object={syntheticRoot} />
      </group>

      {isSelected && !isDead && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ringRad * 0.82, ringRad, 48]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} depthWrite={false} />
        </mesh>
      )}

      {!isDead && (
        <mesh position={[0, hpRingY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.17, 0.22, 32, 1, 0, hpPct * Math.PI * 2]} />
          <meshBasicMaterial color={hpColor} depthWrite={false} />
        </mesh>
      )}

      {!isDead && (
        <mesh position={[0, hpRingY + 0.06, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color={unit.isPlayerControlled ? '#d4a017' : '#cc2222'} />
        </mesh>
      )}

      {!isDead && (
        <Text
          position={[0, labelY, 0]}
          fontSize={0.18}
          color={unit.isPlayerControlled ? '#ffd700' : '#ff7777'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.025}
          outlineColor="#000000"
        >
          {unit.name}
        </Text>
      )}
    </group>
  );
}
