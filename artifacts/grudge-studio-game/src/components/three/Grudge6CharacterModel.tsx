import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Billboard, Text, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TacticalUnit } from '@/store/use-game-store';
import type { AnimState } from '@/lib/character-model-map';
import { portraitUrl } from '@/lib/asset-config';
import { heroToGrudge6Config } from '@/lib/grudge6-character';
import { applyGrudge6RaceTexture, loadGrudge6RaceModel } from '@/lib/grudge6-model-loader';
import { setupGrudge6Equipment } from '@/lib/grudge6-equipment';
import { buildAnimMap } from '@/lib/animation-retarget';
import { collectBoneNames } from '@/lib/animation-retarget';
import { loadWeaponAnimations, hasExternalAnimations } from '@/lib/animation-library';
import { applyHeroPortraitStyle } from '@/lib/hero-portrait-style';

interface Grudge6CharacterModelProps {
  unit: TacticalUnit;
  position: [number, number, number];
  facingAngle?: number;
  isSelected: boolean;
  animState: AnimState;
  weaponType?: string;
  targetWorldPos?: [number, number, number] | null;
  isTargeted?: boolean;
}

const LOOP_ONCE_STATES = new Set<AnimState>([
  'attack1', 'attack2', 'attack3', 'attack4',
  'cast', 'hurt', 'special1', 'special2', 'emote',
]);

function SolidSilhouette({ color }: { color: string }) {
  return (
    <mesh position={[0, 0.75, 0]}>
      <capsuleGeometry args={[0.22, 0.5, 6, 12]} />
      <meshStandardMaterial color={color} roughness={0.85} metalness={0.05} />
    </mesh>
  );
}

function HeroPortraitBadge({ characterId, y }: { characterId: string; y: number }) {
  const texture = useTexture(portraitUrl(characterId));
  texture.colorSpace = THREE.SRGBColorSpace;

  return (
    <Billboard position={[0, y, 0]} follow lockX lockZ>
      <mesh renderOrder={10}>
        <circleGeometry args={[0.34, 48]} />
        <meshBasicMaterial map={texture} transparent depthTest={false} />
      </mesh>
      <mesh position={[0, 0, -0.01]} renderOrder={9}>
        <ringGeometry args={[0.34, 0.39, 48]} />
        <meshBasicMaterial color="#d4a017" depthTest={false} />
      </mesh>
    </Billboard>
  );
}

export function Grudge6CharacterModel({
  unit,
  position,
  facingAngle = Math.PI,
  isSelected,
  animState,
  weaponType,
  targetWorldPos,
  isTargeted,
}: Grudge6CharacterModelProps) {
  const config = useMemo(
    () => heroToGrudge6Config(unit.characterId, weaponType ?? unit.weaponType),
    [unit.characterId, weaponType, unit.weaponType],
  );

  const groupRef = useRef<THREE.Group>(null!);
  const modelRootRef = useRef<THREE.Group | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Record<string, THREE.AnimationAction>>({});
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const starsRef = useRef<THREE.Group>(null!);
  const poisonRef = useRef<THREE.Mesh>(null!);

  const [modelReady, setModelReady] = useState(false);
  const [clipsReady, setClipsReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const cachedMeshes = useRef<Array<{ mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial }>>([]);

  const resolvedAnimMap = useMemo(
    () => buildAnimMap(unit.characterId, config.animWeaponType),
    [unit.characterId, config.animWeaponType],
  );

  useEffect(() => {
    let cancelled = false;
    setModelReady(false);
    setClipsReady(false);
    setLoadError(false);

    loadGrudge6RaceModel(config.racePrefix, config.heightMult)
      .then(async (scene) => {
        if (cancelled || !groupRef.current) return;

        if (modelRootRef.current) {
          groupRef.current.remove(modelRootRef.current);
          modelRootRef.current = null;
        }

        setupGrudge6Equipment(config.racePrefix, scene, config.model3d);
        await applyGrudge6RaceTexture(scene, config.racePrefix);
        await applyHeroPortraitStyle(scene, unit.characterId, config.model3d);

        const meshes: typeof cachedMeshes.current = [];
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            const mat = obj.material as THREE.MeshStandardMaterial;
            if (mat?.isMeshStandardMaterial) meshes.push({ mesh: obj, mat });
          }
        });
        cachedMeshes.current = meshes;

        modelRootRef.current = scene;
        groupRef.current.add(scene);
        setModelReady(true);

        const mixer = new THREE.AnimationMixer(scene);
        mixerRef.current = mixer;
        actionsRef.current = {};
        currentActionRef.current = null;

        const boneNames = collectBoneNames(scene);
        const animWeapon = config.animWeaponType;

        const registerClips = (clips: THREE.AnimationClip[]) => {
          if (cancelled) return;
          for (const clip of clips) {
            const action = mixer.clipAction(clip);
            actionsRef.current[clip.name] = action;
          }
          setClipsReady(true);
        };

        if (hasExternalAnimations(animWeapon)) {
          loadWeaponAnimations(animWeapon, boneNames)
            .then(registerClips)
            .catch(() => {
              if (!cancelled) setLoadError(true);
            });
        } else {
          setClipsReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
      actionsRef.current = {};
      currentActionRef.current = null;
      if (modelRootRef.current && groupRef.current) {
        groupRef.current.remove(modelRootRef.current);
        modelRootRef.current = null;
      }
    };
  }, [unit.characterId, config.racePrefix, config.heightMult, config.animWeaponType, config.model3d]);

  useEffect(() => {
    const mixer = mixerRef.current;
    const actions = actionsRef.current;
    if (!mixer || !modelReady || !clipsReady) return;

    const name = resolvedAnimMap[animState] ?? 'Idle';
    let action =
      actions[name] ??
      actions['ssIdle'] ??
      actions['meleeIdle'] ??
      actions['bowIdle'] ??
      actions['staffIdle'] ??
      actions['Idle'] ??
      null;

    if (!action) {
      const first = Object.values(actions).find((a) => !!a);
      action = first ?? null;
    }
    if (!action) return;

    const prev = currentActionRef.current;
    if (prev && prev !== action) prev.fadeOut(0.25);

    action.timeScale = animState === 'frozen' ? 0.06
      : animState === 'sneak' ? 0.5
      : animState === 'poisoned' ? 0.8
      : 1.0;

    if (animState === 'dead') {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    } else if (LOOP_ONCE_STATES.has(animState)) {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = false;
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
    }

    action.reset().fadeIn(0.2).play();
    currentActionRef.current = action;
  }, [animState, modelReady, clipsReady, resolvedAnimMap]);

  const targetPos = useRef(new THREE.Vector3(...position));
  const targetFacing = useRef(facingAngle);
  const lungeOffset = useRef(new THREE.Vector3());
  const _effTarget = useRef(new THREE.Vector3());
  const prevAnimRef = useRef<AnimState>('idle');
  const hurtFlash = useRef(0);
  const poisonPhase = useRef(0);

  useEffect(() => { targetPos.current.set(...position); }, [position]);
  useEffect(() => { targetFacing.current = facingAngle; }, [facingAngle]);
  useEffect(() => {
    if (animState === 'hurt') hurtFlash.current = 1.0;
  }, [animState]);

  useEffect(() => {
    if (targetWorldPos && LOOP_ONCE_STATES.has(animState)) {
      const dx = targetWorldPos[0] - targetPos.current.x;
      const dz = targetWorldPos[2] - targetPos.current.z;
      targetFacing.current = Math.atan2(dx, dz);
    }
  }, [targetWorldPos, animState]);

  useEffect(() => {
    const isNowAttack = LOOP_ONCE_STATES.has(animState) && animState !== 'hurt' && animState !== 'emote';
    const wasIdle = !LOOP_ONCE_STATES.has(prevAnimRef.current);
    if (wasIdle && isNowAttack) {
      const f = targetFacing.current;
      lungeOffset.current.set(Math.sin(f) * 0.6, 0, Math.cos(f) * 0.6);
    }
    prevAnimRef.current = animState;
  }, [animState]);

  const isStunned = unit.statusEffects.includes('stunned');
  const isPoisoned = unit.statusEffects.includes('poisoned');
  const isFrozen = unit.statusEffects.includes('frozen');
  const isInvisible = unit.statusEffects.includes('invisible');
  const isInvincible = unit.statusEffects.includes('invincible');
  const isBlocked = animState === 'block';
  const isDead = unit.hp <= 0 || animState === 'dead';
  const hpPct = unit.hp / unit.maxHp;
  const hpColor = hpPct > 0.5 ? '#00ff88' : hpPct > 0.2 ? '#ffdd00' : '#ff3300';
  const placeholderColor = unit.isPlayerControlled ? '#4488ff' : '#ff4444';
  const ringRad = config.selectionRingRadius;

  useFrame((_, delta) => {
    if (mixerRef.current) mixerRef.current.update(delta);
    if (!groupRef.current) return;

    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetFacing.current,
      1 - Math.exp(-delta * 8),
    );

    lungeOffset.current.multiplyScalar(Math.exp(-delta * 3.8));
    _effTarget.current.copy(targetPos.current).add(lungeOffset.current);
    groupRef.current.position.lerp(_effTarget.current, 1 - Math.exp(-delta * 5));

    const cms = cachedMeshes.current;
    if (hurtFlash.current > 0) {
      hurtFlash.current = Math.max(0, hurtFlash.current - delta * 5);
      for (const { mat } of cms) {
        mat.emissive.setRGB(hurtFlash.current * 0.8, 0, 0);
        mat.emissiveIntensity = hurtFlash.current;
      }
    } else if (isFrozen) {
      for (const { mat } of cms) {
        mat.emissive.setRGB(0.05, 0.12, 0.45);
        mat.emissiveIntensity = 0.25;
      }
    } else if (isPoisoned) {
      for (const { mat } of cms) {
        mat.emissive.setRGB(0.0, 0.3, 0.04);
        mat.emissiveIntensity = 0.2 + 0.12 * Math.sin(poisonPhase.current);
      }
    } else if (isInvincible) {
      for (const { mat } of cms) {
        mat.emissive.setRGB(0.45, 0.38, 0.08);
        mat.emissiveIntensity = 0.22 + 0.1 * Math.sin(poisonPhase.current);
      }
    } else {
      for (const { mat } of cms) {
        mat.emissive.setRGB(0, 0, 0);
        mat.emissiveIntensity = 0;
      }
    }

    poisonPhase.current += delta * 3;
    if (poisonRef.current && isPoisoned) {
      const mat = poisonRef.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = 0.4 + 0.25 * Math.sin(poisonPhase.current);
    }
    if (starsRef.current && isStunned) {
      starsRef.current.rotation.y += delta * 3.5;
    }
    if (isDead) {
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -Math.PI / 2, delta * 2);
    } else {
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, delta * 8);
    }

    if (groupRef.current) {
      const targetOpacity = isInvisible ? 0.28 : 1;
      groupRef.current.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of mats) {
          if (!('opacity' in mat)) continue;
          const m = mat as THREE.MeshStandardMaterial;
          m.transparent = isInvisible || m.transparent;
          m.opacity = THREE.MathUtils.lerp(m.opacity, targetOpacity, 1 - Math.exp(-delta * 6));
        }
      });
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {(!modelReady || loadError) && (
        <SolidSilhouette color={placeholderColor} />
      )}

      {isSelected && !isDead && modelReady && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ringRad * 0.82, ringRad, 48]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} depthWrite={false} />
        </mesh>
      )}

      {!isDead && (
        <mesh position={[0, config.hpRingHeight, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.17, 0.22, 32, 1, 0, hpPct * Math.PI * 2]} />
          <meshBasicMaterial color={hpColor} depthWrite={false} />
        </mesh>
      )}

      {!isDead && (
        <mesh position={[0, config.hpRingHeight + 0.06, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color={unit.isPlayerControlled ? '#d4a017' : '#cc2222'} />
        </mesh>
      )}

      {!isDead && modelReady && (
        <Suspense fallback={null}>
          <HeroPortraitBadge characterId={unit.characterId} y={config.labelHeight + 0.42} />
        </Suspense>
      )}

      {!isDead && (
        <Text
          position={[0, config.labelHeight, 0]}
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

      {!isDead && (isStunned || isPoisoned || isFrozen) && (
        <Text
          position={[0, config.labelHeight + 0.28, 0]}
          fontSize={0.14}
          color={isStunned ? '#ffff00' : isFrozen ? '#88ccff' : '#44ff88'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {isStunned ? '★ STUNNED' : isFrozen ? '❄ FROZEN' : '☠ POISONED'}
        </Text>
      )}

      {isStunned && !isDead && (
        <group ref={starsRef} position={[0, config.labelHeight - 0.25, 0]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[Math.cos(i * 2.094) * 0.32, 0, Math.sin(i * 2.094) * 0.32]}>
              <octahedronGeometry args={[0.06, 0]} />
              <meshBasicMaterial color="#ffee00" />
            </mesh>
          ))}
        </group>
      )}

      {isPoisoned && !isDead && (
        <group>
          <mesh ref={poisonRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.42, 0.56, 20]} />
            <meshBasicMaterial color="#00ff44" transparent opacity={0.5} depthWrite={false} />
          </mesh>
        </group>
      )}

      {isBlocked && !isDead && (
        <mesh position={[0, 0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ringRad * 0.9, ringRad * 1.15, 32]} />
          <meshBasicMaterial color="#d4a017" transparent opacity={0.55} depthWrite={false} />
        </mesh>
      )}

      {isTargeted && !isDead && (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ringRad * 1.1, ringRad * 1.35, 32]} />
          <meshBasicMaterial color="#ff2200" transparent opacity={0.7} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}