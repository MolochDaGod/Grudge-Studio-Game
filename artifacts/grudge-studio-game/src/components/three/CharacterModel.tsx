import React, { useEffect, useMemo, useRef, Suspense } from 'react';
import { useGLTF, useAnimations, Text, useTexture } from '@react-three/drei';
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
  facingAngle?: number;
  isSelected: boolean;
  animState: AnimState;
}

interface CharacterModelInnerProps extends CharacterModelProps {
  config: CharacterConfig;
  rpgTexture: THREE.Texture | null;
}

const BASE = import.meta.env.BASE_URL;
const C = (id: string) => `${BASE}models/characters/${id}.glb`;
const W = (id: string) => `${BASE}models/weapons/${id}.glb`;

// RPG pack models that need external texture loading (no embedded textures)
const RPG_TEX_URLS: Partial<Record<string, string>> = {
  ranger_rpg: `${BASE}models/characters/rpg-textures/ranger.png`,
  wizard_rpg:  `${BASE}models/characters/rpg-textures/wizard.png`,
  cleric_rpg:  `${BASE}models/characters/rpg-textures/cleric.png`,
  monk_rpg:    `${BASE}models/characters/rpg-textures/monk.png`,
};

// States that play once
const LOOP_ONCE_STATES = new Set<AnimState>([
  'attack1', 'attack2', 'attack3', 'attack4',
  'cast', 'hurt', 'special1', 'special2', 'emote',
]);

function applyMaterialOverrides(
  scene: THREE.Object3D,
  config: CharacterConfig,
  rpgTexture: THREE.Texture | null,
) {
  scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const result = mats.map((mat) => {
      if (!(mat instanceof THREE.MeshStandardMaterial)) return mat;
      const ov = config.materials[mat.name];
      const cloned = mat.clone() as THREE.MeshStandardMaterial;

      // Apply external texture for RPG models that have no embedded texture
      if (rpgTexture && !cloned.map) {
        cloned.map = rpgTexture;
        cloned.needsUpdate = true;
      }

      if (!ov) return cloned;
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

function CharacterModelInner({
  unit, position, facingAngle = Math.PI, isSelected, animState, config, rpgTexture,
}: CharacterModelInnerProps) {
  const charUrl   = C(config.modelId);
  const weapUrl   = W(config.primaryWeapon.modelId);
  const shieldUrl = config.secondaryWeapon ? W(config.secondaryWeapon.modelId) : weapUrl;

  const { scene: rawChar, animations } = useGLTF(charUrl);
  const { scene: rawWeap }             = useGLTF(weapUrl);
  const { scene: rawShield }           = useGLTF(shieldUrl);

  const charScene = useMemo(() => {
    const clone = SkeletonUtils.clone(rawChar);
    applyMaterialOverrides(clone, config, rpgTexture);
    return clone;
  }, [rawChar, config, rpgTexture]);

  const groupRef  = useRef<THREE.Group>(null!);
  const starsRef  = useRef<THREE.Group>(null!);
  const poisonRef = useRef<THREE.Mesh>(null!);
  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    if (!actions) return;
    const name = getAnimationName(animState, config);
    const action = actions[name];
    if (!action) return;
    Object.values(actions).forEach((a) => { if (a && a !== action) a.fadeOut(0.25); });
    action.timeScale = animState === 'frozen' ? 0.06 : 1.0;
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
  }, [animState, actions, config]);

  useEffect(() => {
    const pw = config.primaryWeapon;
    attachToBone(charScene, rawWeap, 'Fist.R', pw.position, pw.rotation, pw.scale);
  }, [charScene, rawWeap, config.primaryWeapon]);

  useEffect(() => {
    if (!config.secondaryWeapon) return;
    const sw = config.secondaryWeapon;
    attachToBone(charScene, rawShield, sw.attachBone, sw.position, sw.rotation, sw.scale);
  }, [charScene, rawShield, config.secondaryWeapon]);

  const targetPos = useRef(new THREE.Vector3(...position));
  useEffect(() => { targetPos.current.set(...position); }, [position]);

  const isStunned  = unit.statusEffects.includes('stunned');
  const isPoisoned = unit.statusEffects.includes('poisoned');
  const isFrozen   = unit.statusEffects.includes('frozen');
  const isBlocked  = animState === 'block';

  const hurtFlash = useRef(0);
  useEffect(() => {
    if (animState === 'hurt') hurtFlash.current = 1.0;
  }, [animState]);

  const isDead  = unit.hp <= 0 || animState === 'dead';
  const hpPct   = unit.hp / unit.maxHp;
  const hpColor = hpPct > 0.5 ? '#00ff88' : hpPct > 0.2 ? '#ffdd00' : '#ff3300';
  const poisonPhase = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.position.lerp(targetPos.current, 0.12);

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

    if (hurtFlash.current <= 0) {
      if (isFrozen) {
        charScene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            const mat = obj.material as THREE.MeshStandardMaterial;
            if (mat?.emissive) { mat.emissive.setRGB(0.05, 0.12, 0.45); mat.emissiveIntensity = 0.25; }
          }
        });
      } else if (isPoisoned) {
        charScene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            const mat = obj.material as THREE.MeshStandardMaterial;
            if (mat?.emissive) { mat.emissive.setRGB(0.0, 0.3, 0.04); mat.emissiveIntensity = 0.2 + 0.12 * Math.sin(poisonPhase.current); }
          }
        });
      } else {
        charScene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            const mat = obj.material as THREE.MeshStandardMaterial;
            if (mat?.emissive) {
              const ov = config.materials[mat.name];
              if (ov?.emissive) {
                const base = new THREE.Color().setStyle(ov.emissive);
                base.convertSRGBToLinear();
                mat.emissive.copy(base);
                mat.emissiveIntensity = ov.emissiveIntensity ?? 0;
              } else {
                mat.emissive.setRGB(0, 0, 0);
                mat.emissiveIntensity = 0;
              }
            }
          }
        });
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
  });

  const [sx, sy, sz] = config.scale;
  const labelY  = config.labelHeight  ?? sy * 2.25;
  const hpRingY = config.hpRingHeight ?? sy * 2.05;
  const ringRad = config.selectionRingRadius ?? Math.max(sx, sz) * 0.58;

  return (
    <group ref={groupRef} position={position} rotation={[0, facingAngle, 0]}>
      <group scale={[sx, sy, sz]}>
        <primitive object={charScene} />
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

      {!isDead && (isStunned || isPoisoned || isFrozen) && (
        <Text
          position={[0, labelY + 0.28, 0]}
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
        <group ref={starsRef} position={[0, labelY - 0.25, 0]}>
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
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[
              Math.cos(i * 1.257) * 0.52,
              0.1 + (i * 0.15) % 0.8,
              Math.sin(i * 1.257) * 0.52,
            ]}>
              <sphereGeometry args={[0.04, 4, 4]} />
              <meshBasicMaterial color="#44ff44" />
            </mesh>
          ))}
        </group>
      )}

      {isFrozen && !isDead && (
        <group>
          {[0, 1, 2, 3].map((i) => {
            const angle = i * (Math.PI / 2) + Math.PI / 4;
            return (
              <mesh key={i} position={[Math.cos(angle) * 0.48, 0.35, Math.sin(angle) * 0.48]}>
                <octahedronGeometry args={[0.12, 0]} />
                <meshStandardMaterial
                  color="#b8e4ff"
                  emissive="#4499ff"
                  emissiveIntensity={0.6}
                  transparent
                  opacity={0.88}
                />
              </mesh>
            );
          })}
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.36, 0.50, 20]} />
            <meshBasicMaterial color="#88ccff" transparent opacity={0.65} depthWrite={false} />
          </mesh>
        </group>
      )}

      {isBlocked && !isDead && (
        <mesh position={[0, sy * 0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ringRad * 0.9, ringRad * 1.15, 32]} />
          <meshBasicMaterial color="#d4a017" transparent opacity={0.55} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

// Loader wrapper for RPG models needing external textures
function CharacterModelTextureLoader(props: CharacterModelInnerProps & { textureUrl: string }) {
  const { textureUrl, ...rest } = props;
  const texture = useTexture(textureUrl);
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return <CharacterModelInner {...rest} rpgTexture={texture} />;
}

export function CharacterModel(props: CharacterModelProps) {
  const config = useMemo(() => getCharacterConfig(props.unit.characterId), [props.unit.characterId]);
  const texUrl = RPG_TEX_URLS[config.modelId];
  if (texUrl) {
    return (
      <Suspense fallback={null}>
        <CharacterModelTextureLoader {...props} config={config} textureUrl={texUrl} rpgTexture={null} />
      </Suspense>
    );
  }
  return <CharacterModelInner {...props} config={config} rpgTexture={null} />;
}

// Preload all assets
const modelIds = [
  'orc', 'elf', 'human', 'barbarian', 'undead', 'dwarf', 'rogue', 'mage',
  'warrior_rpg', 'ranger_rpg', 'rogue_rpg', 'wizard_rpg', 'cleric_rpg', 'monk_rpg',
];
const weapIds = ['greataxe', 'fire_staff', 'dark_staff', 'daggers', 'greatsword',
                 'bow', 'sword', 'shield', 'rusted_sword', 'war_hammer'];
modelIds.forEach((id) => useGLTF.preload(C(id)));
weapIds.forEach((id)  => useGLTF.preload(W(id)));
