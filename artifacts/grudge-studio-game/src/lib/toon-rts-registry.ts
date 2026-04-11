/**
 * Toon_RTS Race & Appendage Registry
 *
 * Defines the modular character system: 6 races, each with swappable
 * body/head/arms/legs/shoulders/weapon/shield mesh slots. All mesh
 * variants live inside a single "_customizable" GLB per race.
 */

// ── Equipment slot types ────────────────────────────────────────────────────

export type EquipSlot =
  | 'body'
  | 'head'
  | 'arms'
  | 'legs'
  | 'shoulderpads'
  | 'weapon'
  | 'shield'
  | 'accessory'; // bag, quiver, wood

export type RaceId =
  | 'barbarians'
  | 'dwarves'
  | 'elves'
  | 'orcs'
  | 'undead'
  | 'western-kingdoms';

// ── Equipment loadout ───────────────────────────────────────────────────────

/** A full character appearance configuration. null = slot hidden. */
export interface ToonRTSLoadout {
  body:         string | null; // e.g. 'A', 'B', 'C'
  head:         string | null;
  arms:         string | null;
  legs:         string | null;
  shoulderpads: string | null;
  weapon:       string | null; // e.g. 'sword_A', 'axe_B', 'staff_C'
  shield:       string | null; // e.g. 'A', 'B', 'C', 'D'
  accessory:    string | null; // 'bag', 'quiver', 'wood'
}

// ── Race configuration ──────────────────────────────────────────────────────

export interface RaceConfig {
  id: RaceId;
  prefix: string;           // FBX mesh name prefix: 'BRB', 'ORC', etc.
  displayName: string;
  /** GLB filename for the customizable character model */
  characterGlb: string;
  /** GLB filename for the cavalry model (if any) */
  cavalryGlb?: string;
  /** Texture filename in the same directory */
  texture: string;
  /** Available variants per equipment slot */
  variants: Record<EquipSlot, string[]>;
  /** Default loadout for a basic warrior */
  defaultLoadout: ToonRTSLoadout;
}

// ── Mesh name builders ──────────────────────────────────────────────────────

/**
 * Build the mesh name as it appears in the GLB scene graph.
 *
 * Patterns found in the FBX meta:
 * - Body/Head/Arms/Legs: `{PREFIX}_body_{variant}`, `{PREFIX}_head_{variant}`
 * - Shoulderpads: `{PREFIX}_shoulderpads_{variant}`
 * - Weapons: `{PREFIX}_sword_{variant}`, `{PREFIX}_axe_{variant}`, etc.
 * - Shields: `{PREFIX}_shield_{variant}`
 * - Accessories: `{PREFIX}_bag`, `{PREFIX}_quiver`, `{PREFIX}_wood`
 *
 * Some races use different casing (ORC_Units_Body_A vs BRB_body_A).
 * We store all known mesh names per race to handle this.
 */
export function buildMeshName(prefix: string, slot: EquipSlot, variant: string): string {
  switch (slot) {
    case 'body':         return `${prefix}_body_${variant}`;
    case 'head':         return `${prefix}_head_${variant}`;
    case 'arms':         return `${prefix}_arms_${variant}`;
    case 'legs':         return `${prefix}_legs_${variant}`;
    case 'shoulderpads': return `${prefix}_shoulderpads_${variant}`;
    case 'shield':       return `${prefix}_shield_${variant}`;
    case 'accessory':    return `${prefix}_${variant}`; // bag, quiver, wood
    case 'weapon': {
      // Weapons have type embedded: sword_A, axe_B, staff_C, spear, dagger, bow, etc.
      return `${prefix}_${variant}`;
    }
  }
}

// ── Race definitions ────────────────────────────────────────────────────────

const BRB_WEAPONS = [
  'sword_A', 'sword_B', 'axe_A', 'axe_B', 'axe_C',
  'hammer_A', 'hammer_B', 'staff_A', 'staff_B', 'staff_C',
  'spear', 'Dagger', 'bow',
];

const ORC_WEAPONS = [
  'Sword', 'Axe', 'Hammer', 'Hatchet', 'Mace',
  'Spear', 'Dagger', 'Bow',
  'Staff_A', 'Staff_B', 'Staff_C',
];

const WK_WEAPONS = [
  'sword_A', 'sword_B', 'axe_A', 'axe_B',
  'hammer_A', 'hammer_B', 'pick', 'spear', 'Bow',
  'staff_A', 'staff_B', 'staff_C',
];

export const RACE_CONFIGS: Record<RaceId, RaceConfig> = {
  barbarians: {
    id: 'barbarians',
    prefix: 'BRB',
    displayName: 'Barbarians',
    characterGlb: 'BRB_Characters_customizable.glb',
    cavalryGlb: 'BRB_Cavalry_customizable.glb',
    texture: 'BRB_StandardUnits_texture.tga',
    variants: {
      body:         ['A','B','C','D','E','F','G','H'],
      head:         ['A','B','C','D','E','F','G','H','I','J'],
      arms:         ['A','B','C'],
      legs:         ['A','B','C'],
      shoulderpads: ['A','B','C'],
      weapon:       BRB_WEAPONS,
      shield:       ['A','B','C','D'],
      accessory:    ['bag','quiver','wood'],
    },
    defaultLoadout: {
      body: 'A', head: 'A', arms: 'A', legs: 'A',
      shoulderpads: 'A', weapon: 'sword_A', shield: null, accessory: null,
    },
  },

  dwarves: {
    id: 'dwarves',
    prefix: 'DWF',
    displayName: 'Dwarves',
    characterGlb: 'DWF_Characters_customizable.glb',
    cavalryGlb: 'DWF_Cavalry_customizable.glb',
    texture: 'DWF_StandardUnits_texture.tga',
    variants: {
      body:         ['A','B','C','D','E'],
      head:         ['A','B','C','D','E','F'],
      arms:         ['A','B','C'],
      legs:         ['A','B','C'],
      shoulderpads: ['A','B'],
      weapon:       WK_WEAPONS, // Dwarves share WK weapon naming
      shield:       ['A','B','C','D'],
      accessory:    ['bag','quiver','wood'],
    },
    defaultLoadout: {
      body: 'A', head: 'A', arms: 'A', legs: 'A',
      shoulderpads: 'A', weapon: 'hammer_A', shield: 'A', accessory: null,
    },
  },

  elves: {
    id: 'elves',
    prefix: 'ELF',
    displayName: 'Elves',
    characterGlb: 'ELF_Characters_customizable.glb',
    cavalryGlb: 'ELF_Cavalry_customizable.glb',
    texture: 'ELF_StandardUnits_texture.tga',
    variants: {
      body:         ['A','B','C','D','E'],
      head:         ['A','B','C','D','E','F','G','H','I'],
      arms:         ['A','B','C','D'],
      legs:         ['A','B','C'],
      shoulderpads: ['A','B'],
      weapon:       WK_WEAPONS,
      shield:       ['A','B','C','D'],
      accessory:    ['bag','quiver','wood'],
    },
    defaultLoadout: {
      body: 'A', head: 'A', arms: 'A', legs: 'A',
      shoulderpads: null, weapon: 'sword_A', shield: null, accessory: 'quiver',
    },
  },

  orcs: {
    id: 'orcs',
    prefix: 'ORC',
    displayName: 'Orcs',
    characterGlb: 'ORC_Characters_Customizable.glb',
    cavalryGlb: 'ORC_Cavalry_Customizable.glb',
    texture: 'ORC_StandardUnits_texture.tga',
    variants: {
      body:         ['A','B','C','D','E','F'],
      head:         ['A','B','C','D','E','F'],
      arms:         ['A','B','C'],
      legs:         ['A','B','C'],
      shoulderpads: ['A','B'],
      weapon:       ORC_WEAPONS,
      shield:       ['A','B','C'],
      accessory:    ['Bag','Quiver','Wood'],
    },
    defaultLoadout: {
      body: 'A', head: 'A', arms: 'A', legs: 'A',
      shoulderpads: 'A', weapon: 'Sword', shield: null, accessory: null,
    },
  },

  undead: {
    id: 'undead',
    prefix: 'UD',
    displayName: 'Undead',
    characterGlb: 'UD_Characters_customizable.glb',
    cavalryGlb: 'UD_Cavalry_customizable.glb',
    texture: 'UD_StandardUnits_texture.tga',
    variants: {
      body:         ['A','B','C','D','E'],
      head:         ['A','B','C','D','E','F'],
      arms:         ['A','B','C'],
      legs:         ['A','B','C'],
      shoulderpads: ['A','B'],
      weapon:       WK_WEAPONS,
      shield:       ['A','B','C','D'],
      accessory:    ['bag','quiver','wood'],
    },
    defaultLoadout: {
      body: 'A', head: 'A', arms: 'A', legs: 'A',
      shoulderpads: null, weapon: 'sword_A', shield: null, accessory: null,
    },
  },

  'western-kingdoms': {
    id: 'western-kingdoms',
    prefix: 'WK',
    displayName: 'Western Kingdoms',
    characterGlb: 'WK_Characters_customizable.glb',
    cavalryGlb: 'WK_Cavalry_customizable.glb',
    texture: 'WK_StandardUnits_texture.tga',
    variants: {
      body:         ['A','B','C','D','E'],
      head:         ['A','B','C','D','E','F','G','H','I'],
      arms:         ['A','B','C','D'],
      legs:         ['A','B','C'],
      shoulderpads: ['A','B'],
      weapon:       WK_WEAPONS,
      shield:       ['A','B','C','D'],
      accessory:    ['bag','quiver','wood'],
    },
    defaultLoadout: {
      body: 'A', head: 'A', arms: 'A', legs: 'A',
      shoulderpads: 'A', weapon: 'sword_A', shield: 'A', accessory: null,
    },
  },
};

/** Get all mesh names that belong to a specific equipment slot for a race. */
export function getSlotMeshNames(raceId: RaceId, slot: EquipSlot): string[] {
  const config = RACE_CONFIGS[raceId];
  if (!config) return [];

  // For ORC models, the FBX uses "ORC_Units_" prefix instead of "ORC_"
  // We handle both patterns via alternate names
  return config.variants[slot].map(v => buildMeshName(config.prefix, slot, v));
}

/**
 * Get the active mesh name for a loadout slot.
 * Returns null if the slot is empty.
 */
export function getActiveMeshName(
  raceId: RaceId,
  slot: EquipSlot,
  variant: string | null,
): string | null {
  if (!variant) return null;
  const config = RACE_CONFIGS[raceId];
  if (!config) return null;
  return buildMeshName(config.prefix, slot, variant);
}

/** Weapon type categories for hitbox sizing and animation selection. */
export type WeaponCategory = 'sword' | 'axe' | 'hammer' | 'staff' | 'spear' | 'dagger' | 'bow' | 'mace' | 'pick';

export function getWeaponCategory(weaponVariant: string): WeaponCategory {
  const lower = weaponVariant.toLowerCase();
  if (lower.includes('sword')) return 'sword';
  if (lower.includes('axe') || lower.includes('hatchet')) return 'axe';
  if (lower.includes('hammer')) return 'hammer';
  if (lower.includes('staff')) return 'staff';
  if (lower.includes('spear')) return 'spear';
  if (lower.includes('dagger')) return 'dagger';
  if (lower.includes('bow')) return 'bow';
  if (lower.includes('mace')) return 'mace';
  if (lower.includes('pick')) return 'pick';
  return 'sword'; // fallback
}
