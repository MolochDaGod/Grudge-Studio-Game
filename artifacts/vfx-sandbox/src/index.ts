export { VfxSandbox } from './components/VfxSandbox';
export type { VfxSandboxProps } from './components/VfxSandbox';

export {
  load3dFxRegistry,
  loadAbilityEffects,
  loadShaderPair,
  effectToPreset,
  flattenSpellEntries,
} from './registry';

export { resolve3dFxForSpell } from './spell-mapper';
export { buildEffectInScene, clearEffectScene } from './effect-builder';
export { BUILTIN_SHADERS } from './shaders';
export { OBJECTSTORE_API, REGISTRY_3DFX_URL, ABILITY_EFFECTS_URL } from './constants';

export type {
  Effect3D,
  EffectCategory,
  EffectPreset,
  Effects3DRegistry,
  AbilityEffectBinding,
  AbilityEffectsRegistry,
  SpellEntry,
  VfxSandboxTab,
  CharacterVfxContext,
} from './types';