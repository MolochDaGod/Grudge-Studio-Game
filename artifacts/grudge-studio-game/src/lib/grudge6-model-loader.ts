/**
 * Load and cache Grudge6 race FBX models from the assets CDN.
 * Always uses CDN — these files exist at assets.grudge-studio.com while
 * per-hero CC GLBs often 404 there.
 */
import * as THREE from 'three';
import { FBXLoader } from 'three-stdlib';
import { ASSET_CDN_BASE, cdnProxyUrl } from './asset-config';
import type { Grudge6RacePrefix } from './grudge6-character';
import { grudge6RaceTextureUrl } from './grudge6-prefabs';

const TARGET_HEIGHT = 1.5;
const _loader = new FBXLoader();
const _texLoader = new THREE.TextureLoader();
const _cache = new Map<string, THREE.Group>();
const _pending = new Map<string, Promise<THREE.Group>>();
const _textureCache = new Map<string, THREE.Texture>();

/**
 * Race FBX on R2 (WK/BRB/DWF/ELF/ORC/UD_Characters.fbx).
 * Always use domain-root same-origin proxy `/api/assets/...` — never
 * `${BASE_URL}/api/assets` (`/game/api/assets` returns the SPA HTML and
 * leaves heroes stuck on capsule placeholders).
 */
export function grudge6RaceModelUrl(prefix: string): string {
  const path = `/models/grudge6/races/${prefix}_Characters.fbx`;
  if (typeof window !== 'undefined') {
    return cdnProxyUrl(path);
  }
  return `${ASSET_CDN_BASE}${path}`;
}

function normalizeModel(root: THREE.Group, heightMult = 1.0): void {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  const height = Math.max(size.y, 0.001);
  const scale = (TARGET_HEIGHT * heightMult) / height;
  root.scale.setScalar(scale);

  root.position.x = -center.x * scale;
  root.position.z = -center.z * scale;
  root.position.y = -box.min.y * scale;

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh && !(mesh as THREE.SkinnedMesh).isSkinnedMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.side = THREE.FrontSide;
      }
    }
  });
}

export function loadGrudge6RaceModel(prefix: string, heightMult = 1.0): Promise<THREE.Group> {
  const url = grudge6RaceModelUrl(prefix);
  const cacheKey = `${url}@${heightMult}`;

  const cached = _cache.get(cacheKey);
  if (cached) {
    return Promise.resolve(cached.clone(true));
  }

  const inflight = _pending.get(cacheKey);
  if (inflight) return inflight;

  const promise = new Promise<THREE.Group>((resolve, reject) => {
    _loader.load(
      url,
      (group) => {
        const root = group as THREE.Group;
        normalizeModel(root, heightMult);
        _cache.set(cacheKey, root);
        _pending.delete(cacheKey);
        resolve(root.clone(true));
      },
      undefined,
      (err) => {
        _pending.delete(cacheKey);
        reject(err instanceof Error ? err : new Error(`Failed to load ${url}`));
      },
    );
  });

  _pending.set(cacheKey, promise);
  return promise;
}

export function preloadGrudge6Races(prefixes: string[]): void {
  for (const p of prefixes) {
    loadGrudge6RaceModel(p).catch(() => { /* non-fatal */ });
    preloadGrudge6Texture(p as Grudge6RacePrefix);
  }
}

function loadRaceTexture(prefix: Grudge6RacePrefix): Promise<THREE.Texture | null> {
  const url = grudge6RaceTextureUrl(prefix);
  if (!url) return Promise.resolve(null);

  const cached = _textureCache.get(url);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    _texLoader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.flipY = false;
        _textureCache.set(url, tex);
        resolve(tex);
      },
      undefined,
      () => resolve(null),
    );
  });
}

export function preloadGrudge6Texture(prefix: Grudge6RacePrefix): void {
  loadRaceTexture(prefix).catch(() => { /* non-fatal */ });
}

/** Apply baked race atlas from prefab library (WK_Standard_Units.webp, etc.) */
export async function applyGrudge6RaceTexture(
  root: THREE.Object3D,
  prefix: Grudge6RacePrefix,
): Promise<void> {
  const tex = await loadRaceTexture(prefix);
  if (!tex) return;

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh && !(mesh as THREE.SkinnedMesh).isSkinnedMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial) {
        mat.map = tex;
        mat.needsUpdate = true;
      }
    }
  });
}