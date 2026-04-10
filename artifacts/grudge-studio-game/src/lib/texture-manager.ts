import * as THREE from 'three';
import { textureAssetUrl } from './asset-config';

// ── Types ────────────────────────────────────────────────────────────────────

export type TextureSlot = 'diffuse' | 'normal' | 'emissive' | 'roughnessMetalness';

export interface TextureSetConfig {
  /** Base color / albedo texture path (relative to BASE_URL or CDN root) */
  diffuse?: string;
  /** Normal map path */
  normal?: string;
  /** Emissive map path */
  emissive?: string;
  /** Combined roughness (G) + metalness (B) map path */
  roughnessMetalness?: string;
}

// ── Texture cache ────────────────────────────────────────────────────────────
// Shared across all components to avoid reloading the same texture.

const textureCache = new Map<string, THREE.Texture>();
const pendingLoads = new Map<string, Promise<THREE.Texture>>();
const loader = new THREE.TextureLoader();

let cacheHits = 0;
let cacheMisses = 0;

/** Dev-mode cache stats */
export function getTextureCacheStats() {
  return { size: textureCache.size, hits: cacheHits, misses: cacheMisses };
}

/**
 * Synchronous load — returns immediately (texture may still be streaming).
 * Cached by (url, flipY, colorSpace) tuple.
 */
function loadCached(
  url: string,
  flipY = false,
  colorSpace?: THREE.ColorSpace,
): THREE.Texture {
  const key = `${url}|${flipY}|${colorSpace ?? ''}`;
  if (textureCache.has(key)) {
    cacheHits++;
    return textureCache.get(key)!;
  }
  cacheMisses++;
  const tex = loader.load(
    url,
    undefined,
    undefined,
    (err) => {
      console.warn(`[TextureManager] Failed to load: ${url}`, err);
      // Retry once after 2 seconds
      setTimeout(() => {
        console.info(`[TextureManager] Retrying: ${url}`);
        loader.load(
          url,
          (retryTex) => {
            retryTex.flipY = flipY;
            if (colorSpace) retryTex.colorSpace = colorSpace;
            textureCache.set(key, retryTex);
          },
          undefined,
          (retryErr) => console.error(`[TextureManager] Retry failed: ${url}`, retryErr),
        );
      }, 2000);
    },
  );
  tex.flipY = flipY;
  if (colorSpace) tex.colorSpace = colorSpace;
  textureCache.set(key, tex);
  return tex;
}

/**
 * Async load — returns a Promise that resolves when the texture is fully decoded.
 * Ideal for preloading or Suspense-compatible workflows.
 */
export function loadTextureAsync(
  url: string,
  flipY = false,
  colorSpace?: THREE.ColorSpace,
): Promise<THREE.Texture> {
  const key = `${url}|${flipY}|${colorSpace ?? ''}`;
  if (textureCache.has(key)) return Promise.resolve(textureCache.get(key)!);
  if (pendingLoads.has(key)) return pendingLoads.get(key)!;

  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    loader.load(
      url,
      (tex) => {
        tex.flipY = flipY;
        if (colorSpace) tex.colorSpace = colorSpace;
        textureCache.set(key, tex);
        pendingLoads.delete(key);
        resolve(tex);
      },
      undefined,
      (err) => {
        pendingLoads.delete(key);
        // Retry once
        setTimeout(() => {
          loader.load(
            url,
            (tex) => {
              tex.flipY = flipY;
              if (colorSpace) tex.colorSpace = colorSpace;
              textureCache.set(key, tex);
              resolve(tex);
            },
            undefined,
            reject,
          );
        }, 2000);
      },
    );
  });
  pendingLoads.set(key, promise);
  return promise;
}

// ── Apply full texture set to a scene ────────────────────────────────────────
// Traverses all MeshStandardMaterial meshes and applies the appropriate maps.
// Resolves paths through the CDN/local asset config.

export function applyTextureSet(
  scene: THREE.Object3D,
  textures: TextureSetConfig,
  baseUrl: string,
): void {
  const resolve = (path: string) => textureAssetUrl(path);
  const diffuseTex  = textures.diffuse  ? loadCached(resolve(textures.diffuse), false, THREE.SRGBColorSpace) : null;
  const normalTex   = textures.normal   ? loadCached(resolve(textures.normal), false) : null;
  const emissiveTex = textures.emissive ? loadCached(resolve(textures.emissive), false, THREE.SRGBColorSpace) : null;
  const rmTex       = textures.roughnessMetalness ? loadCached(resolve(textures.roughnessMetalness), false) : null;

  scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const results = mats.map((mat) => {
      if (!(mat instanceof THREE.MeshStandardMaterial)) return mat;
      const cloned = mat.clone() as THREE.MeshStandardMaterial;

      if (diffuseTex && !cloned.map) {
        cloned.map = diffuseTex;
        cloned.color.setHex(0xffffff);
        cloned.needsUpdate = true;
      }
      if (normalTex) {
        cloned.normalMap = normalTex;
        cloned.needsUpdate = true;
      }
      if (emissiveTex) {
        cloned.emissiveMap = emissiveTex;
        cloned.needsUpdate = true;
      }
      if (rmTex) {
        cloned.roughnessMap = rmTex;
        cloned.metalnessMap = rmTex;
        cloned.needsUpdate = true;
      }

      return cloned;
    });
    obj.material = Array.isArray(obj.material) ? results : results[0];
  });
}

// ── Atlas slicing ────────────────────────────────────────────────────────────

export function sliceAtlas(
  atlasUrl: string,
  tileX: number,
  tileY: number,
  tileW: number,
  tileH: number,
  atlasW: number,
  atlasH: number,
  _baseUrl: string,
): THREE.Texture {
  const tex = loadCached(textureAssetUrl(atlasUrl), false, THREE.SRGBColorSpace);
  const cloned = tex.clone();
  cloned.repeat.set(tileW / atlasW, tileH / atlasH);
  cloned.offset.set(tileX / atlasW, 1 - (tileY + tileH) / atlasH);
  cloned.needsUpdate = true;
  return cloned;
}

// ── Backward compat helper ──────────────────────────────────────────────────

export function textureUrlToSet(textureUrl: string): TextureSetConfig {
  return { diffuse: textureUrl };
}

// ── Preload textures ────────────────────────────────────────────────────────

export function preloadTextures(urls: string[], _baseUrl?: string): void {
  for (const url of urls) {
    loadCached(textureAssetUrl(url), false, THREE.SRGBColorSpace);
  }
}

// ── Clear cache ─────────────────────────────────────────────────────────────

export function clearTextureCache(): void {
  for (const tex of textureCache.values()) {
    tex.dispose();
  }
  textureCache.clear();
  pendingLoads.clear();
  cacheHits = 0;
  cacheMisses = 0;
}
