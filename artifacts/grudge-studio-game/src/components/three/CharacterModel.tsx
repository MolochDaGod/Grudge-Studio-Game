import React, { useEffect, useMemo, useRef, Suspense } from 'react';
import { useGLTF, useAnimations, Text, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { TacticalUnit } from '@/store/use-game-store';
import {
  getCharacterConfig,
  getAnimationName,
  CharacterConfig,
  AnimState,
  AccessoryConfig,
  resolveWeaponConfig,
  WeaponConfig,
  SecondaryWeaponConfig,
} from '@/lib/character-model-map';
import { applyTextureSet, textureUrlToSet } from '@/lib/texture-manager';
import { buildAnimMap } from '@/lib/animation-retarget';
import { characterModelUrl, weaponModelUrl, textureAssetUrl } from '@/lib/asset-config';
import { VoxelCharacterModel } from './VoxelCharacterModel';

export type { AnimState };

interface CharacterModelProps {
  unit: TacticalUnit;
  position: [number, number, number];
  facingAngle?: number;
  isSelected: boolean;
  animState: AnimState;
  /** Equipped weapon type — overrides the config's default weapon + animation set */
  weaponType?: string;
}

interface CharacterModelInnerProps extends CharacterModelProps {
  config: CharacterConfig;
  rpgTexture: THREE.Texture | null;
  /** Resolved weapon configs (with fallbacks and RPG-pack scaling applied) */
  resolvedPrimary: WeaponConfig;
  resolvedSecondary?: SecondaryWeaponConfig;
}

/** Resolve character/weapon model URLs through CDN-aware asset-config */
const C = (id: string) => characterModelUrl(id);
const W = (id: string) => weaponModelUrl(id);


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
  // Apply multi-texture set if configured (takes priority over single textureUrl)
  const texSet = config.textures ?? (config.textureUrl ? textureUrlToSet(config.textureUrl) : null);
  if (texSet && !rpgTexture) {
    applyTextureSet(scene, texSet, import.meta.env.BASE_URL);
  }

  scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const result = mats.map((mat) => {
      if (!(mat instanceof THREE.MeshStandardMaterial)) return mat;
      const ov = config.materials[mat.name];
      const cloned = mat.clone() as THREE.MeshStandardMaterial;

      // Apply external texture for RPG models that have no embedded texture.
      // When we do this we reset the material color to white so the PNG's
      // baked colours show at full brightness (no tint multiply).
      const externalTexApplied = !!(rpgTexture && !cloned.map);
      if (externalTexApplied) {
        cloned.map = rpgTexture;
        cloned.color.setHex(0xffffff);
        cloned.needsUpdate = true;
      }

      if (!ov) return cloned;
      // Skip colour tint when the external PNG is the source of truth
      if (ov.color && !externalTexApplied) {
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

// Shared GLTF loader instance for async accessory loading
const _gltfLoader = new GLTFLoader();

function CharacterModelInner({
  unit, position, facingAngle = Math.PI, isSelected, animState, config, rpgTexture,
  weaponType, resolvedPrimary, resolvedSecondary,
}: CharacterModelInnerProps) {
  const charUrl   = C(config.modelId);
  const weapUrl   = W(resolvedPrimary.modelId);
  const shieldUrl = resolvedSecondary ? W(resolvedSecondary.modelId) : weapUrl;

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

  // Build weapon-aware animation map
  const resolvedAnimMap = useMemo(
    () => buildAnimMap(unit.characterId, weaponType),
    [unit.characterId, weaponType],
  );

  useEffect(() => {
    if (!actions) return;
    const name = resolvedAnimMap[animState] ?? 'Idle';
    // Some GLBs (Quaternius RPG pack) prefix every clip with "CharacterArmature|"
    const action = actions[name] ?? actions[`CharacterArmature|${name}`];
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
  }, [animState, actions, resolvedAnimMap]);

  useEffect(() => {
    attachToBone(charScene, rawWeap, 'Fist.R', resolvedPrimary.position, resolvedPrimary.rotation, resolvedPrimary.scale);
  }, [charScene, rawWeap, resolvedPrimary]);

  useEffect(() => {
    if (!resolvedSecondary) return;
    attachToBone(charScene, rawShield, resolvedSecondary.attachBone, resolvedSecondary.position, resolvedSecondary.rotation, resolvedSecondary.scale);
  }, [charScene, rawShield, resolvedSecondary]);

  // ── Accessory attachments (helmets, shoulder pads, capes, etc.) ─────────
  // Each accessory is loaded on demand via GLTFLoader and attached to the specified bone.
  // If the GLB fails to load (file doesn't exist yet), we silently skip.
  useEffect(() => {
    if (!config.accessoryAttachments || config.accessoryAttachments.length === 0) return;
    const base = import.meta.env.BASE_URL;
    const A = (id: string) => `${base}models/accessories/${id}.glb`;
    let disposed = false;
    const attached: Array<{ bone: THREE.Object3D; child: THREE.Object3D }> = [];

    for (const acc of config.accessoryAttachments) {
      // Find the target bone
      let targetBone: THREE.Object3D | null = null;
      charScene.traverse((o) => { if (o.name === acc.bone) targetBone = o; });
      if (!targetBone) continue;

      const bone: THREE.Object3D = targetBone; // capture for closure
      _gltfLoader.load(
        A(acc.modelId),
        (gltf) => {
          if (disposed) return;
          const clone = SkeletonUtils.clone(gltf.scene);
          clone.userData.isAccessory = true;
          clone.position.set(...acc.position);
          clone.rotation.set(...acc.rotation);
          clone.scale.setScalar(acc.scale);
          clone.traverse((o) => {
            if (o instanceof THREE.Mesh) {
              o.castShadow = true;
              o.receiveShadow = true;
            }
          });
          bone.add(clone);
          attached.push({ bone, child: clone });
        },
        undefined,
        () => { /* Accessory GLB not found — silently skip */ },
      );
    }

    return () => {
      disposed = true;
      for (const { bone, child } of attached) bone.remove(child);
    };
  }, [charScene, config.accessoryAttachments]);

  const targetPos    = useRef(new THREE.Vector3(...position));
  const targetFacing = useRef(facingAngle);
  const lungeOffset  = useRef(new THREE.Vector3());
  const _effTarget   = useRef(new THREE.Vector3());
  const prevAnimRef  = useRef<AnimState>('idle');

  useEffect(() => { targetPos.current.set(...position); }, [position]);
  useEffect(() => { targetFacing.current = facingAngle; }, [facingAngle]);

  // Lunge forward when an attack/cast begins
  useEffect(() => {
    const isNowAttack = LOOP_ONCE_STATES.has(animState) && animState !== 'hurt' && animState !== 'emote';
    const wasIdle     = !LOOP_ONCE_STATES.has(prevAnimRef.current);
    if (wasIdle && isNowAttack) {
      const f = targetFacing.current;
      lungeOffset.current.set(Math.sin(f) * 0.6, 0, Math.cos(f) * 0.6);
    }
    prevAnimRef.current = animState;
  }, [animState]);

  const isStunned  = unit.statusEffects.includes('stunned');
  const isPoisoned = unit.statusEffects.includes('poisoned');
  const isFrozen   = unit.statusEffects.includes('frozen');
  const isBlocked  = animState === 'block';

  const hurtFlash = useRef(0);
  useEffect(() => {
    if (animState === 'hurt') hurtFlash.current = 1.0;
  }, [animState]);

  // Cache mesh+material refs on first render to avoid per-frame scene traversal.
  // We keep ALL MeshStandardMaterial meshes (emissive + opacity both need them).
  const cachedMeshes = useRef<Array<{ mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; matName: string }>>([]);
  useEffect(() => {
    const meshes: typeof cachedMeshes.current = [];
    charScene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const mat = obj.material as THREE.MeshStandardMaterial;
        if (mat?.isMeshStandardMaterial) meshes.push({ mesh: obj, mat, matName: mat.name });
      }
    });
    cachedMeshes.current = meshes;
  }, [charScene]);

  // Stealth transparency — set material opacity based on hide/sneak state
  useEffect(() => {
    const isHide = animState === 'hide';
    const isSneak = animState === 'sneak';
    const transparent = isHide || isSneak;
    const opacity = isHide ? 0.32 : isSneak ? 0.65 : 1.0;
    cachedMeshes.current.forEach(({ mat }) => {
      mat.transparent = transparent;
      mat.opacity = opacity;
      mat.needsUpdate = true;
    });
    return () => {
      cachedMeshes.current.forEach(({ mat }) => {
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.needsUpdate = true;
      });
    };
  }, [animState]);

  const isDead  = unit.hp <= 0 || animState === 'dead';
  const hpPct   = unit.hp / unit.maxHp;
  const hpColor = hpPct > 0.5 ? '#00ff88' : hpPct > 0.2 ? '#ffdd00' : '#ff3300';
  const poisonPhase = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // ── Smooth facing rotation (lerp Y toward targetFacing) ──────────────────
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetFacing.current,
      1 - Math.exp(-delta * 8),
    );

    // ── Lunge spring-back (exponential decay toward zero) ───────────────────
    lungeOffset.current.multiplyScalar(Math.exp(-delta * 3.8));

    // ── Delta-corrected walk lerp + lunge ─────────────────────────────
    _effTarget.current.copy(targetPos.current).add(lungeOffset.current);
    groupRef.current.position.lerp(_effTarget.current, 1 - Math.exp(-delta * 5));

    // ── Material tinting (using cached refs, no traversal) ─────────────────
    const cms = cachedMeshes.current;
    if (hurtFlash.current > 0) {
      hurtFlash.current = Math.max(0, hurtFlash.current - delta * 5);
      for (const { mat, matName } of cms) {
        mat.emissive.setRGB(hurtFlash.current * 0.8, 0, 0);
        mat.emissiveIntensity = (config.materials[matName]?.emissiveIntensity ?? 0) + hurtFlash.current;
      }
    }

    if (hurtFlash.current <= 0) {
      if (isFrozen) {
        for (const { mat } of cms) {
          mat.emissive.setRGB(0.05, 0.12, 0.45); mat.emissiveIntensity = 0.25;
        }
      } else if (isPoisoned) {
        for (const { mat } of cms) {
          mat.emissive.setRGB(0.0, 0.3, 0.04); mat.emissiveIntensity = 0.2 + 0.12 * Math.sin(poisonPhase.current);
        }
      } else {
        for (const { mat, matName } of cms) {
          const ov = config.materials[matName];
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
    <group ref={groupRef} position={position}>
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
  const { textureUrl, ...innerProps } = props;
  const texture = useTexture(textureUrl);
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return <CharacterModelInner {...innerProps} rpgTexture={texture} />;
}

export function CharacterModel(props: CharacterModelProps) {
  const config = useMemo(() => getCharacterConfig(props.unit.characterId), [props.unit.characterId]);

  // Resolve weapon model + secondary from the equipped weapon type (with fallbacks)
  const { resolvedPrimary, resolvedSecondary } = useMemo(() => {
    const resolved = resolveWeaponConfig(props.weaponType ?? props.unit.weaponType, config);
    return { resolvedPrimary: resolved.primary, resolvedSecondary: resolved.secondary };
  }, [props.weaponType, props.unit.weaponType, config]);

  // Placeholder capsule shown while GLBs load
  const LoadingPlaceholder = () => (
    <group position={props.position}>
      <mesh position={[0, 0.6, 0]}>
        <capsuleGeometry args={[0.25, 0.6, 4, 8]} />
        <meshBasicMaterial color={props.unit.isPlayerControlled ? '#4488ff' : '#ff4444'} wireframe />
      </mesh>
    </group>
  );

  // Voxel model branch — delegate to VoxelCharacterModel for skeleton-less models
  if (config.isVoxel && config.voxelModelUrl) {
    return (
      <Suspense fallback={<LoadingPlaceholder />}>
        <VoxelCharacterModel
          unit={props.unit}
          position={props.position}
          facingAngle={props.facingAngle}
          isSelected={props.isSelected}
          animState={props.animState}
          modelUrl={config.voxelModelUrl}
          voxelScale={config.voxelScale}
        />
      </Suspense>
    );
  }

  // Determine texture URL from new `textures.diffuse` or legacy `textureUrl`
  const texSet = config.textures ?? (config.textureUrl ? textureUrlToSet(config.textureUrl) : null);
  const texUrl = texSet?.diffuse ? `${BASE}${texSet.diffuse}` : null;
  if (texUrl) {
    return (
      <Suspense fallback={<LoadingPlaceholder />}>
        <CharacterModelTextureLoader
          {...props}
          config={config}
          textureUrl={texUrl}
          rpgTexture={null}
          resolvedPrimary={resolvedPrimary}
          resolvedSecondary={resolvedSecondary}
        />
      </Suspense>
    );
  }
  return (
    <CharacterModelInner
      {...props}
      config={config}
      rpgTexture={null}
      resolvedPrimary={resolvedPrimary}
      resolvedSecondary={resolvedSecondary}
    />
  );
}

// Preload all assets — only models actually used in CHARACTER_CONFIGS
const modelIds = [
  // Quaternius Fantasy Pack
  'orc', 'dwarf',
  // Quaternius RPG Characters Pack (actively used)
  'ranger_rpg', 'cleric_rpg',
  // Ultimate Animated Character Pack
  'knight_male', 'knight_golden_male', 'viking_male', 'ninja_male', 'ninja_female',
  'pirate_male', 'zombie_male', 'zombie_female', 'soldier_male', 'wizard', 'witch',
  'casual_bald', 'goblin_male', 'kimono_female',
];
const weapIds = ['greataxe', 'fire_staff', 'dark_staff', 'daggers', 'greatsword',
                 'bow', 'sword', 'shield', 'rusted_sword', 'war_hammer'];
try {
  modelIds.forEach((id) => useGLTF.preload(C(id)));
  weapIds.forEach((id)  => useGLTF.preload(W(id)));
} catch (err) {
  console.warn('[CharacterModel] Failed to preload some GLB assets:', err);
}
