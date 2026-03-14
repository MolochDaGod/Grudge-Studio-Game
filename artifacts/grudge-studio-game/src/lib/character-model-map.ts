export interface MaterialOverride {
  color?: string;
  emissive?: string;
  emissiveIntensity?: number;
  metalness?: number;
  roughness?: number;
  opacity?: number;
  transparent?: boolean;
}

export interface WeaponConfig {
  modelId: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export interface SecondaryWeaponConfig extends WeaponConfig {
  attachBone: string;
}

export type AnimState =
  | 'idle' | 'idle2' | 'emote'
  | 'walk'
  | 'attack1' | 'attack2' | 'attack3' | 'attack4'
  | 'cast'
  | 'hurt' | 'stunned' | 'poisoned' | 'block' | 'frozen'
  | 'dead' | 'victory' | 'special1' | 'special2';

// Default mapping from logical AnimState → GLB animation name
// Available GLB animations: Death, Defeat, Idle, Jump, PickUp, Punch, RecieveHit,
//   Roll, Run, Run_Carry, Shoot_OneHanded, SitDown, StandUp, SwordSlash, Victory, Walk, Walk_Carry
export const DEFAULT_ANIM_MAP: Record<AnimState, string> = {
  idle:     'Idle',
  idle2:    'SitDown',
  emote:    'PickUp',
  walk:     'Walk',
  attack1:  'SwordSlash',
  attack2:  'Punch',
  attack3:  'Roll',
  attack4:  'Jump',
  cast:     'Shoot_OneHanded',
  hurt:     'RecieveHit',
  stunned:  'Defeat',
  poisoned: 'Walk',
  block:    'StandUp',
  frozen:   'Idle',
  dead:     'Death',
  victory:  'Victory',
  special1: 'Run',
  special2: 'Jump',
};

export interface CharacterConfig {
  modelId: 'orc' | 'elf' | 'human' | 'barbarian' | 'undead' | 'dwarf' | 'rogue' | 'mage'
         | 'warrior_rpg' | 'ranger_rpg' | 'rogue_rpg' | 'wizard_rpg' | 'cleric_rpg' | 'monk_rpg';
  scale: [number, number, number];
  materials: Record<string, MaterialOverride>;
  primaryWeapon: WeaponConfig;
  secondaryWeapon?: SecondaryWeaponConfig;
  /** Per-character overrides for the DEFAULT_ANIM_MAP */
  animMap?: Partial<Record<AnimState, string>>;
  /** World-space Y for name label (override for models with unusual native scale) */
  labelHeight?: number;
  /** World-space Y for HP arc ring */
  hpRingHeight?: number;
  /** World-space radius of selection ring */
  selectionRingRadius?: number;
}

// Weapon natural longest-axis lengths (from actual GLB vertex bounds):
// greataxe=4.59z, fire_staff=7.63z, dark_staff=5.58z, daggers=0.91z,
// greatsword=2.41z, bow=5.44z, sword=1.50z, shield=2.56z,
// rusted_sword=1.50z, war_hammer=4.97z
// Target: weapon_world_length = scale * 0.72(char) * natural_length ≈ 0.7-1.0
// Rotation [Math.PI/2, 0, 0] rotates Z-axis → Y-axis (blade points up in fist's local space)

const WEAPON_DEFAULTS: Record<string, WeaponConfig> = {
  greataxe: {
    modelId: 'greataxe',
    position: [0, 0, 0],
    rotation: [Math.PI / 2, 0, 0],
    scale: 0.22,   // 0.22 * 0.72 * 4.59 ≈ 0.73 world units
  },
  fire_staff: {
    modelId: 'fire_staff',
    position: [0, 0, 0],
    rotation: [Math.PI / 2, 0, 0],
    scale: 0.18,   // 0.18 * 0.72 * 7.63 ≈ 0.99 world units
  },
  dark_staff: {
    modelId: 'dark_staff',
    position: [0, 0, 0],
    rotation: [Math.PI / 2, 0, 0],
    scale: 0.22,   // 0.22 * 0.72 * 5.58 ≈ 0.88 world units
  },
  daggers: {
    modelId: 'daggers',
    position: [0, 0, 0],
    rotation: [Math.PI / 2, 0, Math.PI / 6],
    scale: 0.50,   // 0.50 * 0.72 * 0.91 ≈ 0.33 world units (short daggers)
  },
  greatsword: {
    modelId: 'greatsword',
    position: [0, 0, 0],
    rotation: [Math.PI / 2, 0, 0],
    scale: 0.42,   // 0.42 * 0.72 * 2.41 ≈ 0.73 world units
  },
  bow: {
    modelId: 'bow',
    position: [0, 0, 0],
    rotation: [Math.PI / 2, Math.PI / 2, 0],
    scale: 0.20,   // 0.20 * 0.72 * 5.44 ≈ 0.78 world units
  },
  sword: {
    modelId: 'sword',
    position: [0, 0, 0],
    rotation: [Math.PI / 2, 0, 0],
    scale: 0.65,   // 0.65 * 0.72 * 1.50 ≈ 0.70 world units
  },
  shield: {
    modelId: 'shield',
    position: [0, 0, 0],
    rotation: [Math.PI / 2, 0, 0],
    scale: 0.28,   // 0.28 * 0.72 * 2.56 ≈ 0.52 world units
  },
  rusted_sword: {
    modelId: 'rusted_sword',
    position: [0, 0, 0],
    rotation: [Math.PI / 2, 0, Math.PI / 12],
    scale: 0.62,   // slightly smaller/worn 0.62 * 0.72 * 1.50 ≈ 0.67 world units
  },
  war_hammer: {
    modelId: 'war_hammer',
    position: [0, 0, 0],
    rotation: [Math.PI / 2, 0, 0],
    scale: 0.22,   // 0.22 * 0.72 * 4.97 ≈ 0.79 world units
  },
};

export const CHARACTER_CONFIGS: Record<string, CharacterConfig> = {

  'frost-orc-berserker': {
    modelId: 'orc',
    scale: [0.72 * 1.4, 0.72 * 0.95, 0.72 * 1.4],
    materials: {
      Skin:  { color: '#3a7a8a', roughness: 0.6 },
      Face:  { color: '#3a7a8a' },
      Pants: { color: '#1e2e40', roughness: 0.8 },
      Teeth: { color: '#d8c8a0' },
    },
    primaryWeapon: WEAPON_DEFAULTS.greataxe,
    animMap: { attack1: 'SwordSlash', attack2: 'Punch', attack3: 'Roll', special1: 'Run', special2: 'Jump' },
  },

  'magma-orc-destroyer': {
    modelId: 'orc',
    scale: [0.72 * 1.6, 0.72 * 1.1, 0.72 * 1.4],
    materials: {
      Skin:  { color: '#4a1000', emissive: '#ff2200', emissiveIntensity: 0.45, roughness: 0.9 },
      Face:  { color: '#4a1000', emissive: '#ff1100', emissiveIntensity: 0.3 },
      Pants: { color: '#150808', roughness: 0.95 },
      Teeth: { color: '#888888', metalness: 0.5 },
    },
    primaryWeapon: WEAPON_DEFAULTS.fire_staff,
    animMap: { attack1: 'Punch', attack2: 'SwordSlash', cast: 'Shoot_OneHanded', special1: 'SwordSlash', special2: 'Jump' },
  },

  'brother-maltheus': {
    modelId: 'mage',
    scale: [0.72 * 0.85, 0.72 * 1.12, 0.72 * 0.85],
    materials: {
      Skin:    { color: '#9a7a65', roughness: 0.7 },
      Face:    { color: '#b08a70' },
      Clothes: { color: '#1a0a2e', roughness: 0.9 },
      Belt:    { color: '#0a0a0a', metalness: 0.3 },
      Gold:    { color: '#5a4800', metalness: 0.7, roughness: 0.4 },
      Hat:     { color: '#0d0520', roughness: 0.95 },
      Hair:    { color: '#888888', roughness: 0.9 },
    },
    primaryWeapon: WEAPON_DEFAULTS.dark_staff,
    animMap: { attack1: 'Punch', attack2: 'SwordSlash', cast: 'Shoot_OneHanded', special1: 'SwordSlash', special2: 'Jump', emote: 'Victory' },
  },

  'canal-lurker': {
    modelId: 'rogue',
    scale: [0.72 * 0.9, 0.72 * 0.92, 0.72 * 0.9],
    materials: {
      Skin:    { color: '#2a4018', roughness: 0.85 },
      Face:    { color: '#2a4018', emissive: '#806000', emissiveIntensity: 0.4 },
      Main:    { color: '#1a2a10', roughness: 0.95 },
      Details: { color: '#1a3000', emissive: '#002200', emissiveIntensity: 0.1 },
      Grey:    { color: '#1e2018', roughness: 0.9 },
    },
    primaryWeapon: WEAPON_DEFAULTS.daggers,
    animMap: { attack1: 'SwordSlash', attack2: 'Roll', attack3: 'Punch', attack4: 'Jump', special1: 'Run', special2: 'Roll' },
  },

  'warlord-garnok': {
    modelId: 'barbarian',
    scale: [0.72 * 1.5, 0.72 * 1.1, 0.72 * 1.3],
    materials: {
      Skin:  { color: '#1a3a0a', roughness: 0.75 },
      Face:  { color: '#1a3a0a' },
      Light: { color: '#4a2e10', roughness: 0.85 },
      Main:  { color: '#1a1a1a', metalness: 0.6, roughness: 0.5 },
      Pants: { color: '#0e2008', roughness: 0.9 },
      Hair:  { color: '#050505', roughness: 0.95 },
    },
    primaryWeapon: WEAPON_DEFAULTS.greatsword,
    animMap: { attack1: 'SwordSlash', attack2: 'Punch', attack3: 'Roll', special1: 'Run', special2: 'Jump', emote: 'Jump' },
  },

  'elven-archer': {
    modelId: 'elf',
    scale: [0.72 * 0.85, 0.72 * 1.08, 0.72 * 0.85],
    materials: {
      Skin:    { color: '#d0b090', roughness: 0.5 },
      Face:    { color: '#e0c8a8' },
      Clothes: { color: '#1e4810', roughness: 0.8 },
      Belt:    { color: '#3a1e08', roughness: 0.85 },
      Gold:    { color: '#b09030', metalness: 0.7, roughness: 0.3 },
      Hat:     { color: '#122808', roughness: 0.9 },
    },
    primaryWeapon: WEAPON_DEFAULTS.bow,
    animMap: { attack1: 'Shoot_OneHanded', attack2: 'Shoot_OneHanded', attack3: 'Roll', attack4: 'Jump', cast: 'Shoot_OneHanded', special1: 'Shoot_OneHanded', special2: 'Jump' },
  },

  'orcish-warrior': {
    modelId: 'orc',
    scale: [0.72 * 1.2, 0.72 * 1.0, 0.72 * 1.15],
    materials: {
      Skin:  { color: '#2e4820', roughness: 0.75 },
      Face:  { color: '#2e4820' },
      Pants: { color: '#2a1808', roughness: 0.9 },
      Teeth: { color: '#c8a050' },
    },
    primaryWeapon: WEAPON_DEFAULTS.greataxe,
    animMap: { attack1: 'SwordSlash', attack2: 'Punch', attack3: 'Roll', special1: 'Run', special2: 'Jump' },
  },

  'human-knight': {
    modelId: 'human',
    scale: [0.72 * 1.05, 0.72 * 1.05, 0.72 * 1.05],
    materials: {
      Skin:       { color: '#c08050', roughness: 0.6 },
      Face:       { color: '#d09060' },
      Armor:      { color: '#c8a030', metalness: 0.8, roughness: 0.25, emissive: '#c8a030', emissiveIntensity: 0.08 },
      Armor_Dark: { color: '#0a1a3a', metalness: 0.6, roughness: 0.4 },
      Detail:     { color: '#d4a017', metalness: 0.85, roughness: 0.2 },
      Red:        { color: '#6a0000', roughness: 0.7 },
    },
    primaryWeapon: WEAPON_DEFAULTS.sword,
    secondaryWeapon: { ...WEAPON_DEFAULTS.shield, attachBone: 'Fist.L' },
    animMap: { attack1: 'SwordSlash', attack2: 'Punch', attack3: 'Roll', block: 'StandUp', special1: 'SwordSlash', special2: 'Jump' },
  },

  'human-barbarian': {
    modelId: 'barbarian',
    scale: [0.72 * 1.2, 0.72 * 1.0, 0.72 * 1.15],
    materials: {
      Skin:  { color: '#7a4e28', roughness: 0.7 },
      Face:  { color: '#8a5e38' },
      Light: { color: '#5a3a18', roughness: 0.85 },
      Main:  { color: '#200e04', roughness: 0.9 },
      Pants: { color: '#2a2010', roughness: 0.9 },
      Hair:  { color: '#1e0c04', roughness: 0.95 },
    },
    primaryWeapon: WEAPON_DEFAULTS.greatsword,
    animMap: { attack1: 'SwordSlash', attack2: 'Punch', attack3: 'Roll', attack4: 'Jump', special1: 'Run', special2: 'Jump' },
  },

  'skeleton-undead': {
    modelId: 'undead',
    scale: [0.72 * 1.0, 0.72 * 1.05, 0.72 * 1.0],
    materials: {
      Skin:        { color: '#c8b898', emissive: '#1a0844', emissiveIntensity: 0.2, roughness: 0.85 },
      Face:        { color: '#a09070', emissive: '#4400aa', emissiveIntensity: 0.35 },
      Clothes:     { color: '#0a0a14', roughness: 0.95 },
      Guts:        { color: '#0a0a0a', roughness: 0.95 },
      Pants:       { color: '#181008', roughness: 0.95 },
      DarkClothes: { color: '#050508', roughness: 0.99 },
      Bones:       { color: '#d8cca0', roughness: 0.8 },
      Brain:       { color: '#0a0a0a' },
    },
    primaryWeapon: WEAPON_DEFAULTS.rusted_sword,
    animMap: { idle2: 'StandUp', emote: 'Roll', attack1: 'SwordSlash', attack2: 'Punch', attack3: 'Roll', special1: 'Run', special2: 'Jump' },
  },

  'dwarven-forge-master': {
    modelId: 'dwarf',
    scale: [0.72 * 1.3, 0.72 * 0.72, 0.72 * 1.3],
    materials: {
      Skin:       { color: '#8a4428', roughness: 0.65 },
      Face:       { color: '#9a5438' },
      Armor:      { color: '#181818', metalness: 0.85, roughness: 0.3 },
      Armor_Dark: { color: '#080808', metalness: 0.9, roughness: 0.2 },
      Detail:     { color: '#c44000', emissive: '#c44000', emissiveIntensity: 0.3, metalness: 0.6 },
      Red:        { color: '#880000', roughness: 0.7 },
    },
    primaryWeapon: WEAPON_DEFAULTS.war_hammer,
    animMap: { attack1: 'SwordSlash', attack2: 'Punch', attack3: 'Roll', attack4: 'Jump', special1: 'Run', special2: 'Jump' },
  },

  // ── RPG Characters Nov 2020 pack ─────────────────────────────────────────
  // These FBX→GLB models are in centimeter scale (100× larger native geometry).
  // Scale is 0.0072 base (= 0.72 / 100). Weapon scales are compensated ×100.
  // Label/ring heights are explicit world-space values (~1.3 m character height).

  'orc-blood-guard': {
    modelId: 'warrior_rpg',
    scale: [0.0072 * 1.3, 0.0072 * 1.05, 0.0072 * 1.3],
    materials: {
      Warrior_Texture:       { color: '#28500e', roughness: 0.75 },
      Warrior_Sword_Texture: { color: '#b08840', metalness: 0.6, roughness: 0.4 },
    },
    // warrior_rpg animations: Sword_Attack / Sword_Attack2 → greatsword
    primaryWeapon: { modelId: 'greatsword', position: [0,0,0], rotation: [Math.PI/2, 0, 0], scale: 43 },
    animMap: {
      idle2: 'Idle_Weapon', attack1: 'Sword_Attack', attack2: 'Sword_Attack2',
      attack3: 'Punch', attack4: 'Roll', cast: 'Idle_Weapon',
      stunned: 'RecieveHit', block: 'Idle_Weapon', victory: 'Idle_Attacking',
      special1: 'Run_Weapon', special2: 'Roll',
    },
    labelHeight: 1.62, hpRingHeight: 1.44, selectionRingRadius: 0.52,
  },

  'saltbone-corsair': {
    modelId: 'ranger_rpg',
    scale: [0.0072 * 0.95, 0.0072 * 1.05, 0.0072 * 0.95],
    materials: {
      Ranger_Texture: { color: '#c8c0a8', emissive: '#220044', emissiveIntensity: 0.25, roughness: 0.85 },
      Bow_Texture:    { color: '#c0b8a0', roughness: 0.9 },
    },
    // ranger_rpg animations: Bow_Shoot / Bow_Draw → bow
    primaryWeapon: { modelId: 'bow', position: [0,0,0], rotation: [Math.PI/2, Math.PI/2, 0], scale: 19 },
    animMap: {
      idle2: 'Idle_Weapon', attack1: 'Bow_Shoot', attack2: 'Bow_Shoot',
      attack3: 'Roll', attack4: 'Roll', cast: 'Bow_Draw',
      stunned: 'RecieveHit', block: 'Idle_Weapon', victory: 'Idle_Attacking',
      special1: 'Run_Holding', special2: 'Roll',
    },
    labelHeight: 1.58, hpRingHeight: 1.40, selectionRingRadius: 0.48,
  },

  'grave-shade': {
    modelId: 'rogue_rpg',
    scale: [0.0072 * 0.9, 0.0072 * 1.0, 0.0072 * 0.9],
    materials: {
      Rogue_Texture:        { color: '#706860', emissive: '#6600aa', emissiveIntensity: 0.4, roughness: 0.9 },
      Rogue_Dagger_Texture: { color: '#909090', metalness: 0.4, roughness: 0.6 },
    },
    // rogue_rpg animations: Dagger_Attack / Dagger_Attack2 → daggers
    primaryWeapon: { modelId: 'daggers', position: [0,0,0], rotation: [Math.PI/2, 0, Math.PI/6], scale: 115 },
    animMap: {
      idle2: 'Attacking_Idle', attack1: 'Dagger_Attack', attack2: 'Dagger_Attack2',
      attack3: 'Roll', attack4: 'Roll', cast: 'Attacking_Idle',
      stunned: 'RecieveHit', block: 'Attacking_Idle', victory: 'Attacking_Idle',
      special1: 'Run', special2: 'Roll',
    },
    labelHeight: 1.54, hpRingHeight: 1.36, selectionRingRadius: 0.46,
  },

  'orc-warlock': {
    modelId: 'wizard_rpg',
    scale: [0.0072 * 1.2, 0.0072 * 1.08, 0.0072 * 1.2],
    materials: {
      Wizard_Texture:       { color: '#1c3806', emissive: '#ff4400', emissiveIntensity: 0.12, roughness: 0.8 },
      Wizard_Staff_Texture: { color: '#a06020', metalness: 0.5, roughness: 0.5 },
    },
    // wizard_rpg animations: Staff_Attack / Spell1 / Spell2 → fire_staff (orc warlock = fire)
    primaryWeapon: { modelId: 'fire_staff', position: [0,0,0], rotation: [Math.PI/2, 0, 0], scale: 14 },
    animMap: {
      idle2: 'Idle_Weapon', attack1: 'Staff_Attack', attack2: 'Punch',
      attack3: 'Roll', attack4: 'Roll', cast: 'Spell1',
      stunned: 'RecieveHit', block: 'Idle_Weapon', victory: 'Idle_Attacking',
      special1: 'Spell2', special2: 'Roll',
    },
    labelHeight: 1.60, hpRingHeight: 1.42, selectionRingRadius: 0.50,
  },

  'hollow-zealot': {
    modelId: 'cleric_rpg',
    scale: [0.0072 * 1.0, 0.0072 * 1.05, 0.0072 * 1.0],
    materials: {
      Cleric_Texture:       { color: '#cbb870', emissive: '#aa8800', emissiveIntensity: 0.18, roughness: 0.85 },
      Cleric_Staff_Texture: { color: '#a8a070', roughness: 0.9 },
    },
    // cleric_rpg animations: Staff_Attack / Spell1 → war_hammer (divine zealot)
    primaryWeapon: { modelId: 'war_hammer', position: [0,0,0], rotation: [Math.PI/2, 0, 0], scale: 21 },
    animMap: {
      idle2: 'Idle_Weapon', attack1: 'Staff_Attack', attack2: 'Punch',
      attack3: 'Punch', attack4: 'RecieveHit_Attacking', cast: 'Spell1',
      stunned: 'RecieveHit', block: 'Idle_Weapon', victory: 'RecieveHit_Attacking',
      special1: 'Run', special2: 'Punch',
    },
    labelHeight: 1.58, hpRingHeight: 1.40, selectionRingRadius: 0.48,
  },

  'iron-pilgrim': {
    modelId: 'monk_rpg',
    scale: [0.0072 * 1.05, 0.0072 * 1.05, 0.0072 * 1.05],
    materials: {
      Monk_Texture: { color: '#8a6040', roughness: 0.7 },
    },
    // monk_rpg animations: Attack / Attack2 (melee) → greatsword (warrior-monk)
    primaryWeapon: { modelId: 'greatsword', position: [0,0,0], rotation: [Math.PI/2, 0, 0], scale: 43 },
    animMap: {
      idle2: 'Idle_Attacking', attack1: 'Attack', attack2: 'Attack2',
      attack3: 'Roll', attack4: 'Roll', cast: 'Attack',
      stunned: 'RecieveHit', block: 'Idle_Attacking', victory: 'Idle_Attacking',
      special1: 'Run', special2: 'Roll',
    },
    labelHeight: 1.58, hpRingHeight: 1.40, selectionRingRadius: 0.48,
  },
};

export function getCharacterConfig(characterId: string): CharacterConfig {
  return CHARACTER_CONFIGS[characterId] ?? CHARACTER_CONFIGS['orcish-warrior'];
}

export function getAnimationName(state: AnimState, config: CharacterConfig): string {
  return config.animMap?.[state] ?? DEFAULT_ANIM_MAP[state] ?? 'Idle';
}

export const ALL_MODEL_URLS = [
  '/models/characters/orc.glb',
  '/models/characters/elf.glb',
  '/models/characters/human.glb',
  '/models/characters/barbarian.glb',
  '/models/characters/undead.glb',
  '/models/characters/dwarf.glb',
  '/models/characters/rogue.glb',
  '/models/characters/mage.glb',
  '/models/characters/warrior_rpg.glb',
  '/models/characters/ranger_rpg.glb',
  '/models/characters/rogue_rpg.glb',
  '/models/characters/wizard_rpg.glb',
  '/models/characters/cleric_rpg.glb',
  '/models/characters/monk_rpg.glb',
  '/models/weapons/greataxe.glb',
  '/models/weapons/fire_staff.glb',
  '/models/weapons/dark_staff.glb',
  '/models/weapons/daggers.glb',
  '/models/weapons/greatsword.glb',
  '/models/weapons/bow.glb',
  '/models/weapons/sword.glb',
  '/models/weapons/shield.glb',
  '/models/weapons/rusted_sword.glb',
  '/models/weapons/war_hammer.glb',
];
