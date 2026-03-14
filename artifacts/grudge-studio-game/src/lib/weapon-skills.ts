export type SkillSlot = 1 | 2 | 3 | 4 | 5;
export type SkillTag = 'damage' | 'heal' | 'buff' | 'debuff' | 'aoe' | 'utility' | 'move' | 'attack' | 'ultimate';

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
            description: 'Vanish into shadows and reappear behind target for a crit strike.',
            slot: 2, tier: 'T2', cooldown: 3, range: 2,
            tags: ['attack', 'damage'],
            stats: ['150% DMG', 'guaranteed crit', 'shadow'],
            dmgMultiplier: 1.5
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
            description: 'Charge an enemy, dealing massive damage with momentum.',
            slot: 4, tier: 'T3', cooldown: 4, range: 2,
            tags: ['attack', 'damage'],
            stats: ['180% DMG', 'charge momentum', 'holy'],
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

};

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
