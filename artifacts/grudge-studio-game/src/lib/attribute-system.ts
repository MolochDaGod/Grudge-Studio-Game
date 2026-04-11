/**
 * GRUDGE WARLORDS — Complete Attributes & Stats System
 *
 * Direct port of shared/attributeSystem.ts from GrudgeBuilder.
 * This is THE single source of truth for all combat math across every
 * game mode: tactical, MOBA, dungeon, island, PvP — all use this.
 *
 * 8 Core Attributes → 19 Secondary Stats → Full Combat Resolution
 * Includes diminishing returns after 25 points and stat caps.
 */

// ── Attribute IDs ───────────────────────────────────────────────────────────

export const ATTRIBUTE_IDS = [
  'strength', 'vitality', 'endurance', 'intellect',
  'wisdom', 'dexterity', 'agility', 'tactics',
] as const;

export type AttributeId = typeof ATTRIBUTE_IDS[number];

export interface CharacterAttributes {
  strength: number;
  vitality: number;
  endurance: number;
  intellect: number;
  wisdom: number;
  dexterity: number;
  agility: number;
  tactics: number;
}

// ── Secondary Stat IDs ──────────────────────────────────────────────────────

export const SECONDARY_STAT_IDS = [
  'health', 'mana', 'stamina',
  'damage', 'defense',
  'blockChance', 'criticalChance', 'accuracy', 'resistance',
  'blockFactor', 'criticalFactor',
  'drainHealthFactor', 'drainManaFactor', 'reflectFactor',
  'absorbHealthFactor', 'absorbManaFactor',
  'defenseBreakFactor', 'blockBreakFactor', 'critEvasion',
] as const;

export type SecondaryStatId = typeof SECONDARY_STAT_IDS[number];

// ── Stat Effect (how 1 effective attribute point changes a secondary stat) ──

interface StatEffect {
  stat: SecondaryStatId;
  flat: number;
  percent: number;
}

// ── Stat Caps ───────────────────────────────────────────────────────────────

export const STAT_CAPS: Record<SecondaryStatId, { min: number; max: number }> = {
  health:             { min: 1,   max: 999999 },
  mana:               { min: 0,   max: 999999 },
  stamina:            { min: 0,   max: 999 },
  damage:             { min: 1,   max: 99999 },
  defense:            { min: 0,   max: 9999 },
  blockChance:        { min: 0,   max: 0.75 },
  criticalChance:     { min: 0,   max: 0.75 },
  accuracy:           { min: 0,   max: 0.95 },
  resistance:         { min: 0,   max: 0.95 },
  blockFactor:        { min: 0,   max: 0.90 },
  criticalFactor:     { min: 1,   max: 3.0 },
  drainHealthFactor:  { min: 0,   max: 0.50 },
  drainManaFactor:    { min: 0,   max: 0.50 },
  reflectFactor:      { min: 0,   max: 0.50 },
  absorbHealthFactor: { min: 0,   max: 0.50 },
  absorbManaFactor:   { min: 0,   max: 0.50 },
  defenseBreakFactor: { min: 0,   max: 0.75 },
  blockBreakFactor:   { min: 0,   max: 0.75 },
  critEvasion:        { min: 0,   max: 0.50 },
};

// ── Diminishing Returns ─────────────────────────────────────────────────────

const DR_THRESHOLD = 25;
const DR_TIER1 = 0.5;   // 50% efficiency for points 26-50
const DR_TIER2 = 0.25;  // 25% efficiency for points 51+

export function getEffectivePoints(actualPoints: number): number {
  if (actualPoints <= DR_THRESHOLD) return actualPoints;
  let effective = DR_THRESHOLD;
  if (actualPoints <= 50) {
    effective += (actualPoints - DR_THRESHOLD) * DR_TIER1;
  } else {
    effective += 25 * DR_TIER1;
    effective += (actualPoints - 50) * DR_TIER2;
  }
  return effective;
}

// ── The 8 Attributes — Effects Tables ───────────────────────────────────────

const ATTR_EFFECTS: Record<AttributeId, StatEffect[]> = {
  strength: [
    { stat: 'health',         flat: 26,     percent: 0.008 },
    { stat: 'damage',         flat: 3,      percent: 0.02 },
    { stat: 'defense',        flat: 12,     percent: 0.015 },
    { stat: 'blockChance',    flat: 0.005,  percent: 0.05 },
    { stat: 'criticalChance', flat: 0.0032, percent: 0.07 },
    { stat: 'blockFactor',    flat: 0.0085, percent: 0.263 },
    { stat: 'criticalFactor', flat: 0.011,  percent: 0.015 },
  ],
  vitality: [
    { stat: 'health',      flat: 25,    percent: 0.005 },
    { stat: 'mana',        flat: 2,     percent: 0.002 },
    { stat: 'stamina',     flat: 5,     percent: 0.001 },
    { stat: 'damage',      flat: 2,     percent: 0.001 },
    { stat: 'defense',     flat: 12,    percent: 0 },
    { stat: 'blockFactor', flat: 0.003, percent: 0.17 },
    { stat: 'resistance',  flat: 0.005, percent: 0 },
  ],
  endurance: [
    { stat: 'health',      flat: 10,     percent: 0.001 },
    { stat: 'stamina',     flat: 1,      percent: 0.003 },
    { stat: 'defense',     flat: 12,     percent: 0.12 },
    { stat: 'blockChance', flat: 0.0011, percent: 0.735 },
    { stat: 'blockFactor', flat: 0.0027, percent: 0 },
    { stat: 'resistance',  flat: 0.0046, percent: 0 },
  ],
  intellect: [
    { stat: 'mana',           flat: 5,      percent: 0.05 },
    { stat: 'damage',         flat: 4,      percent: 0.025 },
    { stat: 'defense',        flat: 2,      percent: 0 },
    { stat: 'criticalChance', flat: 0.0023, percent: 0.001 },
    { stat: 'accuracy',       flat: 0.0012, percent: 0.338 },
    { stat: 'resistance',     flat: 0.0038, percent: 0.17 },
  ],
  wisdom: [
    { stat: 'health',         flat: 10,    percent: 0 },
    { stat: 'mana',           flat: 20,    percent: 0.03 },
    { stat: 'damage',         flat: 2,     percent: 0.015 },
    { stat: 'defense',        flat: 2,     percent: 0 },
    { stat: 'criticalChance', flat: 0.005, percent: 0.0015 },
    { stat: 'resistance',     flat: 0.005, percent: 0 },
  ],
  dexterity: [
    { stat: 'damage',         flat: 3,      percent: 0.018 },
    { stat: 'defense',        flat: 10,     percent: 0.01 },
    { stat: 'blockChance',    flat: 0.0041, percent: 0.01 },
    { stat: 'criticalChance', flat: 0.005,  percent: 0.012 },
    { stat: 'accuracy',       flat: 0.007,  percent: 0.015 },
  ],
  agility: [
    { stat: 'health',         flat: 2,      percent: 0.006 },
    { stat: 'stamina',        flat: 5,      percent: 0.005 },
    { stat: 'damage',         flat: 3,      percent: 0.016 },
    { stat: 'defense',        flat: 5,      percent: 0.008 },
    { stat: 'criticalChance', flat: 0.0042, percent: 0.01 },
  ],
  tactics: [
    { stat: 'health',      flat: 10,     percent: 0.084 },
    { stat: 'mana',        flat: 0,      percent: 0.082 },
    { stat: 'stamina',     flat: 1,      percent: 0 },
    { stat: 'damage',      flat: 3,      percent: 0.002 },
    { stat: 'defense',     flat: 5,      percent: 0.005 },
    { stat: 'blockChance', flat: 0.0027, percent: 0.008 },
  ],
};

// ── Base Stats by Level ─────────────────────────────────────────────────────

export const POINTS_PER_LEVEL = 7;
export const STARTING_POINTS = 20;
export const MAX_LEVEL = 20;

export function getTotalAttributePoints(level: number): number {
  return STARTING_POINTS + (level * POINTS_PER_LEVEL);
}

interface BaseStats {
  health: number;
  mana: number;
  stamina: number;
  damage: number;
}

function getBaseStatsByLevel(level: number): BaseStats {
  return {
    health: 100 + (level * 10),
    mana: 50 + (level * 5),
    stamina: 100,
    damage: 10 + (level * 2),
  };
}

// ── Computed Stats (full 19-stat output) ────────────────────────────────────

export interface ComputedStats {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  damage: number;
  defense: number;
  blockChance: number;
  criticalChance: number;
  accuracy: number;
  resistance: number;
  blockFactor: number;
  criticalFactor: number;
  drainHealthFactor: number;
  drainManaFactor: number;
  reflectFactor: number;
  absorbHealthFactor: number;
  absorbManaFactor: number;
  defenseBreakFactor: number;
  blockBreakFactor: number;
  critEvasion: number;
}

/**
 * Calculate ALL 19 secondary stats from the 8 core attributes.
 * This is the single function used everywhere in every game mode.
 */
export function calculateStats(
  level: number,
  attributes: CharacterAttributes,
  equipmentBonuses?: Partial<Record<SecondaryStatId, number>>,
): ComputedStats {
  const base = getBaseStatsByLevel(level);

  // Init with defaults
  const stats: Record<SecondaryStatId, number> = {
    health: base.health,
    mana: base.mana,
    stamina: base.stamina,
    damage: base.damage,
    defense: 0,
    blockChance: 0,
    criticalChance: 0.05,
    accuracy: 0.5,
    resistance: 0,
    blockFactor: 0.3,
    criticalFactor: 1.5,
    drainHealthFactor: 0,
    drainManaFactor: 0,
    reflectFactor: 0,
    absorbHealthFactor: 0,
    absorbManaFactor: 0,
    defenseBreakFactor: 0,
    blockBreakFactor: 0,
    critEvasion: 0,
  };

  const initStats = { ...stats };

  // Apply each attribute's effects
  for (const attrId of ATTRIBUTE_IDS) {
    const rawPoints = attributes[attrId] || 0;
    const eff = getEffectivePoints(rawPoints);
    for (const fx of ATTR_EFFECTS[attrId]) {
      const baseVal = getBaseValueForStat(fx.stat, base, initStats);
      stats[fx.stat] += (fx.flat * eff) + (baseVal * fx.percent * eff);
    }
  }

  // Equipment bonuses
  if (equipmentBonuses) {
    for (const [id, bonus] of Object.entries(equipmentBonuses)) {
      if (bonus && id in stats) stats[id as SecondaryStatId] += bonus;
    }
  }

  // Clamp to caps
  for (const id of SECONDARY_STAT_IDS) {
    const cap = STAT_CAPS[id];
    stats[id] = Math.max(cap.min, Math.min(cap.max, stats[id]));
  }

  return {
    health: Math.floor(stats.health),
    maxHealth: Math.floor(stats.health),
    mana: Math.floor(stats.mana),
    maxMana: Math.floor(stats.mana),
    stamina: Math.floor(stats.stamina),
    maxStamina: Math.floor(stats.stamina),
    damage: Math.floor(stats.damage),
    defense: Math.floor(stats.defense),
    blockChance: stats.blockChance,
    criticalChance: stats.criticalChance,
    accuracy: stats.accuracy,
    resistance: stats.resistance,
    blockFactor: stats.blockFactor,
    criticalFactor: stats.criticalFactor,
    drainHealthFactor: stats.drainHealthFactor,
    drainManaFactor: stats.drainManaFactor,
    reflectFactor: stats.reflectFactor,
    absorbHealthFactor: stats.absorbHealthFactor,
    absorbManaFactor: stats.absorbManaFactor,
    defenseBreakFactor: stats.defenseBreakFactor,
    blockBreakFactor: stats.blockBreakFactor,
    critEvasion: stats.critEvasion,
  };
}

function getBaseValueForStat(
  statId: SecondaryStatId,
  base: BaseStats,
  initStats: Record<SecondaryStatId, number>,
): number {
  switch (statId) {
    case 'health': return base.health;
    case 'mana': return base.mana;
    case 'stamina': return base.stamina;
    case 'damage': return base.damage;
    default: return initStats[statId] > 0 ? initStats[statId] : 1;
  }
}

// ── Combat Resolution ───────────────────────────────────────────────────────

export interface CombatResult {
  rawDamage: number;
  mitigatedDamage: number;
  finalDamage: number;
  blocked: boolean;
  critical: boolean;
  healthDrained: number;
  manaDrained: number;
  reflected: number;
  healthAbsorbed: number;
  manaAbsorbed: number;
}

/** Defense mitigation: DamageTaken = Incoming × (100 - √Defense) / 100 */
export function calculateMitigation(incoming: number, defense: number): number {
  const sqrtDef = Math.sqrt(Math.max(0, defense));
  const reduction = Math.min(sqrtDef, 90);
  return incoming * (100 - reduction) / 100;
}

/**
 * Full combat damage calculation with all 19 stats.
 * Used by every game mode — tactical, MOBA, dungeon, PvP.
 */
export function calculateCombatDamage(
  attacker: ComputedStats,
  defender: ComputedStats,
  randomVariance = true,
): CombatResult {
  let damage = attacker.damage;

  // 1. Random variance ±25%
  if (randomVariance) {
    damage = Math.floor(damage * (0.75 + Math.random() * 0.5));
  }
  const rawDamage = damage;

  // 2. Defense break
  let effectiveDefense = defender.defense;
  if (attacker.defenseBreakFactor > 0) {
    effectiveDefense *= (1 - attacker.defenseBreakFactor);
  }

  // 3. Mitigation
  const mitigatedDamage = calculateMitigation(damage, effectiveDefense);
  damage = mitigatedDamage;

  // 4. Block
  let blocked = false;
  let effBlock = Math.max(0, Math.min(0.75, defender.blockChance - attacker.blockBreakFactor));
  if (Math.random() < effBlock) {
    blocked = true;
    damage *= (1 - defender.blockFactor);
  }

  // 5. Critical (only if not blocked)
  let critical = false;
  if (!blocked) {
    let effCrit = Math.max(0, Math.min(0.75, attacker.criticalChance - defender.critEvasion));
    if (Math.random() < effCrit) {
      critical = true;
      damage *= attacker.criticalFactor;
    }
  }

  const finalDamage = Math.max(1, Math.floor(damage));

  // 6. Drain
  const healthDrained = Math.floor(finalDamage * attacker.drainHealthFactor);
  const manaDrained = Math.floor(finalDamage * attacker.drainManaFactor);

  // 7. Reflect (not on blocked)
  const reflected = blocked ? 0 : Math.floor(finalDamage * defender.reflectFactor);

  // 8. Absorb
  const healthAbsorbed = Math.floor(finalDamage * defender.absorbHealthFactor);
  const manaAbsorbed = Math.floor(finalDamage * defender.absorbManaFactor);

  return {
    rawDamage,
    mitigatedDamage: Math.floor(mitigatedDamage),
    finalDamage,
    blocked,
    critical,
    healthDrained,
    manaDrained,
    reflected,
    healthAbsorbed,
    manaAbsorbed,
  };
}

/** Check if debuff lands (accuracy vs resistance) */
export function checkDebuffSuccess(attackerAccuracy: number, defenderResistance: number): boolean {
  const chance = Math.max(0.05, Math.min(0.95, attackerAccuracy - defenderResistance));
  return Math.random() < chance;
}

// ── Class Starting Attributes ───────────────────────────────────────────────

export function getClassStartingAttributes(classId: string): CharacterAttributes {
  switch (classId.toLowerCase()) {
    case 'warrior':
      return { strength: 10, vitality: 5, endurance: 5, intellect: 0, wisdom: 0, dexterity: 0, agility: 0, tactics: 0 };
    case 'mage':
      return { strength: 0, vitality: 0, endurance: 0, intellect: 10, wisdom: 10, dexterity: 0, agility: 0, tactics: 0 };
    case 'rogue':
      return { strength: 6, vitality: 0, endurance: 0, intellect: 0, wisdom: 0, dexterity: 7, agility: 7, tactics: 0 };
    case 'cleric':
      return { strength: 0, vitality: 5, endurance: 0, intellect: 5, wisdom: 10, dexterity: 0, agility: 0, tactics: 0 };
    default:
      return { strength: 5, vitality: 5, endurance: 0, intellect: 0, wisdom: 0, dexterity: 5, agility: 0, tactics: 5 };
  }
}

export function getDefaultAttributes(): CharacterAttributes {
  return { strength: 0, vitality: 0, endurance: 0, intellect: 0, wisdom: 0, dexterity: 0, agility: 0, tactics: 0 };
}

export function getUnspentPoints(level: number, attributes: CharacterAttributes): number {
  const total = getTotalAttributePoints(level);
  const spent = Object.values(attributes).reduce((s, v) => s + v, 0);
  return total - spent;
}
