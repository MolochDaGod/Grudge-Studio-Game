/**
 * Grudge Bridge — Connects grudgewarlords.com characters to the tactical game.
 *
 * Fetches the player's real characters from api.grudge-studio.com,
 * runs them through the full 8-attribute → 19 secondary stat pipeline,
 * and produces TacticalUnit objects for the battle system.
 *
 * Every character uses the same math as grudgewarlords.com — no shortcuts.
 */

import { getMyCharacters, type GrudgeCharacter } from '@/lib/grudge-api';
import { TacticalUnit } from '@/store/use-game-store';
import {
  type CharacterAttributes,
  type ComputedStats,
  calculateStats,
  getClassStartingAttributes,
  getDefaultAttributes,
  ATTRIBUTE_IDS,
} from '@/lib/attribute-system';
import { CHARACTERS, type GameCharacter } from '@/lib/characters';

// ── Attribute extraction ────────────────────────────────────────────────────

/**
 * Extract CharacterAttributes from a GrudgeCharacter's stats record.
 * The API returns stats as Record<string, number> — we map to our typed struct.
 * Falls back to class defaults if no attributes are allocated yet.
 */
function extractAttributes(char: GrudgeCharacter): CharacterAttributes {
  const s = char.stats ?? {};
  const hasAny = ATTRIBUTE_IDS.some(id => (s[id] ?? 0) > 0);

  if (!hasAny) {
    // No attributes allocated yet — use class starting defaults
    return getClassStartingAttributes(char.class);
  }

  return {
    strength:  s.strength  ?? 0,
    vitality:  s.vitality  ?? 0,
    endurance: s.endurance ?? 0,
    intellect: s.intellect ?? 0,
    wisdom:    s.wisdom    ?? 0,
    dexterity: s.dexterity ?? 0,
    agility:   s.agility   ?? 0,
    tactics:   s.tactics   ?? 0,
  };
}

/**
 * Determine weapon type from class and any equipped weapon data.
 * Maps GrudgeBuilder class → default weapon for the tactical system.
 */
function resolveWeaponType(char: GrudgeCharacter): string {
  // If the character has an explicit weapon type in stats, use it
  const explicitWeapon = char.stats?.weaponType != null ? String(char.stats.weaponType) : undefined;
  if (explicitWeapon) return explicitWeapon.toLowerCase();

  // Otherwise, derive from class
  switch (char.class.toLowerCase()) {
    case 'warrior': return 'sword';
    case 'mage':    return 'fire_staff';
    case 'rogue':   return 'daggers';
    case 'cleric':  return 'war_hammer';
    default:        return 'sword';
  }
}

/**
 * Map class to tactical role name.
 */
function classToRole(classId: string): string {
  switch (classId.toLowerCase()) {
    case 'warrior': return 'Warrior';
    case 'mage':    return 'Mage';
    case 'rogue':   return 'Ranger'; // Rogue maps to Ranger role in tactical
    case 'cleric':  return 'Worg';   // Cleric maps to Worg (support) in tactical
    default:        return 'Warrior';
  }
}

/**
 * Derive tactical movement range from stats.
 * AGI and TAC contribute to movement — more agile characters move further.
 */
function deriveMoveRange(computed: ComputedStats, classId: string): number {
  // Base move by class
  const classMove: Record<string, number> = {
    warrior: 3, mage: 3, rogue: 4, cleric: 3,
  };
  const base = classMove[classId.toLowerCase()] ?? 3;
  // AGI bonus: every 200 stamina above 100 = +1 move (max +2)
  const staminaBonus = Math.min(2, Math.floor((computed.stamina - 100) / 200));
  return base + Math.max(0, staminaBonus);
}

/**
 * Derive tactical attack range from weapon type.
 */
function deriveAttackRange(weaponType: string): number {
  switch (weaponType) {
    case 'bow':
    case 'crossbow':
    case 'gun':
      return 5;
    case 'fire_staff':
    case 'dark_staff':
    case 'wand':
      return 4;
    case 'spear':
      return 2;
    default:
      return 1; // melee
  }
}

/**
 * Derive speed (CT charge rate) from AGI + DEX.
 * Higher = charges faster = acts sooner in turn order.
 */
function deriveSpeed(attrs: CharacterAttributes): number {
  // Base 50, +0.5 per AGI, +0.3 per DEX
  return Math.floor(50 + attrs.agility * 0.5 + attrs.dexterity * 0.3);
}

// ── Equipment bonus extraction ──────────────────────────────────────────────

/**
 * Extract equipment stat bonuses from a character's stats record.
 * GrudgeBuilder stores gear bonuses as equip_health, equip_damage, etc.
 */
function extractEquipmentBonuses(
  stats: Record<string, number>,
): Partial<Record<string, number>> {
  const bonuses: Record<string, number> = {};
  for (const [key, val] of Object.entries(stats)) {
    if (key.startsWith('equip_') && val) {
      const statId = key.replace('equip_', '');
      bonuses[statId] = val;
    }
  }
  return bonuses;
}

// ── Main conversion ─────────────────────────────────────────────────────────

/**
 * Convert a GrudgeCharacter from the API into a TacticalUnit.
 * Runs the full attribute → computed stats pipeline.
 */
export function grudgeCharToTacticalUnit(
  char: GrudgeCharacter,
  isPlayerControlled: boolean,
  position: { x: number; y: number },
): TacticalUnit {
  const attrs = extractAttributes(char);
  const level = char.level ?? 1;
  const equipBonuses = extractEquipmentBonuses(char.stats ?? {});
  const computed = calculateStats(level, attrs, equipBonuses);
  const weaponType = resolveWeaponType(char);

  return {
    id: `grudge_${char.id}`,
    characterId: mapCharacterModelId(char),
    name: char.name,
    race: char.race,
    role: classToRole(char.class),
    hp: computed.health,
    maxHp: computed.maxHealth,
    mana: computed.mana,
    maxMana: computed.maxMana,
    stamina: computed.stamina,
    maxStamina: computed.maxStamina,
    attack: computed.damage,
    defense: computed.defense,
    speed: deriveSpeed(attrs),
    move: deriveMoveRange(computed, char.class),
    range: deriveAttackRange(weaponType),
    weaponType,
    position,
    facing: isPlayerControlled ? 1 : 3, // player faces east, enemies face west
    isPlayerControlled,
    specialAbility: getSpecialAbility(char.class),
    specialAbilityDescription: getSpecialAbilityDesc(char.class),
    specialAbilityCooldown: 0,
    ct: 0,
    faction: char.stats?.faction != null ? String(char.stats.faction) : (isPlayerControlled ? 'Crusade' : 'Legion'),
    rarity: char.stats?.rarity != null ? String(char.stats.rarity) : 'rare',
    statusEffects: [],
    statusDurations: {},
    statusImmunities: {},
    hasMoved: false,
    hasActed: false,
  };
}

/**
 * Map a GrudgeCharacter to a 3D model ID in CHARACTER_CONFIGS.
 * Uses race_class pattern (e.g., "human_warrior", "orc_mage").
 */
function mapCharacterModelId(char: GrudgeCharacter): string {
  const race = char.race.toLowerCase();
  const cls = char.class.toLowerCase();
  // Map to the existing CHARACTER_CONFIGS IDs
  const id = `${race}_${cls}`;
  // Check if this ID exists in our static roster, fallback to generic
  const exists = CHARACTERS.find(c => c.id === id);
  return exists ? id : `${race}_warrior`;
}

function getSpecialAbility(classId: string): string {
  switch (classId.toLowerCase()) {
    case 'warrior': return 'Invincibility';
    case 'mage':    return 'Lightning Chain';
    case 'rogue':   return 'Rain of Arrows';
    case 'cleric':  return 'Guardian\'s Aura';
    default:        return 'Power Strike';
  }
}

function getSpecialAbilityDesc(classId: string): string {
  switch (classId.toLowerCase()) {
    case 'warrior': return 'Become immune to all damage for a short duration.';
    case 'mage':    return 'Chain lightning hitting up to 5 targets.';
    case 'rogue':   return 'Massive AoE ranged barrage hitting all enemies in target zone.';
    case 'cleric':  return '+15% defense to all nearby allies.';
    default:        return 'A powerful strike dealing double damage.';
  }
}

// ── Pre-made hero → TacticalUnit (for PvE enemies) ─────────────────────────

/**
 * Convert a static GameCharacter (the 27 pre-made heroes) into a TacticalUnit
 * using the full attribute system. These serve as PvE dungeon enemies/bosses.
 *
 * Since pre-made heroes don't have explicit 8-attribute allocations,
 * we derive attributes from their flat stats + class defaults, scaled by
 * an effective level to match their power.
 */
export function heroToTacticalUnit(
  hero: GameCharacter,
  dungeonTier: number,
  position: { x: number; y: number },
): TacticalUnit {
  // Derive an effective level from the hero's base HP
  // Base HP 100 at level 0, +10 per level → level ≈ (hp - 100) / 10
  const effectiveLevel = Math.min(20, Math.max(1, Math.floor((hero.hp - 100) / 15)));

  // Build attributes from class defaults, scaled to the effective level
  const classAttrs = getClassStartingAttributes(hero.role.toLowerCase());
  const levelScale = effectiveLevel / 3; // spread points as if leveling
  const attrs: CharacterAttributes = {
    strength:  Math.floor(classAttrs.strength  * levelScale) || classAttrs.strength,
    vitality:  Math.floor(classAttrs.vitality  * levelScale) || classAttrs.vitality,
    endurance: Math.floor(classAttrs.endurance * levelScale) || classAttrs.endurance,
    intellect: Math.floor(classAttrs.intellect * levelScale) || classAttrs.intellect,
    wisdom:    Math.floor(classAttrs.wisdom    * levelScale) || classAttrs.wisdom,
    dexterity: Math.floor(classAttrs.dexterity * levelScale) || classAttrs.dexterity,
    agility:   Math.floor(classAttrs.agility   * levelScale) || classAttrs.agility,
    tactics:   Math.floor(classAttrs.tactics   * levelScale) || classAttrs.tactics,
  };

  // Dungeon tier scaling: +15% stats per tier
  const tierMult = 1 + dungeonTier * 0.15;
  const tierEquipBonus: Partial<Record<string, number>> = {
    health: Math.floor(hero.hp * (tierMult - 1)),
    damage: Math.floor(hero.attack * (tierMult - 1)),
    defense: Math.floor(hero.defense * (tierMult - 1)),
  };

  const computed = calculateStats(effectiveLevel, attrs, tierEquipBonus);

  // Map hero weapon from role
  const weaponType = roleToWeapon(hero.role);

  return {
    id: `pve_${hero.id}`,
    characterId: hero.id,
    name: hero.name,
    race: hero.race,
    role: hero.role,
    hp: computed.health,
    maxHp: computed.maxHealth,
    mana: computed.mana,
    maxMana: computed.maxMana,
    stamina: computed.stamina,
    maxStamina: computed.maxStamina,
    attack: computed.damage,
    defense: computed.defense,
    speed: hero.speed,
    move: hero.role === 'Ranger' ? 4 : hero.role === 'Mage' ? 3 : 3,
    range: hero.role === 'Ranger' ? 5 : hero.role === 'Mage' ? 4 : 1,
    weaponType,
    position,
    facing: 3, // PvE enemies face west (toward player spawn)
    isPlayerControlled: false,
    specialAbility: hero.specialAbility,
    specialAbilityDescription: hero.specialAbilityDescription,
    specialAbilityCooldown: 0,
    ct: 0,
    faction: hero.faction,
    rarity: hero.rarity,
    statusEffects: [],
    statusDurations: {},
    statusImmunities: {},
    hasMoved: false,
    hasActed: false,
  };
}

function roleToWeapon(role: string): string {
  switch (role) {
    case 'Warrior': return 'greatsword';
    case 'Mage':    return 'fire_staff';
    case 'Ranger':  return 'bow';
    case 'Worg':    return 'greataxe';
    default:        return 'sword';
  }
}

// ── Fetch player roster ─────────────────────────────────────────────────────

/**
 * Fetch all the player's characters from grudgewarlords.com and convert
 * them to TacticalUnits ready for squad selection.
 */
export async function fetchPlayerRoster(): Promise<TacticalUnit[]> {
  try {
    const chars = await getMyCharacters();
    return chars.map((c, i) => grudgeCharToTacticalUnit(c, true, { x: 0, y: i }));
  } catch (err) {
    console.warn('[grudge-bridge] Failed to fetch roster, using static fallback:', err);
    // Fallback: use the static 27-hero roster (player-controlled subset)
    return CHARACTERS
      .filter(c => c.faction === 'Crusade')
      .slice(0, 4)
      .map((c, i) => heroToTacticalUnit(c, 0, { x: 0, y: i }));
  }
}
