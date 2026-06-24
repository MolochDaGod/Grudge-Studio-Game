/**
 * Launch a Grudge Triad 3v3 skirmish — player squad vs random enemy faction.
 */

import { useGameStore, type TacticalUnit } from '@/store/use-game-store';
import { CHARACTERS } from '@/lib/characters';
import { getLevelWithEdits } from '@/lib/levels';
import { WEAPON_SKILL_TREES, type SkillSlot } from '@/lib/weapon-skills';
import { buildGrudgeTriadParty } from '@/lib/grudge-triad-party';

const DEFAULT_WEAPON_BY_ROLE: Record<string, string> = {
  Warrior: 'sword_shield',
  Worg: 'greataxe',
  Mage: 'fire_staff',
  Ranger: 'bow',
};

function defaultLoadoutFor(weaponType: string): Record<SkillSlot, string> | null {
  const tree = WEAPON_SKILL_TREES[weaponType];
  if (!tree) return null;
  const loadout = {} as Record<SkillSlot, string>;
  for (const slot of tree.slots) {
    if (slot.skills.length > 0) loadout[slot.slot as SkillSlot] = slot.skills[0].id;
  }
  return loadout;
}

function createTacticalUnit(
  char: (typeof CHARACTERS)[0],
  isPlayer: boolean,
  index: number,
  spawn: { xMin: number; xMax: number; yMin: number; yMax: number },
  unitId: string,
  weaponOverride?: string,
): TacticalUnit {
  const speed = char.speed;
  const move = Math.max(3, Math.floor(speed / 7) * 3);
  const range = char.role === 'Ranger' ? 5 : char.role === 'Mage' ? 4 : 1;
  const col = index % 2;
  const row = Math.floor(index / 2);
  const x = Math.min(spawn.xMax, spawn.xMin + col * 3);
  const y = Math.min(spawn.yMax, spawn.yMin + row * 5);
  const maxMana = Math.round(Math.max(20, 10 + speed * 3));
  const maxStamina = Math.round(Math.max(40, 30 + speed * 2));
  const weaponType = weaponOverride ?? DEFAULT_WEAPON_BY_ROLE[char.role] ?? 'sword_shield';

  return {
    id: unitId,
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
    position: { x, y },
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

export async function launchTriadSkirmish(levelId = 'ruins'): Promise<void> {
  const party = await buildGrudgeTriadParty();
  const level = getLevelWithEdits(levelId);
  const { initBattle, setCurrentLevelId, setPlayerSquad, setEquippedSkills, setPendingSquad } =
    useGameStore.getState();

  setCurrentLevelId(levelId);
  setPlayerSquad(party.selectedIds);
  setPendingSquad({
    selectedIds: party.selectedIds,
    selectedFaction: party.selectedFaction,
    weaponByCharId: party.weaponByCharId,
    loadoutByCharId: party.loadoutByCharId,
  });

  const allFactionIds = [...new Set(CHARACTERS.map((c) => c.faction))];
  const otherFactions = allFactionIds.filter(
    (f) => f !== party.selectedFaction && f !== 'Pirates',
  );
  const enemyFaction = otherFactions[Math.floor(Math.random() * otherFactions.length)] ?? 'Legion';
  const enemyChars = [...CHARACTERS.filter((c) => c.faction === enemyFaction)]
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);

  let unitCounter = 1;
  const playerChars = CHARACTERS.filter((c) => party.selectedIds.includes(c.id));
  const playerUnits = party.playerUnits.map((u, i) => {
    const char = playerChars[i] ?? CHARACTERS.find((c) => c.id === party.selectedIds[i]);
    if (!char) return u;
    return {
      ...createTacticalUnit(
        char,
        true,
        i,
        level.playerSpawn,
        `unit_${unitCounter++}`,
        party.weaponByCharId[char.id],
      ),
      id: u.id,
      name: u.name,
      hp: u.hp,
      maxHp: u.maxHp,
      attack: u.attack,
      defense: u.defense,
      move: u.move,
      range: u.range,
      weaponType: u.weaponType,
    };
  });

  const enemyUnits = enemyChars.map((c, i) =>
    createTacticalUnit(c, false, i, level.enemySpawn, `unit_${unitCounter++}`),
  );

  initBattle([...playerUnits, ...enemyUnits]);

  playerUnits.forEach((unit, i) => {
    const charId = party.selectedIds[i];
    const loadout = party.loadoutByCharId[charId];
    if (loadout) setEquippedSkills(unit.id, loadout);
    else {
      const fallback = unit.weaponType ? defaultLoadoutFor(unit.weaponType) : null;
      if (fallback) setEquippedSkills(unit.id, fallback);
    }
  });
  enemyUnits.forEach((unit) => {
    const loadout = unit.weaponType ? defaultLoadoutFor(unit.weaponType) : null;
    if (loadout) setEquippedSkills(unit.id, loadout);
  });
}