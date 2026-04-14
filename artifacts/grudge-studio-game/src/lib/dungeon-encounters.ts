/**
 * Dungeon Encounters — PvE Enemy Builder
 *
 * Uses the 27 pre-made heroes from characters.ts as PvE enemies.
 * Each encounter specifies which heroes appear, at what tier, with
 * what AI behavior. Stats are computed through the full attribute system.
 */

import { CHARACTERS, type GameCharacter } from '@/lib/characters';
import { heroToTacticalUnit } from '@/lib/grudge-bridge';
import { TacticalUnit } from '@/store/use-game-store';

// ── AI Behavior Types ───────────────────────────────────────────────────────

export type AiBehavior =
  | 'aggressive'  // warrior/worg: charges melee, focuses lowest HP
  | 'kiter'       // ranger: maintains max range, repositions after attacking
  | 'nuker'       // mage: targets clustered enemies, uses AoE skills
  | 'support'     // cleric: heals allies, buffs, only attacks when safe
  | 'berserker'   // gets stronger as HP drops, ignores self-preservation
  | 'boss';       // uses all abilities on cooldown, phases at HP thresholds

export function getAiBehavior(hero: GameCharacter): AiBehavior {
  if (hero.rarity === 'legendary') return 'boss';
  switch (hero.role) {
    case 'Warrior': return 'aggressive';
    case 'Worg':    return 'berserker';
    case 'Mage':    return 'nuker';
    case 'Ranger':  return 'kiter';
    default:        return 'aggressive';
  }
}

// ── Encounter Definition ────────────────────────────────────────────────────

export interface EncounterSlot {
  heroId: string;
  /** Override tier scaling (defaults to dungeon floor tier) */
  tierOverride?: number;
  /** Override AI behavior */
  aiOverride?: AiBehavior;
}

export interface Encounter {
  id: string;
  name: string;
  description: string;
  /** Enemy slots — which heroes appear and in what configuration */
  enemies: EncounterSlot[];
  /** Is this a boss encounter? (bigger rewards, cinematic intro) */
  isBoss: boolean;
  /** Loot tier — determines quality of drops (1-6 matching crafting tiers) */
  lootTier: number;
  /** XP reward multiplier (1.0 = normal) */
  xpMultiplier: number;
}

// ── Build encounter units ───────────────────────────────────────────────────

/**
 * Generate TacticalUnits for an encounter at a given dungeon tier.
 * Positions are spread across the enemy spawn zone.
 */
export function buildEncounterUnits(
  encounter: Encounter,
  dungeonTier: number,
  spawnZone: { xMin: number; xMax: number; yMin: number; yMax: number },
): TacticalUnit[] {
  const units: TacticalUnit[] = [];
  const count = encounter.enemies.length;

  for (let i = 0; i < count; i++) {
    const slot = encounter.enemies[i];
    const hero = CHARACTERS.find(c => c.id === slot.heroId);
    if (!hero) continue;

    const tier = slot.tierOverride ?? dungeonTier;

    // Spread enemies across the spawn zone
    const xRange = spawnZone.xMax - spawnZone.xMin;
    const yRange = spawnZone.yMax - spawnZone.yMin;
    const x = spawnZone.xMin + Math.floor((i / Math.max(1, count - 1)) * xRange);
    const y = spawnZone.yMin + Math.floor((i % 3) * (yRange / 3)) + 1;

    const unit = heroToTacticalUnit(hero, tier, { x, y });
    // Tag with encounter metadata
    (unit as any)._aiBehavior = slot.aiOverride ?? getAiBehavior(hero);
    (unit as any)._encounterId = encounter.id;
    units.push(unit);
  }

  return units;
}

// ── Pre-built encounter templates ───────────────────────────────────────────

export const ENCOUNTERS: Record<string, Encounter> = {
  // ── Crusade themed ────────────────────────────────────────────────────
  crusade_patrol: {
    id: 'crusade_patrol',
    name: 'Crusade Patrol',
    description: 'A patrol of Crusade soldiers blocks the path.',
    enemies: [
      { heroId: 'human_warrior' },
      { heroId: 'human_ranger' },
      { heroId: 'human_mage' },
    ],
    isBoss: false, lootTier: 1, xpMultiplier: 1.0,
  },
  crusade_elite: {
    id: 'crusade_elite',
    name: 'Crusade Elite Guard',
    description: 'The finest warriors of the Crusade stand against you.',
    enemies: [
      { heroId: 'human_warrior' },
      { heroId: 'barbarian_warrior' },
      { heroId: 'barbarian_worg' },
      { heroId: 'human_mage' },
    ],
    isBoss: false, lootTier: 2, xpMultiplier: 1.5,
  },

  // ── Fabled themed ─────────────────────────────────────────────────────
  fabled_sentinels: {
    id: 'fabled_sentinels',
    name: 'Fabled Sentinels',
    description: 'Ancient guardians of the Fabled forest awaken.',
    enemies: [
      { heroId: 'elf_warrior' },
      { heroId: 'elf_ranger' },
      { heroId: 'dwarf_warrior' },
    ],
    isBoss: false, lootTier: 2, xpMultiplier: 1.0,
  },
  fabled_council: {
    id: 'fabled_council',
    name: 'Fabled War Council',
    description: 'The combined might of Elf and Dwarf leadership.',
    enemies: [
      { heroId: 'elf_mage' },
      { heroId: 'elf_worg' },
      { heroId: 'dwarf_mage' },
      { heroId: 'dwarf_worg' },
    ],
    isBoss: false, lootTier: 3, xpMultiplier: 1.5,
  },

  // ── Legion themed ─────────────────────────────────────────────────────
  legion_warband: {
    id: 'legion_warband',
    name: 'Legion Warband',
    description: 'Orc raiders and undead soldiers march as one.',
    enemies: [
      { heroId: 'orc_warrior' },
      { heroId: 'orc_ranger' },
      { heroId: 'undead_warrior' },
    ],
    isBoss: false, lootTier: 2, xpMultiplier: 1.0,
  },
  legion_commanders: {
    id: 'legion_commanders',
    name: 'Legion Commanders',
    description: 'The dark generals of the Legion make their stand.',
    enemies: [
      { heroId: 'orc_warrior' },
      { heroId: 'orc_worg' },
      { heroId: 'undead_mage' },
      { heroId: 'undead_worg' },
    ],
    isBoss: false, lootTier: 3, xpMultiplier: 1.5,
  },

  // ── Boss encounters ───────────────────────────────────────────────────
  boss_pirate_king: {
    id: 'boss_pirate_king',
    name: 'Racalvin the Pirate King',
    description: 'The Scourge of the Seven Seas challenges you aboard The Grudge.',
    enemies: [
      { heroId: 'pirate_king', aiOverride: 'boss' },
      { heroId: 'sky_captain' },
    ],
    isBoss: true, lootTier: 5, xpMultiplier: 3.0,
  },
  boss_faithbarrier: {
    id: 'boss_faithbarrier',
    name: 'Scourge FaithBarrier',
    description: 'The oldest blade stands at the edge of Creation and End.',
    enemies: [
      { heroId: 'faith_barrier', aiOverride: 'boss' },
      { heroId: 'pirate_king' },
      { heroId: 'sky_captain' },
    ],
    isBoss: true, lootTier: 6, xpMultiplier: 5.0,
  },
  boss_grommash: {
    id: 'boss_grommash',
    name: 'Grommash Ironjaw',
    description: 'Born during a blood eclipse, destined for war.',
    enemies: [
      { heroId: 'orc_warrior', aiOverride: 'boss', tierOverride: 4 },
      { heroId: 'orc_mage' },
    ],
    isBoss: true, lootTier: 4, xpMultiplier: 2.5,
  },
  boss_malachar: {
    id: 'boss_malachar',
    name: 'Lord Malachar',
    description: 'The undead lord who ruled a kingdom that no longer exists.',
    enemies: [
      { heroId: 'undead_warrior', aiOverride: 'boss', tierOverride: 4 },
      { heroId: 'undead_mage' },
      { heroId: 'undead_ranger' },
    ],
    isBoss: true, lootTier: 4, xpMultiplier: 2.5,
  },
  boss_lyra: {
    id: 'boss_lyra',
    name: 'Lyra Stormweaver',
    description: 'Four hundred years of arcane study unleashed.',
    enemies: [
      { heroId: 'elf_mage', aiOverride: 'boss', tierOverride: 5 },
      { heroId: 'elf_ranger' },
    ],
    isBoss: true, lootTier: 5, xpMultiplier: 3.0,
  },
};
