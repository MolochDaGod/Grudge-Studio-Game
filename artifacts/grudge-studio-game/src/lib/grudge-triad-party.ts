/**
 * Grudge Triad — 3v3 party builder
 *
 * Slot 1: the player's active Grudge character (from api.grudge-studio.com)
 * Slots 2–3: same-race stock heroes from the dash roster (CHARACTERS table)
 *
 * Mirrors dash.grudge-studio.com: your hero leads, race archetypes fill the squad.
 */

import { CHARACTERS, type GameCharacter } from '@/lib/characters';
import { getMyCharacters, type GrudgeCharacter } from '@/lib/grudge-api';
import { grudgeCharToTacticalUnit, heroToTacticalUnit } from '@/lib/grudge-bridge';
import { mapCharacterModelId } from '@/lib/character-identity';
import type { TacticalUnit } from '@/store/use-game-store';
import type { SkillSlot } from '@/lib/weapon-skills';
import { getDefaultSkillLoadout } from '@/lib/weapon-skills';

const RACE_NORMALIZE: Record<string, string> = {
  human: 'Human',
  barbarian: 'Barbarian',
  barbarians: 'Barbarian',
  elf: 'Elf',
  elves: 'Elf',
  dwarf: 'Dwarf',
  dwarves: 'Dwarf',
  orc: 'Orc',
  orcs: 'Orc',
  undead: 'Undead',
  worge: 'Barbarian',
  'western-kingdoms': 'Human',
  wk: 'Human',
  brb: 'Barbarian',
  elf_: 'Elf',
  dwf: 'Dwarf',
  orc_: 'Orc',
  ud: 'Undead',
};

export interface TriadPartyResult {
  playerUnits: TacticalUnit[];
  selectedIds: string[];
  selectedFaction: string;
  weaponByCharId: Record<string, string>;
  loadoutByCharId: Record<string, Record<SkillSlot, string>>;
  heroChar: GrudgeCharacter | null;
  heroName: string;
}

function normalizeRace(race: string): string {
  const key = race.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  return RACE_NORMALIZE[key] ?? race;
}

function raceStockHeroes(race: string, excludeId?: string): GameCharacter[] {
  const norm = normalizeRace(race);
  return CHARACTERS.filter(
    (c) => c.race === norm && c.id !== excludeId && c.faction !== 'Pirates',
  );
}

const DEFAULT_WEAPON_BY_ROLE: Record<string, string> = {
  Warrior: 'sword_shield',
  Worg: 'greataxe',
  Mage: 'fire_staff',
  Ranger: 'bow',
};

export async function buildGrudgeTriadParty(): Promise<TriadPartyResult> {
  let heroChar: GrudgeCharacter | null = null;
  let playerUnits: TacticalUnit[] = [];
  let selectedIds: string[] = [];
  let selectedFaction = 'Crusade';
  const weaponByCharId: Record<string, string> = {};
  const loadoutByCharId: Record<string, Record<SkillSlot, string>> = {};

  try {
    const chars = await getMyCharacters();
    let activeId: string | null = null;
    try {
      const stored = localStorage.getItem('activeCharacter');
      if (stored) activeId = String(JSON.parse(stored)?.id ?? '');
    } catch { /* ignore */ }
    heroChar =
      (activeId ? chars.find((c) => String(c.id) === activeId) : null) ??
      chars[0] ??
      null;
  } catch {
    heroChar = null;
  }

  if (heroChar) {
    const modelId = mapCharacterModelId(heroChar);
    const heroUnit = grudgeCharToTacticalUnit(heroChar, true, { x: 0, y: 0 });
    playerUnits.push(heroUnit);
    selectedIds.push(modelId);
    selectedFaction = heroUnit.faction;
    weaponByCharId[modelId] = heroUnit.weaponType;
    loadoutByCharId[modelId] = getDefaultSkillLoadout(modelId);

    const stock = raceStockHeroes(heroChar.race, modelId).slice(0, 2);
    stock.forEach((hero, i) => {
      const unit = heroToTacticalUnit(hero, 0, { x: 0, y: i + 1 });
      playerUnits.push(unit);
      selectedIds.push(hero.id);
      selectedFaction = hero.faction;
      weaponByCharId[hero.id] = DEFAULT_WEAPON_BY_ROLE[hero.role] ?? 'sword_shield';
      loadoutByCharId[hero.id] = getDefaultSkillLoadout(hero.id);
    });
  }

  // Pad to 3 with race-matched or faction heroes
  while (playerUnits.length < 3) {
    const race = heroChar ? normalizeRace(heroChar.race) : 'Human';
    const pool = raceStockHeroes(race).filter((h) => !selectedIds.includes(h.id));
    const pick = pool[playerUnits.length] ?? CHARACTERS.filter((c) => c.faction === 'Crusade')[playerUnits.length];
    if (!pick) break;
    const unit = heroToTacticalUnit(pick, 0, { x: 0, y: playerUnits.length });
    playerUnits.push(unit);
    selectedIds.push(pick.id);
    selectedFaction = pick.faction;
    weaponByCharId[pick.id] = DEFAULT_WEAPON_BY_ROLE[pick.role] ?? 'sword_shield';
    loadoutByCharId[pick.id] = getDefaultSkillLoadout(pick.id);
  }

  const heroName = heroChar?.name ?? playerUnits[0]?.name ?? 'Warlord';

  return {
    playerUnits,
    selectedIds,
    selectedFaction,
    weaponByCharId,
    loadoutByCharId,
    heroChar,
    heroName,
  };
}