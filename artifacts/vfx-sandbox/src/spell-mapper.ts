import type { Effects3DRegistry } from './types';

/** Direct ability-name → 3dfx id overrides for common spells. */
const SPELL_OVERRIDES: Record<string, string> = {
  Fireball: 'flame_ball',
  'Flame Brand': 'casting_fire',
  'Meteor Strike': 'meteor_hit',
  'Chain Lightning': 'chain_lightning',
  'Ice Storm': 'frost_nova',
  'Holy Nova': 'holy_aura',
  'Divine Heal': 'light_channeling',
  Blessing: 'holy_aura',
  Purify: 'light_channeling',
  'Arcane Cataclysm': 'arcane_burst',
  'Arcane Bolt': 'arcane_burst',
  'Mana Shield': 'arcane_channeling',
  Slumber: 'dark_aura',
  'Mind Break': 'void_rift',
  Bewilderment: 'void_rift',
  'War Cry': 'holy_aura',
  "Guardian's Aura": 'holy_aura',
  'Life Drain': 'chain_lightning',
  Execute: 'inferno',
  'Avatar Form': 'arcane_channeling',
  'Lightning Lash': 'chain_lightning',
  "Nature's Grasp": 'light_channeling',
  'Bear Form': 'holy_aura',
  'Soothing Rain': 'water_orb',
  Thunderclap: 'thunderstrike',
  Tempest: 'chain_lightning',
  "Nature's Wrath": 'chain_lightning',
  'Primal Roar': 'shockwave',
  'Poison Arrow': 'ice_ball',
  'Arrow Volley': 'shockwave',
  'Arrow Storm': 'shockwave',
  'Sleep Dart': 'dark_aura',
  'Shadow Bolt': 'arcane_burst',
  'Fire Breath': 'inferno',
  Hellfire: 'hellfire',
  Meteor: 'meteor_impact',
  'Frozen Prison': 'frost_nova',
  Blizzard: 'blizzard',
  Annihilate: 'meteor_hit',
  'Reality Tear': 'void_rift',
};

const EFFECT_HINTS: Array<{ test: RegExp; fxId: string }> = [
  { test: /flame|fire|inferno|hell/i, fxId: 'flame_ball' },
  { test: /frost|ice|freeze|blizzard/i, fxId: 'frost_nova' },
  { test: /lightning|thunder|electric|arcane.?light/i, fxId: 'chain_lightning' },
  { test: /holy|heal|bless|divine|light/i, fxId: 'holy_aura' },
  { test: /void|shadow|dark|fel|midnight|nebula/i, fxId: 'void_rift' },
  { test: /water|tidal|torrent/i, fxId: 'water_orb' },
  { test: /earth|stone|quake|bump|wall/i, fxId: 'stone_strike' },
  { test: /meteor|explosion|impact/i, fxId: 'meteor_impact' },
  { test: /shock|wave|nova/i, fxId: 'shockwave' },
  { test: /arcane|magic|mist|bolt/i, fxId: 'arcane_burst' },
  { test: /slash|crit|hit|thrust|smear/i, fxId: 'shockwave' },
  { test: /wind|breath/i, fxId: 'arcane_channeling' },
  { test: /vortex|spin/i, fxId: 'hellfire' },
  { test: /protection|shield|circle/i, fxId: 'holy_aura' },
];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function resolve3dFxForSpell(
  abilityName: string,
  spriteEffectId: string,
  registry: Effects3DRegistry,
): string | null {
  const override = SPELL_OVERRIDES[abilityName];
  if (override && registry.effects[override]) return override;

  const spriteNorm = normalize(spriteEffectId);
  for (const [id, fx] of Object.entries(registry.effects)) {
    const idNorm = normalize(id);
    const nameNorm = normalize(fx.name);
    if (idNorm.includes(spriteNorm) || spriteNorm.includes(idNorm)) return id;
    if (nameNorm.includes(spriteNorm) || spriteNorm.includes(nameNorm)) return id;
    if (fx.tags.some(t => normalize(t).includes(spriteNorm) || spriteNorm.includes(normalize(t)))) return id;
  }

  const abilityNorm = normalize(abilityName);
  for (const [id, fx] of Object.entries(registry.effects)) {
    if (normalize(fx.name).includes(abilityNorm) || abilityNorm.includes(normalize(id))) return id;
  }

  const haystack = `${abilityName} ${spriteEffectId}`;
  for (const hint of EFFECT_HINTS) {
    if (hint.test.test(haystack) && registry.effects[hint.fxId]) return hint.fxId;
  }

  return null;
}