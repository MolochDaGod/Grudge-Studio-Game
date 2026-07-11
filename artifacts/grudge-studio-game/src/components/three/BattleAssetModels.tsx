/**
 * GLB-backed battle props — archer tower, traps, arrow/ice projectiles, shield auras.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { tileToWorld } from './TileGrid';
import {
  BATTLE_ASSETS,
  trapModelUrl,
  shieldAssetForRole,
} from '@/lib/battle-assets';
import type { TrapTile, TrapModelId } from '@/lib/structure-combat';

function normalizeClone(root: THREE.Object3D, targetHeight: number): THREE.Object3D {
  const clone = root.clone(true);
  const box = new THREE.Box3().setFromObject(clone);
  const size = new THREE.Vector3();
  box.getCenter(new THREE.Vector3());
  box.getSize(size);
  const scale = targetHeight / Math.max(size.y, 0.01);
  clone.scale.setScalar(scale);
  const box2 = new THREE.Box3().setFromObject(clone);
  const minY = box2.min.y;
  clone.position.y -= minY;
  return clone;
}

// ── Archer watchtower ─────────────────────────────────────────────────────────
export function ArcherTowerProp({
  structureId,
  x,
  y,
  tileSize,
}: {
  structureId: string;
  x: number;
  y: number;
  tileSize: number;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(BATTLE_ASSETS.archerTower);
  const { actions } = useAnimations(animations, groupRef);
  const [wx, , wz] = tileToWorld(x, y, tileSize, 0);
  const model = useMemo(() => normalizeClone(scene, 2.4), [scene]);

  useEffect(() => {
    const onFire = (e: Event) => {
      const d = (e as CustomEvent).detail as { structureId?: string };
      if (d.structureId !== structureId) return;
      const act =
        actions['ArmatureAction.002'] ??
        actions['ArmatureAction.002_CrossBow-tower-ctrl'] ??
        Object.values(actions)[0];
      act?.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.08).play();
    };
    window.addEventListener('tower-fire', onFire);
    return () => window.removeEventListener('tower-fire', onFire);
  }, [structureId, actions]);

  return (
    <group ref={groupRef} position={[wx, 0, wz]}>
      <primitive object={model} rotation={[0, Math.PI / 4, 0]} />
    </group>
  );
}

// ── Trap tiles ────────────────────────────────────────────────────────────────
function TrapProp({
  modelId,
  x,
  y,
  tileSize,
  triggered,
}: {
  modelId: TrapModelId;
  x: number;
  y: number;
  tileSize: number;
  triggered: boolean;
}) {
  const url = trapModelUrl(modelId);
  const groupRef = useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, groupRef);
  const [wx, , wz] = tileToWorld(x, y, tileSize, 0.05);
  const model = useMemo(() => normalizeClone(scene, modelId === 'spike_trap' ? 0.55 : 0.7), [scene, modelId]);

  useEffect(() => {
    if (!triggered || modelId !== 'spike_trap') return;
    const act =
      actions.SpikeTrap_HideAnimation ??
      actions['Armature|SpikeTrap_HideAnimation'] ??
      Object.values(actions)[0];
    act?.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.05).play();
  }, [triggered, modelId, actions]);

  useEffect(() => {
    if (!triggered || modelId !== 'bear_trap') return;
    const act = Object.values(actions)[0];
    act?.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.05).play();
  }, [triggered, modelId, actions]);

  return (
    <group ref={groupRef} position={[wx, 0, wz]}>
      <primitive object={model} />
    </group>
  );
}

export function TrapTilesLayer({
  traps,
  tileSize,
  triggeredIds,
}: {
  traps: TrapTile[];
  tileSize: number;
  triggeredIds: Set<string>;
}) {
  return (
    <group>
      {traps.map((t) => (
        <TrapProp
          key={t.id}
          modelId={t.trapModel ?? 'bear_trap'}
          x={t.x}
          y={t.y}
          tileSize={tileSize}
          triggered={triggeredIds.has(t.id)}
        />
      ))}
    </group>
  );
}

// ── Shield aura (invincible / mana shield) ───────────────────────────────────
export function ShieldAuraModel({ role }: { role: string }) {
  const groupRef = useRef<THREE.Group>(null!);
  const assetKey = shieldAssetForRole(role);
  const { scene } = useGLTF(BATTLE_ASSETS[assetKey]);
  const model = useMemo(() => normalizeClone(scene, 1.35), [scene]);
  const spin = useRef(0);

  useFrame((_, delta) => {
    spin.current += delta * 1.2;
    if (groupRef.current) {
      groupRef.current.rotation.y = spin.current;
      groupRef.current.position.y = 0.95 + Math.sin(spin.current * 2) * 0.04;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.9, 0]} scale={0.85}>
      <primitive object={model} />
    </group>
  );
}

export function preloadBattleAssets(): void {
  for (const url of Object.values(BATTLE_ASSETS)) {
    useGLTF.preload(url);
  }
}