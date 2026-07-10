/**
 * Class skill supplements — invis, invincibility, traps, buffs per role.
 * Merged into hero loadouts at battle start (slot 2–3 picks).
 */
import type { Skill, SkillSlot } from './weapon-skills';

const WARRIOR_CLASS: Skill[] = [
  {
    id: 'cls_invincible', name: 'Iron Bastion', icon: '🛡️',
    description: 'Become invincible for 1 turn. Immune to all damage.',
    slot: 3, tier: 'T2', cooldown: 6, range: 0, tags: ['buff', 'utility'],
    stats: ['Invincible 1t'], applyStatus: 'invincible', statusDuration: 1, selfTarget: true,
  },
  {
    id: 'cls_war_cry', name: 'War Cry', icon: '📯',
    description: 'Rally nearby allies. +15% attack this turn.',
    slot: 2, tier: 'T1', cooldown: 4, range: 0, tags: ['buff', 'aoe'], stats: ['ATK +15% allies'], selfTarget: true,
    healMultiplier: 0, // buff-only marker
  },
];

const MAGE_CLASS: Skill[] = [
  {
    id: 'cls_arcane_trap', name: 'Arcane Snare', icon: '🔮',
    description: 'Place a magic trap. Stuns the first enemy to step on it.',
    slot: 3, tier: 'T2', cooldown: 5, range: 4, tags: ['debuff', 'utility'],
    stats: ['Trap: Stun 1t'], trapDamage: 0.15, applyStatus: 'stunned', statusDuration: 1,
  },
  {
    id: 'cls_mana_shield', name: 'Mana Shield', icon: '💠',
    description: 'Absorbing barrier — invincible for 1 turn.',
    slot: 2, tier: 'T1', cooldown: 5, range: 0, tags: ['buff'], stats: ['Invincible 1t'],
    applyStatus: 'invincible', statusDuration: 1, selfTarget: true,
  },
];

const RANGER_CLASS: Skill[] = [
  {
    id: 'cls_snare_trap', name: 'Snare Trap', icon: '🪤',
    description: 'Hidden trap. Damages and poisons trespassers.',
    slot: 3, tier: 'T2', cooldown: 4, range: 5, tags: ['debuff', 'utility'],
    stats: ['Trap: 20% HP + Poison'], trapDamage: 0.2, applyStatus: 'poisoned', statusDuration: 2,
  },
  {
    id: 'cls_camouflage', name: 'Camouflage', icon: '👁️',
    description: 'Fade from sight. Invisible for 2 turns.',
    slot: 2, tier: 'T1', cooldown: 5, range: 0, tags: ['buff', 'utility'], stats: ['Invisible 2t'],
    applyStatus: 'invisible', statusDuration: 2, selfTarget: true,
  },
];

const WORG_CLASS: Skill[] = [
  {
    id: 'cls_feral_rage', name: 'Feral Rage', icon: '🐺',
    description: 'Enter a berserk state. Invincible for 1 turn.',
    slot: 3, tier: 'T2', cooldown: 6, range: 0, tags: ['buff', 'ultimate'], stats: ['Invincible 1t'],
    applyStatus: 'invincible', statusDuration: 1, selfTarget: true,
  },
  {
    id: 'cls_pack_howl', name: 'Pack Howl', icon: '🌙',
    description: 'Howl unnerves foes in range. Brief invisibility.',
    slot: 2, tier: 'T1', cooldown: 4, range: 0, tags: ['buff', 'debuff'], stats: ['Invisible 1t'],
    applyStatus: 'invisible', statusDuration: 1, selfTarget: true,
  },
];

const BY_ROLE: Record<string, Skill[]> = {
  Warrior: WARRIOR_CLASS,
  Mage: MAGE_CLASS,
  Ranger: RANGER_CLASS,
  Worg: WORG_CLASS,
};

export function getClassSkillsForRole(role: string): Skill[] {
  return BY_ROLE[role] ?? WARRIOR_CLASS;
}

/** Merge class skills into loadout without overwriting player weapon picks. */
export function mergeClassSkillsIntoLoadout(
  role: string,
  loadout: Partial<Record<SkillSlot, string>>,
): Record<SkillSlot, string> {
  const merged = { ...loadout } as Record<SkillSlot, string>;
  const classSkills = getClassSkillsForRole(role);
  for (const skill of classSkills) {
    const slot = skill.slot as SkillSlot;
    if (!merged[slot]) merged[slot] = skill.id;
  }
  return merged;
}

export function getClassSkillById(skillId: string): Skill | undefined {
  for (const skills of Object.values(BY_ROLE)) {
    const found = skills.find((s) => s.id === skillId);
    if (found) return found;
  }
  return undefined;
}

