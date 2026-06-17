export type EffectCategory =
  | 'fire'
  | 'ice'
  | 'lightning'
  | 'magic'
  | 'impact'
  | 'aura'
  | 'portal'
  | 'combat'
  | 'annihilator'
  | 'environment';

export interface Effect3D {
  id: string;
  name: string;
  category: EffectCategory;
  source: string;
  description: string;
  colors: { primary: string; secondary: string };
  timing: { duration: number; loop: boolean; speed: number };
  shader: string | null;
  particles: Record<string, unknown>;
  geometry?: Record<string, unknown>;
  bloom?: { strength: number; radius: number; threshold: number };
  light?: { color: string; intensity: number; distance: number };
  uniforms?: Record<string, { value: number; min?: number; max?: number }>;
  tags: string[];
}

export interface Effects3DRegistry {
  version: string;
  totalEffects: number;
  sourceBase?: string;
  categories: Record<string, { name: string; icon: string; color: string; count: number }>;
  shaderFiles: Record<string, { vertex: string; fragment: string }>;
  effects: Record<string, Effect3D>;
}

export interface AbilityEffectBinding {
  effect: string;
  beam: string | null;
  anim?: string;
  isAoE?: boolean;
  postHealEffect?: string;
  effectFilter?: string;
}

export interface AbilityEffectsRegistry {
  version: string;
  description: string;
  totalAbilities: number;
  classAbilities: Record<string, Record<string, AbilityEffectBinding>>;
  weaponSkills: Record<string, AbilityEffectBinding & { id?: string }>;
  enemyAbilities: Record<string, AbilityEffectBinding>;
}

export interface SpellEntry {
  id: string;
  name: string;
  group: string;
  groupLabel: string;
  binding: AbilityEffectBinding;
  mapped3dFxId: string | null;
}

export interface EffectPreset {
  id: string;
  name: string;
  category: EffectCategory;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  intensity: number;
  particleCount: number;
  duration: number;
  shader: string | null;
  bloom?: { strength: number; radius: number; threshold: number };
}

export interface VfxSandboxTab {
  id: 'effects' | 'spells';
  label: string;
}

/** Optional player/character context from the host game. */
export interface CharacterVfxContext {
  grudgeId: string | null;
  displayName: string | null;
  /** Roster model id e.g. human_mage */
  characterId: string | null;
  characterName: string | null;
  role: string | null;
  /** abilityEffects.json class key: warrior | mage | worge | ranger */
  abilityClassKey: string | null;
}