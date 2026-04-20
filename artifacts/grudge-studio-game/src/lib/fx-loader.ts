/**
 * Client-side 3D FX library loader.
 *
 * Fetches the shared VFX manifest + GLSL shader pairs from the grudge-editor
 * `/fx` service (served out of `ObjectStore/3dfx`), caches them in memory,
 * and returns ready-to-use THREE.ShaderMaterial instances whose uniforms you
 * can tweak at runtime.
 *
 * Set VITE_GRUDGE_EDITOR_URL=http://localhost:7777 in .env.local to point at
 * a local grudge-editor; in production the same service lives under
 *   https://editor.grudge-studio.com.
 */
import * as THREE from 'three';

export type FxUniformType = 'float' | 'color' | 'vec2' | 'vec3';

export interface FxUniformDecl {
  type: FxUniformType;
  default: number | string | [number, number] | [number, number, number];
  min?: number;
  max?: number;
  description?: string;
}

export interface FxEffect {
  name: string;
  description: string;
  vert: string;
  frag: string;
  transparent?: boolean;
  doubleSide?: boolean;
  depthWrite?: boolean;
  blending?: 'AdditiveBlending' | 'NormalBlending' | 'MultiplyBlending';
  uniforms: Record<string, FxUniformDecl>;
  geometry: Record<string, unknown>;
}

export interface FxManifest {
  version: string;
  description: string;
  effects: Record<string, Omit<FxEffect, 'name' | 'vert' | 'frag'>>;
}

const DEFAULT_URL = 'http://localhost:7777';
const base = import.meta.env.VITE_GRUDGE_EDITOR_URL ?? DEFAULT_URL;

let manifestPromise: Promise<FxManifest> | null = null;
const effectCache = new Map<string, FxEffect>();

export async function loadFxManifest(): Promise<FxManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch(`${base}/fx/manifest.json`).then(r => {
      if (!r.ok) throw new Error(`FX manifest HTTP ${r.status}`);
      return r.json() as Promise<FxManifest>;
    });
  }
  return manifestPromise;
}

export async function loadEffect(name: string): Promise<FxEffect> {
  const hit = effectCache.get(name);
  if (hit) return hit;
  const res = await fetch(`${base}/fx/${name}`);
  if (!res.ok) throw new Error(`FX effect "${name}" HTTP ${res.status}`);
  const json = (await res.json()) as FxEffect;
  effectCache.set(name, json);
  return json;
}

function uniformValue(decl: FxUniformDecl): unknown {
  switch (decl.type) {
    case 'float': return decl.default as number;
    case 'color': return new THREE.Color(decl.default as string).convertSRGBToLinear();
    case 'vec2':  return new THREE.Vector2(...(decl.default as [number, number]));
    case 'vec3':  return new THREE.Vector3(...(decl.default as [number, number, number]));
  }
}

/**
 * Build a ShaderMaterial + default uniforms object for the named effect.
 * Caller is responsible for updating uTime / uProgress each frame.
 */
export async function buildEffectMaterial(name: string): Promise<{
  material: THREE.ShaderMaterial;
  uniforms: Record<string, { value: unknown }>;
  effect: FxEffect;
}> {
  const fx = await loadEffect(name);
  const uniforms: Record<string, { value: unknown }> = {};
  for (const [key, decl] of Object.entries(fx.uniforms)) {
    uniforms[key] = { value: uniformValue(decl) };
  }
  const blending =
    fx.blending === 'AdditiveBlending' ? THREE.AdditiveBlending :
    fx.blending === 'MultiplyBlending' ? THREE.MultiplyBlending :
                                         THREE.NormalBlending;
  const material = new THREE.ShaderMaterial({
    vertexShader:   fx.vert,
    fragmentShader: fx.frag,
    uniforms,
    transparent: fx.transparent ?? true,
    side:        fx.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
    depthWrite:  fx.depthWrite ?? false,
    blending,
  });
  return { material, uniforms, effect: fx };
}

/** Build the declared geometry for an effect (plane or ring). */
export function buildEffectGeometry(effect: FxEffect): THREE.BufferGeometry {
  const g = effect.geometry as Record<string, number | string>;
  if (g.type === 'ring') {
    return new THREE.RingGeometry(
      (g.innerRadius as number) ?? 0.4,
      (g.outerRadius as number) ?? 0.6,
      (g.segments as number)    ?? 64,
    );
  }
  return new THREE.PlaneGeometry(
    (g.width as number)  ?? 1.0,
    (g.height as number) ?? 1.0,
    16, 16,
  );
}
