/**
 * Grudge6 prefab library — canonical hero loadouts + CDN texture URLs.
 * Sources: toon-rts-registry (mesh variants), race-loadout-preset (CDN paths),
 * grudge-character-tester (WK_Units_* FBX mesh naming).
 */
import type { Grudge6RacePrefix } from './grudge6-character';
import type { Model3DField } from './grudge6-equipment';
import { RACE_ASSET_PRESETS } from './race-loadout-preset';
import {
  RACE_CONFIGS,
  type RaceId,
  type ToonRTSLoadout,
} from './toon-rts-registry';
import { ASSET_CDN_BASE } from './asset-config';

const FACTION_TO_RACE: Record<string, RaceId> = {
  human: 'western-kingdoms',
  barbarian: 'barbarians',
  dwarf: 'dwarves',
  elf: 'elves',
  orc: 'orcs',
  undead: 'undead',
};

const PREFIX_TO_RACE: Record<Grudge6RacePrefix, RaceId> = {
  WK: 'western-kingdoms',
  BRB: 'barbarians',
  DWF: 'dwarves',
  ELF: 'elves',
  ORC: 'orcs',
  UD: 'undead',
};

function factionFromCharacterId(characterId: string): string {
  const idx = characterId.indexOf('_');
  return idx > 0 ? characterId.slice(0, idx) : 'human';
}

function roleFromCharacterId(characterId: string): 'warrior' | 'mage' | 'ranger' | 'worg' {
  if (characterId.endsWith('_mage')) return 'mage';
  if (characterId.endsWith('_ranger')) return 'ranger';
  if (characterId.endsWith('_worg')) return 'worg';
  return 'warrior';
}

/** Stable cosmetic variant from hero id — picks from registry's real variant lists */
function pickVariant(characterId: string, slot: keyof ToonRTSLoadout, salt: number): string {
  const raceId = FACTION_TO_RACE[factionFromCharacterId(characterId)] ?? 'western-kingdoms';
  const variants = RACE_CONFIGS[raceId]?.variants;
  if (!variants) return 'A';

  const list =
    slot === 'shoulderpads' ? variants.shoulderpads
    : slot === 'body' ? variants.body
    : slot === 'head' ? variants.head
    : slot === 'arms' ? variants.arms
    : slot === 'legs' ? variants.legs
    : variants.body;

  if (!list?.length) return 'A';
  let h = salt;
  for (let i = 0; i < characterId.length; i++) h = (h * 31 + characterId.charCodeAt(i)) | 0;
  return list[Math.abs(h) % list.length];
}

/** Role weapon from prefab library — matches Toon_RTS FBX child mesh names */
function roleWeapon(raceId: RaceId, role: ReturnType<typeof roleFromCharacterId>): string {
  const weapons = RACE_CONFIGS[raceId].variants.weapon;
  const pick = (candidates: string[]) =>
    candidates.find((c) => weapons.includes(c)) ?? weapons[0] ?? 'sword_A';

  switch (role) {
    case 'mage':
      return pick(['staff_A', 'staff_B', 'staff_C', 'Staff_A', 'Staff_B', 'Staff_C']);
    case 'ranger':
      return pick(['bow', 'Bow']);
    case 'worg':
      return pick(['axe_A', 'axe_B', 'Axe', 'hammer_A', 'hammer_B', 'Hammer']);
    default:
      return pick(['sword_A', 'sword_B', 'Sword']);
  }
}

export function characterIdToRaceId(characterId: string): RaceId {
  return FACTION_TO_RACE[factionFromCharacterId(characterId)] ?? 'western-kingdoms';
}

export function heroToPrefabLoadout(characterId: string): ToonRTSLoadout {
  const raceId = characterIdToRaceId(characterId);
  const role = roleFromCharacterId(characterId);
  const base = { ...RACE_CONFIGS[raceId].defaultLoadout };

  const loadout: ToonRTSLoadout = {
    body: pickVariant(characterId, 'body', 1),
    head: pickVariant(characterId, 'head', 7),
    arms: pickVariant(characterId, 'arms', 3),
    legs: pickVariant(characterId, 'legs', 5),
    shoulderpads: role === 'mage' || role === 'ranger' ? null : pickVariant(characterId, 'shoulderpads', 11),
    weapon: roleWeapon(raceId, role),
    shield: role === 'warrior' ? (base.shield ?? 'A') : null,
    accessory: role === 'ranger' ? 'quiver' : null,
  };

  // Orc accessories use PascalCase in registry
  if (raceId === 'orcs' && loadout.accessory === 'quiver') {
    loadout.accessory = 'Quiver';
  }

  return loadout;
}

/** Map registry weapon string → Grudge6EquipmentManager slots */
function weaponToSlots(weapon: string): Record<string, string> {
  const lower = weapon.toLowerCase();
  if (lower.includes('sword')) {
    const m = weapon.match(/_([A-Z])$/i);
    return { sword: m ? m[1].toUpperCase() : '_default' };
  }
  if (lower.includes('axe') || lower.includes('hatchet')) {
    const m = weapon.match(/_([A-Z])$/i);
    return { axe: m ? m[1].toUpperCase() : '_default' };
  }
  if (lower.includes('hammer')) {
    const m = weapon.match(/_([A-Z])$/i);
    return { hammer: m ? m[1].toUpperCase() : '_default' };
  }
  if (lower.includes('mace')) return { mace: '_default' };
  if (lower.includes('staff')) {
    const m = weapon.match(/_([A-Z])$/i);
    return { staff: m ? m[1].toUpperCase() : 'A' };
  }
  if (lower.includes('spear')) return { spear: '_default' };
  if (lower.includes('pick')) return { pick: '_default' };
  if (lower.includes('bow')) return { bow: '_default' };
  if (lower.includes('dagger')) return { dagger: '_default' };
  if (lower === 'mace') return { mace: '_default' };
  return { sword: 'A' };
}

export function prefabLoadoutToModel3d(
  loadout: ToonRTSLoadout,
  armorColor?: string,
): Model3DField {
  const equippedMeshes: Record<string, string> = {};
  if (loadout.body) equippedMeshes.body = loadout.body;
  if (loadout.arms) equippedMeshes.arms = loadout.arms;
  if (loadout.legs) equippedMeshes.legs = loadout.legs;
  if (loadout.head) equippedMeshes.head = loadout.head;
  if (loadout.shoulderpads) equippedMeshes.shoulders = loadout.shoulderpads;

  const weaponSlots: Record<string, string> = loadout.weapon
    ? weaponToSlots(loadout.weapon)
    : {};

  if (loadout.shield) weaponSlots.shield = loadout.shield;
  if (loadout.accessory) {
    const acc = loadout.accessory.toLowerCase();
    if (acc === 'quiver') weaponSlots.quiver = '_default';
    if (acc === 'bag') weaponSlots.bag = '_default';
    if (acc === 'wood') weaponSlots.wood = '_default';
  }

  return { equippedMeshes, weaponSlots, armorColor };
}

export function heroToModel3d(characterId: string): Model3DField {
  const loadout = heroToPrefabLoadout(characterId);
  const preset = RACE_ASSET_PRESETS[characterIdToRaceId(characterId)];
  return prefabLoadoutToModel3d(loadout, preset?.color);
}

/** CDN texture for race — same-origin proxy in browser (domain-root, not /game/...) */
export function grudge6RaceTextureUrl(racePrefix: Grudge6RacePrefix): string {
  const raceId = PREFIX_TO_RACE[racePrefix];
  const preset = RACE_ASSET_PRESETS[raceId];
  if (!preset) return '';

  let path = preset.textureUrl;
  if (path.startsWith(ASSET_CDN_BASE)) path = path.slice(ASSET_CDN_BASE.length);
  if (typeof window !== 'undefined') {
    // Must be /api/assets/... (not /game/api/assets/...) — see asset-config.cdnProxyUrl
    return `/api/assets${path.startsWith('/') ? path : `/${path}`}`;
  }
  return preset.textureUrl;
}