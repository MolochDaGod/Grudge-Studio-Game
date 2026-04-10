/**
 * Campaign Progression System
 *
 * Flow:
 * 1. New player picks a faction (Crusade, Fabled, or Legion — NOT Pirates)
 * 2. They get 3 starter heroes from that faction (Warrior, Mage, Ranger)
 * 3. Each campaign level they beat unlocks the next hero (Worg class)
 * 4. After beating all faction levels, Pirates faction unlocks
 *
 * Campaign state is stored in the Grudge backend (for authenticated users)
 * or localStorage (for guests).
 */

import { CHARACTERS, type GameCharacter } from './characters';

// ── Faction → Hero ID mapping ────────────────────────────────────────────────

export const FACTION_HERO_IDS: Record<string, string[]> = {
  Crusade: [
    'human_warrior',    // Starter: Warrior
    'human_mage',       // Starter: Mage
    'human_ranger',     // Starter: Ranger
    'human_worg',       // Unlocked: Level 1 clear
    'barbarian_warrior', // Unlocked: Level 2 clear
    'barbarian_mage',   // Unlocked: Level 3 clear
    'barbarian_ranger', // Unlocked: Level 4 clear (all cleared = full roster)
    'barbarian_worg',   // Bonus: beat all 4 levels
  ],
  Fabled: [
    'dwarf_warrior',
    'dwarf_mage',
    'dwarf_ranger',
    'dwarf_worg',       // Level 1
    'elf_warrior',      // Level 2
    'elf_mage',         // Level 3
    'elf_ranger',       // Level 4
    'elf_worg',         // Bonus
  ],
  Legion: [
    'orc_warrior',
    'orc_mage',
    'orc_ranger',
    'orc_worg',         // Level 1
    'undead_warrior',   // Level 2
    'undead_mage',      // Level 3
    'undead_ranger',    // Level 4
    'undead_worg',      // Bonus
  ],
  Pirates: [
    'pirate_king',
    'sky_captain',
    'faith_barrier',
  ],
};

// Campaign levels in order
export const CAMPAIGN_LEVELS = ['ruins', 'orc', 'elven', 'medieval'] as const;

export type FactionId = 'Crusade' | 'Fabled' | 'Legion' | 'Pirates';

// ── Campaign State ──────────────────────────────────────────────────────────

export interface CampaignState {
  /** Chosen faction (null = hasn't picked yet) */
  faction: FactionId | null;
  /** Level IDs that have been cleared */
  clearedLevels: string[];
  /** Whether pirates have been unlocked (clear all 4 campaign levels) */
  piratesUnlocked: boolean;
}

const EMPTY_STATE: CampaignState = {
  faction: null,
  clearedLevels: [],
  piratesUnlocked: false,
};

const STORAGE_KEY = 'grudge-campaign';

// ── Load / Save (localStorage for guests, could be wired to backend for auth) ──

export function loadCampaignState(): CampaignState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_STATE };
    return JSON.parse(raw) as CampaignState;
  } catch {
    return { ...EMPTY_STATE };
  }
}

export function saveCampaignState(state: CampaignState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetCampaign(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Progression Logic ────────────────────────────────────────────────────────

/** How many starter heroes a new player gets */
const STARTER_COUNT = 3;

/**
 * Get the hero IDs available to the player based on their campaign progress.
 * - First 3 heroes of chosen faction are always available (starters)
 * - Each cleared level unlocks the next hero in the faction list
 * - If all 4 levels cleared, pirates unlock (their full roster)
 */
export function getUnlockedHeroIds(state: CampaignState): string[] {
  if (!state.faction) return [];

  const factionHeroes = FACTION_HERO_IDS[state.faction] ?? [];
  const clearedCount = state.clearedLevels.length;

  // Starters + 1 per cleared level
  const unlockCount = Math.min(factionHeroes.length, STARTER_COUNT + clearedCount);
  const unlocked = factionHeroes.slice(0, unlockCount);

  // If pirates unlocked, add their heroes too
  if (state.piratesUnlocked && FACTION_HERO_IDS.Pirates) {
    unlocked.push(...FACTION_HERO_IDS.Pirates);
  }

  return unlocked;
}

/**
 * Get the GameCharacter objects for unlocked heroes.
 */
export function getUnlockedCharacters(state: CampaignState): GameCharacter[] {
  const ids = new Set(getUnlockedHeroIds(state));
  return CHARACTERS.filter(c => ids.has(c.id));
}

/**
 * Get the next level the player should play.
 * Returns null if all levels are cleared.
 */
export function getNextCampaignLevel(state: CampaignState): string | null {
  for (const levelId of CAMPAIGN_LEVELS) {
    if (!state.clearedLevels.includes(levelId)) return levelId;
  }
  return null; // all cleared
}

/**
 * Record a level clear. Returns the updated state.
 * Unlocking logic:
 * - Adds levelId to clearedLevels
 * - If all 4 levels cleared, unlocks pirates
 */
export function clearLevel(state: CampaignState, levelId: string): CampaignState {
  if (state.clearedLevels.includes(levelId)) return state; // already cleared

  const clearedLevels = [...state.clearedLevels, levelId];
  const piratesUnlocked = state.piratesUnlocked ||
    CAMPAIGN_LEVELS.every(l => clearedLevels.includes(l));

  const newState: CampaignState = { ...state, clearedLevels, piratesUnlocked };
  saveCampaignState(newState);
  return newState;
}

/**
 * Choose a faction for the first time. Saves immediately.
 */
export function chooseFaction(factionId: FactionId): CampaignState {
  if (factionId === 'Pirates') {
    throw new Error('Pirates cannot be chosen as a starting faction');
  }
  const state: CampaignState = {
    faction: factionId,
    clearedLevels: [],
    piratesUnlocked: false,
  };
  saveCampaignState(state);
  return state;
}

/**
 * Get the hero that would be unlocked by clearing a specific level.
 * Returns null if the level has already been cleared or no more heroes to unlock.
 */
export function getHeroUnlockedByLevel(state: CampaignState, levelId: string): GameCharacter | null {
  if (!state.faction) return null;
  if (state.clearedLevels.includes(levelId)) return null;

  const factionHeroes = FACTION_HERO_IDS[state.faction] ?? [];
  const nextUnlockIndex = STARTER_COUNT + state.clearedLevels.length;
  if (nextUnlockIndex >= factionHeroes.length) return null;

  const heroId = factionHeroes[nextUnlockIndex];
  return CHARACTERS.find(c => c.id === heroId) ?? null;
}

/**
 * Selectable factions for new players (excludes Pirates).
 */
export const SELECTABLE_FACTIONS: FactionId[] = ['Crusade', 'Fabled', 'Legion'];

/**
 * Check if the player has completed the full campaign.
 */
export function isCampaignComplete(state: CampaignState): boolean {
  return CAMPAIGN_LEVELS.every(l => state.clearedLevels.includes(l));
}
