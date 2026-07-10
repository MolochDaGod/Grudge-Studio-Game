/**
 * Shared battle unit creation — used by deploy screen and level-select.
 */
import { TacticalUnit } from '@/store/use-game-store';
import { CHARACTERS as LOCAL_CHARACTERS, type GameCharacter } from '@/lib/characters';
import { LevelDef } from '@/lib/levels';
import { WEAPON_SKILL_TREES, SkillSlot } from '@/lib/weapon-skills';
import type { DeployPlan } from '@/lib/lane-deploy';
import { applyDeployPlanToPositions } from '@/lib/lane-deploy';
import {
  calculateStats,
  getClassStartingAttributes,
  getTotalAttributePoints,
  MAX_LEVEL,
  type CharacterAttributes,
} from '@/lib/attribute-system';
import { getHeroCanonicalWeapon } from '@/lib/hero-weapons';
import { mergeClassSkillsIntoLoadout } from '@/lib/class-skills';

export const DEFAULT_WEAPON_BY_ROLE: Record<string, string> = {
  Warrior: 'sword_shield',
  Worg: 'greataxe',
  Mage: 'fire_staff',
  Ranger: 'bow',
};

let unitIdCounter = 1;

export function resetUnitIdCounter(): void {
  unitIdCounter = 1;
}

function roleToClassId(role: string): string {
  switch (role) {
    case 'Mage': return 'mage';
    case 'Ranger': return 'rogue';
    case 'Worg': return 'cleric';
    default: return 'warrior';
  }
}

/** Distribute level-20 attribute points with role bias. */
function canonicalLevel20Attributes(char: GameCharacter): CharacterAttributes {
  const classId = roleToClassId(char.role);
  const base = { ...getClassStartingAttributes(classId) };
  const total = getTotalAttributePoints(MAX_LEVEL);
  let spent = Object.values(base).reduce((s, v) => s + v, 0);

  const weights: Record<keyof CharacterAttributes, number> =
    char.role === 'Mage'
      ? { strength: 0.5, vitality: 1, endurance: 0.8, intellect: 3, wisdom: 3, dexterity: 0.5, agility: 1, tactics: 1.5 }
      : char.role === 'Ranger'
      ? { strength: 1, vitality: 0.8, endurance: 0.5, intellect: 0.5, wisdom: 0.5, dexterity: 3, agility: 3, tactics: 2 }
      : char.role === 'Worg'
      ? { strength: 2.5, vitality: 2, endurance: 1.5, intellect: 0.5, wisdom: 1.5, dexterity: 1.5, agility: 2, tactics: 1 }
      : { strength: 3, vitality: 2.5, endurance: 2, intellect: 0.5, wisdom: 0.5, dexterity: 1, agility: 1, tactics: 1.5 };

  const keys = Object.keys(weights) as (keyof CharacterAttributes)[];
  while (spent < total) {
    const pick = keys[Math.floor(Math.random() * keys.length)];
    const w = weights[pick];
    if (Math.random() < w / 3) {
      base[pick]++;
      spent++;
    }
  }
  return base;
}

function deriveMoveFromRole(role: string, agility: number): number {
  const base = role === 'Ranger' ? 4 : role === 'Mage' ? 3 : 3;
  return base + (agility > 40 ? 1 : 0);
}

function deriveRangeFromWeapon(weaponType: string, role: string): number {
  if (weaponType.includes('bow') || weaponType === 'gun' || weaponType === 'crossbow') return 8;
  if (weaponType.includes('staff') || weaponType === 'focus' || weaponType === 'wand') return 7;
  if (weaponType === 'lance' || weaponType === 'spear') return 3;
  return role === 'Ranger' ? 8 : role === 'Mage' ? 7 : 2;
}

export function createTacticalUnit(
  char: GameCharacter,
  isPlayer: boolean,
  position: { x: number; y: number },
  weaponType: string,
): TacticalUnit {
  const attrs = canonicalLevel20Attributes(char);
  const computed = calculateStats(MAX_LEVEL, attrs);
  const speed = Math.max(45, Math.min(85, char.speed));
  const move = deriveMoveFromRole(char.role, attrs.agility);
  const range = deriveRangeFromWeapon(weaponType, char.role);

  return {
    id: `unit_${unitIdCounter++}`,
    characterId: char.id,
    name: char.name,
    race: char.race,
    role: char.role,
    hp: computed.health,
    maxHp: computed.maxHealth,
    mana: computed.mana,
    maxMana: computed.maxMana,
    stamina: computed.stamina,
    maxStamina: computed.maxStamina,
    attack: computed.damage,
    defense: computed.defense,
    speed,
    move,
    range,
    weaponType,
    position,
    facing: (isPlayer ? 1 : 3) as 0 | 1 | 2 | 3,
    isPlayerControlled: isPlayer,
    specialAbility: char.specialAbility,
    specialAbilityDescription: char.specialAbilityDescription,
    specialAbilityCooldown: 0,
    ct: Math.floor(Math.random() * 20),
    faction: char.faction,
    rarity: char.rarity,
    statusEffects: [],
    statusDurations: {},
    statusImmunities: {},
    hasMoved: false,
    hasActed: false,
  };
}

export function defaultLoadoutForWeapon(weaponType: string): Record<SkillSlot, string> | null {
  const tree = WEAPON_SKILL_TREES[weaponType];
  if (!tree) return null;
  const loadout = {} as Record<SkillSlot, string>;
  for (const slot of tree.slots) {
    if (slot.skills.length > 0) loadout[slot.slot as SkillSlot] = slot.skills[0].id;
  }
  return loadout;
}

export function defaultLoadoutForHero(
  characterId: string,
  role: string,
  weaponType: string,
): Record<SkillSlot, string> {
  const base = defaultLoadoutForWeapon(weaponType) ?? ({} as Record<SkillSlot, string>);
  return mergeClassSkillsIntoLoadout(role, base);
}

export interface SquadBattleInput {
  selectedIds: string[];
  selectedFaction: string;
  weaponByCharId: Record<string, string>;
  loadoutByCharId: Record<string, Record<SkillSlot, string>>;
  deployPlan?: DeployPlan | null;
}

export function buildBattleRoster(
  level: LevelDef,
  squad: SquadBattleInput,
): { playerUnits: TacticalUnit[]; enemyUnits: TacticalUnit[] } {
  resetUnitIdCounter();
  const { selectedIds, selectedFaction, weaponByCharId, deployPlan } = squad;
  const playerChars = LOCAL_CHARACTERS.filter((c) => selectedIds.includes(c.id));

  const allFactionIds = [...new Set(LOCAL_CHARACTERS.map((c) => c.faction))];
  const otherFactions = allFactionIds.filter((f) => f !== selectedFaction && f !== 'Pirates');
  const enemyFaction = otherFactions[Math.floor(Math.random() * otherFactions.length)];
  const possibleEnemies = LOCAL_CHARACTERS.filter((c) => c.faction === enemyFaction);
  const enemyChars = [...possibleEnemies].sort(() => 0.5 - Math.random()).slice(0, 3);

  const playerUnits = playerChars.map((char, i) => {
    const weapon = weaponByCharId[char.id]
      ?? getHeroCanonicalWeapon(char.id, char.role);
    const pos = deployPlan
      ? applyDeployPlanToPositions(deployPlan, level, char.id, i)
      : { x: level.playerSpawn.xMin + i, y: level.playerSpawn.yMin };
    return createTacticalUnit(char, true, pos, weapon);
  });

  const enemyUnits = enemyChars.map((char, i) => {
    const weapon = getHeroCanonicalWeapon(char.id, char.role);
    const pos = {
      x: level.enemySpawn.xMax - i,
      y: level.enemySpawn.yMin + Math.floor(i * 2),
    };
    return createTacticalUnit(char, false, pos, weapon);
  });

  return { playerUnits, enemyUnits };
}