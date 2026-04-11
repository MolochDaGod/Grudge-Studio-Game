/**
 * Dungeon Definitions — Faction-themed PvE dungeon instances.
 *
 * Each dungeon has:
 * - Multiple floors with escalating difficulty
 * - Encounters per floor drawn from dungeon-encounters.ts
 * - A boss fight on the final floor
 * - A level theme that determines the BattleScene map
 * - Loot tier recommendations and XP rewards
 */

import type { LevelDef } from '@/lib/levels';

// ── Types ───────────────────────────────────────────────────────────────────

export interface DungeonFloor {
  /** Floor number (1-indexed) */
  floor: number;
  /** Encounter IDs for this floor (from ENCOUNTERS in dungeon-encounters.ts) */
  encounterIds: string[];
  /** Tier scaling for this floor's enemies */
  tier: number;
  /** Which level layout to use for this floor's battle */
  levelId: string;
}

export interface DungeonDefinition {
  id: string;
  name: string;
  lore: string;
  faction: 'Crusade' | 'Fabled' | 'Legion' | 'Pirates';
  theme: 'ruins' | 'orc' | 'elven' | 'medieval';
  /** Minimum recommended player level */
  minLevel: number;
  /** Minimum recommended gear tier (T1-T6) */
  recommendedTier: number;
  /** Dungeon icon emoji */
  icon: string;
  /** Floors in order */
  floors: DungeonFloor[];
  /** Total XP for full clear */
  totalXP: number;
  /** Gold reward for full clear */
  goldReward: number;
}

// ── Dungeon Instances ───────────────────────────────────────────────────────

export const DUNGEONS: Record<string, DungeonDefinition> = {

  // ── Tier 1: Graveyard Ruins ────────────────────────────────────────────
  graveyard_depths: {
    id: 'graveyard_depths',
    name: 'Graveyard of the Fallen',
    lore: 'The ancient burial grounds beneath the Crusade capital have been disturbed. Undead forces have taken root among the crumbling tombs, and fallen Crusade soldiers patrol endlessly.',
    faction: 'Crusade',
    theme: 'ruins',
    minLevel: 1,
    recommendedTier: 1,
    icon: '💀',
    floors: [
      { floor: 1, encounterIds: ['crusade_patrol'],  tier: 0, levelId: 'ruins' },
      { floor: 2, encounterIds: ['crusade_patrol'],  tier: 1, levelId: 'ruins' },
      { floor: 3, encounterIds: ['crusade_elite'],   tier: 1, levelId: 'ruins' },
    ],
    totalXP: 500,
    goldReward: 150,
  },

  // ── Tier 2: Fabled Forest ──────────────────────────────────────────────
  silverglade_sanctum: {
    id: 'silverglade_sanctum',
    name: 'Silverglade Sanctum',
    lore: 'Deep in the Fabled forest, the ancient Silverglade Sanctum has been sealed for centuries. The elven and dwarven guardians within have gone mad, attacking any who enter their forgotten halls.',
    faction: 'Fabled',
    theme: 'elven',
    minLevel: 5,
    recommendedTier: 2,
    icon: '🌲',
    floors: [
      { floor: 1, encounterIds: ['fabled_sentinels'], tier: 1, levelId: 'elven' },
      { floor: 2, encounterIds: ['fabled_sentinels'], tier: 2, levelId: 'elven' },
      { floor: 3, encounterIds: ['fabled_council'],   tier: 2, levelId: 'elven' },
      { floor: 4, encounterIds: ['boss_lyra'],        tier: 3, levelId: 'elven' },
    ],
    totalXP: 1200,
    goldReward: 400,
  },

  // ── Tier 3: Orc Stronghold ─────────────────────────────────────────────
  ironjaw_fortress: {
    id: 'ironjaw_fortress',
    name: 'Ironjaw Fortress',
    lore: 'Grommash Ironjaw\'s personal stronghold, carved from volcanic rock and fortified with blood-forged iron. The Legion\'s war machine is at full power here.',
    faction: 'Legion',
    theme: 'orc',
    minLevel: 8,
    recommendedTier: 3,
    icon: '🏰',
    floors: [
      { floor: 1, encounterIds: ['legion_warband'],     tier: 2, levelId: 'orc' },
      { floor: 2, encounterIds: ['legion_warband'],     tier: 2, levelId: 'orc' },
      { floor: 3, encounterIds: ['legion_commanders'],  tier: 3, levelId: 'orc' },
      { floor: 4, encounterIds: ['boss_grommash'],      tier: 3, levelId: 'orc' },
    ],
    totalXP: 2000,
    goldReward: 700,
  },

  // ── Tier 4: Undead Catacombs ───────────────────────────────────────────
  malachar_catacombs: {
    id: 'malachar_catacombs',
    name: 'Malachar\'s Catacombs',
    lore: 'Lord Malachar\'s underground domain stretches beneath the ruins of his fallen kingdom. The dead never truly rest here — they serve eternally.',
    faction: 'Legion',
    theme: 'ruins',
    minLevel: 12,
    recommendedTier: 4,
    icon: '⚰️',
    floors: [
      { floor: 1, encounterIds: ['legion_warband'],     tier: 3, levelId: 'ruins' },
      { floor: 2, encounterIds: ['legion_commanders'],  tier: 3, levelId: 'ruins' },
      { floor: 3, encounterIds: ['legion_commanders'],  tier: 4, levelId: 'ruins' },
      { floor: 4, encounterIds: ['crusade_elite'],      tier: 4, levelId: 'ruins' },
      { floor: 5, encounterIds: ['boss_malachar'],      tier: 4, levelId: 'ruins' },
    ],
    totalXP: 3500,
    goldReward: 1200,
  },

  // ── Tier 5: Pirate Cove ────────────────────────────────────────────────
  the_grudge_harbor: {
    id: 'the_grudge_harbor',
    name: 'The Grudge Harbor',
    lore: 'Racalvin the Pirate King has anchored The Grudge in a hidden cove. His legendary crew guards the greatest plunder in the known world. Only the strongest dare challenge the Pirate King on his own deck.',
    faction: 'Pirates',
    theme: 'medieval',
    minLevel: 15,
    recommendedTier: 5,
    icon: '🏴‍☠️',
    floors: [
      { floor: 1, encounterIds: ['crusade_elite'],     tier: 4, levelId: 'medieval' },
      { floor: 2, encounterIds: ['legion_commanders'], tier: 4, levelId: 'medieval' },
      { floor: 3, encounterIds: ['fabled_council'],    tier: 5, levelId: 'medieval' },
      { floor: 4, encounterIds: ['boss_pirate_king'],  tier: 5, levelId: 'medieval' },
      { floor: 5, encounterIds: ['boss_faithbarrier'], tier: 5, levelId: 'medieval' },
    ],
    totalXP: 6000,
    goldReward: 2500,
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Get all dungeons sorted by recommended tier */
export function getDungeonList(): DungeonDefinition[] {
  return Object.values(DUNGEONS).sort((a, b) => a.recommendedTier - b.recommendedTier);
}

/** Get dungeons filtered by faction */
export function getDungeonsByFaction(faction: string): DungeonDefinition[] {
  return getDungeonList().filter(d => d.faction === faction);
}

/** Check if a player meets the minimum level for a dungeon */
export function canEnterDungeon(dungeon: DungeonDefinition, playerLevel: number): boolean {
  return playerLevel >= dungeon.minLevel;
}

/** Get the total number of encounters in a dungeon */
export function getTotalEncounters(dungeon: DungeonDefinition): number {
  return dungeon.floors.reduce((sum, f) => sum + f.encounterIds.length, 0);
}
