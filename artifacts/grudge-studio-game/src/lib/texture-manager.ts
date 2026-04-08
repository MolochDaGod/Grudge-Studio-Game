import * as THREE from 'three';

// ── Types ────────────────────────────────────────────────────────────────────

export type TextureSlot = 'diffuse' | 'normal' | 'emissive' | 'roughnessMetalness';

export interface TextureSetConfig {
  /** Base color / albedo texture path (relative to BASE_URL) */
  diffuse?: string;
  /** Normal map path */
  normal?: string;
  /** Emissive map path */
  emissive?: string;
  /** Combined roughness (G) + metalness (B) map path */
  roughnessMetalness?: string;
}

// ── Texture cache ────────────────────────────────────────────────────────────
// Avoids reloading the same texture if multiple characters share assets.

const textureCache = new Map<string, THREE.Texture>();
const loader = new THREE.TextureLoader();

function loadCached(url: string, flipY = false, colorSpace?: THREE.ColorSpace): THREE.Texture {
  const key = `${url}|${flipY}|${colorSpace ?? ''}`;
  if (textureCache.has(key)) return textureCache.get(key)!;
  const tex = loader.load(url);
  tex.flipY = flipY;
  if (colorSpace) tex.colorSpace = colorSpace;
  textureCache.set(key, tex);
  return tex;
}

// ── Apply full texture set to a scene ────────────────────────────────────────
// Traverses all MeshStandardMaterial meshes and applies the appropriate texture
// maps. If a diffuse map is applied and no embedded map existed, resets color
// to white so the PNG shows at full brightness.

export function applyTextureSet(
  scene: THREE.Object3D,
  textures: TextureSetConfig,
  baseUrl: string,
): void {
  const diffuseTex  = textures.diffuse  ? loadCached(`${baseUrl}${textures.diffuse}`, false, THREE.SRGBColorSpace) : null;
  const normalTex   = textures.normal   ? loadCached(`${baseUrl}${textures.normal}`, false) : null;
  const emissiveTex = textures.emissive ? loadCached(`${baseUrl}${textures.emissive}`, false, THREE.SRGBColorSpace) : null;
  const rmTex       = textures.roughnessMetalness ? loadCached(`${baseUrl}${textures.roughnessMetalness}`, false) : null;

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
// Creates a cropped Texture from a sprite-sheet atlas for sprite-based characters.

export function sliceAtlas(
  atlasUrl: string,
  tileX: number,
  tileY: number,
  tileW: number,
  tileH: number,
  atlasW: number,
  atlasH: number,
  baseUrl: string,
): THREE.Texture {
  const tex = loadCached(`${baseUrl}${atlasUrl}`, false, THREE.SRGBColorSpace);
  const cloned = tex.clone();
  cloned.repeat.set(tileW / atlasW, tileH / atlasH);
  cloned.offset.set(tileX / atlasW, 1 - (tileY + tileH) / atlasH);
  cloned.needsUpdate = true;
  return cloned;
}

// ── Backward compat helper ──────────────────────────────────────────────────
// Converts the old single `textureUrl` field to a TextureSetConfig.

export function textureUrlToSet(textureUrl: string): TextureSetConfig {
  return { diffuse: textureUrl };
}

// ── Preload textures ────────────────────────────────────────────────────────
// Call at init time with known texture URLs to start loading early.

export function preloadTextures(urls: string[], baseUrl: string): void {
  for (const url of urls) {
    loadCached(`${baseUrl}${url}`, false, THREE.SRGBColorSpace);
  }
}

// ── Clear cache ─────────────────────────────────────────────────────────────

export function clearTextureCache(): void {
  for (const tex of textureCache.values()) {
    tex.dispose();
  }
  textureCache.clear();
}
