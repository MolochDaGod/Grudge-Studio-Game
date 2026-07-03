/**
 * Load and cache Grudge6 race FBX models from the assets CDN.
 * Always uses CDN — these files exist at assets.grudge-studio.com while
 * per-hero CC GLBs often 404 there.
 */
import * as THREE from 'three';
import { FBXLoader } from 'three-stdlib';
import { ASSET_CDN_BASE } from './asset-config';

const TARGET_HEIGHT = 1.5;
const _loader = new FBXLoader();
const _cache = new Map<string, THREE.Group>();
const _pending = new Map<string, Promise<THREE.Group>>();

export function grudge6RaceModelUrl(prefix: string): string {
  return `${ASSET_CDN_BASE}/models/grudge6/races/${prefix}_Characters.fbx`;
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
  }
}