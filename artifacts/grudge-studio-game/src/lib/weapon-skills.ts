export type SkillSlot = 1 | 2 | 3 | 4 | 5;
export type SkillTag = 'damage' | 'heal' | 'buff' | 'debuff' | 'aoe' | 'utility' | 'move' | 'attack' | 'ultimate';

/**
 * attackType controls how the attacker reaches the target:
 * - 'normal' (default): standard melee/ranged, requires line-of-sight
 * - 'jump': leaps over obstacles, ignores LOS check (but still range-limited)
 * - 'dash': rushes to the target; range is extended by dashBonus tiles
 */
export type AttackType = 'normal' | 'jump' | 'dash';

/**
 * mobilityType controls special movement skills (non-damage, slot 3 utility):
 * - 'team_jump': Bounce off an adjacent ally to land at target tile (Mario+Rabbids style)
 * - 'flight': Arc over obstacles to reach target tile
 * - 'teleport': Instant blink to target tile, ignoring all obstacles/LOS
 */
export type MobilityType = 'team_jump' | 'flight' | 'teleport';

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  slot: SkillSlot;
  tier: 'T1' | 'T2' | 'T3';
  cooldown: number;
  range: number;
  tags: SkillTag[];
  stats: string[];
  dmgMultiplier?: number;
  healMultiplier?: number;
  armorPen?: number;
  moveBonus?: number;
  aoe?: boolean;
  selfTarget?: boolean;
  /** Applies a status effect to the target on hit */
  applyStatus?: 'stunned' | 'poisoned' | 'frozen';
  /** How many turns the status lasts */
  statusDuration?: number;
  /** How this skill reaches its target. Default: 'normal'. */
  attackType?: AttackType;
  /** Extra tiles added to range when attackType is 'dash'. Default 0. */
  dashBonus?: number;
  /**
   * When true, a dash-attack visually lunges to the target then returns to the
   * original tile. The unit's game-state position does NOT change.
   * Creates risk/reward: you get extra range but stay exposed where you started.
   */
  returnsToOrigin?: boolean;
  /**
   * Mobility skill type — relocates the unit to a target tile as the skill effect.
   * Uses the 'move' tag. The skill targets an empty tile, not an enemy.
   */
  mobilityType?: MobilityType;
  /**
   * When true, the skill ignores obstacles for LOS/pathfinding (flight, teleport).
   */
  ignoresObstacles?: boolean;
  /**
   * Target type determines what tiles light up and what can be clicked:
   * - 'enemy': only enemy units (default for attack skills)
   * - 'friendly': only allied units (heals, buffs)
   * - 'self': self-only (selfTarget buffs)
   * - 'empty': empty tiles only (mobility skills)
   * - 'any': any tile with a unit
   */
  targetType?: 'enemy' | 'friendly' | 'self' | 'empty' | 'any';
  /**
   * When true, this skill is a passive effect — always active, cannot be clicked.
   * Shown with a dashed border and "PASSIVE" label in the HUD.
   */
  isPassive?: boolean;
}

export interface WeaponSkillTree {
  weaponType: string;
  displayName: string;
  icon: string;
  description: string;
  slots: {
    slot: SkillSlot;
    label: string;
    sublabel: string;
    skills: Skill[];
  }[];
}

export const WEAPON_SKILL_TREES: Record<string, WeaponSkillTree> = {

  greataxe: {
    weaponType: 'greataxe',
    displayName: 'Greataxe',
    icon: '🪓',
    description: 'Brutal two-handed weapon. High damage, wide swings. Favored by berserkers and warriors who trade finesse for raw destruction.',
    slots: [
      {
        slot: 1,
        label: 'Basic Attack',
        sublabel: 'Primary strike options',
        skills: [
          {
            id: 'axe_cleave', name: 'Cleave', icon: '🪓',
            description: 'Wide horizontal swing that cleaves through armor.',
            slot: 1, tier: 'T1', cooldown: 0, range: 1,
            tags: ['attack', 'damage'],
            stats: ['100% DMG', 'cleave'],
            dmgMultiplier: 1.0
          },
          {
            id: 'axe_rend', name: 'Rend', icon: '⚔️',
            description: 'Savage rending strike that shreds armor. +15% armor penetration.',
            slot: 1, tier: 'T1', cooldown: 0, range: 1,
            tags: ['attack', 'damage'],
            stats: ['90% DMG', '+15% armor pen'],
            dmgMultiplier: 0.9, armorPen: 15
          },
          {
            id: 'axe_overhead', name: 'Overhead Slam', icon: '💥',
            description: 'Overhead downward slam. High damage, low speed.',
            slot: 1, tier: 'T1', cooldown: 0, range: 1,
            tags: ['attack', 'damage'],
            stats: ['130% DMG', 'slow'],
            dmgMultiplier: 1.3
          },
        ]
      },
      {
        slot: 2,
        label: 'Core Skill',
        sublabel: 'Core offensive abilities',
        skills: [
          {
            id: 'axe_blood_frenzy', name: 'Blood Frenzy', icon: '🔥',
            description: 'Wounds fuel your rage. Deal extra damage for each missing 10% HP.',
            slot: 2, tier: 'T2', cooldown: 2, range: 1,
            tags: ['attack', 'damage', 'buff'],
            stats: ['120% DMG', '+10% per 10% missing HP'],
            dmgMultiplier: 1.2
          },
          {
            id: 'axe_berserker_fury', name: "Berserker's Fury", icon: '😤',
            description: 'Enter a brief fury. Next two attacks deal extra damage.',
            slot: 2, tier: 'T2', cooldown: 3, range: 1,
            tags: ['attack', 'damage', 'buff'],
            stats: ['140% DMG', 'fury stack'],
            dmgMultiplier: 1.4
          },
        ]
      },
      {
        slot: 3,
        label: 'Utility',
        sublabel: 'Defensive & movement skills',
        skills: [
          {
            id: 'axe_war_cry', name: 'War Cry', icon: '📢',
            description: 'Bellow a war cry to intimidate enemies and heal yourself.',
            slot: 3, tier: 'T2', cooldown: 3, range: 0,
            tags: ['utility', 'heal', 'buff'],
            stats: ['Heal 25% HP', 'intimidate'],
            healMultiplier: 0.25, selfTarget: true
          },
          {
            id: 'axe_charge', name: 'Savage Charge', icon: '🏃',
            description: 'Charge forward, moving +2 extra tiles.',
            slot: 3, tier: 'T1', cooldown: 2, range: 0,
            tags: ['utility', 'move'],
            stats: ['+2 move range'],
            moveBonus: 2, selfTarget: true
          },
        ]
      },
      {
        slot: 4,
        label: 'Special',
        sublabel: 'Weapon-specific ability',
        skills: [
          {
            id: 'axe_whirlwind', name: 'Whirlwind', icon: '🌀',
            description: 'Spin in place, striking all adjacent enemies.',
            slot: 4, tier: 'T3', cooldown: 4, range: 1,
            tags: ['attack', 'damage', 'aoe'],
            stats: ['150% DMG', 'hits all adjacent'],
            dmgMultiplier: 1.5, aoe: true
          },
          {
            id: 'axe_skull_crush', name: 'Skull Crush', icon: '💀',
            description: 'Devastating crushing blow to the skull. Stuns for 1 turn.',
            slot: 4, tier: 'T3', cooldown: 3, range: 1,
            tags: ['attack', 'damage', 'debuff'],
            stats: ['180% DMG', 'STUN 1 turn'],
            dmgMultiplier: 1.8, applyStatus: 'stunned', statusDuration: 1
          },
        ]
      },
      {
        slot: 5,
        label: 'Ultimate',
        sublabel: 'Once-per-battle supreme power',
        skills: [
          {
            id: 'axe_berserker_rage', name: "Berserker's Rage", icon: '🩸',
            description: 'Enter an uncontrollable rage. Devastating AoE strike that ignores all armor.',
            slot: 5, tier: 'T3', cooldown: 999, range: 1,
            tags: ['attack', 'damage', 'aoe', 'ultimate'],
            stats: ['220% DMG', 'AoE', 'ignores armor'],
            dmgMultiplier: 2.2, aoe: true, armorPen: 100
          },
          {
            id: 'axe_frost_giant_wrath', name: "Frost Giant's Wrath", icon: '❄️',
            description: 'Channel the power of frost giants. Frozen shockwave hits all enemies.',
            slot: 5, tier: 'T3', cooldown: 999, range: 3,
            tags: ['attack', 'damage', 'aoe', 'ultimate'],
            stats: ['200% DMG', 'AoE', 'FREEZE 2 turns'],
            dmgMultiplier: 2.0, aoe: true, applyStatus: 'frozen', statusDuration: 2
          },
        ]
      },
    ]
  },

  fire_staff: {
    weaponType: 'fire_staff',
    displayName: 'Fire Staff',
    icon: '🔥',
    description: 'A weapon imbued with volcanic fury. Ranged magical attacks and explosive AoE fire spells.',
    slots: [
      {
        slot: 1,
        label: 'Basic Attack',
        sublabel: 'Primary fire spell',
        skills: [
          {
            id: 'fire_bolt', name: 'Fire Bolt', icon: '🔥',
            description: 'Launch a bolt of fire at an enemy.',
            slot: 1, tier: 'T1', cooldown: 0, range: 5,
            tags: ['attack', 'damage'],
            stats: ['100% DMG', 'fire', 'range 5'],
            dmgMultiplier: 1.0
          },
          {
            id: 'magma_spit', name: 'Magma Spit', icon: '🌋',
            description: 'Spit molten rock. Burns through armor.',
            slot: 1, tier: 'T1', cooldown: 0, range: 5,
            tags: ['attack', 'damage'],
            stats: ['85% DMG', '+20% armor pen', 'fire'],
            dmgMultiplier: 0.85, armorPen: 20
          },
          {
            id: 'cinder_blast', name: 'Cinder Blast', icon: '💨',
            description: 'Wide cinder spray hitting a larger area.',
            slot: 1, tier: 'T1', cooldown: 0, range: 4,
            tags: ['attack', 'damage', 'aoe'],
            stats: ['80% DMG', 'wide spray', 'range 4'],
            dmgMultiplier: 0.8
          },
        ]
      },
      {
        slot: 2,
        label: 'Core Skill',
        sublabel: 'Core fire abilities',
        skills: [
          {
            id: 'lava_touch', name: 'Lava Touch', icon: '✋',
            description: 'Melee reach of living magma. Burns on contact.',
            slot: 2, tier: 'T2', cooldown: 2, range: 1,
            tags: ['attack', 'damage'],
            stats: ['130% DMG', 'fire', 'melee'],
            dmgMultiplier: 1.3
          },
          {
            id: 'flame_wave', name: 'Flame Wave', icon: '🌊',
            description: 'Send a wave of fire in a line hitting multiple targets.',
            slot: 2, tier: 'T2', cooldown: 3, range: 3,
            tags: ['attack', 'damage', 'aoe'],
            stats: ['110% DMG', 'line AoE'],
            dmgMultiplier: 1.1, aoe: true
          },
        ]
      },
      {
        slot: 3,
        label: 'Utility',
        sublabel: 'Defense & positioning',
        skills: [
          {
            id: 'volcanic_armor', name: 'Volcanic Armor', icon: '🛡️',
            description: 'Coat yourself in hardened volcanic rock for protection.',
            slot: 3, tier: 'T2', cooldown: 3, range: 0,
            tags: ['utility', 'buff'],
            stats: ['+50% DEF', '2 turns', 'fire shield'],
            selfTarget: true
          },
          {
            id: 'fire_dash', name: 'Fire Dash', icon: '💨',
            description: 'Propel yourself in a burst of flame.',
            slot: 3, tier: 'T1', cooldown: 2, range: 0,
            tags: ['utility', 'move'],
            stats: ['+2 move range', 'fire trail'],
            moveBonus: 2, selfTarget: true
          },
        ]
      },
      {
        slot: 4,
        label: 'Special',
        sublabel: 'Signature fire ability',
        skills: [
          {
            id: 'eruption', name: 'Eruption', icon: '🌋',
            description: 'Call down a volcanic eruption on target location.',
            slot: 4, tier: 'T3', cooldown: 4, range: 3,
            tags: ['attack', 'damage', 'aoe'],
            stats: ['160% DMG', 'AoE 2-tile', 'fire'],
            dmgMultiplier: 1.6, aoe: true
          },
          {
            id: 'inferno_pillar', name: 'Inferno Pillar', icon: '🏛️',
            description: 'Summon a pillar of roaring hellfire.',
            slot: 4, tier: 'T3', cooldown: 4, range: 3,
            tags: ['attack', 'damage'],
            stats: ['200% DMG', 'single target inferno'],
            dmgMultiplier: 2.0
          },
        ]
      },
      {
        slot: 5,
        label: 'Ultimate',
        sublabel: 'Once-per-battle supreme power',
        skills: [
          {
            id: 'volcanic_ascension', name: 'Volcanic Ascension', icon: '☄️',
            description: 'Transform into a living volcano. Bombard all enemies with magma.',
            slot: 5, tier: 'T3', cooldown: 999, range: 4,
            tags: ['attack', 'damage', 'aoe', 'ultimate'],
            stats: ['250% DMG', 'hits all enemies', 'ignores armor'],
            dmgMultiplier: 2.5, aoe: true, armorPen: 50
          },
          {
            id: 'lava_flood', name: 'Lava Flood', icon: '🌊',
            description: 'Flood the battlefield with lava. Massive AoE damage.',
            slot: 5, tier: 'T3', cooldown: 999, range: 3,
            tags: ['attack', 'damage', 'aoe', 'ultimate'],
            stats: ['200% DMG', 'AoE 3-tile', 'fire'],
            dmgMultiplier: 2.0, aoe: true
          },
        ]
      },
    ]
  },

  dark_staff: {
    weaponType: 'dark_staff',
    displayName: 'Dark Staff',
    icon: '🌑',
    description: 'A staff imbued with forbidden eldritch knowledge. Curses, corruption, and soul manipulation.',
    slots: [
      {
        slot: 1,
        label: 'Basic Attack',
        sublabel: 'Primary dark spell',
        skills: [
          {
            id: 'eldritch_bolt', name: 'Eldritch Bolt', icon: '🌑',
            description: 'Launch a bolt of eldritch energy.',
            slot: 1, tier: 'T1', cooldown: 0, range: 5,
            tags: ['attack', 'damage'],
            stats: ['100% DMG', 'dark', 'range 5'],
            dmgMultiplier: 1.0
          },
          {
            id: 'shadow_grasp', name: 'Shadow Grasp', icon: '🖤',
            description: 'Tendrils of shadow squeeze the target.',
            slot: 1, tier: 'T1', cooldown: 0, range: 5,
            tags: ['attack', 'damage', 'debuff'],
            stats: ['90% DMG', 'slows target', 'range 5'],
            dmgMultiplier: 0.9
          },
          {
            id: 'cursed_touch', name: 'Cursed Touch', icon: '☠️',
            description: 'Apply a corrupting curse that lingers.',
            slot: 1, tier: 'T1', cooldown: 0, range: 1,
            tags: ['attack', 'damage', 'debuff'],
            stats: ['80% DMG', 'curse stacks'],
            dmgMultiplier: 0.8
          },
        ]
      },
      {
        slot: 2,
        label: 'Core Skill',
        sublabel: 'Core dark abilities',
        skills: [
          {
            id: 'eldritch_corruption', name: 'Eldritch Corruption', icon: '💜',
            description: 'Corrupt the target with ancient evil, dealing heavy dark damage.',
            slot: 2, tier: 'T2', cooldown: 2, range: 3,
            tags: ['attack', 'damage', 'debuff'],
            stats: ['140% DMG', 'dark', 'corruption'],
            dmgMultiplier: 1.4
          },
          {
            id: 'soul_drain', name: 'Soul Drain', icon: '💀',
            description: 'Drain the life force from a target, healing yourself.',
            slot: 2, tier: 'T2', cooldown: 3, range: 2,
            tags: ['attack', 'damage', 'heal'],
            stats: ['110% DMG', 'heal 50% dmg dealt'],
            dmgMultiplier: 1.1, healMultiplier: 0.5
          },
        ]
      },
      {
        slot: 3,
        label: 'Utility',
        sublabel: 'Dark manipulation',
        skills: [
          {
            id: 'false_sanctuary', name: 'False Sanctuary', icon: '⛪',
            description: 'Project an aura of false holiness, healing yourself.',
            slot: 3, tier: 'T2', cooldown: 3, range: 0,
            tags: ['utility', 'heal'],
            stats: ['Heal 30% HP', 'clears curses'],
            healMultiplier: 0.3, selfTarget: true
          },
          {
            id: 'shadow_step', name: 'Shadowstep', icon: '👁️',
            description: 'Step through shadows to reposition instantly.',
            slot: 3, tier: 'T2', cooldown: 2, range: 0,
            tags: ['utility', 'move'],
            stats: ['+3 move range', 'phasing'],
            moveBonus: 3, selfTarget: true
          },
        ]
      },
      {
        slot: 4,
        label: 'Special',
        sublabel: 'Dark art signature',
        skills: [
          {
            id: 'dark_sermon', name: 'Dark Sermon', icon: '📖',
            description: 'Recite forbidden scripture. AoE psychic damage that stuns.',
            slot: 4, tier: 'T3', cooldown: 4, range: 4,
            tags: ['attack', 'damage', 'aoe', 'debuff'],
            stats: ['150% DMG', 'AoE', 'STUN 1 turn'],
            dmgMultiplier: 1.5, aoe: true, applyStatus: 'stunned', statusDuration: 1
          },
          {
            id: 'void_rift', name: 'Void Rift', icon: '🕳️',
            description: 'Tear a rift in reality that consumes the target. Freezes in place.',
            slot: 4, tier: 'T3', cooldown: 4, range: 4,
            tags: ['attack', 'damage', 'debuff'],
            stats: ['190% DMG', 'void', 'FREEZE 2 turns'],
            dmgMultiplier: 1.9, armorPen: 25, applyStatus: 'frozen', statusDuration: 2
          },
        ]
      },
      {
        slot: 5,
        label: 'Ultimate',
        sublabel: 'Once-per-battle supreme power',
        skills: [
          {
            id: 'demonic_possession', name: 'Demonic Possession', icon: '👿',
            description: 'Unleash the bound demon within. Devastating AoE dark explosion.',
            slot: 5, tier: 'T3', cooldown: 999, range: 3,
            tags: ['attack', 'damage', 'aoe', 'ultimate'],
            stats: ['260% DMG', 'AoE all visible', 'demon'],
            dmgMultiplier: 2.6, aoe: true
          },
          {
            id: 'ancient_awakening', name: 'Ancient Awakening', icon: '🌀',
            description: 'Awaken an old god from slumber within the target. Massive single target obliteration.',
            slot: 5, tier: 'T3', cooldown: 999, range: 4,
            tags: ['attack', 'damage', 'ultimate'],
            stats: ['300% DMG', 'ancient', 'ignores armor'],
            dmgMultiplier: 3.0, armorPen: 100
          },
        ]
      },
    ]
  },

  daggers: {
    weaponType: 'daggers',
    displayName: 'Daggers',
    icon: '🗡️',
    description: 'Twin blades for fast, precise strikes. Specializes in poison, ambush, and mobility.',
    slots: [
      {
        slot: 1,
        label: 'Basic Attack',
        sublabel: 'Primary blade strikes',
        skills: [
          {
            id: 'dagger_quick_slash', name: 'Quick Slash', icon: '🗡️',
            description: 'Two fast slashing strikes in quick succession.',
            slot: 1, tier: 'T1', cooldown: 0, range: 1,
            tags: ['attack', 'damage'],
            stats: ['90% DMG', 'fast, 2-hit'],
            dmgMultiplier: 0.9
          },
          {
            id: 'dagger_backstab', name: 'Backstab', icon: '🔪',
            description: 'Strike from behind for devastating bonus damage.',
            slot: 1, tier: 'T1', cooldown: 0, range: 1,
            tags: ['attack', 'damage'],
            stats: ['120% DMG', '+30% from behind'],
            dmgMultiplier: 1.2
          },
          {
            id: 'dagger_poison_throw', name: 'Poison Throw', icon: '🧪',
            description: 'Throw a poison-coated dagger from range.',
            slot: 1, tier: 'T1', cooldown: 0, range: 3,
            tags: ['attack', 'damage', 'debuff'],
            stats: ['70% DMG', 'range 3', 'POISON 3 turns'],
            dmgMultiplier: 0.7, applyStatus: 'poisoned', statusDuration: 3
          },
        ]
      },
      {
        slot: 2,
        label: 'Core Skill',
        sublabel: 'Core rogue abilities',
        skills: [
          {
            id: 'voice_mimic', name: 'Voice Mimic', icon: '🗣️',
            description: 'Mimic a dying cry to lure the target closer, then strike.',
            slot: 2, tier: 'T2', cooldown: 3, range: 2,
            tags: ['attack', 'damage', 'debuff'],
            stats: ['130% DMG', 'pulls target', 'dark'],
            dmgMultiplier: 1.3
          },
          {
            id: 'shadow_strike', name: 'Shadow Strike', icon: '🌑',
            description: 'Vanish into shadows and reappear behind target for a crit strike. Ignores walls and LOS.',
            slot: 2, tier: 'T2', cooldown: 3, range: 3,
            tags: ['attack', 'damage'],
            stats: ['150% DMG', 'guaranteed crit', 'shadow', 'ignores LOS'],
            dmgMultiplier: 1.5, attackType: 'jump' as const
          },
        ]
      },
      {
        slot: 3,
        label: 'Utility',
        sublabel: 'Rogue mobility & tricks',
        skills: [
          {
            id: 'aqua_dash', name: 'Aqua Dash', icon: '💧',
            description: 'Propel through water channels at great speed.',
            slot: 3, tier: 'T1', cooldown: 2, range: 0,
            tags: ['utility', 'move'],
            stats: ['+3 move range', 'ignore terrain'],
            moveBonus: 3, selfTarget: true
          },
          {
            id: 'fog_of_filth', name: 'Fog of Filth', icon: '🌫️',
            description: 'Release foul vapors that obscure position and heal slightly.',
            slot: 3, tier: 'T2', cooldown: 3, range: 0,
            tags: ['utility', 'heal', 'debuff'],
            stats: ['Heal 20% HP', 'reduces enemy accuracy'],
            healMultiplier: 0.2, selfTarget: true
          },
        ]
      },
      {
        slot: 4,
        label: 'Special',
        sublabel: 'Canal Lurker signature',
        skills: [
          {
            id: 'undertow', name: 'Undertow', icon: '🌀',
            description: 'Grab and drag the enemy under with you.',
            slot: 4, tier: 'T3', cooldown: 4, range: 1,
            tags: ['attack', 'damage', 'debuff'],
            stats: ['160% DMG', 'pulls then slows', 'drowning'],
            dmgMultiplier: 1.6
          },
          {
            id: 'barnacle_barrage', name: 'Barnacle Barrage', icon: '🦀',
            description: 'Hurl barnacle-crusted debris in a sweeping arc.',
            slot: 4, tier: 'T3', cooldown: 4, range: 2,
            tags: ['attack', 'damage', 'aoe'],
            stats: ['140% DMG', 'AoE line', 'armor shred'],
            dmgMultiplier: 1.4, aoe: true, armorPen: 15
          },
        ]
      },
      {
        slot: 5,
        label: 'Ultimate',
        sublabel: 'Once-per-battle supreme power',
        skills: [
          {
            id: 'sea_demon_wrath', name: "Sea Demon's Wrath", icon: '🌊',
            description: 'Call upon the bargained sea demon. Tentacles erupt from the ground.',
            slot: 5, tier: 'T3', cooldown: 999, range: 3,
            tags: ['attack', 'damage', 'aoe', 'ultimate'],
            stats: ['230% DMG', 'AoE', 'sea demon'],
            dmgMultiplier: 2.3, aoe: true
          },
          {
            id: 'deep_hunger', name: 'Deep Hunger', icon: '😈',
            description: 'Channel the insatiable hunger of the deep. Devour a target entirely.',
            slot: 5, tier: 'T3', cooldown: 999, range: 1,
            tags: ['attack', 'damage', 'ultimate'],
            stats: ['280% DMG', 'single target', 'devour'],
            dmgMultiplier: 2.8
          },
        ]
      },
    ]
  },

  greatsword: {
    weaponType: 'greatsword',
    displayName: 'Greatsword',
    icon: '⚔️',
    description: 'A massive two-handed blade for commanding warriors. Power strikes and intimidation.',
    slots: [
      {
        slot: 1,
        label: 'Basic Attack',
        sublabel: 'Sword strike options',
        skills: [
          {
            id: 'gs_power_strike', name: 'Power Strike', icon: '⚔️',
            description: 'A powerful overhead strike with your full weight.',
            slot: 1, tier: 'T1', cooldown: 0, range: 1,
            tags: ['attack', 'damage'],
            stats: ['110% DMG', 'power'],
            dmgMultiplier: 1.1
          },
          {
            id: 'gs_sweeping_cut', name: 'Sweeping Cut', icon: '🌊',
            description: 'A wide sweeping slash hitting multiple enemies.',
            slot: 1, tier: 'T1', cooldown: 0, range: 1,
            tags: ['attack', 'damage', 'aoe'],
            stats: ['90% DMG', 'hits 2-wide'],
            dmgMultiplier: 0.9, aoe: true
          },
          {
            id: 'gs_impale', name: 'Impale', icon: '🏹',
            description: 'Drive the blade deep into the target with armor penetration.',
            slot: 1, tier: 'T1', cooldown: 0, range: 1,
            tags: ['attack', 'damage'],
            stats: ['95% DMG', '+20% armor pen'],
            dmgMultiplier: 0.95, armorPen: 20
          },
        ]
      },
      {
        slot: 2,
        label: 'Core Skill',
        sublabel: 'Core warrior abilities',
        skills: [
          {
            id: 'collectors_brand', name: "Collector's Brand", icon: '🔱',
            description: "Brand the enemy with Garnok's mark, weakening their defenses.",
            slot: 2, tier: 'T2', cooldown: 2, range: 1,
            tags: ['attack', 'damage', 'debuff'],
            stats: ['120% DMG', '-20% target DEF', 'branded'],
            dmgMultiplier: 1.2
          },
          {
            id: 'tribal_fury', name: 'Tribal Fury', icon: '😤',
            description: 'Channel the fury of your ancestors for a devastating blow.',
            slot: 2, tier: 'T2', cooldown: 2, range: 1,
            tags: ['attack', 'damage'],
            stats: ['150% DMG', 'ancestors'],
            dmgMultiplier: 1.5
          },
        ]
      },
      {
        slot: 3,
        label: 'Utility',
        sublabel: 'Command & battlefield control',
        skills: [
          {
            id: 'intimidate', name: 'Intimidate', icon: '😱',
            description: "Stare down an enemy, reducing their initiative and healing yourself from confidence.",
            slot: 3, tier: 'T2', cooldown: 3, range: 0,
            tags: ['utility', 'heal', 'debuff'],
            stats: ['Heal 20% HP', 'reduces enemy CT', 'intimidate'],
            healMultiplier: 0.2, selfTarget: true
          },
          {
            id: 'tactical_advance', name: 'Tactical Advance', icon: '🏃',
            description: 'Read the battlefield and advance with purpose.',
            slot: 3, tier: 'T1', cooldown: 2, range: 0,
            tags: ['utility', 'move'],
            stats: ['+2 move range', 'tactical'],
            moveBonus: 2, selfTarget: true
          },
        ]
      },
      {
        slot: 4,
        label: 'Special',
        sublabel: 'Warlord signature strike',
        skills: [
          {
            id: 'execution', name: 'Execution', icon: '💀',
            description: 'Devastating blow. Deals bonus damage against wounded enemies.',
            slot: 4, tier: 'T3', cooldown: 4, range: 1,
            tags: ['attack', 'damage'],
            stats: ['170% DMG', '+50% vs <50% HP', 'execution'],
            dmgMultiplier: 1.7
          },
          {
            id: 'conquerors_blow', name: "Conqueror's Blow", icon: '👑',
            description: 'The strike of a conqueror. Massive damage, terrifying to witness.',
            slot: 4, tier: 'T3', cooldown: 4, range: 1,
            tags: ['attack', 'damage'],
            stats: ['200% DMG', 'demoralizes nearby foes'],
            dmgMultiplier: 2.0
          },
        ]
      },
      {
        slot: 5,
        label: 'Ultimate',
        sublabel: 'Once-per-battle supreme power',
        skills: [
          {
            id: 'lord_of_grudges', name: 'Lord of Grudges', icon: '⚡',
            description: "Unleash every grudge you've ever kept. Explosive AoE roar + slam.",
            slot: 5, tier: 'T3', cooldown: 999, range: 2,
            tags: ['attack', 'damage', 'aoe', 'ultimate'],
            stats: ['240% DMG', 'AoE 2-tile', 'grudge'],
            dmgMultiplier: 2.4, aoe: true
          },
          {
            id: 'storm_of_steel', name: 'Storm of Steel', icon: '🌪️',
            description: 'Unleash a whirlwind of blade strikes across the entire battlefield.',
            slot: 5, tier: 'T3', cooldown: 999, range: 4,
            tags: ['attack', 'damage', 'aoe', 'ultimate'],
            stats: ['200% DMG', 'hits all enemies', 'steel storm'],
            dmgMultiplier: 2.0, aoe: true
          },
        ]
      },
    ]
  },

  bow: {
    weaponType: 'bow',
    displayName: 'Longbow',
    icon: '🏹',
    description: 'A masterwork elven longbow. Long-range precision, ancient arrows, and nature magic.',
    slots: [
      {
        slot: 1,
        label: 'Basic Attack',
        sublabel: 'Primary arrow shots',
        skills: [
          {
            id: 'bow_arrow_shot', name: 'Arrow Shot', icon: '🏹',
            description: 'A precise arrow aimed at the target.',
            slot: 1, tier: 'T1', cooldown: 0, range: 4,
            tags: ['attack', 'damage'],
            stats: ['100% DMG', 'range 4', 'precise'],
            dmgMultiplier: 1.0
          },
          {
            id: 'bow_piercing_arrow', name: 'Piercing Arrow', icon: '🔱',
            description: 'Arrow that pierces through armor and continues.',
            slot: 1, tier: 'T1', cooldown: 0, range: 4,
            tags: ['attack', 'damage'],
            stats: ['90% DMG', '+25% armor pen', 'piercing'],
            dmgMultiplier: 0.9, armorPen: 25
          },
          {
            id: 'bow_flurry', name: 'Arrow Flurry', icon: '💨',
            description: 'Fire three rapid arrows at reduced damage each.',
            slot: 1, tier: 'T1', cooldown: 0, range: 3,
            tags: ['attack', 'damage'],
            stats: ['80% DMG', '3-hit', 'rapid'],
            dmgMultiplier: 0.8
          },
        ]
      },
      {
        slot: 2,
        label: 'Core Skill',
        sublabel: 'Elven archery mastery',
        skills: [
          {
            id: 'ancient_arrow', name: 'Ancient Arrow', icon: '✨',
            description: 'An arrow enchanted with ancient elven magic. Devastating and precise.',
            slot: 2, tier: 'T2', cooldown: 2, range: 4,
            tags: ['attack', 'damage'],
            stats: ['150% DMG', 'ancient magic', '+10% armor pen'],
            dmgMultiplier: 1.5, armorPen: 10
          },
          {
            id: 'forest_mark', name: 'Forest Mark', icon: '🌿',
            description: 'Mark a target with nature magic, weakening them.',
            slot: 2, tier: 'T2', cooldown: 3, range: 4,
            tags: ['attack', 'damage', 'debuff'],
            stats: ['110% DMG', 'marked: -15% DEF', 'nature'],
            dmgMultiplier: 1.1
          },
        ]
      },
      {
        slot: 3,
        label: 'Utility',
        sublabel: 'Elven agility & nature',
        skills: [
          {
            id: 'eagle_eye', name: "Eagle Eye", icon: '🦅',
            description: 'Focus your centuries of knowledge into a moment of clarity. Heal yourself.',
            slot: 3, tier: 'T2', cooldown: 3, range: 0,
            tags: ['utility', 'heal', 'buff'],
            stats: ['Heal 25% HP', '+1 range next attack'],
            healMultiplier: 0.25, selfTarget: true
          },
          {
            id: 'forest_step', name: 'Forest Step', icon: '🌲',
            description: 'Step through the forest with ancient grace.',
            slot: 3, tier: 'T1', cooldown: 2, range: 0,
            tags: ['utility', 'move'],
            stats: ['+2 move range', 'ignore terrain', 'elven grace'],
            moveBonus: 2, selfTarget: true
          },
        ]
      },
      {
        slot: 4,
        label: 'Special',
        sublabel: 'Elven archer signature',
        skills: [
          {
            id: 'memory_shot', name: 'Memory Shot', icon: '💫',
            description: 'A shot carrying four centuries of hatred for the burning of the First Forest.',
            slot: 4, tier: 'T3', cooldown: 4, range: 4,
            tags: ['attack', 'damage'],
            stats: ['200% DMG', 'memory', '+30% armor pen'],
            dmgMultiplier: 2.0, armorPen: 30
          },
          {
            id: 'vengeful_volley', name: 'Vengeful Volley', icon: '🌧️',
            description: 'Rain arrows down on a target area.',
            slot: 4, tier: 'T3', cooldown: 4, range: 4,
            tags: ['attack', 'damage', 'aoe'],
            stats: ['140% DMG', 'AoE 2-tile', 'volley'],
            dmgMultiplier: 1.4, aoe: true
          },
        ]
      },
      {
        slot: 5,
        label: 'Ultimate',
        sublabel: 'Once-per-battle supreme power',
        skills: [
          {
            id: 'elven_fusillade', name: 'Elven Fusillade', icon: '⚡',
            description: 'Four centuries of skill unleashed. Barrage every enemy with perfect arrows.',
            slot: 5, tier: 'T3', cooldown: 999, range: 5,
            tags: ['attack', 'damage', 'aoe', 'ultimate'],
            stats: ['220% DMG', 'hits all enemies', 'perfect aim'],
            dmgMultiplier: 2.2, aoe: true, armorPen: 20
          },
          {
            id: 'first_forest_fury', name: "First Forest's Fury", icon: '🌳',
            description: 'Channel the rage of the burned First Forest. Nature itself strikes.',
            slot: 5, tier: 'T3', cooldown: 999, range: 4,
            tags: ['attack', 'damage', 'aoe', 'ultimate'],
            stats: ['260% DMG', 'nature AoE', 'forest wrath'],
            dmgMultiplier: 2.6, aoe: true
          },
        ]
      },
    ]
  },

  sword_shield: {
    weaponType: 'sword_shield',
    displayName: 'Sword & Shield',
    icon: '🛡️',
    description: 'A noble weapon combination for defenders and paladins. Holy strikes and iron defense.',
    slots: [
      {
        slot: 1,
        label: 'Basic Attack',
        sublabel: 'Sword and shield techniques',
        skills: [
          {
            id: 'ss_slash', name: 'Slash', icon: '⚔️',
            description: 'A disciplined sword slash.',
            slot: 1, tier: 'T1', cooldown: 0, range: 1,
            tags: ['attack', 'damage'],
            stats: ['100% DMG', 'disciplined'],
            dmgMultiplier: 1.0
          },
          {
            id: 'ss_shield_bash', name: 'Shield Bash', icon: '🛡️',
            description: 'Strike with the shield. Lower damage but disrupts the target.',
            slot: 1, tier: 'T1', cooldown: 0, range: 1,
            tags: ['attack', 'damage', 'debuff'],
            stats: ['70% DMG', 'disrupts target', 'shield'],
            dmgMultiplier: 0.7
          },
          {
            id: 'ss_thrust', name: 'Thrust', icon: '🎯',
            description: 'Precise thrusting attack. High armor penetration.',
            slot: 1, tier: 'T1', cooldown: 0, range: 1,
            tags: ['attack', 'damage'],
            stats: ['90% DMG', '+20% armor pen', 'precise'],
            dmgMultiplier: 0.9, armorPen: 20
          },
        ]
      },
      {
        slot: 2,
        label: 'Core Skill',
        sublabel: 'Core paladin abilities',
        skills: [
          {
            id: 'holy_strike', name: 'Holy Strike', icon: '✨',
            description: 'A strike blessed by divine power. Extra damage vs undead and demons.',
            slot: 2, tier: 'T2', cooldown: 2, range: 1,
            tags: ['attack', 'damage', 'buff'],
            stats: ['140% DMG', '+50% vs undead', 'holy'],
            dmgMultiplier: 1.4
          },
          {
            id: 'righteous_fury', name: 'Righteous Fury', icon: '😤',
            description: 'Channel righteous anger into a furious assault.',
            slot: 2, tier: 'T2', cooldown: 2, range: 1,
            tags: ['attack', 'damage'],
            stats: ['150% DMG', 'righteous', 'fury'],
            dmgMultiplier: 1.5
          },
        ]
      },
      {
        slot: 3,
        label: 'Utility',
        sublabel: 'Defense and leadership',
        skills: [
          {
            id: 'rally_cry', name: 'Rally Cry', icon: '📯',
            description: 'Rally yourself with a battle cry, restoring resolve.',
            slot: 3, tier: 'T2', cooldown: 3, range: 0,
            tags: ['utility', 'heal', 'buff'],
            stats: ['Heal 30% HP', 'remove fear', 'rally'],
            healMultiplier: 0.3, selfTarget: true
          },
          {
            id: 'shield_wall', name: 'Shield Wall', icon: '🧱',
            description: 'Adopt a defensive stance and advance carefully.',
            slot: 3, tier: 'T1', cooldown: 2, range: 0,
            tags: ['utility', 'move', 'buff'],
            stats: ['+2 move', '+30% DEF while moving'],
            moveBonus: 2, selfTarget: true
          },
        ]
      },
      {
        slot: 4,
        label: 'Special',
        sublabel: 'Knight signature ability',
        skills: [
          {
            id: 'crusaders_charge', name: "Crusader's Charge", icon: '🏇',
            description: 'Charge an enemy across a great distance, dealing massive damage with momentum.',
            slot: 4, tier: 'T3', cooldown: 4, range: 2,
            tags: ['attack', 'damage'],
            stats: ['180% DMG', 'charge momentum', 'holy', '+6 dash range'],
            attackType: 'dash' as const, dashBonus: 6,
            dmgMultiplier: 1.8
          },
          {
            id: 'divine_smite', name: 'Divine Smite', icon: '⚡',
            description: 'Call down divine lightning upon the target.',
            slot: 4, tier: 'T3', cooldown: 4, range: 1,
            tags: ['attack', 'damage'],
            stats: ['200% DMG', 'lightning', '+25% armor pen'],
            dmgMultiplier: 2.0, armorPen: 25
          },
        ]
      },
      {
        slot: 5,
        label: 'Ultimate',
        sublabel: 'Once-per-battle supreme power',
        skills: [
          {
            id: 'holy_sword', name: 'Holy Sword', icon: '🗡️',
            description: 'Your sword glows with pure holy light. Strikes all enemies in range.',
            slot: 5, tier: 'T3', cooldown: 999, range: 2,
            tags: ['attack', 'damage', 'aoe', 'ultimate'],
            stats: ['230% DMG', 'AoE', 'holy light'],
            dmgMultiplier: 2.3, aoe: true
          },
          {
            id: 'knights_vow', name: "Knight's Vow", icon: '📜',
            description: 'Swear a final vow. Massive single target holy execution.',
            slot: 5, tier: 'T3', cooldown: 999, range: 1,
            tags: ['attack', 'damage', 'ultimate'],
            stats: ['290% DMG', 'single target', 'vow', 'ignores armor'],
            dmgMultiplier: 2.9, armorPen: 100
          },
        ]
      },
    ]
  },

  war_hammer: {
    weaponType: 'war_hammer',
    displayName: 'War Hammer',
    icon: '🔨',
    description: 'A dwarven masterwork hammer. Crushing blows and forge magic. Built to outlast empires.',
    slots: [
      {
        slot: 1,
        label: 'Basic Attack',
        sublabel: 'Hammering techniques',
        skills: [
          {
            id: 'wh_crush', name: 'Crushing Blow', icon: '🔨',
            description: 'A heavy overhead hammer blow.',
            slot: 1, tier: 'T1', cooldown: 0, range: 1,
            tags: ['attack', 'damage'],
            stats: ['110% DMG', 'crushing', 'reduces armor'],
            dmgMultiplier: 1.1
          },
          {
            id: 'wh_forge_strike', name: 'Forge Strike', icon: '⚒️',
            description: 'Strike with the precision of a master smith.',
            slot: 1, tier: 'T1', cooldown: 0, range: 1,
            tags: ['attack', 'damage'],
            stats: ['95% DMG', '+25% armor pen', 'forge'],
            dmgMultiplier: 0.95, armorPen: 25
          },
          {
            id: 'wh_ground_slam', name: 'Ground Slam', icon: '💥',
            description: 'Slam the ground, sending shockwaves outward.',
            slot: 1, tier: 'T1', cooldown: 0, range: 1,
            tags: ['attack', 'damage', 'aoe'],
            stats: ['90% DMG', 'shockwave', 'small AoE'],
            dmgMultiplier: 0.9, aoe: true
          },
        ]
      },
      {
        slot: 2,
        label: 'Core Skill',
        sublabel: 'Forge master abilities',
        skills: [
          {
            id: 'forge_mastery', name: 'Forge Mastery', icon: '🔥',
            description: 'Channel forge fire through your weapon for devastating heat damage.',
            slot: 2, tier: 'T2', cooldown: 2, range: 1,
            tags: ['attack', 'damage'],
            stats: ['140% DMG', 'fire', 'forge heat'],
            dmgMultiplier: 1.4
          },
          {
            id: 'dwarven_stubbornness', name: 'Dwarven Stubbornness', icon: '💪',
            description: 'Strike with decades of stubborn crafting determination.',
            slot: 2, tier: 'T2', cooldown: 2, range: 1,
            tags: ['attack', 'damage'],
            stats: ['160% DMG', 'stubborn', 'stagger'],
            dmgMultiplier: 1.6
          },
        ]
      },
      {
        slot: 3,
        label: 'Utility',
        sublabel: 'Dwarven resilience',
        skills: [
          {
            id: 'iron_constitution', name: 'Iron Constitution', icon: '🛡️',
            description: 'Tap into dwarven endurance and heal your battle wounds.',
            slot: 3, tier: 'T2', cooldown: 3, range: 0,
            tags: ['utility', 'heal', 'buff'],
            stats: ['Heal 35% HP', 'iron body', 'dwarven'],
            healMultiplier: 0.35, selfTarget: true
          },
          {
            id: 'mountain_stride', name: 'Mountain Stride', icon: '⛰️',
            description: 'Move with the steady purpose of a mountain dwarf.',
            slot: 3, tier: 'T1', cooldown: 2, range: 0,
            tags: ['utility', 'move'],
            stats: ['+1 move range', 'ignore difficult terrain'],
            moveBonus: 1, selfTarget: true
          },
        ]
      },
      {
        slot: 4,
        label: 'Special',
        sublabel: 'Forge master signature',
        skills: [
          {
            id: 'masterwork_strike', name: 'Masterwork Strike', icon: '⚒️',
            description: 'A strike with 90 years of craft behind it. Destroys armor.',
            slot: 4, tier: 'T3', cooldown: 4, range: 1,
            tags: ['attack', 'damage'],
            stats: ['190% DMG', '+50% armor pen', 'masterwork'],
            dmgMultiplier: 1.9, armorPen: 50
          },
          {
            id: 'seismic_slam', name: 'Seismic Slam', icon: '🌍',
            description: 'Slam with enough force to shake the earth itself.',
            slot: 4, tier: 'T3', cooldown: 4, range: 1,
            tags: ['attack', 'damage', 'aoe'],
            stats: ['160% DMG', 'seismic AoE', 'stagger all'],
            dmgMultiplier: 1.6, aoe: true
          },
        ]
      },
      {
        slot: 5,
        label: 'Ultimate',
        sublabel: 'Once-per-battle supreme power',
        skills: [
          {
            id: 'forge_elemental', name: 'Forge Elemental', icon: '🔥',
            description: 'Awaken a fire elemental from your hammer. It strikes all enemies.',
            slot: 5, tier: 'T3', cooldown: 999, range: 3,
            tags: ['attack', 'damage', 'aoe', 'ultimate'],
            stats: ['220% DMG', 'AoE', 'fire elemental'],
            dmgMultiplier: 2.2, aoe: true
          },
          {
            id: 'masterwork_vengeance', name: 'Masterwork Vengeance', icon: '⚡',
            description: "90 years of work, invested in one single strike. Ignore all armor.",
            slot: 5, tier: 'T3', cooldown: 999, range: 1,
            tags: ['attack', 'damage', 'ultimate'],
            stats: ['310% DMG', 'single target', 'ignores armor', 'masterwork'],
            dmgMultiplier: 3.1, armorPen: 100
          },
        ]
      },
    ]
  },

  rusted_sword: {
    weaponType: 'rusted_sword',
    displayName: 'Rusted Blade',
    icon: '🗡️',
    description: 'The blade of a soldier who cannot die. Ancient and corroded, it still knows the art of war.',
    slots: [
      {
        slot: 1,
        label: 'Basic Attack',
        sublabel: 'Undead soldier techniques',
        skills: [
          {
            id: 'rs_undead_slash', name: 'Undead Slash', icon: '🗡️',
            description: 'A slash carried out with unthinking, tireless precision.',
            slot: 1, tier: 'T1', cooldown: 0, range: 1,
            tags: ['attack', 'damage'],
            stats: ['100% DMG', 'tireless'],
            dmgMultiplier: 1.0
          },
          {
            id: 'rs_corroded_thrust', name: 'Corroded Thrust', icon: '☠️',
            description: 'Drive the rusted blade into the target, applying poison corrosion.',
            slot: 1, tier: 'T1', cooldown: 0, range: 1,
            tags: ['attack', 'damage', 'debuff'],
            stats: ['85% DMG', 'corrosion', 'POISON 2 turns'],
            dmgMultiplier: 0.85, applyStatus: 'poisoned', statusDuration: 2
          },
          {
            id: 'rs_bone_strike', name: 'Bone Strike', icon: '🦴',
            description: 'Strike with skeletal strength that ignores fatigue.',
            slot: 1, tier: 'T1', cooldown: 0, range: 1,
            tags: ['attack', 'damage'],
            stats: ['110% DMG', 'bone strength'],
            dmgMultiplier: 1.1
          },
        ]
      },
      {
        slot: 2,
        label: 'Core Skill',
        sublabel: 'Revenant abilities',
        skills: [
          {
            id: 'rs_phantom_memory', name: 'Phantom Memory', icon: '👻',
            description: 'Channel memories of the soldier you once were. Devastating strike.',
            slot: 2, tier: 'T2', cooldown: 2, range: 1,
            tags: ['attack', 'damage'],
            stats: ['150% DMG', 'phantom', 'memory'],
            dmgMultiplier: 1.5
          },
          {
            id: 'rs_soul_fire', name: 'Soul Fire', icon: '🔆',
            description: 'The soul-fire in your eyes becomes a weapon.',
            slot: 2, tier: 'T2', cooldown: 2, range: 2,
            tags: ['attack', 'damage'],
            stats: ['130% DMG', 'soul fire', 'ranged'],
            dmgMultiplier: 1.3
          },
        ]
      },
      {
        slot: 3,
        label: 'Utility',
        sublabel: 'Undead nature powers',
        skills: [
          {
            id: "rs_deaths_embrace", name: "Death's Embrace", icon: '💚',
            description: 'Draw upon the power of undeath to restore your form.',
            slot: 3, tier: 'T2', cooldown: 3, range: 0,
            tags: ['utility', 'heal'],
            stats: ['Heal 40% HP', 'undeath', 'resilience'],
            healMultiplier: 0.4, selfTarget: true
          },
          {
            id: 'rs_spectral_drift', name: 'Spectral Drift', icon: '🌫️',
            description: 'Phase through solid objects as a wraith.',
            slot: 3, tier: 'T2', cooldown: 2, range: 0,
            tags: ['utility', 'move'],
            stats: ['+3 move range', 'phase', 'ignore terrain'],
            moveBonus: 3, selfTarget: true
          },
        ]
      },
      {
        slot: 4,
        label: 'Special',
        sublabel: 'Revenant signature',
        skills: [
          {
            id: 'rs_ancient_war_cry', name: 'Ancient War Cry', icon: '📯',
            description: "A war cry from a kingdom that no longer exists. It still carries power.",
            slot: 4, tier: 'T3', cooldown: 4, range: 1,
            tags: ['attack', 'damage', 'aoe'],
            stats: ['150% DMG', 'AoE', 'ancient terror'],
            dmgMultiplier: 1.5, aoe: true
          },
          {
            id: 'rs_eternal_soldier', name: 'Eternal Soldier', icon: '⚰️',
            description: 'Channel the fact that you cannot die into a relentless assault.',
            slot: 4, tier: 'T3', cooldown: 4, range: 1,
            tags: ['attack', 'damage'],
            stats: ['200% DMG', 'cannot be interrupted', 'relentless'],
            dmgMultiplier: 2.0
          },
        ]
      },
      {
        slot: 5,
        label: 'Ultimate',
        sublabel: 'Once-per-battle supreme power',
        skills: [
          {
            id: 'rs_army_of_the_dead', name: 'Army of the Dead', icon: '💀',
            description: 'Summon spectral soldiers of your fallen kingdom. They strike all enemies.',
            slot: 5, tier: 'T3', cooldown: 999, range: 4,
            tags: ['attack', 'damage', 'aoe', 'ultimate'],
            stats: ['240% DMG', 'hits all enemies', 'phantom army'],
            dmgMultiplier: 2.4, aoe: true
          },
          {
            id: 'rs_unkillable_fury', name: 'Unkillable Fury', icon: '😡',
            description: 'The rage of a soldier denied rest. Unstoppable single-target devastation.',
            slot: 5, tier: 'T3', cooldown: 999, range: 1,
            tags: ['attack', 'damage', 'ultimate'],
            stats: ['300% DMG', 'single target', 'ignores armor', 'cannot miss'],
            dmgMultiplier: 3.0, armorPen: 100
          },
        ]
      },
    ]
  },

  sword: {
    weaponType: 'sword', displayName: 'Sword', icon: '⚔️',
    description: 'A reliable one-handed blade. Balanced between offense and defense, versatile in any warrior\'s hand.',
    slots: [
      { slot: 1, label: 'Basic Attack', sublabel: 'Striking options', skills: [
        { id: 'swd_slash',  name: 'Slash',       icon: '⚔️', description: 'Clean horizontal cut. Reliable damage.',          slot: 1, tier: 'T1', cooldown: 0, range: 1, tags: ['attack','damage'], stats: ['95% DMG'],                   dmgMultiplier: 0.95 },
        { id: 'swd_thrust', name: 'Thrust',      icon: '🗡️', description: 'Precise stab. Pierces gaps in armor.',            slot: 1, tier: 'T1', cooldown: 0, range: 1, tags: ['attack','damage'], stats: ['85% DMG','+12% armor pen'],   dmgMultiplier: 0.85, armorPen: 12 },
        { id: 'swd_quick',  name: 'Quick Strike', icon: '💨', description: 'Rapid strike, trade power for positioning.',      slot: 1, tier: 'T1', cooldown: 0, range: 1, tags: ['attack','damage'], stats: ['80% DMG','+1 move'],          dmgMultiplier: 0.80, moveBonus: 1 },
      ]},
      { slot: 2, label: 'Core', sublabel: 'Battle techniques', skills: [
        { id: 'swd_parry',   name: 'Parry',    icon: '🛡️', description: 'Deflect and counter immediately.',           slot: 2, tier: 'T1', cooldown: 2, range: 1, tags: ['buff','attack'],  stats: ['50% DEF 1t','80% counter'],   dmgMultiplier: 0.80 },
        { id: 'swd_disarm',  name: 'Disarm',   icon: '✋', description: 'Knock weapon aside. Reduces enemy ATK.',      slot: 2, tier: 'T1', cooldown: 3, range: 1, tags: ['debuff'],          stats: ['-20% ATK 2t'] },
        { id: 'swd_feint',   name: 'Feint',    icon: '🎭', description: 'Fake opening. Ignores enemy counter.',        slot: 2, tier: 'T1', cooldown: 2, range: 1, tags: ['attack','damage'], stats: ['90% DMG','no counter'],       dmgMultiplier: 0.90 },
      ]},
      { slot: 3, label: 'Utility', sublabel: 'Tactical moves', skills: [
        { id: 'swd_advance',   name: 'Advance',   icon: '👣', description: 'Step forward and attack in one motion.', slot: 3, tier: 'T2', cooldown: 3, range: 2, tags: ['move','attack'],   stats: ['+2 move','70% DMG'], dmgMultiplier: 0.70, moveBonus: 2 },
        { id: 'swd_challenge', name: 'Challenge', icon: '😤', description: 'Taunt enemy. +15% ATK for 2 turns.',     slot: 3, tier: 'T2', cooldown: 4, range: 4, tags: ['debuff','utility'], stats: ['Pull 2 tiles','ATK+15% 2t'] },
        { id: 'swd_riposte',   name: 'Riposte',   icon: '🔄', description: 'Counter the next attack at full force.',slot: 3, tier: 'T2', cooldown: 3, range: 1, tags: ['buff'],             stats: ['200% counter next'] },
      ]},
      { slot: 4, label: 'Special', sublabel: 'Signature moves', skills: [
        { id: 'swd_flurry',  name: 'Flurry',         icon: '🌀', description: 'Three rapid strikes in one action.',       slot: 4, tier: 'T2', cooldown: 4, range: 1, tags: ['attack','damage'],           stats: ['3×50% DMG'],              dmgMultiplier: 1.50 },
        { id: 'swd_bleed',   name: 'Jugular Strike',  icon: '🩸', description: 'Vital spot hit. Apply poison bleed.',      slot: 4, tier: 'T2', cooldown: 4, range: 1, tags: ['attack','damage','debuff'],   stats: ['110% DMG','Bleed 3t'],    dmgMultiplier: 1.10, applyStatus: 'poisoned', statusDuration: 3 },
        { id: 'swd_execute', name: 'Execute',         icon: '💀', description: 'Bonus damage on low HP targets.',          slot: 4, tier: 'T2', cooldown: 4, range: 1, tags: ['attack','damage'],           stats: ['180% DMG vs <30% HP'],    dmgMultiplier: 1.80 },
      ]},
      { slot: 5, label: 'Ultimate', sublabel: 'Finishing blow', skills: [
        { id: 'swd_storm',  name: 'Sword Storm',     icon: '⚡', description: 'Blinding flurry on all adjacent foes.',   slot: 5, tier: 'T3', cooldown: 6, range: 1, tags: ['attack','aoe','ultimate'],    stats: ['120% DMG','All adjacent'], dmgMultiplier: 1.20, aoe: true },
        { id: 'swd_duel',   name: 'Honor Duel',      icon: '🏅', description: 'Lock target in one-on-one. +40% mutual.', slot: 5, tier: 'T3', cooldown: 6, range: 2, tags: ['debuff','ultimate'],          stats: ['+40% mutual DMG 3t'] },
        { id: 'swd_legend', name: 'Legendary Slash', icon: '🌟', description: 'Devastating strike, ignores all armor.',  slot: 5, tier: 'T3', cooldown: 7, range: 1, tags: ['attack','damage','ultimate'],  stats: ['200% DMG','full pierce'],  dmgMultiplier: 2.0, armorPen: 100 },
      ]},
    ],
  },

  axe: {
    weaponType: 'axe', displayName: 'Axe', icon: '🪓',
    description: 'A one-handed chopping axe. Brutal and efficient, landing powerful overhead blows that splinter shields.',
    slots: [
      { slot: 1, label: 'Basic Attack', sublabel: 'Chop options', skills: [
        { id: 'axe1_chop',   name: 'Chop',       icon: '🪓', description: 'Downward chop. Raw impact.',       slot: 1, tier: 'T1', cooldown: 0, range: 1, tags: ['attack','damage'], stats: ['100% DMG'],              dmgMultiplier: 1.0 },
        { id: 'axe1_hack',   name: 'Hack',        icon: '⚔️', description: 'Rapid hack. Low damage, fast.',   slot: 1, tier: 'T1', cooldown: 0, range: 1, tags: ['attack','damage'], stats: ['75% DMG','fast'],         dmgMultiplier: 0.75 },
        { id: 'axe1_hurl',   name: 'Throw Axe',   icon: '🎯', description: 'Hurl the axe. Short range throw.',slot: 1, tier: 'T1', cooldown: 1, range: 3, tags: ['attack','damage'], stats: ['85% DMG','range 3'],      dmgMultiplier: 0.85 },
      ]},
      { slot: 2, label: 'Core', sublabel: 'Axe techniques', skills: [
        { id: 'axe1_shatter', name: 'Shield Shatter', icon: '💥', description: 'Smash through blocking stance.',slot: 2, tier: 'T1', cooldown: 2, range: 1, tags: ['attack','damage'], stats: ['90% DMG','break block'],  dmgMultiplier: 0.90 },
        { id: 'axe1_maim',    name: 'Maim',           icon: '🦵', description: 'Cripple leg. Reduce target SPD.',slot: 2, tier: 'T1', cooldown: 3, range: 1, tags: ['debuff','attack'],  stats: ['80% DMG','-2 move 2t'],  dmgMultiplier: 0.80 },
        { id: 'axe1_berserk', name: 'Berserk Blow',   icon: '😤', description: 'Hit hard, leave yourself open.',slot: 2, tier: 'T1', cooldown: 2, range: 1, tags: ['attack','damage'], stats: ['140% DMG','-20% DEF 1t'],dmgMultiplier: 1.40 },
      ]},
      { slot: 3, label: 'Utility', sublabel: 'Tactical', skills: [
        { id: 'axe1_spin',  name: 'Axe Spin',    icon: '🌀', description: 'Spin attack on adjacent tiles.',   slot: 3, tier: 'T2', cooldown: 3, range: 1, tags: ['attack','aoe'],    stats: ['70% DMG','all adjacent'], dmgMultiplier: 0.70, aoe: true },
        { id: 'axe1_pull',  name: 'Hooking Pull',icon: '⛓️', description: 'Hook and drag enemy closer.',      slot: 3, tier: 'T2', cooldown: 4, range: 2, tags: ['utility','debuff'],stats: ['Pull to melee'] },
        { id: 'axe1_blood', name: 'Bloodlust',   icon: '🩸', description: 'Regain stamina on kill.',          slot: 3, tier: 'T2', cooldown: 3, range: 0, tags: ['buff'],            stats: ['+30 stamina on kill'], selfTarget: true },
      ]},
      { slot: 4, label: 'Special', sublabel: 'Signature', skills: [
        { id: 'axe1_cleave',  name: 'Cleave',       icon: '⚔️', description: 'Hit two adjacent enemies.',          slot: 4, tier: 'T2', cooldown: 4, range: 1, tags: ['attack','aoe'],    stats: ['90% DMG 2 targets'],  dmgMultiplier: 0.90 },
        { id: 'axe1_whirl',   name: 'Whirlwind',    icon: '💨', description: 'Wide swing, stun on hit.',            slot: 4, tier: 'T2', cooldown: 4, range: 1, tags: ['attack','damage'], stats: ['100% DMG','Stun 1t'],  dmgMultiplier: 1.0, applyStatus: 'stunned', statusDuration: 1 },
        { id: 'axe1_rampage', name: 'Rampage',      icon: '🔥', description: 'Attack again if target is killed.',   slot: 4, tier: 'T2', cooldown: 5, range: 1, tags: ['attack','damage'], stats: ['110% DMG','re-attack'],dmgMultiplier: 1.10 },
      ]},
      { slot: 5, label: 'Ultimate', sublabel: 'Rampage', skills: [
        { id: 'axe1_frenzy',  name: 'Battle Frenzy', icon: '🌋', description: 'Attack 4 times at reduced damage.', slot: 5, tier: 'T3', cooldown: 6, range: 1, tags: ['attack','ultimate'], stats: ['4×60% DMG'],           dmgMultiplier: 2.40 },
        { id: 'axe1_warcry',  name: 'War Cry',       icon: '📣', description: 'Buff all allies ATK+25% 2 turns.',   slot: 5, tier: 'T3', cooldown: 6, range: 0, tags: ['buff','ultimate'],   stats: ['+25% ATK allies 2t'],  selfTarget: true },
        { id: 'axe1_skull',   name: 'Skull Breaker', icon: '💀', description: 'Devastating overhead, stun target.', slot: 5, tier: 'T3', cooldown: 7, range: 1, tags: ['attack','ultimate'], stats: ['180% DMG','Stun 2t'],  dmgMultiplier: 1.80, applyStatus: 'stunned', statusDuration: 2 },
      ]},
    ],
  },

  mace: {
    weaponType: 'mace', displayName: 'Mace', icon: '🔨',
    description: 'A heavy blunt weapon. Crushes armor and bones alike. Preferred by holy warriors and siege fighters.',
    slots: [
      { slot: 1, label: 'Basic Attack', sublabel: 'Bludgeon options', skills: [
        { id: 'mce_smash',  name: 'Smash',       icon: '🔨', description: 'Crushing blow. Ignores some armor.',  slot: 1, tier: 'T1', cooldown: 0, range: 1, tags: ['attack','damage'], stats: ['100% DMG','+10% armor pen'], dmgMultiplier: 1.0, armorPen: 10 },
        { id: 'mce_bash',   name: 'Shield Bash', icon: '🛡️', description: 'Bash with shield edge, stagger foe.', slot: 1, tier: 'T1', cooldown: 0, range: 1, tags: ['attack','debuff'],  stats: ['70% DMG','stagger'],          dmgMultiplier: 0.70 },
        { id: 'mce_pummel', name: 'Pummel',      icon: '👊', description: 'Rapid blows. Low per-hit damage.',    slot: 1, tier: 'T1', cooldown: 0, range: 1, tags: ['attack','damage'], stats: ['2×50% DMG'],                  dmgMultiplier: 1.0 },
      ]},
      { slot: 2, label: 'Core', sublabel: 'Impact techniques', skills: [
        { id: 'mce_concuss',  name: 'Concussion', icon: '💫', description: 'Daze target. Reduce accuracy.',          slot: 2, tier: 'T1', cooldown: 2, range: 1, tags: ['attack','debuff'],  stats: ['80% DMG','Stun 1t'],         dmgMultiplier: 0.80, applyStatus: 'stunned', statusDuration: 1 },
        { id: 'mce_crack',    name: 'Armor Crack',icon: '🔓', description: 'Crack armor. Permanent DEF reduction.',  slot: 2, tier: 'T1', cooldown: 3, range: 1, tags: ['debuff','attack'],  stats: ['75% DMG','-15% DEF perm'],   dmgMultiplier: 0.75 },
        { id: 'mce_rally',    name: 'Rally',       icon: '🏳️', description: 'Strike bolsters own defense.',          slot: 2, tier: 'T1', cooldown: 2, range: 1, tags: ['attack','buff'],    stats: ['80% DMG','+20% DEF 2t'],     dmgMultiplier: 0.80 },
      ]},
      { slot: 3, label: 'Utility', sublabel: 'Field control', skills: [
        { id: 'mce_groundpound', name: 'Ground Pound', icon: '💥', description: 'Slam ground. Knock nearby back.',  slot: 3, tier: 'T2', cooldown: 3, range: 1, tags: ['aoe','utility'], stats: ['60% DMG','push 1 tile'],    dmgMultiplier: 0.60, aoe: true },
        { id: 'mce_tremble',     name: 'Earth Tremble',icon: '🌍', description: 'Shockwave slows all nearby foes.', slot: 3, tier: 'T2', cooldown: 4, range: 2, tags: ['aoe','debuff'],  stats: ['-1 move 2t','all nearby'] },
        { id: 'mce_ironwill',    name: 'Iron Will',    icon: '🪨', description: 'Fortify self. Halve damage 1t.',   slot: 3, tier: 'T2', cooldown: 3, range: 0, tags: ['buff'],          stats: ['50% damage reduction 1t'],  selfTarget: true },
      ]},
      { slot: 4, label: 'Special', sublabel: 'Heavy blows', skills: [
        { id: 'mce_obliterate', name: 'Obliterate',   icon: '💢', description: 'Massive overhead. Ignore 30% armor.', slot: 4, tier: 'T2', cooldown: 4, range: 1, tags: ['attack','damage'], stats: ['140% DMG','+30% armor pen'], dmgMultiplier: 1.40, armorPen: 30 },
        { id: 'mce_detonate',   name: 'Holy Detonate',icon: '✨', description: 'Imbue strike with holy force.',       slot: 4, tier: 'T2', cooldown: 4, range: 1, tags: ['attack','damage'], stats: ['120% DMG','undead bonus'],   dmgMultiplier: 1.20 },
        { id: 'mce_earthquake', name: 'Earthquake',   icon: '🌋', description: 'Shockwave freezes all in range.',    slot: 4, tier: 'T2', cooldown: 5, range: 2, tags: ['aoe','debuff'],    stats: ['80% DMG','Freeze 2t'],       dmgMultiplier: 0.80, applyStatus: 'frozen', statusDuration: 2 },
      ]},
      { slot: 5, label: 'Ultimate', sublabel: 'Judgment', skills: [
        { id: 'mce_armageddon', name: 'Armageddon', icon: '☄️', description: 'Crushing AoE smash. Stun all hit.',    slot: 5, tier: 'T3', cooldown: 6, range: 2, tags: ['attack','aoe','ultimate'], stats: ['120% DMG','Stun 2t AoE'], dmgMultiplier: 1.20, aoe: true, applyStatus: 'stunned', statusDuration: 2 },
        { id: 'mce_divine',     name: 'Divine Wrath',icon: '⚡', description: 'Call down holy judgment on target.', slot: 5, tier: 'T3', cooldown: 6, range: 3, tags: ['attack','ultimate'],        stats: ['200% DMG','divine'],     dmgMultiplier: 2.0 },
        { id: 'mce_fortress',   name: 'Living Fortress',icon:'🏰',description: 'Become immovable. +60% DEF 3t.',   slot: 5, tier: 'T3', cooldown: 7, range: 0, tags: ['buff','ultimate'],          stats: ['+60% DEF 3t'],          selfTarget: true },
      ]},
    ],
  },

  greathammer: {
    weaponType: 'greathammer', displayName: 'Greathammer', icon: '🔩',
    description: 'A massive two-handed maul. Crushes everything in its path. Slow to swing but devastating on contact.',
    slots: [
      { slot: 1, label: 'Basic Attack', sublabel: 'Maul options', skills: [
        { id: 'ghm_maul',    name: 'Maul',        icon: '🔩', description: 'Massive overhead crush.',         slot: 1, tier: 'T1', cooldown: 0, range: 1, tags: ['attack','damage'], stats: ['130% DMG','+20% armor pen'], dmgMultiplier: 1.30, armorPen: 20 },
        { id: 'ghm_sweep',   name: 'Wide Sweep',  icon: '↔️', description: 'Horizontal sweep, hits 2 targets.',slot: 1, tier: 'T1', cooldown: 1, range: 1, tags: ['attack','aoe'],    stats: ['90% DMG','2 targets'],       dmgMultiplier: 0.90 },
        { id: 'ghm_pound',   name: 'Ground Pound',icon: '💢', description: 'Slam into ground, AoE shockwave.', slot: 1, tier: 'T1', cooldown: 1, range: 1, tags: ['attack','aoe'],    stats: ['80% DMG','push back'],       dmgMultiplier: 0.80, aoe: true },
      ]},
      { slot: 2, label: 'Core', sublabel: 'Demolition', skills: [
        { id: 'ghm_shockwave', name: 'Shockwave',    icon: '🌊', description: 'Impact sends shockwave forward.',     slot: 2, tier: 'T1', cooldown: 2, range: 3, tags: ['attack','aoe'],    stats: ['70% DMG','line of 3'],       dmgMultiplier: 0.70 },
        { id: 'ghm_demolish',  name: 'Demolish',     icon: '🏚️', description: 'Annihilate armor in one blow.',       slot: 2, tier: 'T1', cooldown: 3, range: 1, tags: ['attack','damage'], stats: ['110% DMG','-30% DEF'],       dmgMultiplier: 1.10 },
        { id: 'ghm_brace',     name: 'Brace Impact', icon: '🛡️', description: 'Brace and counterattack powerfully.', slot: 2, tier: 'T1', cooldown: 2, range: 1, tags: ['buff','attack'],   stats: ['+30% DEF','150% counter'],   dmgMultiplier: 1.50 },
      ]},
      { slot: 3, label: 'Utility', sublabel: 'Area control', skills: [
        { id: 'ghm_tremor',  name: 'Tremor',      icon: '🌍', description: 'Stamp ground. Freeze all near.',     slot: 3, tier: 'T2', cooldown: 3, range: 2, tags: ['aoe','debuff'],  stats: ['Freeze 1t all nearby'],  applyStatus: 'frozen', statusDuration: 1 },
        { id: 'ghm_heave',   name: 'Heave',       icon: '💨', description: 'Throw enemy back 2 tiles.',         slot: 3, tier: 'T2', cooldown: 3, range: 1, tags: ['utility'],       stats: ['60% DMG','push 2 tiles'], dmgMultiplier: 0.60 },
        { id: 'ghm_fortify', name: 'Fortify',     icon: '🪨', description: 'Channel strength. +40% ATK next.',  slot: 3, tier: 'T2', cooldown: 3, range: 0, tags: ['buff'],          stats: ['+40% next attack'],       selfTarget: true },
      ]},
      { slot: 4, label: 'Special', sublabel: 'Devastation', skills: [
        { id: 'ghm_crater',   name: 'Crater Blow',  icon: '☄️', description: 'Massive hit. Stun and push.',         slot: 4, tier: 'T2', cooldown: 4, range: 1, tags: ['attack','damage'], stats: ['150% DMG','Stun 2t'],        dmgMultiplier: 1.50, applyStatus: 'stunned', statusDuration: 2 },
        { id: 'ghm_juggernaut',name: 'Juggernaut',  icon: '🚂', description: 'Charge through all enemies in path.',  slot: 4, tier: 'T2', cooldown: 4, range: 3, tags: ['move','attack'],   stats: ['100% DMG','trample all'],    dmgMultiplier: 1.0, moveBonus: 3 },
        { id: 'ghm_seismic',  name: 'Seismic Slam', icon: '🌋', description: 'Enormous shockwave. Hits all nearby.', slot: 4, tier: 'T2', cooldown: 5, range: 2, tags: ['attack','aoe'],   stats: ['110% DMG AoE'],              dmgMultiplier: 1.10, aoe: true },
      ]},
      { slot: 5, label: 'Ultimate', sublabel: 'World-Ender', skills: [
        { id: 'ghm_cataclysm',  name: 'Cataclysm',      icon: '💥', description: 'Apocalyptic slam. Stun entire field.',slot: 5, tier: 'T3', cooldown: 7, range: 2, tags: ['attack','aoe','ultimate'], stats: ['120% DMG AoE','Stun 2t'],  dmgMultiplier: 1.20, aoe: true, applyStatus: 'stunned', statusDuration: 2 },
        { id: 'ghm_mountain',   name: 'Mountain Fall',   icon: '🏔️', description: 'Summon the weight of a mountain.',    slot: 5, tier: 'T3', cooldown: 7, range: 1, tags: ['attack','ultimate'],        stats: ['250% DMG','full pierce'],  dmgMultiplier: 2.50, armorPen: 100 },
        { id: 'ghm_colossus',   name: 'Colossus Blow',   icon: '🗿', description: 'Become a colossus. 200% DMG next.',   slot: 5, tier: 'T3', cooldown: 6, range: 0, tags: ['buff','ultimate'],          stats: ['200% ATK 1 turn'],         selfTarget: true },
      ]},
    ],
  },

  lance: {
    weaponType: 'lance', displayName: 'Lance', icon: '🏹',
    description: 'A long reach polearm. Strikes enemies from 2 tiles away and punishes advancing foes with brutal counters.',
    slots: [
      { slot: 1, label: 'Basic Attack', sublabel: 'Reach strikes', skills: [
        { id: 'lnc_pierce',  name: 'Piercing Thrust', icon: '🏹', description: 'Thrust forward at reach-2.',      slot: 1, tier: 'T1', cooldown: 0, range: 2, tags: ['attack','damage'], stats: ['95% DMG','range 2'],         dmgMultiplier: 0.95 },
        { id: 'lnc_sweep',   name: 'Pole Sweep',       icon: '↔️', description: 'Wide polearm sweep at melee.',   slot: 1, tier: 'T1', cooldown: 1, range: 1, tags: ['attack','aoe'],    stats: ['80% DMG','hits adjacent'],    dmgMultiplier: 0.80, aoe: true },
        { id: 'lnc_poke',    name: 'Quick Poke',        icon: '💨', description: 'Fast jab, no cooldown.',        slot: 1, tier: 'T1', cooldown: 0, range: 2, tags: ['attack','damage'], stats: ['70% DMG','fast'],             dmgMultiplier: 0.70 },
      ]},
      { slot: 2, label: 'Core', sublabel: 'Polearm control', skills: [
        { id: 'lnc_opport',  name: 'Opportunity',  icon: '⚡', description: 'Counter any enemy entering melee.',  slot: 2, tier: 'T1', cooldown: 2, range: 2, tags: ['buff'],            stats: ['150% counter on approach'] },
        { id: 'lnc_keepback', name: 'Keep Back',   icon: '🚫', description: 'Push all melee attackers back 1.',   slot: 2, tier: 'T1', cooldown: 3, range: 1, tags: ['utility','debuff'],stats: ['Push all melee back 1'] },
        { id: 'lnc_skewer',  name: 'Skewer',       icon: '🗡️', description: 'Impale. Pin enemy for 1 turn.',      slot: 2, tier: 'T1', cooldown: 2, range: 2, tags: ['attack','debuff'],  stats: ['90% DMG','Pin 1t'],          dmgMultiplier: 0.90, applyStatus: 'stunned', statusDuration: 1 },
      ]},
      { slot: 3, label: 'Utility', sublabel: 'Tactical reach', skills: [
        { id: 'lnc_vault',   name: 'Vault',       icon: '🦘', description: 'Vault over an obstacle tile. Ignores walls and terrain between attacker and target.', slot: 3, tier: 'T2', cooldown: 3, range: 3, tags: ['move','utility'],  stats: ['Jump 3 tiles', 'ignores walls'], attackType: 'jump' as const },
        { id: 'lnc_guard',   name: 'Guard Stance',icon: '🛡️', description: 'Block with shaft. +30% DEF 2t.',    slot: 3, tier: 'T2', cooldown: 3, range: 0, tags: ['buff'],            stats: ['+30% DEF 2t'],             selfTarget: true },
        { id: 'lnc_line',    name: 'Line Control', icon: '📏', description: 'Zone off a row of tiles.',          slot: 3, tier: 'T2', cooldown: 4, range: 3, tags: ['utility'],        stats: ['Block movement row 1t'] },
      ]},
      { slot: 4, label: 'Special', sublabel: 'Charge attacks', skills: [
        { id: 'lnc_charge',   name: 'Cavalry Charge', icon: '🐴', description: 'Charge forward and strike — range extends greatly during the charge.', slot: 4, tier: 'T2', cooldown: 4, range: 3, tags: ['move','attack'],  stats: ['140% DMG', '+5 dash range'],   dmgMultiplier: 1.40, moveBonus: 3, attackType: 'dash' as const, dashBonus: 5 },
        { id: 'lnc_impale',   name: 'Impale',         icon: '💀', description: 'Pin enemy to ground. Freeze 2t.',    slot: 4, tier: 'T2', cooldown: 4, range: 2, tags: ['attack','debuff'],stats: ['120% DMG','Freeze 2t'], dmgMultiplier: 1.20, applyStatus: 'frozen', statusDuration: 2 },
        { id: 'lnc_blitz',    name: 'Blitz',          icon: '⚡', description: 'Strike and reposition behind.',      slot: 4, tier: 'T2', cooldown: 4, range: 2, tags: ['move','attack'],  stats: ['100% DMG','pass through'],dmgMultiplier: 1.0, moveBonus: 2 },
      ]},
      { slot: 5, label: 'Ultimate', sublabel: 'Polearm master', skills: [
        { id: 'lnc_hurricane', name: 'Hurricane Spin', icon: '🌪️', description: 'Spin and hit all within 2 tiles.',  slot: 5, tier: 'T3', cooldown: 6, range: 2, tags: ['attack','aoe','ultimate'], stats: ['130% DMG all nearby'],  dmgMultiplier: 1.30, aoe: true },
        { id: 'lnc_dragoon',   name: 'Dragoon Dive',   icon: '🐉', description: 'Leap high over terrain and crash down on any enemy within 5 tiles. Ignores all obstacles.',slot: 5, tier: 'T3', cooldown: 6, range: 5, tags: ['attack','ultimate'],        stats: ['180% DMG','leap 5','ignores walls'],     dmgMultiplier: 1.80, moveBonus: 4, attackType: 'jump' as const },
        { id: 'lnc_formation', name: 'Formation Call', icon: '📣', description: 'Phalanx: +30% DEF all allies 2t.',  slot: 5, tier: 'T3', cooldown: 7, range: 0, tags: ['buff','ultimate'],          stats: ['+30% DEF all allies 2t'], selfTarget: true },
      ]},
    ],
  },

  crossbow: {
    weaponType: 'crossbow', displayName: 'Crossbow', icon: '🎯',
    description: 'A mechanical ranged weapon. Powerful bolts pierce deeply. Slower to reload but devastating accuracy.',
    slots: [
      { slot: 1, label: 'Basic Attack', sublabel: 'Bolt options', skills: [
        { id: 'xbw_bolt',   name: 'Bolt Shot',    icon: '🎯', description: 'Fire a heavy bolt. High penetration.', slot: 1, tier: 'T1', cooldown: 0, range: 5, tags: ['attack','damage'], stats: ['105% DMG','+15% armor pen'], dmgMultiplier: 1.05, armorPen: 15 },
        { id: 'xbw_rapid',  name: 'Rapid Bolt',   icon: '💨', description: 'Two quick bolts, lower accuracy.',      slot: 1, tier: 'T1', cooldown: 1, range: 5, tags: ['attack','damage'], stats: ['2×65% DMG'],                  dmgMultiplier: 1.30 },
        { id: 'xbw_snipe',  name: 'Aimed Shot',   icon: '🔭', description: 'Take aim. Higher crit chance.',        slot: 1, tier: 'T1', cooldown: 1, range: 7, tags: ['attack','damage'], stats: ['90% DMG','crit+25%','range 7'],dmgMultiplier: 0.90 },
      ]},
      { slot: 2, label: 'Core', sublabel: 'Bolt techniques', skills: [
        { id: 'xbw_pin',     name: 'Pinning Bolt', icon: '📌', description: 'Pin enemy to ground. Can\'t move 1t.',  slot: 2, tier: 'T1', cooldown: 2, range: 5, tags: ['attack','debuff'],  stats: ['80% DMG','Pin 1t'],          dmgMultiplier: 0.80, applyStatus: 'stunned', statusDuration: 1 },
        { id: 'xbw_toxic',   name: 'Toxic Bolt',   icon: '🧪', description: 'Poisoned tip. Damage over time.',       slot: 2, tier: 'T1', cooldown: 2, range: 5, tags: ['attack','debuff'],  stats: ['75% DMG','Poison 3t'],       dmgMultiplier: 0.75, applyStatus: 'poisoned', statusDuration: 3 },
        { id: 'xbw_recoil',  name: 'Recoil Shot',  icon: '💥', description: 'Powerful shot knocks you back 1.',      slot: 2, tier: 'T1', cooldown: 2, range: 6, tags: ['attack','move'],    stats: ['120% DMG','self push 1'],    dmgMultiplier: 1.20 },
      ]},
      { slot: 3, label: 'Utility', sublabel: 'Field support', skills: [
        { id: 'xbw_volley', name: 'Volley',        icon: '🌧️', description: 'Rain bolts on small area.',          slot: 3, tier: 'T2', cooldown: 3, range: 5, tags: ['attack','aoe'],  stats: ['60% DMG','3×3 area'],      dmgMultiplier: 0.60, aoe: true },
        { id: 'xbw_scope',  name: 'Scope',         icon: '🔭', description: 'Reveal all enemies. +1 range 2t.',   slot: 3, tier: 'T2', cooldown: 4, range: 0, tags: ['utility','buff'], stats: ['Reveal all','+1 range 2t'], selfTarget: true },
        { id: 'xbw_dodge',  name: 'Reload & Roll', icon: '🎲', description: 'Reload while dodging back 1 tile.',  slot: 3, tier: 'T2', cooldown: 3, range: 0, tags: ['move','buff'],    stats: ['Reload','retreat 1'],       selfTarget: true },
      ]},
      { slot: 4, label: 'Special', sublabel: 'Precision bolts', skills: [
        { id: 'xbw_explode',  name: 'Explosive Bolt',icon: '💣', description: 'Bolt detonates on impact. AoE.',     slot: 4, tier: 'T2', cooldown: 4, range: 5, tags: ['attack','aoe'],    stats: ['80% DMG','2-tile AoE'],     dmgMultiplier: 0.80, aoe: true },
        { id: 'xbw_freeze',   name: 'Frost Bolt',    icon: '❄️', description: 'Enchanted ice bolt. Freeze target.',  slot: 4, tier: 'T2', cooldown: 4, range: 5, tags: ['attack','debuff'],  stats: ['90% DMG','Freeze 2t'],     dmgMultiplier: 0.90, applyStatus: 'frozen', statusDuration: 2 },
        { id: 'xbw_armor',    name: 'Armor Piercer', icon: '🔩', description: 'Bolt ignores 50% armor.',             slot: 4, tier: 'T2', cooldown: 4, range: 6, tags: ['attack','damage'],  stats: ['100% DMG','+50% armor pen'],dmgMultiplier: 1.0, armorPen: 50 },
      ]},
      { slot: 5, label: 'Ultimate', sublabel: 'Deadeye', skills: [
        { id: 'xbw_deadeye', name: 'Deadeye',      icon: '🎯', description: 'Perfect shot. Cannot miss, crit.',      slot: 5, tier: 'T3', cooldown: 6, range: 8, tags: ['attack','ultimate'],        stats: ['200% DMG','guaranteed crit'],dmgMultiplier: 2.0 },
        { id: 'xbw_barrage', name: 'Barrage',      icon: '🌩️', description: 'Fire 6 bolts at different targets.',    slot: 5, tier: 'T3', cooldown: 7, range: 6, tags: ['attack','aoe','ultimate'],   stats: ['6×50% DMG diff targets'],   dmgMultiplier: 3.0 },
        { id: 'xbw_silence', name: 'Silence Shot', icon: '🔇', description: 'Anti-magic bolt. Disables spells 2t.', slot: 5, tier: 'T3', cooldown: 6, range: 6, tags: ['debuff','ultimate'],          stats: ['80% DMG','No spells 2t'],   dmgMultiplier: 0.80 },
      ]},
    ],
  },

  gun: {
    weaponType: 'gun', displayName: 'Flintlock Gun', icon: '🔫',
    description: 'A fearsome ranged firearm. Loud, powerful, and unexpected on the battlefield. Long range with punishing hits.',
    slots: [
      { slot: 1, label: 'Basic Attack', sublabel: 'Fire options', skills: [
        { id: 'gun_shot',   name: 'Fire',        icon: '🔫', description: 'Single powerful shot at range.',     slot: 1, tier: 'T1', cooldown: 1, range: 7, tags: ['attack','damage'], stats: ['120% DMG','long range'],     dmgMultiplier: 1.20 },
        { id: 'gun_shot2',  name: 'Double Shot', icon: '⚡', description: 'Two barrels at once. Short range.',  slot: 1, tier: 'T1', cooldown: 2, range: 4, tags: ['attack','damage'], stats: ['2×80% DMG','range 4'],       dmgMultiplier: 1.60 },
        { id: 'gun_quick',  name: 'Quick Draw',  icon: '💨', description: 'Fast unholster and fire.',           slot: 1, tier: 'T1', cooldown: 1, range: 5, tags: ['attack','damage'], stats: ['90% DMG','fast'],            dmgMultiplier: 0.90 },
      ]},
      { slot: 2, label: 'Core', sublabel: 'Gunfighter tricks', skills: [
        { id: 'gun_smoke',  name: 'Smoke Shot', icon: '💨', description: 'Smoke-loaded shot. Blind enemy 2t.',  slot: 2, tier: 'T1', cooldown: 2, range: 5, tags: ['attack','debuff'],  stats: ['70% DMG','Blind 2t'],        dmgMultiplier: 0.70 },
        { id: 'gun_buck',   name: 'Buckshot',   icon: '💥', description: 'Scatter shot hits 3 in a cone.',     slot: 2, tier: 'T1', cooldown: 2, range: 3, tags: ['attack','aoe'],    stats: ['60% DMG','3 targets cone'],   dmgMultiplier: 0.60, aoe: true },
        { id: 'gun_reload', name: 'Fan & Fire', icon: '🌀', description: 'Fan the hammer. 3 fast shots.',      slot: 2, tier: 'T1', cooldown: 3, range: 5, tags: ['attack','damage'], stats: ['3×50% DMG'],                  dmgMultiplier: 1.50 },
      ]},
      { slot: 3, label: 'Utility', sublabel: 'Gunslinger moves', skills: [
        { id: 'gun_cover', name: 'Cover Fire',   icon: '🛡️', description: 'Suppress area. Enemy can\'t move.',  slot: 3, tier: 'T2', cooldown: 3, range: 5, tags: ['aoe','utility'],  stats: ['Suppress 2-tile zone 1t'] },
        { id: 'gun_flee',  name: 'Evasive Fire', icon: '🏃', description: 'Shoot while retreating 2 tiles.',   slot: 3, tier: 'T2', cooldown: 3, range: 4, tags: ['move','attack'],   stats: ['80% DMG','retreat 2 tiles'], dmgMultiplier: 0.80, moveBonus: 2 },
        { id: 'gun_aim',   name: 'Dead Aim',     icon: '🎯', description: 'Spend a turn. +60% DMG next shot.', slot: 3, tier: 'T2', cooldown: 3, range: 0, tags: ['buff'],            stats: ['+60% DMG next shot'],        selfTarget: true },
      ]},
      { slot: 4, label: 'Special', sublabel: 'Outlaw shots', skills: [
        { id: 'gun_explosive', name: 'Explosive Round',icon: '💣', description: 'Grenade-tipped shot. AoE blast.',     slot: 4, tier: 'T2', cooldown: 4, range: 5, tags: ['attack','aoe'],    stats: ['90% DMG','2-tile AoE'],     dmgMultiplier: 0.90, aoe: true },
        { id: 'gun_marked',    name: 'Mark Target',     icon: '🎯', description: 'Paint target. All allies +20% vs them.',slot: 4, tier: 'T2', cooldown: 4, range: 6, tags: ['debuff','utility'],stats: ['Mark: +20% DMG received'] },
        { id: 'gun_execution', name: 'Execution Shot',  icon: '💀', description: 'Finish a weakened enemy.',            slot: 4, tier: 'T2', cooldown: 4, range: 7, tags: ['attack','damage'],  stats: ['150% vs <25% HP'],          dmgMultiplier: 1.50 },
      ]},
      { slot: 5, label: 'Ultimate', sublabel: 'Gunslinger legend', skills: [
        { id: 'gun_legend',  name: 'Legendary Shot', icon: '🌟', description: 'Perfect shot through all enemies in line.',slot: 5, tier: 'T3', cooldown: 6, range: 8, tags: ['attack','ultimate'],        stats: ['160% DMG','full line'],  dmgMultiplier: 1.60 },
        { id: 'gun_hailfire',name: 'Hail of Lead',   icon: '🌩️', description: 'Unload everything. 5 shots random.',    slot: 5, tier: 'T3', cooldown: 7, range: 6, tags: ['attack','aoe','ultimate'],   stats: ['5×70% random'],         dmgMultiplier: 3.50 },
        { id: 'gun_outlawking',name:'Outlaw King',    icon: '👑', description: 'Turn and fire 360°. Hit all enemies.',   slot: 5, tier: 'T3', cooldown: 7, range: 4, tags: ['attack','aoe','ultimate'],   stats: ['100% DMG all enemies'], dmgMultiplier: 1.0, aoe: true },
      ]},
    ],
  },

  focus: {
    weaponType: 'focus', displayName: 'Arcane Focus', icon: '🔮',
    description: 'A crystalline arcane amplifier. Channels pure magical energy with precision, utility, and arcane mastery.',
    slots: [
      { slot: 1, label: 'Basic Attack', sublabel: 'Arcane bolts', skills: [
        { id: 'fcs_bolt',   name: 'Arcane Bolt',  icon: '🔮', description: 'Pure arcane projectile at range.',    slot: 1, tier: 'T1', cooldown: 0, range: 5, tags: ['attack','damage'], stats: ['90% DMG (magic)'],            dmgMultiplier: 0.90 },
        { id: 'fcs_pulse',  name: 'Mana Pulse',   icon: '💜', description: 'Wave of force. Low damage, no armor.', slot: 1, tier: 'T1', cooldown: 0, range: 4, tags: ['attack','damage'], stats: ['70% DMG','ignores DEF'],      dmgMultiplier: 0.70, armorPen: 100 },
        { id: 'fcs_siphon', name: 'Mana Siphon',  icon: '🧲', description: 'Drain enemy MP on hit.',              slot: 1, tier: 'T1', cooldown: 1, range: 4, tags: ['attack','debuff'],  stats: ['60% DMG','-20 MP target'],    dmgMultiplier: 0.60 },
      ]},
      { slot: 2, label: 'Core', sublabel: 'Arcane techniques', skills: [
        { id: 'fcs_shield', name: 'Arcane Shield',icon: '🛡️', description: 'Barrier absorbs 1 hit.',              slot: 2, tier: 'T1', cooldown: 2, range: 0, tags: ['buff'],            stats: ['Absorb 1 attack'],             selfTarget: true },
        { id: 'fcs_slow',   name: 'Time Warp',    icon: '⏱️', description: 'Slow target. Lose 1 CT per turn.',    slot: 2, tier: 'T1', cooldown: 3, range: 4, tags: ['debuff'],          stats: ['Slow: -20 CT 2t'] },
        { id: 'fcs_chain',  name: 'Chain Bolt',   icon: '⛓️', description: 'Bolt chains to nearby enemy.',       slot: 2, tier: 'T1', cooldown: 2, range: 4, tags: ['attack','aoe'],    stats: ['70% DMG +chain 50%'],          dmgMultiplier: 0.70 },
      ]},
      { slot: 3, label: 'Utility', sublabel: 'Arcane utility', skills: [
        { id: 'fcs_teleport',name:'Blink',         icon: '✨', description: 'Teleport to any tile in range.',    slot: 3, tier: 'T2', cooldown: 3, range: 4, tags: ['move','utility'],  stats: ['Teleport 4 tiles'],           mobilityType: 'teleport', ignoresObstacles: true },
        { id: 'fcs_reveal', name: 'Arcane Eye',    icon: '👁️', description: 'See through fog. +2 range 2t.',    slot: 3, tier: 'T2', cooldown: 4, range: 0, tags: ['utility','buff'],  stats: ['Reveal map','+2 range 2t'],   selfTarget: true },
        { id: 'fcs_drain',  name: 'Drain Life',   icon: '🩸', description: 'Steal HP from target.',             slot: 3, tier: 'T2', cooldown: 3, range: 4, tags: ['attack','heal'],   stats: ['80% DMG','steal 40% HP'],     dmgMultiplier: 0.80, healMultiplier: 0.40 },
      ]},
      { slot: 4, label: 'Special', sublabel: 'Advanced spells', skills: [
        { id: 'fcs_cage',    name: 'Arcane Cage', icon: '🔒', description: 'Trap enemy. Cannot act 2 turns.',   slot: 4, tier: 'T2', cooldown: 4, range: 4, tags: ['debuff'],           stats: ['Trap 2t'],                    applyStatus: 'stunned', statusDuration: 2 },
        { id: 'fcs_overload',name: 'Overload',    icon: '💥', description: 'Dump all MP into one burst.',       slot: 4, tier: 'T2', cooldown: 5, range: 4, tags: ['attack','damage'],  stats: ['DMG = MP spent×2'],           dmgMultiplier: 2.0 },
        { id: 'fcs_mirror',  name: 'Mirror Force', icon: '🪞', description: 'Reflect next magical attack.',     slot: 4, tier: 'T2', cooldown: 4, range: 0, tags: ['buff'],             stats: ['Reflect next spell'],         selfTarget: true },
      ]},
      { slot: 5, label: 'Ultimate', sublabel: 'Arcane mastery', skills: [
        { id: 'fcs_singularity', name: 'Singularity',  icon: '🌌', description: 'Black hole pulls all into center.',   slot: 5, tier: 'T3', cooldown: 6, range: 4, tags: ['aoe','ultimate'],        stats: ['Pull all','80% DMG center'],  dmgMultiplier: 0.80, aoe: true },
        { id: 'fcs_timestop',    name: 'Time Stop',    icon: '⏰', description: 'Freeze all enemies for 1 full turn.', slot: 5, tier: 'T3', cooldown: 7, range: 0, tags: ['aoe','ultimate'],        stats: ['All enemies Freeze 1t'],      applyStatus: 'frozen', statusDuration: 1, selfTarget: true },
        { id: 'fcs_arcanestorm', name: 'Arcane Storm', icon: '⚡', description: 'Storm of bolts hits all enemies.',    slot: 5, tier: 'T3', cooldown: 7, range: 5, tags: ['attack','aoe','ultimate'], stats: ['120% DMG all foes'],          dmgMultiplier: 1.20, aoe: true },
      ]},
    ],
  },

};

// ── Universal Mobility Skills (available to all weapon trees via slot 3) ─────
// These are injected into every weapon tree's slot 3 as additional options.
export const UNIVERSAL_MOBILITY_SKILLS: Skill[] = [
  {
    id: 'mob_team_jump', name: 'Team Jump', icon: '🦘',
    description: 'Bounce off an adjacent ally to land anywhere within range. Ignores obstacles. Requires an ally within 1 tile.',
    slot: 3, tier: 'T2', cooldown: 2, range: 5,
    tags: ['move', 'utility'],
    stats: ['Jump 5 tiles', 'needs adjacent ally', 'ignores obstacles'],
    mobilityType: 'team_jump', ignoresObstacles: true, selfTarget: false,
  },
  {
    id: 'mob_flight', name: 'Heroic Leap', icon: '🦅',
    description: 'Soar through the air to any tile within range, flying over all obstacles and units.',
    slot: 3, tier: 'T2', cooldown: 3, range: 6,
    tags: ['move', 'utility'],
    stats: ['Fly 6 tiles', 'ignores obstacles & units'],
    mobilityType: 'flight', ignoresObstacles: true, selfTarget: false,
  },
  {
    id: 'mob_teleport', name: 'Shadow Step', icon: '🌀',
    description: 'Blink instantly to any tile within range. Ignores obstacles, LOS, and units.',
    slot: 3, tier: 'T3', cooldown: 4, range: 4,
    tags: ['move', 'utility'],
    stats: ['Teleport 4 tiles', 'ignores everything'],
    mobilityType: 'teleport', ignoresObstacles: true, selfTarget: false,
  },
];

// ── Universal Dash-Strike Skills (melee weapons, slot 2 or 4) ───────────────
// These give melee characters extended reach with a dash-strike-return mechanic.
export const DASH_STRIKE_SKILLS: Skill[] = [
  {
    id: 'dash_lunge', name: 'Lunge Strike', icon: '⚔️',
    description: 'Dash 3 tiles to strike an enemy, then spring back to your original position. High risk, high reward.',
    slot: 2, tier: 'T2', cooldown: 2, range: 1,
    tags: ['attack', 'damage', 'move'],
    stats: ['110% DMG', 'dash 3', 'returns to origin'],
    dmgMultiplier: 1.1, attackType: 'dash', dashBonus: 2, returnsToOrigin: true,
  },
  {
    id: 'dash_blitz', name: 'Blitz Rush', icon: '💨',
    description: 'Rush 4 tiles and deliver a devastating blow. You stay at the target\'s position after striking.',
    slot: 2, tier: 'T2', cooldown: 3, range: 1,
    tags: ['attack', 'damage', 'move'],
    stats: ['130% DMG', 'dash 3', 'stays at target'],
    dmgMultiplier: 1.3, attackType: 'dash', dashBonus: 3, returnsToOrigin: false,
  },
  {
    id: 'dash_skirmish', name: 'Hit & Run', icon: '🏃',
    description: 'Quick dash to strike, then immediately return. Lower damage but safe positioning.',
    slot: 4, tier: 'T2', cooldown: 2, range: 1,
    tags: ['attack', 'damage', 'move'],
    stats: ['80% DMG', 'dash 2', 'returns safely'],
    dmgMultiplier: 0.8, attackType: 'dash', dashBonus: 1, returnsToOrigin: true,
  },
];

// Inject universal mobility skills into all weapon trees slot 3
for (const tree of Object.values(WEAPON_SKILL_TREES)) {
  const slot3 = tree.slots.find(s => s.slot === 3);
  if (slot3) {
    for (const mob of UNIVERSAL_MOBILITY_SKILLS) {
      if (!slot3.skills.some(s => s.id === mob.id)) {
        slot3.skills.push(mob);
      }
    }
  }
}

// ── Universal Long-Range Blast Skills (ALL weapons, slot 4) ─────────────────
// Every weapon gets at least one 10+ tile ranged blast option.
export const LONG_RANGE_BLAST_SKILLS: Skill[] = [
  {
    id: 'blast_energy_wave', name: 'Energy Wave', icon: '🌊',
    description: 'Channel weapon energy into a directional wave that travels 12 tiles. Hits the first enemy in its path.',
    slot: 4, tier: 'T2', cooldown: 3, range: 12,
    tags: ['attack', 'damage'],
    stats: ['90% DMG', 'range 12', 'directional'],
    dmgMultiplier: 0.9, attackType: 'normal',
  },
  {
    id: 'blast_piercing_shot', name: 'Piercing Shot', icon: '🎯',
    description: 'A focused strike that pierces through the air to hit targets up to 14 tiles away. Ignores half cover.',
    slot: 4, tier: 'T2', cooldown: 3, range: 14,
    tags: ['attack', 'damage'],
    stats: ['100% DMG', 'range 14', '+30% armor pen'],
    dmgMultiplier: 1.0, armorPen: 30, attackType: 'normal',
  },
  {
    id: 'blast_shockwave', name: 'Shockwave Slam', icon: '💥',
    description: 'Slam weapon into the ground creating a shockwave that travels 10 tiles in all directions. AoE at impact.',
    slot: 4, tier: 'T3', cooldown: 4, range: 10,
    tags: ['attack', 'damage', 'aoe'],
    stats: ['80% DMG', 'range 10', 'AoE impact'],
    dmgMultiplier: 0.8, aoe: true, attackType: 'normal',
  },
];

// Inject long-range blasts into ALL weapon trees slot 4
for (const tree of Object.values(WEAPON_SKILL_TREES)) {
  const slot4 = tree.slots.find(s => s.slot === 4);
  if (slot4) {
    for (const blast of LONG_RANGE_BLAST_SKILLS) {
      if (!slot4.skills.some(s => s.id === blast.id)) {
        slot4.skills.push(blast);
      }
    }
  }
}

// Inject dash-strike skills into melee weapon trees (slot 2)
const MELEE_WEAPON_TYPES = ['greataxe', 'greatsword', 'sword', 'sword_shield', 'war_hammer', 'daggers', 'rusted_sword', 'mace', 'axe', 'spear', 'lance'];
for (const wt of MELEE_WEAPON_TYPES) {
  const tree = WEAPON_SKILL_TREES[wt];
  if (!tree) continue;
  const slot2 = tree.slots.find(s => s.slot === 2);
  if (slot2) {
    for (const ds of DASH_STRIKE_SKILLS.filter(s => s.slot === 2)) {
      if (!slot2.skills.some(s => s.id === ds.id)) {
        slot2.skills.push(ds);
      }
    }
  }
  const slot4 = tree.slots.find(s => s.slot === 4);
  if (slot4) {
    for (const ds of DASH_STRIKE_SKILLS.filter(s => s.slot === 4)) {
      if (!slot4.skills.some(s => s.id === ds.id)) {
        slot4.skills.push(ds);
      }
    }
  }
}

// Map character ID to weapon type
export const CHARACTER_WEAPON_MAP: Record<string, string> = {
  'frost-orc-berserker':  'greataxe',
  'magma-orc-destroyer':  'fire_staff',
  'brother-maltheus':     'dark_staff',
  'canal-lurker':         'daggers',
  'warlord-garnok':       'greatsword',
  'elven-archer':         'bow',
  'orcish-warrior':       'greataxe',
  'human-knight':         'sword_shield',
  'human-barbarian':      'greatsword',
  'skeleton-undead':      'rusted_sword',
  'dwarven-forge-master': 'war_hammer',
  // RPG Characters Nov 2020 — weapon matches their animation set
  'orc-blood-guard':  'greatsword',   // Sword_Attack / Sword_Attack2
  'saltbone-corsair': 'bow',          // Bow_Shoot / Bow_Draw
  'grave-shade':      'daggers',      // Dagger_Attack / Dagger_Attack2
  'orc-warlock':      'fire_staff',   // Staff_Attack / Spell1 / Spell2
  'hollow-zealot':    'war_hammer',   // Staff_Attack / Spell1 (divine zealot)
  'iron-pilgrim':     'greatsword',   // Attack / Attack2 (warrior-monk)
};

// Get the weapon skill tree for a character
export function getWeaponTree(characterId: string): WeaponSkillTree | undefined {
  const weaponType = CHARACTER_WEAPON_MAP[characterId];
  return weaponType ? WEAPON_SKILL_TREES[weaponType] : undefined;
}

// Get skills for a specific slot from a weapon tree
export function getSlotSkills(characterId: string, slot: SkillSlot): Skill[] {
  const tree = getWeaponTree(characterId);
  if (!tree) return [];
  return tree.slots.find(s => s.slot === slot)?.skills || [];
}

// Get default skill selections (first option in each slot)
export function getDefaultSkillLoadout(characterId: string): Record<SkillSlot, string> {
  const tree = getWeaponTree(characterId);
  if (!tree) return {} as Record<SkillSlot, string>;
  const result = {} as Record<SkillSlot, string>;
  for (const slot of tree.slots) {
    if (slot.skills.length > 0) {
      result[slot.slot] = slot.skills[0].id;
    }
  }
  return result;
}

// Get a skill by ID
export function getSkillById(skillId: string): Skill | undefined {
  for (const tree of Object.values(WEAPON_SKILL_TREES)) {
    for (const slotDef of tree.slots) {
      const skill = slotDef.skills.find(s => s.id === skillId);
      if (skill) return skill;
    }
  }
  return undefined;
}

export const SLOT_LABELS: Record<SkillSlot, { roman: string; label: string; color: string }> = {
  1: { roman: 'I',   label: 'Attack',  color: '#ef4444' },
  2: { roman: 'II',  label: 'Core',    color: '#f97316' },
  3: { roman: 'III', label: 'Utility', color: '#3b82f6' },
  4: { roman: 'IV',  label: 'Special', color: '#a855f7' },
  5: { roman: 'V',   label: 'Ultimate', color: '#d4a017' },
};

export const TIER_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  T1: { label: 'T1', color: '#9ca3af', bg: '#1f2937' },
  T2: { label: 'T2', color: '#34d399', bg: '#064e3b' },
  T3: { label: 'T3', color: '#d4a017', bg: '#451a03' },
};
