import { WEAPON_SKILL_TREES, WeaponSkillTree } from './weapon-skills';

export type HeroWeaponOptions = [string, string, string];

export const HERO_WEAPON_OPTIONS: Record<string, HeroWeaponOptions> = {
  human_warrior:      ['sword_shield', 'greatsword', 'lance'],
  human_worg:         ['daggers',      'sword',       'mace'],
  human_mage:         ['fire_staff',   'focus',       'dark_staff'],
  human_ranger:       ['bow',          'crossbow',    'gun'],

  barbarian_warrior:  ['greataxe',     'greathammer', 'war_hammer'],
  barbarian_worg:     ['daggers',      'greataxe',    'axe'],
  barbarian_mage:     ['fire_staff',   'greathammer', 'dark_staff'],
  barbarian_ranger:   ['bow',          'axe',         'lance'],

  dwarf_warrior:      ['war_hammer',   'sword_shield','greathammer'],
  dwarf_worg:         ['mace',         'axe',         'daggers'],
  dwarf_mage:         ['fire_staff',   'focus',       'war_hammer'],
  dwarf_ranger:       ['crossbow',     'gun',         'war_hammer'],

  elf_warrior:        ['greatsword',   'sword',       'lance'],
  elf_worg:           ['daggers',      'bow',         'focus'],
  elf_mage:           ['fire_staff',   'focus',       'dark_staff'],
  elf_ranger:         ['bow',          'daggers',     'focus'],

  orc_warrior:        ['greataxe',     'greathammer', 'war_hammer'],
  orc_worg:           ['greataxe',     'mace',        'daggers'],
  orc_mage:           ['fire_staff',   'dark_staff',  'greataxe'],
  orc_ranger:         ['crossbow',     'lance',       'greataxe'],

  undead_warrior:     ['rusted_sword', 'mace',        'greatsword'],
  undead_worg:        ['daggers',      'rusted_sword','dark_staff'],
  undead_mage:        ['dark_staff',   'fire_staff',  'focus'],
  undead_ranger:      ['bow',          'dark_staff',  'gun'],

  pirate_king:        ['gun',          'sword',       'daggers'],
  sky_captain:        ['gun',          'crossbow',    'bow'],
  faith_barrier:      ['sword',        'axe',         'spear'],
};

/**
 * Form-specific weapon trees.
 * When a Worg activates a beast form, these replace the normal weapon loadout.
 */
export const FORM_WEAPON_MAP: Record<string, string> = {
  bear:    'bear_form',
  raptor:  'raptor_form',
  warbear: 'warbear_form',
};

export function getHeroWeaponOptionsForForm(formId: string): WeaponSkillTree[] {
  const key = FORM_WEAPON_MAP[formId];
  return key ? [WEAPON_SKILL_TREES[key]].filter(Boolean) : [];
}

export function getHeroWeaponOptions(characterId: string): WeaponSkillTree[] {
  const keys = HERO_WEAPON_OPTIONS[characterId] ?? ['sword', 'bow', 'fire_staff'];
  return keys.map(k => WEAPON_SKILL_TREES[k]).filter(Boolean);
}
