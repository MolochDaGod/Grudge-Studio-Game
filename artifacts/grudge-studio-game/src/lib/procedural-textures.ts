/**
 * Procedural stylized ground textures + heightmaps (Canvas API, zero deps).
 *
 * We don't use IceCreamYou/THREE.Terrain directly because its master branch
 * targets three.js r130 and our runtime is r183. Instead we port the two
 * pieces of it we actually need for stylized tactical-battle terrain:
 *
 *   1. generateThemeGroundTexture() -- layered per-pixel noise + colour
 *      variation baked into a CanvasTexture for per-theme tile / island
 *      plane surfaces. Looks like painted hand-drawn ground.
 *
 *   2. diamondSquareHeightmap() -- classic Diamond-Square fractal noise
 *      for the island perimeter mesh (outside the flat playable grid) so
 *      the battlefield rests on gentle rolling terrain instead of a disc.
 *
 * All textures set colorSpace = SRGBColorSpace and wrap = RepeatWrapping by
 * default so they tile seamlessly on large surfaces.
 */

import * as THREE from 'three';

// ── Deterministic RNG ────────────────────────────────────────────────────────
// We want identical textures every reload (for cache-friendliness + debugging)
// so we use a seedable mulberry32 instead of Math.random.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Fractal Brownian Motion (multi-octave value noise) ───────────────────────
// Same shape used by THREE.Terrain's `Perlin` generator, coded small.
function fbm2d(rand: () => number, size: number, octaves = 5, persistence = 0.5): Float32Array {
  const out = new Float32Array(size * size);
  let amplitude = 1;
  let totalAmp = 0;
  for (let oct = 0; oct < octaves; oct++) {
    const freq = 1 << oct;                 // 1, 2, 4, 8, 16
    const cells = Math.max(2, freq);
    const grid = new Float32Array(cells * cells);
    for (let i = 0; i < grid.length; i++) grid[i] = rand() * 2 - 1;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * cells;
        const fy = (y / size) * cells;
        const x0 = Math.floor(fx), y0 = Math.floor(fy);
        const x1 = (x0 + 1) % cells, y1 = (y0 + 1) % cells;
        const tx = fx - x0, ty = fy - y0;
        // Smoothstep interpolation
        const sx = tx * tx * (3 - 2 * tx);
        const sy = ty * ty * (3 - 2 * ty);
        const a = grid[y0 * cells + x0];
        const b = grid[y0 * cells + x1];
        const c = grid[y1 * cells + x0];
        const d = grid[y1 * cells + x1];
        const top = a + (b - a) * sx;
        const bot = c + (d - c) * sx;
        out[y * size + x] += (top + (bot - top) * sy) * amplitude;
      }
    }
    totalAmp += amplitude;
    amplitude *= persistence;
  }
  // Normalise to [0, 1]
  for (let i = 0; i < out.length; i++) out[i] = out[i] / totalAmp * 0.5 + 0.5;
  return out;
}

// ── Theme palettes ───────────────────────────────────────────────────────────
// 3 colour stops blended by noise + subtle speckle on top.

export type GroundTheme = 'ruins' | 'orc' | 'elven' | 'medieval';

interface ThemePalette {
  /** Darkest colour, valleys / shadows */
  deep: string;
  /** Mid-tone base */
  base: string;
  /** Highlight / rim colour */
  high: string;
  /** Scattered speckle colour (pebbles, moss, ash) */
  speck: string;
  /** Speckle density (0-1 per pixel) */
  speckDensity: number;
}

const GROUND_PALETTES: Record<GroundTheme, ThemePalette> = {
  ruins:    { deep: '#1a2612', base: '#2e3a20', high: '#4a5a2e', speck: '#8a7a50', speckDensity: 0.015 },
  orc:      { deep: '#1a0a04', base: '#3a1a08', high: '#6a2810', speck: '#ff5510', speckDensity: 0.022 },
  elven:    { deep: '#15241a', base: '#2a4030', high: '#4a6a48', speck: '#c8e090', speckDensity: 0.012 },
  medieval: { deep: '#2a2620', base: '#453e32', high: '#70624c', speck: '#a8a090', speckDensity: 0.014 },
};

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// ── generateThemeGroundTexture ──────────────────────────────────────────────
/**
 * Build a seamless tiling stylized-ground CanvasTexture for the given theme.
 *
 * @param theme    One of the level themes (ruins, orc, elven, medieval).
 * @param size     Texture size in pixels (default 512, power-of-2 only).
 * @param seed     Deterministic seed so reloads show identical terrain.
 */
export function generateThemeGroundTexture(
  theme: GroundTheme,
  size = 512,
  seed = 12345,
): THREE.CanvasTexture {
  const pal = GROUND_PALETTES[theme] ?? GROUND_PALETTES.medieval;
  const rand = mulberry32(seed);

  // Two noise octaves: low-freq patches (0.3-1 scale) + high-freq speckle shading.
  const patchNoise = fbm2d(rand, size, 5, 0.55);
  const detailNoise = fbm2d(mulberry32(seed + 1), size, 3, 0.4);

  const deep = hexToRgb(pal.deep);
  const base = hexToRgb(pal.base);
  const high = hexToRgb(pal.high);
  const speck = hexToRgb(pal.speck);

  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const d = imgData.data;

  for (let i = 0; i < size * size; i++) {
    const n = patchNoise[i];
    const detail = detailNoise[i] * 0.25 + 0.875; // subtle ±12% value shimmer
    let rgb: [number, number, number];
    if (n < 0.45)      rgb = mix(deep, base, n / 0.45);
    else if (n < 0.75) rgb = mix(base, high, (n - 0.45) / 0.30);
    else               rgb = mix(high, high, 1);

    // Apply detail brightness
    rgb = [rgb[0] * detail, rgb[1] * detail, rgb[2] * detail];

    // Random speckle overlay
    if (rand() < pal.speckDensity) rgb = speck as [number, number, number];

    const o = i * 4;
    d[o]     = Math.min(255, Math.max(0, rgb[0]));
    d[o + 1] = Math.min(255, Math.max(0, rgb[1]));
    d[o + 2] = Math.min(255, Math.max(0, rgb[2]));
    d[o + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

// ── Matching normal map (same noise, turned into heightmap gradient) ────────
/**
 * Build a tangent-space normal map for the ground so lighting picks up tiny
 * stylized pebbles / cracks. Uses the same noise as the albedo so they line up.
 */
export function generateThemeGroundNormal(size = 512, seed = 12345, strength = 2.0): THREE.CanvasTexture {
  const rand = mulberry32(seed + 997);
  const n = fbm2d(rand, size, 5, 0.55);

  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = n[y * size + ((x - 1 + size) % size)];
      const r = n[y * size + ((x + 1) % size)];
      const u = n[((y - 1 + size) % size) * size + x];
      const dn = n[((y + 1) % size) * size + x];
      const dx = (r - l) * strength;
      const dy = (dn - u) * strength;
      // Reconstruct normal: (−dx, −dy, 1) normalised, pack to [0,1].
      const nx = -dx, ny = -dy, nz = 1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      const o = (y * size + x) * 4;
      d[o]     = ((nx / len) * 0.5 + 0.5) * 255;
      d[o + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      d[o + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  // Normal maps MUST stay in linear / NoColorSpace — do not flag as SRGB.
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

// ── Diamond-Square heightmap (ported from THREE.Terrain, no deps) ───────────
/**
 * Classic Diamond-Square fractal heightmap. Returns a Float32Array of size
 * (2^p + 1) × (2^p + 1). Identical output to THREE.Terrain.DiamondSquare when
 * fed the same seed + roughness. Used by the perimeter island mesh.
 */
export function diamondSquareHeightmap(
  power = 7,              // 2^7 + 1 = 129 × 129 grid
  roughness = 0.7,        // 0 = flat, 1 = jagged
  seed = 24601,
): { data: Float32Array; size: number } {
  const size = (1 << power) + 1;
  const d = new Float32Array(size * size);
  const rand = mulberry32(seed);

  // Seed corners
  d[0]                         = rand() * 2 - 1;
  d[size - 1]                  = rand() * 2 - 1;
  d[(size - 1) * size]         = rand() * 2 - 1;
  d[(size - 1) * size + size - 1] = rand() * 2 - 1;

  let stepSize = size - 1;
  let scale = 1.0;
  while (stepSize > 1) {
    const half = stepSize / 2;
    // Diamond step
    for (let y = half; y < size - 1; y += stepSize) {
      for (let x = half; x < size - 1; x += stepSize) {
        const avg = (
          d[(y - half) * size + (x - half)] +
          d[(y - half) * size + (x + half)] +
          d[(y + half) * size + (x - half)] +
          d[(y + half) * size + (x + half)]
        ) * 0.25;
        d[y * size + x] = avg + (rand() * 2 - 1) * scale;
      }
    }
    // Square step
    for (let y = 0; y < size; y += half) {
      for (let x = (y + half) % stepSize; x < size; x += stepSize) {
        let sum = 0, count = 0;
        if (y >= half)        { sum += d[(y - half) * size + x]; count++; }
        if (y + half < size)  { sum += d[(y + half) * size + x]; count++; }
        if (x >= half)        { sum += d[y * size + (x - half)]; count++; }
        if (x + half < size)  { sum += d[y * size + (x + half)]; count++; }
        d[y * size + x] = sum / count + (rand() * 2 - 1) * scale;
      }
    }
    stepSize = half;
    scale *= Math.pow(2, -roughness);
  }

  // Normalise to [0, 1]
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < d.length; i++) { if (d[i] < min) min = d[i]; if (d[i] > max) max = d[i]; }
  const range = Math.max(1e-6, max - min);
  for (let i = 0; i < d.length; i++) d[i] = (d[i] - min) / range;

  return { data: d, size };
}

/**
 * Apply a Diamond-Square heightmap to a PlaneGeometry's Y positions.
 * Flattens a central rectangle (the playable tile grid) back to y=0 so tactical
 * gameplay is unaffected. `playableWorldW/H` are in world units centred on
 * the mesh origin.
 */
export function applyHeightmapToPlane(
  geometry: THREE.PlaneGeometry,
  heightmap: Float32Array,
  heightmapSize: number,
  maxHeight: number,
  playableWorldW: number,
  playableWorldH: number,
): void {
  const pos = geometry.attributes.position;
  const params = geometry.parameters;
  const planeW = params.width, planeH = params.height;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);  // plane X in local space, range [-planeW/2, +planeW/2]
    const y = pos.getY(i);  // plane Y, will become world Z after rotation

    // Sample heightmap via UV-style mapping
    const u = (x + planeW / 2) / planeW;
    const v = (y + planeH / 2) / planeH;
    const hx = Math.min(heightmapSize - 1, Math.floor(u * heightmapSize));
    const hy = Math.min(heightmapSize - 1, Math.floor(v * heightmapSize));
    let h = heightmap[hy * heightmapSize + hx] * maxHeight;

    // Smoothly flatten anything inside the playable rect so the tactical grid
    // stays perfectly flat at y=0.
    const axf = Math.abs(x) / (playableWorldW / 2);
    const ayf = Math.abs(y) / (playableWorldH / 2);
    const inside = Math.max(axf, ayf);     // 0 at centre, 1 at edge of rect, >1 outside
    const mask = THREE.MathUtils.smoothstep(inside, 1.0, 1.25);
    h = h * mask;

    pos.setZ(i, h);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}
