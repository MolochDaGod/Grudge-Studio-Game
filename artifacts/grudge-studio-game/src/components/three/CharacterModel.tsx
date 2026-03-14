import React, { useEffect, useMemo, useRef } from 'react';
import { useGLTF, useAnimations, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import { TacticalUnit } from '@/store/use-game-store';
import {
  getCharacterConfig,
  getAnimationName,
  CharacterConfig,
  AnimState,
} from '@/lib/character-model-map';

export type { AnimState };

interface CharacterModelProps {
  unit: TacticalUnit;
  position: [number, number, number];
  isSelected: boolean;
  animState: AnimState;
}

const BASE = import.meta.env.BASE_URL;
const C = (id: string) => `${BASE}models/characters/${id}.glb`;
const W = (id: string) => `${BASE}models/weapons/${id}.glb`;

function applyMaterialOverrides(scene: THREE.Object3D, config: CharacterConfig) {
  scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const result = mats.map((mat) => {
      if (!(mat instanceof THREE.MeshStandardMaterial)) return mat;
      const ov = config.materials[mat.name];
      if (!ov) return mat.clone();
      const cloned = mat.clone() as THREE.MeshStandardMaterial;
      if (ov.color) {
        const c = new THREE.Color().setStyle(ov.color);
        c.convertSRGBToLinear();
        cloned.color.copy(c);
      }
      if (ov.emissive) {
        const e = new THREE.Color().setStyle(ov.emissive);
        e.convertSRGBToLinear();
        cloned.emissive.copy(e);
      }
      if (ov.emissiveIntensity !== undefined) cloned.emissiveIntensity = ov.emissiveIntensity;
      if (ov.metalness !== undefined) cloned.metalness = ov.metalness;
      if (ov.roughness !== undefined) cloned.roughness = ov.roughness;
      return cloned;
    });
    obj.material = Array.isArray(obj.material) ? result : result[0];
    obj.castShadow = true;
    obj.receiveShadow = true;
  });
}

function attachToBone(
  charScene: THREE.Object3D,
  weapScene: THREE.Object3D,
  boneName: string,
  pos: [number, number, number],
  rot: [number, number, number],
  scale: number,
) {
  let bone: THREE.Object3D | null = null;
  charScene.traverse((o) => { if (o.name === boneName) bone = o; });
  if (!bone) return;
  const prev = (bone as THREE.Object3D).children.filter((c) => c.userData.isWeapon);
  prev.forEach((p) => (bone as THREE.Object3D).remove(p));
  const clone = SkeletonUtils.clone(weapScene);
  clone.userData.isWeapon = true;
  clone.position.set(...pos);
  clone.rotation.set(...rot);
  clone.scale.setScalar(scale);
  clone.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.material = Array.isArray(o.material)
        ? o.material.map((m) => m.clone())
        : (o.material as THREE.Material).clone();
    }
  });
  (bone as THREE.Object3D).add(clone);
}

export function CharacterModel({ unit, position, isSelected, animState }: CharacterModelProps) {
  const config = useMemo(() => getCharacterConfig(unit.characterId), [unit.characterId]);

  const charUrl  = C(config.modelId);
  const weapUrl  = W(config.primaryWeapon.modelId);
  // Always call useGLTF — use same weapon if no secondary (React hook rule)
  const shieldUrl = config.secondaryWeapon ? W(config.secondaryWeapon.modelId) : weapUrl;

  const { scene: rawChar, animations } = useGLTF(charUrl);
  const { scene: rawWeap }             = useGLTF(weapUrl);
  const { scene: rawShield }           = useGLTF(shieldUrl);

  const charScene = useMemo(() => {
    const clone = SkeletonUtils.clone(rawChar);
    applyMaterialOverrides(clone, config);
    return clone;
  }, [rawChar, config]);

  const groupRef = useRef<THREE.Group>(null!);
  const { actions } = useAnimations(animations, groupRef);

  // Play animation
  useEffect(() => {
    if (!actions) return;
    const name = getAnimationName(animState, config);
    const action = actions[name];
    if (!action) return;
    Object.values(actions).forEach((a) => { if (a && a !== action) a.fadeOut(0.2); });
    if (animState === 'dead') {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
    }
    action.reset().fadeIn(0.2).play();
  }, [animState, actions, config]);

  // Attach primary weapon
  useEffect(() => {
    const pw = config.primaryWeapon;
    attachToBone(charScene, rawWeap, 'Fist.R', pw.position, pw.rotation, pw.scale);
  }, [charScene, rawWeap, config.primaryWeapon]);

  // Attach secondary weapon (shield)
  useEffect(() => {
    if (!config.secondaryWeapon) return;
    const sw = config.secondaryWeapon;
    attachToBone(charScene, rawShield, sw.attachBone, sw.position, sw.rotation, sw.scale);
  }, [charScene, rawShield, config.secondaryWeapon]);

  // Smooth position
  const targetPos = useRef(new THREE.Vector3(...position));
  useEffect(() => { targetPos.current.set(...position); }, [position]);

  // Hurt flash
  const hurtFlash = useRef(0);
  useEffect(() => {
    if (animState === 'hurt') hurtFlash.current = 1.0;
  }, [animState]);

  const isDead = unit.hp <= 0 || animState === 'dead';
  const hpPct  = unit.hp / unit.maxHp;
  const hpColor = hpPct > 0.5 ? '#00ff88' : hpPct > 0.2 ? '#ffdd00' : '#ff3300';

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.position.lerp(targetPos.current, 0.12);

    // Hurt emissive flash
    if (hurtFlash.current > 0) {
      hurtFlash.current = Math.max(0, hurtFlash.current - delta * 5);
      charScene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const mat = obj.material as THREE.MeshStandardMaterial;
          if (mat?.emissive) {
            mat.emissive.setRGB(hurtFlash.current * 0.8, 0, 0);
            mat.emissiveIntensity = (config.materials[mat.name]?.emissiveIntensity ?? 0) + hurtFlash.current;
          }
        }
      });
    }

    // Death fall
    if (isDead) {
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x, -Math.PI / 2, delta * 2
      );
    } else {
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x, 0, delta * 8
      );
    }
  });

  const [sx, sy, sz] = config.scale;
  const labelY   = sy * 2.25;
  const hpRingY  = sy * 2.05;
  const ringRad  = Math.max(sx, sz) * 0.58;

  return (
    <group ref={groupRef} position={position}>
      <group scale={[sx, sy, sz]}>
        <primitive object={charScene} />
      </group>

      {/* Selection ring */}
      {isSelected && !isDead && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ringRad * 0.82, ringRad, 48]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} depthWrite={false} />
        </mesh>
      )}

      {/* HP arc */}
      {!isDead && (
        <mesh position={[0, hpRingY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.17, 0.22, 32, 1, 0, hpPct * Math.PI * 2]} />
          <meshBasicMaterial color={hpColor} depthWrite={false} />
        </mesh>
      )}

      {/* Faction dot */}
      {!isDead && (
        <mesh position={[0, hpRingY + 0.06, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color={unit.isPlayerControlled ? '#d4a017' : '#cc2222'} />
        </mesh>
      )}

      {/* Name label */}
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

// Preload all assets
const modelIds = ['orc','elf','human','barbarian','undead','dwarf','rogue','mage'];
const weapIds  = ['greataxe','fire_staff','dark_staff','daggers','greatsword',
                  'bow','sword','shield','rusted_sword','war_hammer'];
modelIds.forEach((id) => useGLTF.preload(C(id)));
weapIds.forEach((id)  => useGLTF.preload(W(id)));
