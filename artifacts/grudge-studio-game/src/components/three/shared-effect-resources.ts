/**
 * Shared Effect Resources — Geometry & Material Pools
 *
 * All combat effect components reuse these pre-built geometries and
 * cached materials to avoid per-instance allocations and GC pressure.
 *
 * Geometries are created once at module load (they're cheap and immutable).
 * Materials are cached by color string and shared across all effects of the
 * same color — transparent + depthWrite:false so they layer correctly.
 */

import * as THREE from 'three';

// ── Shared Geometries ────────────────────────────────────────────────────────
// Created once, reused everywhere. Never disposed.

export const GEO = {
  sphere14: new THREE.SphereGeometry(1, 14, 14),
  sphere10: new THREE.SphereGeometry(1, 10, 10),
  sphere8:  new THREE.SphereGeometry(1, 8, 8),
  sphere6:  new THREE.SphereGeometry(1, 6, 6),
  sphere5:  new THREE.SphereGeometry(1, 5, 5),
  sphere4:  new THREE.SphereGeometry(1, 4, 4),
  ring32:   new THREE.RingGeometry(1, 1.2, 32),
  ring20:   new THREE.RingGeometry(1, 1.2, 20),
  torus8x32: new THREE.TorusGeometry(1, 0.04, 8, 32),
  torus4x8:  new THREE.TorusGeometry(1, 0.05, 4, 8),
  cone6:    new THREE.ConeGeometry(1, 1, 6),
  cone5:    new THREE.ConeGeometry(1, 1, 5),
  cone4:    new THREE.ConeGeometry(1, 1, 4),
  cylinder6: new THREE.CylinderGeometry(1, 1, 1, 6),
  cylinder4: new THREE.CylinderGeometry(1, 1, 1, 4),
  octahedron: new THREE.OctahedronGeometry(1, 0),
  circle32: new THREE.CircleGeometry(1, 32),
  capsule:  new THREE.CapsuleGeometry(1, 1, 4, 8),
  plane1:   new THREE.PlaneGeometry(1, 1),
  dodecahedron: new THREE.DodecahedronGeometry(1, 0),
} as const;

// ── Shared Materials ─────────────────────────────────────────────────────────
// Cached by color. All are transparent + MeshBasicMaterial (unlit, cheap).

const materialCache = new Map<string, THREE.MeshBasicMaterial>();

/**
 * Get or create a shared transparent MeshBasicMaterial for the given color.
 * Callers can set .opacity per-frame without cloning.
 */
export function getEffectMaterial(color: string): THREE.MeshBasicMaterial {
  if (materialCache.has(color)) return materialCache.get(color)!;
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });
  materialCache.set(color, mat);
  return mat;
}

/** Double-sided variant for ring/plane effects */
export function getEffectMaterialDS(color: string): THREE.MeshBasicMaterial {
  const key = `${color}|ds`;
  if (materialCache.has(key)) return materialCache.get(key)!;
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  materialCache.set(key, mat);
  return mat;
}

// ── PointLight Pool ──────────────────────────────────────────────────────────
// Cap active effect lights to avoid GPU over-draw. Simple round-robin reuse.

const MAX_EFFECT_LIGHTS = 4;
const lightPool: THREE.PointLight[] = [];
let lightIdx = 0;

export function borrowEffectLight(
  color: string,
  intensity: number,
  distance: number,
): THREE.PointLight {
  if (lightPool.length < MAX_EFFECT_LIGHTS) {
    const light = new THREE.PointLight(color, intensity, distance, 2);
    lightPool.push(light);
    return light;
  }
  // Reuse oldest
  const light = lightPool[lightIdx % MAX_EFFECT_LIGHTS];
  light.color.set(color);
  light.intensity = intensity;
  light.distance = distance;
  lightIdx++;
  return light;
}

// ── Cleanup ──────────────────────────────────────────────────────────────────

export function disposeEffectResources(): void {
  for (const mat of materialCache.values()) mat.dispose();
  materialCache.clear();
  for (const light of lightPool) light.dispose();
  lightPool.length = 0;
}
