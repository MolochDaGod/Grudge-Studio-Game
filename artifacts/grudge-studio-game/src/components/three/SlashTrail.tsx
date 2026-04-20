/**
 * SlashTrail — sprite-sheet weapon slash VFX.
 *
 * Each slash FX is a grid-packed PNG + JSON baked from the original image
 * sequence in `attached_assets/slashefect_*.zip` by
 * `scripts/bake-slash-atlases.mjs`. Files live under `public/slashfx/`.
 *
 * Rendering strategy: one PlaneGeometry, always facing the camera
 * (billboard), material is MeshBasicMaterial with an off-screen UV window
 * into the atlas. A useFrame loop advances the current frame index based on
 * `(now - startTime) / duration * frameCount`. On completion the component
 * calls `onComplete` so the parent pool can retire it.
 *
 * Production-recommended blending is AdditiveBlending for bright/neon
 * slashes, NormalBlending (with premultiplied alpha) for painterly ones.
 * The default is Additive which reads punchy against the dark battle grid.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

const BASE = import.meta.env.BASE_URL;

export interface SlashAtlasMeta {
  name: string;
  atlas: string;
  cols: number;
  rows: number;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  atlasWidth: number;
  atlasHeight: number;
  duration: number;
}

export interface SlashTrailProps {
  /** Atlas id, e.g. "slash3". Resolved to `${BASE}slashfx/${id}.png|json`. */
  effect: string;
  /** World position of the slash centre. */
  position: [number, number, number];
  /** Z-axis rotation in radians (slash tilt). Random jitter looks great. */
  rotation?: number;
  /** Visual size in world units. 1.6 ≈ one character-height. */
  scale?: number;
  /** Override the JSON duration (seconds). */
  durationOverride?: number;
  /** 'additive' (default — bright/neon) or 'normal'. */
  blending?: 'additive' | 'normal';
  /** Tint multiplied into the sprite colour. */
  tint?: string;
  /** Fires exactly once when the last frame has been shown. */
  onComplete?: () => void;
}

/** Fetch the atlas JSON (cached per-effect). */
const metaCache = new Map<string, Promise<SlashAtlasMeta>>();
function loadMeta(effect: string): Promise<SlashAtlasMeta> {
  const hit = metaCache.get(effect);
  if (hit) return hit;
  const p = fetch(`${BASE}slashfx/${effect}.json`).then(r => {
    if (!r.ok) throw new Error(`slashfx ${effect} HTTP ${r.status}`);
    return r.json() as Promise<SlashAtlasMeta>;
  });
  metaCache.set(effect, p);
  return p;
}

/** Internal: memoised texture for an atlas PNG. */
function useAtlasTexture(effect: string): THREE.Texture {
  const tex = useLoader(THREE.TextureLoader, `${BASE}slashfx/${effect}.png`);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

export function SlashTrail({
  effect,
  position,
  rotation = 0,
  scale = 1.6,
  durationOverride,
  blending = 'additive',
  tint = '#ffffff',
  onComplete,
}: SlashTrailProps) {
  const texture = useAtlasTexture(effect);

  // Meta is loaded synchronously after first fetch by a suspending ref.
  const metaRef = useRef<SlashAtlasMeta | null>(null);
  useEffect(() => {
    let disposed = false;
    loadMeta(effect).then(m => { if (!disposed) metaRef.current = m; });
    return () => { disposed = true; };
  }, [effect]);

  const matRef  = useRef<THREE.MeshBasicMaterial>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);
  const startRef = useRef<number>(performance.now());
  const completedRef = useRef(false);

  // One-time material config (blending + depthWrite off).
  useEffect(() => {
    const m = matRef.current;
    if (!m) return;
    m.blending = blending === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending;
    m.transparent = true;
    m.depthWrite = false;
    m.toneMapped = false;
  }, [blending]);

  const tintColor = useMemo(() => new THREE.Color(tint), [tint]);

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    const mat  = matRef.current;
    const meta = metaRef.current;
    if (!mesh || !mat) return;

    // Billboard: face the camera every frame.
    mesh.quaternion.copy(camera.quaternion);
    mesh.rotateZ(rotation);

    if (!meta) return;
    const now = performance.now();
    const duration = (durationOverride ?? meta.duration) * 1000;
    const t = (now - startRef.current) / duration;
    if (t >= 1) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
      mesh.visible = false;
      return;
    }

    const frameIdx = Math.min(meta.frameCount - 1, Math.floor(t * meta.frameCount));
    const cx = frameIdx % meta.cols;
    const cy = Math.floor(frameIdx / meta.cols);
    texture.repeat.set(1 / meta.cols, 1 / meta.rows);
    texture.offset.set(cx / meta.cols, 1 - (cy + 1) / meta.rows);   // PNG is y-down, UVs are y-up

    // Fade out in the last 25% for a softer tail.
    const alpha = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
    mat.opacity = alpha;
    mat.color.copy(tintColor);
  });

  return (
    <mesh ref={meshRef} position={position} scale={[scale, scale, scale]} renderOrder={999}>
      <planeGeometry args={[2, 1.125]} />      {/* 256:144 aspect */}
      <meshBasicMaterial
        ref={matRef}
        map={texture}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

// ── Runtime controller: spawn + auto-retire slashes from anywhere ────────────
export interface ActiveSlash {
  id: string;
  effect: string;
  position: [number, number, number];
  rotation: number;
  scale: number;
  tint: string;
  spawnedAt: number;
}

/**
 * `<SlashTrailLayer />` renders the list of active slashes; `spawnSlash()`
 * pushes a new one. Place this inside BattleScene's root group. Slashes
 * auto-expire via `onComplete` after their animation plays out.
 */
export function SlashTrailLayer({
  slashes,
  onExpire,
}: {
  slashes: ActiveSlash[];
  onExpire: (id: string) => void;
}) {
  return (
    <>
      {slashes.map(s => (
        <SlashTrail
          key={s.id}
          effect={s.effect}
          position={s.position}
          rotation={s.rotation}
          scale={s.scale}
          tint={s.tint}
          onComplete={() => onExpire(s.id)}
        />
      ))}
    </>
  );
}

/** Pick a random slash FX id for a given weapon type. Quick thematic map. */
const WEAPON_SLASH_MAP: Record<string, string[]> = {
  sword:         ['slash',  'slash3', 'slash4'],
  greatsword:    ['slash4', 'slash6', 'slash9'],
  rusted_sword:  ['slash2', 'slash'],
  greataxe:      ['slash4', 'slash6', 'slash9'],
  war_hammer:    ['slash7', 'slash8'],
  daggers:       ['slash',  'slash2', 'slash5'],
  // staves / bows fall through to generic white slash
};

export function pickSlashForWeapon(weaponType?: string): string {
  const candidates = weaponType && WEAPON_SLASH_MAP[weaponType];
  if (candidates && candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)]!;
  }
  return 'slash3';
}
