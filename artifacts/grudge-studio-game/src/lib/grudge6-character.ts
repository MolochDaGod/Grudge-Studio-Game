/**
 * Hero → Grudge6 race + equipment mapping for tactical battle.
 */
import type { WorgeFormId } from './character-model-map';
import type { Model3DField } from './grudge6-equipment';

export type Grudge6RacePrefix = 'WK' | 'BRB' | 'DWF' | 'ELF' | 'ORC' | 'UD';

export const RACE_GRUDGE6: Record<string, Grudge6RacePrefix> = {
  human: 'WK',
  barbarian: 'BRB',
  dwarf: 'DWF',
  elf: 'ELF',
  orc: 'ORC',
  undead: 'UD',
};

const GRUDGE6_HERO_PREFIXES = [
  'human_',
  'barbarian_',
  'dwarf_',
  'elf_',
  'orc_',
  'undead_',
] as const;

const HEIGHT_MULT: Record<string, number> = {
  human_worg: 1.05,
  human_ranger: 0.95,
  barbarian_warrior: 1.15,
  barbarian_worg: 1.10,
  barbarian_mage: 1.02,
  barbarian_ranger: 1.02,
  dwarf_warrior: 0.85,
  dwarf_worg: 0.90,
  dwarf_mage: 0.88,
  dwarf_ranger: 0.88,
  orc_warrior: 1.15,
  orc_worg: 1.10,
  orc_mage: 1.05,
  orc_ranger: 0.95,
  undead_warrior: 1.05,
};

const ARMOR_TINT: Record<string, string> = {
  human_warrior: '#e6e9ef',
  human_worg: '#c49060',
  human_mage: '#5a4cbf',
  human_ranger: '#2a3a18',
  barbarian_warrior: '#7a4e28',
  barbarian_worg: '#4a3a28',
  barbarian_mage: '#8a1030',
  barbarian_ranger: '#c8b890',
  dwarf_warrior: '#a8b0b8',
  dwarf_worg: '#5a3820',
  dwarf_mage: '#ff5500',
  dwarf_ranger: '#604820',
  elf_warrior: '#c8e0a8',
  elf_worg: '#3a6020',
  elf_mage: '#2a4838',
  elf_ranger: '#c8e8b0',
  orc_warrior: '#2e4820',
  orc_worg: '#6a1810',
  orc_mage: '#28380a',
  orc_ranger: '#4a6a18',
  undead_warrior: '#18140c',
  undead_worg: '#a0a080',
  undead_mage: '#c0b8a8',
  undead_ranger: '#b0ae90',
};

export interface Grudge6HeroConfig {
  racePrefix: Grudge6RacePrefix;
  model3d: Model3DField;
  heightMult: number;
  animWeaponType: string;
  labelHeight: number;
  hpRingHeight: number;
  selectionRingRadius: number;
}

function hashVariant(id: string, salt: number): string {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ['A', 'B', 'C'][Math.abs(h) % 3];
}

function raceFromCharacterId(characterId: string): Grudge6RacePrefix {
  for (const [faction, prefix] of Object.entries(RACE_GRUDGE6)) {
    if (characterId.startsWith(`${faction}_`)) return prefix;
  }
  return 'WK';
}

function roleFromCharacterId(characterId: string): 'warrior' | 'mage' | 'ranger' | 'worg' {
  if (characterId.endsWith('_mage')) return 'mage';
  if (characterId.endsWith('_ranger')) return 'ranger';
  if (characterId.endsWith('_worg')) return 'worg';
  return 'warrior';
}

function animWeaponForRole(role: ReturnType<typeof roleFromCharacterId>): string {
  switch (role) {
    case 'mage': return 'fire_staff';
    case 'ranger': return 'bow';
    case 'worg': return 'greataxe';
    default: return 'sword';
  }
}

function buildLoadout(characterId: string): Model3DField {
  const role = roleFromCharacterId(characterId);
  const body = hashVariant(characterId, 1);
  const head = hashVariant(characterId, 7);
  const weaponSlots: Record<string, string> = {};

  switch (role) {
    case 'warrior':
      weaponSlots.sword = 'A';
      weaponSlots.shield = 'A';
      break;
    case 'mage':
      weaponSlots.staff = 'A';
      break;
    case 'ranger':
      weaponSlots.bow = '_default';
      weaponSlots.quiver = '_default';
      break;
    case 'worg':
      weaponSlots.axe = 'A';
      break;
  }

  return {
    equippedMeshes: {
      body,
      arms: body,
      legs: body,
      head,
      shoulders: body,
    },
    weaponSlots,
    armorColor: ARMOR_TINT[characterId],
  };
}

export function usesGrudge6Model(
  characterId: string,
  activeForm?: WorgeFormId | null,
): boolean {
  if (activeForm) return false;
  if (characterId === 'pirate_king') return false;
  return GRUDGE6_HERO_PREFIXES.some((p) => characterId.startsWith(p));
}

export function heroToGrudge6Config(
  characterId: string,
  weaponType?: string,
): Grudge6HeroConfig {
  const racePrefix = raceFromCharacterId(characterId);
  const role = roleFromCharacterId(characterId);
  const heightMult = HEIGHT_MULT[characterId] ?? 1.0;
  const animWeaponType = weaponType ?? animWeaponForRole(role);
  const h = 1.5 * heightMult;

  return {
    racePrefix,
    model3d: buildLoadout(characterId),
    heightMult,
    animWeaponType,
    labelHeight: h + 0.30,
    hpRingHeight: h + 0.10,
    selectionRingRadius: 0.45,
  };
}