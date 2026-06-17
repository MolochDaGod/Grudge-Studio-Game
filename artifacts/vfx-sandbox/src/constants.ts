export const OBJECTSTORE_BASE =
  (typeof import.meta !== 'undefined' &&
    (import.meta as { env?: { VITE_OBJECTSTORE_DATA_URL?: string } }).env?.VITE_OBJECTSTORE_DATA_URL) ||
  'https://molochdagod.github.io/ObjectStore';

export const OBJECTSTORE_API = `${OBJECTSTORE_BASE.replace(/\/$/, '')}/api/v1`;

export const REGISTRY_3DFX_URL = `${OBJECTSTORE_API}/3dfx-registry.json`;
export const ABILITY_EFFECTS_URL = `${OBJECTSTORE_API}/abilityEffects.json`;