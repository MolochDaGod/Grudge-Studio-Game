/**
 * Shared battle unit creation — used by deploy screen and level-select.
 */
import { TacticalUnit } from '@/store/use-game-store';
import { CHARACTERS as LOCAL_CHARACTERS } from '@/lib/characters';
import { LevelDef } from '@/lib/levels';
import { WEAPON_SKILL_TREES, SkillSlot } from '@/lib/weapon-skills';
import type { DeployPlan } from '@/lib/lane-deploy';
import { applyDeployPlanToPositions } from '@/lib/lane-deploy';

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

export function createTacticalUnit(
  char: (typeof LOCAL_CHARACTERS)[0],
  isPlayer: boolean,
  position: { x: number; y: number },
  weaponType: string,
): TacticalUnit {
  const speed = char.speed;
  const move = Math.max(12, Math.floor(speed / 7) * 3);
  const range = char.role === 'Ranger' ? 8 : char.role === 'Mage' ? 7 : char.role === 'Worg' ? 3 : 2;
  const maxMana = Math.round(Math.max(20, 10 + speed * 3));
  const maxStamina = Math.round(Math.max(40, 30 + speed * 2));
  return {
    id: `unit_${unitIdCounter++}`,
    characterId: char.id,
    name: char.name,
    race: char.race,
    role: char.role,
    hp: char.hp,
    maxHp: char.hp,
    mana: maxMana,
    maxMana,
    stamina: maxStamina,
    maxStamina,
    attack: char.attack,
    defense: char.defense,
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

  const positionMap = deployPlan
    ? applyDeployPlanToPositions(deployPlan, level)
    : {};

  const playerUnits = playerChars.map((char, i) => {
    const spawn = level.playerSpawn;
    const col = i % 2;
    const row = Math.floor(i / 2);
    const defaultPos = {
      x: Math.min(spawn.xMax, spawn.xMin + col * 3),
      y: Math.min(spawn.yMax, spawn.yMin + row * 5),
    };
    const pos = positionMap[char.id] ?? defaultPos;
    const weapon = weaponByCharId[char.id] ?? DEFAULT_WEAPON_BY_ROLE[char.role] ?? 'sword';
    return createTacticalUnit(char, true, pos, weapon);
  });

  const enemyUnits = enemyChars.map((char, i) => {
    const spawn = level.enemySpawn;
    const col = i % 2;
    const row = Math.floor(i / 2);
    const pos = {
      x: Math.min(spawn.xMax, spawn.xMin + col * 3),
      y: Math.min(spawn.yMax, spawn.yMin + row * 5),
    };
    const weapon = DEFAULT_WEAPON_BY_ROLE[char.role] ?? 'sword';
    return createTacticalUnit(char, false, pos, weapon);
  });

  return { playerUnits, enemyUnits };
}