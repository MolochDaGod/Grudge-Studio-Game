import { ABILITY_EFFECTS_URL, OBJECTSTORE_BASE, REGISTRY_3DFX_URL } from './constants';
import type {
  AbilityEffectsRegistry,
  Effect3D,
  EffectPreset,
  Effects3DRegistry,
  SpellEntry,
} from './types';
import { resolve3dFxForSpell } from './spell-mapper';

const cache = new Map<string, { data: unknown; at: number }>();
const TTL_MS = 10 * 60 * 1000;

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data as T;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as T;
    cache.set(url, { data, at: Date.now() });
    return data;
  } catch (err) {
    console.warn(`[vfx-sandbox] fetch failed ${url}:`, err);
    if (hit) return hit.data as T;
    return fallback;
  }
}

export function effectToPreset(effect: Effect3D): EffectPreset {
  return {
    id: effect.id,
    name: effect.name,
    category: effect.category,
    description: effect.description,
    primaryColor: effect.colors.primary,
    secondaryColor: effect.colors.secondary,
    intensity: effect.uniforms?.uIntensity?.value ?? effect.bloom?.strength ?? 1.5,
    particleCount: (effect.particles?.count as number | undefined) ?? 200,
    duration: effect.timing?.duration ?? 2,
    shader: effect.shader,
    bloom: effect.bloom,
  };
}

export async function load3dFxRegistry(): Promise<Effects3DRegistry> {
  return fetchJson<Effects3DRegistry>(REGISTRY_3DFX_URL, {
    version: '0',
    totalEffects: 0,
    categories: {},
    shaderFiles: {},
    effects: {},
  });
}

export async function loadAbilityEffects(): Promise<AbilityEffectsRegistry> {
  return fetchJson<AbilityEffectsRegistry>(ABILITY_EFFECTS_URL, {
    version: '0',
    description: '',
    totalAbilities: 0,
    classAbilities: {},
    weaponSkills: {},
    enemyAbilities: {},
  });
}

export async function loadShaderPair(
  registry: Effects3DRegistry,
  shaderKey: string,
): Promise<{ vertex: string; fragment: string } | null> {
  const files = registry.shaderFiles[shaderKey];
  if (!files) return null;

  const base = registry.sourceBase ?? OBJECTSTORE_BASE;
  const vertUrl = files.vertex.startsWith('http') ? files.vertex : `${base}${files.vertex}`;
  const fragUrl = files.fragment.startsWith('http') ? files.fragment : `${base}${files.fragment}`;

  try {
    const [vertRes, fragRes] = await Promise.all([fetch(vertUrl), fetch(fragUrl)]);
    if (!vertRes.ok || !fragRes.ok) return null;
    return { vertex: await vertRes.text(), fragment: await fragRes.text() };
  } catch {
    return null;
  }
}

const CLASS_LABELS: Record<string, string> = {
  warrior: 'Warrior',
  mage: 'Mage',
  worge: 'Worge',
  ranger: 'Ranger',
};

export function flattenSpellEntries(
  abilities: AbilityEffectsRegistry,
  fxRegistry: Effects3DRegistry,
): SpellEntry[] {
  const entries: SpellEntry[] = [];

  for (const [cls, spells] of Object.entries(abilities.classAbilities)) {
    for (const [name, binding] of Object.entries(spells)) {
      entries.push({
        id: `${cls}:${name}`,
        name,
        group: cls,
        groupLabel: CLASS_LABELS[cls] ?? cls,
        binding,
        mapped3dFxId: resolve3dFxForSpell(name, binding.effect, fxRegistry),
      });
    }
  }

  for (const [id, binding] of Object.entries(abilities.weaponSkills)) {
    const label = id.replace(/^ws_/, '').replace(/_/g, ' ');
    entries.push({
      id,
      name: label,
      group: 'weapon',
      groupLabel: 'Weapon Skills',
      binding,
      mapped3dFxId: resolve3dFxForSpell(label, binding.effect, fxRegistry),
    });
  }

  for (const [name, binding] of Object.entries(abilities.enemyAbilities)) {
    entries.push({
      id: `enemy:${name}`,
      name,
      group: 'enemy',
      groupLabel: 'Enemy Abilities',
      binding,
      mapped3dFxId: resolve3dFxForSpell(name, binding.effect, fxRegistry),
    });
  }

  return entries.sort((a, b) => a.groupLabel.localeCompare(b.groupLabel) || a.name.localeCompare(b.name));
}