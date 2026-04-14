/**
 * Toon_RTS Equipment System — Mesh Visibility Controller
 *
 * Given a loaded GLTF scene containing ALL mesh variants for a race,
 * shows only the meshes matching the current equipment loadout and
 * hides everything else.
 *
 * This is the core of the modular appendage system: one GLB per race
 * contains every body/head/arms/legs/shoulder/weapon/shield variant
 * as separate meshes sharing the same Bip001 skeleton. Equipment
 * changes are instant — just toggle mesh visibility.
 */

import * as THREE from 'three';
import {
  type RaceId,
  type EquipSlot,
  type ToonRTSLoadout,
  RACE_CONFIGS,
  buildMeshName,
} from './toon-rts-registry';

// All appendage slot types that should be managed by visibility toggling
const MANAGED_SLOTS: EquipSlot[] = [
  'body', 'head', 'arms', 'legs', 'shoulderpads',
  'weapon', 'shield', 'accessory',
];

/**
 * Build a Set of all mesh names that exist in any slot for a race.
 * Used to determine which meshes in the scene are "managed" by the
 * equipment system (everything else is left visible — e.g. the skeleton).
 */
function buildManagedMeshNames(raceId: RaceId): Set<string> {
  const config = RACE_CONFIGS[raceId];
  if (!config) return new Set();

  const names = new Set<string>();
  for (const slot of MANAGED_SLOTS) {
    const variants = config.variants[slot];
    for (const v of variants) {
      names.add(buildMeshName(config.prefix, slot, v));
    }
  }
  // Also add the ORC_Units_ prefixed alternate names
  if (config.prefix === 'ORC') {
    for (const slot of MANAGED_SLOTS) {
      const variants = config.variants[slot];
      for (const v of variants) {
        names.add(buildMeshName('ORC_Units', slot, v));
      }
    }
  }
  // WK_Units_ alternates
  if (config.prefix === 'WK') {
    for (const slot of MANAGED_SLOTS) {
      const variants = config.variants[slot];
      for (const v of variants) {
        names.add(buildMeshName('WK_Units', slot, v));
      }
    }
  }
  // Also add fullBody mesh name
  names.add('fullBody');
  return names;
}

/**
 * Apply an equipment loadout to a GLTF scene.
 *
 * Hides all managed appendage meshes, then shows only the ones
 * that match the loadout configuration.
 *
 * @param scene - The root Object3D of the loaded GLB
 * @param raceId - Which race this model belongs to
 * @param loadout - The equipment configuration to apply
 */
export function applyLoadout(
  scene: THREE.Object3D,
  raceId: RaceId,
  loadout: ToonRTSLoadout,
): void {
  const config = RACE_CONFIGS[raceId];
  if (!config) return;

  const managed = buildManagedMeshNames(raceId);

  // Build the set of mesh names that should be VISIBLE
  const activeNames = new Set<string>();
  for (const slot of MANAGED_SLOTS) {
    const variant = loadout[slot as keyof ToonRTSLoadout];
    if (variant) {
      activeNames.add(buildMeshName(config.prefix, slot, variant));
      // Add alternate prefix versions
      if (config.prefix === 'ORC') {
        activeNames.add(buildMeshName('ORC_Units', slot, variant));
      }
      if (config.prefix === 'WK') {
        activeNames.add(buildMeshName('WK_Units', slot, variant));
      }
    }
  }

  // Traverse scene and toggle visibility
  scene.traverse((obj) => {
    // Only manage meshes whose names are in our registry
    if (!managed.has(obj.name)) return;

    // Case-insensitive match: some FBX exports have inconsistent casing
    const isActive = activeNames.has(obj.name) ||
      Array.from(activeNames).some(n => n.toLowerCase() === obj.name.toLowerCase());

    obj.visible = isActive;
  });
}

/**
 * Find a mesh by name in the scene (case-insensitive search).
 * Returns the first match or null.
 */
export function findMeshByName(
  scene: THREE.Object3D,
  name: string,
): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  const lower = name.toLowerCase();
  scene.traverse((obj) => {
    if (!found && obj.name.toLowerCase() === lower) {
      found = obj;
    }
  });
  return found;
}

/**
 * Get the weapon mesh from the scene based on the loadout.
 * Returns the Object3D for the weapon, or null if no weapon equipped.
 */
export function getWeaponMesh(
  scene: THREE.Object3D,
  raceId: RaceId,
  loadout: ToonRTSLoadout,
): THREE.Object3D | null {
  if (!loadout.weapon) return null;
  const config = RACE_CONFIGS[raceId];
  if (!config) return null;
  const name = buildMeshName(config.prefix, 'weapon', loadout.weapon);
  return findMeshByName(scene, name);
}

/**
 * Get the shield mesh from the scene based on the loadout.
 */
export function getShieldMesh(
  scene: THREE.Object3D,
  raceId: RaceId,
  loadout: ToonRTSLoadout,
): THREE.Object3D | null {
  if (!loadout.shield) return null;
  const config = RACE_CONFIGS[raceId];
  if (!config) return null;
  const name = buildMeshName(config.prefix, 'shield', loadout.shield);
  return findMeshByName(scene, name);
}

/**
 * Apply shadow casting to all visible meshes in the scene.
 */
export function applyShadows(scene: THREE.Object3D): void {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
}
