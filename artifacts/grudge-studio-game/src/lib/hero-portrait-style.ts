/**
 * Portrait-guided material styling for Grudge6 heroes.
 * Samples the hero's 2D portrait and tints race-atlas meshes toward those colors.
 */
import * as THREE from 'three';
import { portraitUrl } from './asset-config';
import type { Model3DField } from './grudge6-equipment';

export interface PortraitPalette {
  skin: THREE.Color;
  armor: THREE.Color;
  accent: THREE.Color;
  hair: THREE.Color;
}

const _cache = new Map<string, PortraitPalette | null>();

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Extract a small palette from the hero portrait PNG. */
export async function extractPortraitPalette(characterId: string): Promise<PortraitPalette | null> {
  if (_cache.has(characterId)) return _cache.get(characterId) ?? null;

  const img = await loadImage(portraitUrl(characterId));
  if (!img) {
    _cache.set(characterId, null);
    return null;
  }

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    _cache.set(characterId, null);
    return null;
  }

  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  let skinR = 0, skinG = 0, skinB = 0, skinN = 0;
  let armorR = 0, armorG = 0, armorB = 0, armorN = 0;
  let accentR = 0, accentG = 0, accentB = 0, accentN = 0;
  let hairR = 0, hairG = 0, hairB = 0, hairN = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const a = data[i + 3] / 255;
    if (a < 0.15) continue;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max - min;
    const lum = (max + min) * 0.5;

    // Warm mid-tones → skin
    if (lum > 0.28 && lum < 0.72 && r >= g * 0.85 && sat < 0.45) {
      skinR += r; skinG += g; skinB += b; skinN++;
      continue;
    }
    // Dark saturated → armor
    if (lum < 0.45 && sat > 0.08) {
      armorR += r; armorG += g; armorB += b; armorN++;
      continue;
    }
    // Bright accent
    if (lum > 0.55 && sat > 0.12) {
      accentR += r; accentG += g; accentB += b; accentN++;
      continue;
    }
    // Low-lum low-sat → hair
    if (lum < 0.5 && sat < 0.2) {
      hairR += r; hairG += g; hairB += b; hairN++;
    }
  }

  const avg = (r: number, g: number, b: number, n: number, fallback: THREE.Color) => {
    if (n < 4) return fallback.clone();
    return new THREE.Color(r / n, g / n, b / n);
  };

  const palette: PortraitPalette = {
    skin: avg(skinR, skinG, skinB, skinN, new THREE.Color(0xc8a882)),
    armor: avg(armorR, armorG, armorB, armorN, new THREE.Color(0x6a7080)),
    accent: avg(accentR, accentG, accentB, accentN, new THREE.Color(0xd4a017)),
    hair: avg(hairR, hairG, hairB, hairN, new THREE.Color(0x3a3028)),
  };

  _cache.set(characterId, palette);
  return palette;
}

function tintMaterial(mat: THREE.MeshStandardMaterial, tint: THREE.Color, strength = 0.55): void {
  const base = mat.color.clone();
  base.lerp(tint, strength);
  mat.color.copy(base);
  if (mat.map) mat.color.setRGB(1, 1, 1);
  mat.needsUpdate = true;
}

/** Apply portrait-derived tints to visible Grudge6 equipment meshes. */
export function applyPortraitPaletteToModel(
  root: THREE.Object3D,
  palette: PortraitPalette,
  model3d: Model3DField,
): void {
  const armorTint = model3d.armorColor
    ? new THREE.Color(model3d.armorColor)
    : palette.armor;

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh && !(mesh as THREE.SkinnedMesh).isSkinnedMesh) return;
    if (!mesh.visible) return;

    const slot = (mesh.userData.equipSlot as string | undefined) ?? '';
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    for (const mat of mats) {
      if (!(mat instanceof THREE.MeshStandardMaterial)) continue;
      if (slot === 'head') tintMaterial(mat, palette.skin, 0.5);
      else if (['body', 'arms', 'legs', 'shoulders', 'shield'].includes(slot)) {
        tintMaterial(mat, armorTint, 0.62);
      } else if (['axe', 'hammer', 'mace', 'sword', 'dagger', 'pick', 'spear', 'staff', 'bow'].includes(slot)) {
        tintMaterial(mat, palette.accent, 0.35);
      } else {
        tintMaterial(mat, palette.skin, 0.25);
      }
    }
  });
}

export async function applyHeroPortraitStyle(
  root: THREE.Object3D,
  characterId: string,
  model3d: Model3DField,
): Promise<void> {
  const palette = await extractPortraitPalette(characterId);
  if (!palette) return;
  applyPortraitPaletteToModel(root, palette, model3d);
}

export function preloadPortraitPalette(characterId: string): void {
  extractPortraitPalette(characterId).catch(() => { /* non-fatal */ });
}