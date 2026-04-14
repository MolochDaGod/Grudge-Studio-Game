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
  | 'walk' | 'run' | 'sneak' | 'hide'
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
  run: 'Run',
  sneak: 'Walk',      // slower Walk at half speed; visual crouch applied by CharacterModel
  hide: 'SitDown',   // crouched idle; opacity dimmed by CharacterModel
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

export type ModelId =
  // Original fantasy pack
  | 'orc' | 'elf' | 'human' | 'barbarian' | 'undead' | 'dwarf' | 'rogue' | 'mage'
  // RPG Characters pack
  // Worge beast form models
  | 'warbear' | 'werewolf' | 'raptor'
  | 'warrior_rpg' | 'ranger_rpg' | 'rogue_rpg' | 'wizard_rpg' | 'cleric_rpg' | 'monk_rpg'
  // Ultimate Animated Character Pack (Nov 2019)
  | 'blue_soldier_female' | 'blue_soldier_male'
  | 'casual2_female' | 'casual2_male' | 'casual3_female' | 'casual3_male'
  | 'casual_bald' | 'casual_female' | 'casual_male'
  | 'chef_female' | 'chef_male'
  | 'cowboy_female' | 'cowboy_male'
  | 'doctor_female_old' | 'doctor_female_young' | 'doctor_male_old' | 'doctor_male_young'
  | 'goblin_female' | 'goblin_male'
  | 'kimono_female' | 'kimono_male'
  | 'knight_golden_female' | 'knight_golden_male' | 'knight_male'
  | 'ninja_female' | 'ninja_male' | 'ninja_sand' | 'ninja_sand_female'
  | 'old_classy_female' | 'old_classy_male'
  | 'pirate_female' | 'pirate_male'
  | 'soldier_female' | 'soldier_male'
  | 'suit_female' | 'suit_male'
  | 'viking_female' | 'viking_male'
  | 'witch' | 'wizard'
  | 'worker_female' | 'worker_male'
  | 'zombie_female' | 'zombie_male';

export interface AccessoryConfig {
  modelId: string;
  bone: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export type ModelPackType = 'quaternius' | 'rpg';

export interface CharacterConfig {
  modelId: ModelId;
  scale: [number, number, number];
  materials: Record<string, MaterialOverride>;
  primaryWeapon: WeaponConfig;
  secondaryWeapon?: SecondaryWeaponConfig;
  /** Extra bone-attached accessories (helmets, shoulder pads, capes, etc.) */
  accessoryAttachments?: AccessoryConfig[];
  /** Per-character overrides for the DEFAULT_ANIM_MAP */
  animMap?: Partial<Record<AnimState, string>>;
  /** World-space Y for name label (override for models with unusual native scale) */
  labelHeight?: number;
  /** World-space Y for HP arc ring */
  hpRingHeight?: number;
  /** World-space radius of selection ring */
  selectionRingRadius?: number;
  /**
   * URL to an external diffuse texture for RPG FBX→GLB models that have no embedded textures.
   * When set, CharacterModel loads and applies this texture to all materials in the mesh.
   * @deprecated Use `textures.diffuse` instead for multi-texture support.
   */
  textureUrl?: string;
  /** Multi-texture set (diffuse, normal, emissive, roughness/metalness) */
  textures?: import('./texture-manager').TextureSetConfig;
  /** If true, this character uses a voxel GLB with no skeleton — procedural animation */
  isVoxel?: boolean;
  /** Override voxel auto-scale (only used when isVoxel is true) */
  voxelScale?: number;
  /** Path to voxel model GLB (only used when isVoxel is true) */
  voxelModelUrl?: string;
  /** Physics capsule radius (world units). Computed from scale if not set. */
  bodyRadius?: number;
  /** Physics capsule full height (world units). Computed from scale if not set. */
  bodyHeight?: number;
  /**
   * Which asset pack this model comes from. Affects automatic weapon scaling.
   * - 'quaternius': native scale ~1.0, character scale ~0.72 (default)
   * - 'rpg': native scale ~1000×, character scale ~0.0072, weapons need ~86× multiplier
   */
  modelPackType?: ModelPackType;
  /** If true, this config represents a beast form - weapons are hidden. */
  isBeastForm?: boolean;
}

// -- Worge Form IDs --------------------------------------------------------
export type WorgeFormId = 'bear' | 'raptor' | 'warbear';

export interface WorgeFormDef {
  formId: WorgeFormId;
  label: string;
  unlockLevel: number;
  configKey: string;
}

/** Which forms each Worg can access and at what level. */
export const WORGE_FORM_DEFS: WorgeFormDef[] = [
  { formId: 'bear',    label: 'Bear Form',    unlockLevel: 1,  configKey: 'werewolf_form' },
  { formId: 'raptor',  label: 'Raptor Form',  unlockLevel: 10, configKey: 'raptor_form' },
  { formId: 'warbear', label: 'Warbear Form',  unlockLevel: 20, configKey: 'warbear_form' },
];

const BEAST_CLAWS: WeaponConfig = {
  modelId: 'daggers', position: [0, 0, 0], rotation: [0, 0, 0], scale: 0,
};

/** Beast form character configs. */
export const WORGE_FORM_CONFIGS: Record<string, CharacterConfig> = {
  'werewolf_form': {
    modelId: 'werewolf', scale: [1.2, 1.2, 1.2], materials: {},
    primaryWeapon: BEAST_CLAWS, isBeastForm: true,
    animMap: {
      idle: 'GltfAnimation 0', walk: 'GltfAnimation 0', run: 'GltfAnimation 0',
      attack1: 'GltfAnimation 0', attack2: 'GltfAnimation 0',
      hurt: 'GltfAnimation 0', dead: 'GltfAnimation 0',
    },
    labelHeight: 2.4, hpRingHeight: 2.2, selectionRingRadius: 0.85,
  },
  'raptor_form': {
    modelId: 'raptor', scale: [1.0, 1.0, 1.0], materials: {},
    primaryWeapon: BEAST_CLAWS, isBeastForm: true,
    animMap: {
      idle: 'Idle', idle2: 'Idle2', walk: 'SlowWalk', run: 'FastWalk',
      attack1: 'Attack', attack2: 'HeadSmash', special1: 'Roar',
      emote: 'LegScratch', dead: 'Die',
      hurt: 'Idle', stunned: 'Idle', victory: 'Roar',
    },
    labelHeight: 1.8, hpRingHeight: 1.6, selectionRingRadius: 0.65,
  },
  'warbear_form': {
    modelId: 'warbear', scale: [0.012, 0.012, 0.012], materials: {},
    primaryWeapon: BEAST_CLAWS, isBeastForm: true,
    animMap: {
      idle: 'warbear_stand', idle2: 'warbear_lobbyStand00',
      walk: 'warbear_move', run: 'warbear_move',
      attack1: 'warbear_attack00', attack2: 'warbear_attack01',
      cast: 'warbear_activeSkill', special1: 'warbear_activeSkill',
      special2: 'warbear_activeSkill_return',
      hurt: 'warbear_hit', stunned: 'warbear_stun', dead: 'warbear_die',
      emote: 'warbear_lobbyIntro', victory: 'warbear_lobbyStand01',
    },
    labelHeight: 2.8, hpRingHeight: 2.5, selectionRingRadius: 0.95,
  },
};

// Weapon natural longest-axis lengths (from actual GLB vertex bounds):
// greataxe=4.59z, fire_staff=7.63z, dark_staff=5.58z, daggers=0.91z,
// greatsword=2.41z, bow=5.44z, sword=1.50z, shield=2.56z,
// rusted_sword=1.50z, war_hammer=4.97z
// Target: weapon_world_length = scale * 0.72(char) * natural_length ≈ 0.7-1.0
// Rotation [Math.PI/2, 0, 0] rotates Z-axis → Y-axis (blade points up in fist's local space)

export const WEAPON_DEFAULTS: Record<string, WeaponConfig> = {
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

  // ── Orc Faction ───────────────────────────────────────────────────────────

  'frost-orc-berserker': {
    // Portrait: Massive ice-armored orc, blue cracked skin, glowing blue runes, huge build
    modelId: 'viking_male',
    scale: [0.72 * 1.45, 0.72 * 1.0, 0.72 * 1.45],
    materials: {
      Skin:  { color: '#2a6070', emissive: '#0055aa', emissiveIntensity: 0.15, roughness: 0.65 },
      Face:  { color: '#2a6070', emissive: '#0066cc', emissiveIntensity: 0.25 },
      Pants: { color: '#0e1c2e', roughness: 0.9 },
      Main:  { color: '#1a2a3a', metalness: 0.75, roughness: 0.35 },
      Light: { color: '#0a1420', roughness: 0.85 },
      Hair:  { color: '#e8eaf0', roughness: 0.85 },
    },
    primaryWeapon: WEAPON_DEFAULTS.greataxe,
    accessoryAttachments: [
      { modelId: 'orc_shoulder_spike_l', bone: 'Shoulder.L', position: [0, 0.02, 0], rotation: [0, 0, 0], scale: 0.7 },
      { modelId: 'orc_shoulder_spike_r', bone: 'Shoulder.R', position: [0, 0.02, 0], rotation: [0, 0, 0], scale: 0.7 },
    ],
    // animMap removed — inherits from weapon type (greataxe → melee FBX set)
  },

  'magma-orc-destroyer': {
    modelId: 'orc',
    scale: [0.72 * 1.35, 0.72 * 1.1, 0.72 * 1.35],
    materials: {
      Skin:  { color: '#3a0c00', emissive: '#dd2200', emissiveIntensity: 0.45, roughness: 0.9 },
      Face:  { color: '#3a0c00', emissive: '#ff1100', emissiveIntensity: 0.35 },
      Pants: { color: '#100606', roughness: 0.95 },
      Teeth: { color: '#707070', metalness: 0.5 },
    },
    primaryWeapon: WEAPON_DEFAULTS.fire_staff,
    // animMap removed — inherits from weapon type (fire_staff → staff FBX set)
  },

  'orcish-warrior': {
    modelId: 'orc',
    scale: [0.72 * 1.22, 0.72 * 1.0, 0.72 * 1.22],
    materials: {
      Skin:  { color: '#2e4820', roughness: 0.75 },
      Face:  { color: '#2e4820' },
      Pants: { color: '#2a1808', roughness: 0.9 },
      Teeth: { color: '#c8a050' },
    },
    primaryWeapon: WEAPON_DEFAULTS.greataxe,
  },

  'orc-blood-guard': {
    modelId: 'orc',
    scale: [0.72 * 1.35, 0.72 * 1.05, 0.72 * 1.35],
    materials: {
      Skin:  { color: '#2c4a10', emissive: '#002200', emissiveIntensity: 0.08, roughness: 0.8 },
      Face:  { color: '#2c4a10', emissive: '#880000', emissiveIntensity: 0.2 },
      Pants: { color: '#080808', metalness: 0.3, roughness: 0.85 },
      Teeth: { color: '#c09020', metalness: 0.4 },
    },
    primaryWeapon: WEAPON_DEFAULTS.war_hammer,
  },

  'warlord-garnok': {
    modelId: 'orc',
    scale: [0.72 * 1.45, 0.72 * 1.12, 0.72 * 1.45],
    materials: {
      Skin:  { color: '#7a2820', roughness: 0.7 },
      Face:  { color: '#7a2820' },
      Pants: { color: '#0e0808', roughness: 0.9 },
      Teeth: { color: '#d8c880', metalness: 0.2 },
    },
    primaryWeapon: WEAPON_DEFAULTS.greatsword,
  },

  'orc-warlock': {
    modelId: 'orc',
    scale: [0.72 * 1.2, 0.72 * 1.05, 0.72 * 1.2],
    materials: {
      Skin:  { color: '#28380a', emissive: '#004400', emissiveIntensity: 0.06, roughness: 0.8 },
      Face:  { color: '#28380a', emissive: '#cc4400', emissiveIntensity: 0.3 },
      Pants: { color: '#060610', roughness: 0.95 },
      Teeth: { color: '#303030' },
    },
    primaryWeapon: WEAPON_DEFAULTS.fire_staff,
  },

  // ── Undead Faction ────────────────────────────────────────────────────────

  'brother-maltheus': {
    // Portrait: Undead necromancer priest — skull face, purple glowing eyes, pristine white priestly robes, spellbook
    modelId: 'zombie_male',
    scale: [0.72 * 0.90, 0.72 * 0.90, 0.72 * 0.90],
    materials: {
      Clothes:     { color: '#e8eaf0', roughness: 0.8 },
      Skin:        { color: '#b0a898', emissive: '#330066', emissiveIntensity: 0.05, roughness: 0.9 },
      Face:        { color: '#c0b8a8', emissive: '#6600cc', emissiveIntensity: 0.4 },
      Pants:       { color: '#d8dae0', roughness: 0.85 },
      DarkClothes: { color: '#1a1820', roughness: 0.95 },
      Bones:       { color: '#d8d0b8', roughness: 0.8 },
      Guts:        { color: '#080808' },
      Brain:       { color: '#080808' },
    },
    primaryWeapon: WEAPON_DEFAULTS.dark_staff,
  },

  'skeleton-undead': {
    // Portrait: Armored skeleton knight — dark rusted plate armor, glowing orange eye slit, ragged red cloth
    modelId: 'knight_male',
    scale: [0.72 * 1.0, 0.72 * 1.0, 0.72 * 1.0],
    materials: {
      Armor:      { color: '#14120e', metalness: 0.6, roughness: 0.9 },
      Armor_Dark: { color: '#080808', metalness: 0.5, roughness: 0.95 },
      Skin:       { color: '#d0c8a0', emissive: '#ff4400', emissiveIntensity: 0.3, roughness: 0.85 },
      Detail:     { color: '#2a1000', roughness: 0.95 },
      Red:        { color: '#280808', roughness: 0.95 },
    },
    primaryWeapon: WEAPON_DEFAULTS.rusted_sword,
  },

  'hollow-zealot': {
    // Portrait: Skeleton priest — golden skull face glowing halo, gold/cream priestly robes, rosary, sword
    modelId: 'zombie_male',
    scale: [0.72 * 1.0, 0.72 * 1.0, 0.72 * 1.0],
    materials: {
      Clothes:     { color: '#c8a840', roughness: 0.75 },
      Skin:        { color: '#c8b060', emissive: '#8a6000', emissiveIntensity: 0.08, roughness: 0.85 },
      Face:        { color: '#cbb860', emissive: '#ddaa00', emissiveIntensity: 0.45 },
      Pants:       { color: '#18160a', roughness: 0.9 },
      DarkClothes: { color: '#0e0c06', roughness: 0.95 },
      Bones:       { color: '#d8c870', roughness: 0.75 },
      Guts:        { color: '#080808' },
      Brain:       { color: '#080808' },
    },
    primaryWeapon: WEAPON_DEFAULTS.war_hammer,
  },

  'grave-shade': {
    // Portrait: Hooded skull-faced shadow assassin — all black robes, purple glowing eyes, daggers on back, void-fire hands
    modelId: 'ninja_male',
    scale: [0.72 * 0.9, 0.72 * 0.9, 0.72 * 0.9],
    materials: {
      Main:    { color: '#060606', roughness: 0.95 },
      Skin:    { color: '#c8c0a0', roughness: 0.9 },
      Details: { color: '#080810', emissive: '#110033', emissiveIntensity: 0.05 },
      Grey:    { color: '#0c0c10', roughness: 0.95 },
      Face:    { color: '#1a1618', emissive: '#9900cc', emissiveIntensity: 0.55 },
    },
    primaryWeapon: WEAPON_DEFAULTS.daggers,
  },

  'saltbone-corsair': {
    // Portrait: Skeleton pirate captain — navy blue officer coat, gold trim, skull face, purple glowing eyes, daggers
    modelId: 'pirate_male',
    scale: [0.72, 0.72, 0.72],
    materials: {
      Clothes: { color: '#060c22', roughness: 0.85 },
      Beige:   { color: '#d8d0c0', roughness: 0.9 },
      Skin:    { color: '#c8c0a8', roughness: 0.9 },
      Gold:    { color: '#8a7020', metalness: 0.55, roughness: 0.5 },
      Brown:   { color: '#1a1008', roughness: 0.9 },
      Face:    { color: '#d0c8a0', emissive: '#8800cc', emissiveIntensity: 0.55 },
      Black:   { color: '#060606' },
      Red:     { color: '#5a0808', roughness: 0.9 },
    },
    primaryWeapon: WEAPON_DEFAULTS.daggers,
  },

  // ── Human & Elf Faction ───────────────────────────────────────────────────

  'human-knight': {
    // Portrait: Noble human knight — silver plate armor, blue tabard with gold sun-cross, dark hair, sword + shield
    modelId: 'knight_male',
    scale: [0.72 * 1.05, 0.72 * 1.05, 0.72 * 1.05],
    materials: {
      Armor:      { color: '#a8b8c8', metalness: 0.88, roughness: 0.2 },
      Armor_Dark: { color: '#0a1a3a', metalness: 0.65, roughness: 0.4 },
      Skin:       { color: '#c08050', roughness: 0.6 },
      Detail:     { color: '#d4a017', metalness: 0.88, roughness: 0.15 },
      Red:        { color: '#1a4a8a', roughness: 0.65 },
    },
    primaryWeapon: WEAPON_DEFAULTS.sword,
    secondaryWeapon: { ...WEAPON_DEFAULTS.shield, attachBone: 'Fist.L' },
    accessoryAttachments: [
      { modelId: 'knight_helm', bone: 'Head', position: [0, 0.05, 0], rotation: [0, 0, 0], scale: 0.9 },
      { modelId: 'shoulder_plate_l', bone: 'Shoulder.L', position: [0, 0, 0], rotation: [0, 0, 0], scale: 0.8 },
      { modelId: 'shoulder_plate_r', bone: 'Shoulder.R', position: [0, 0, 0], rotation: [0, 0, 0], scale: 0.8 },
    ],
  },

  'human-barbarian': {
    // Portrait: Muscular human barbarian — blue warpaint stripes, dark braided hair, fur-trim leather, greatsword
    modelId: 'viking_male',
    scale: [0.72 * 1.18, 0.72 * 1.02, 0.72 * 1.18],
    materials: {
      Skin:  { color: '#7a4e28', roughness: 0.7 },
      Face:  { color: '#7a4e28', emissive: '#0033aa', emissiveIntensity: 0.08 },
      Pants: { color: '#2a1a10', roughness: 0.9 },
      Main:  { color: '#3a2010', roughness: 0.88 },
      Light: { color: '#6a4a28', roughness: 0.85 },
      Hair:  { color: '#0e0808', roughness: 0.95 },
    },
    primaryWeapon: WEAPON_DEFAULTS.greatsword,
  },

  'elven-archer': {
    // Portrait: Graceful elf, silver braided hair, green+gold leaf armor, longbow — RPG pack for bow animations
    modelId: 'ranger_rpg',
    scale: [0.0072, 0.0072, 0.0072],
    textures: { diffuse: 'models/characters/rpg-textures/ranger.png' },
    materials: {
      Ranger_Texture: { color: '#c8e8b0', emissive: '#006600', emissiveIntensity: 0.05, roughness: 0.75 },
      Bow_Texture:    { color: '#c0b060', roughness: 0.8 },
    },
    primaryWeapon: { modelId: 'bow', position: [0,0,0], rotation: [Math.PI/2, Math.PI/2, 0], scale: 19 },
    // RPG pack has embedded weapon-specific clips — use them as overrides
    animMap: {
      idle2: 'Idle_Weapon', attack1: 'Bow_Attack_Shoot', attack2: 'Bow_Attack_Shoot',
      cast: 'Bow_Attack_Draw', stunned: 'RecieveHit', block: 'Idle_Weapon',
      victory: 'Idle_Attacking', special1: 'Run_Holding',
    },
    modelPackType: 'rpg',
    labelHeight: 1.58, hpRingHeight: 1.40, selectionRingRadius: 0.48,
  },

  // ── Dwarf Faction ─────────────────────────────────────────────────────────

  'dwarven-forge-master': {
    // Portrait: Short stocky dwarf, huge braided red beard, runic silver plate armor, glowing forge hammer
    modelId: 'dwarf',
    scale: [0.72 * 1.08, 0.72 * 0.90, 0.72 * 1.08],
    materials: {
      Skin:       { color: '#8a4428', roughness: 0.65 },
      Face:       { color: '#9a5438' },
      Armor:      { color: '#181818', metalness: 0.85, roughness: 0.3 },
      Armor_Dark: { color: '#080808', metalness: 0.9, roughness: 0.2 },
      Detail:     { color: '#c44000', emissive: '#c44000', emissiveIntensity: 0.3, metalness: 0.6 },
      Red:        { color: '#880000', roughness: 0.7 },
    },
    primaryWeapon: WEAPON_DEFAULTS.war_hammer,
  },

  // ── Pirate / Naval Faction ────────────────────────────────────────────────

  'canal-lurker': {
    // Portrait: Green reptilian creature in navy blue naval captain coat with gold trim, pirate hat, cannon + sword
    modelId: 'pirate_male',
    scale: [0.72, 0.72, 0.72],
    materials: {
      Clothes: { color: '#0a1840', roughness: 0.8 },
      Beige:   { color: '#e8e4d8', roughness: 0.85 },
      Skin:    { color: '#2a5018', roughness: 0.85 },
      Gold:    { color: '#c8a030', metalness: 0.7, roughness: 0.3 },
      Brown:   { color: '#3a2010', roughness: 0.9 },
      Face:    { color: '#2a5018', emissive: '#406000', emissiveIntensity: 0.1 },
      Black:   { color: '#060606' },
      Red:     { color: '#7a1010', roughness: 0.85 },
    },
    primaryWeapon: WEAPON_DEFAULTS.daggers,
  },

  // ── Pilgrim / Wanderer ────────────────────────────────────────────────────

  'iron-pilgrim': {
    // Portrait: Bald tanned monk/pilgrim, rough brown hooded robes, bead necklace, large axe over shoulder
    modelId: 'casual_bald',
    scale: [0.72 * 1.08, 0.72 * 1.02, 0.72 * 1.08],
    materials: {
      Shirt: { color: '#4a3420', roughness: 0.95 },
      Skin:  { color: '#8a6040', roughness: 0.7 },
      Pants: { color: '#3a2810', roughness: 0.95 },
      Belt:  { color: '#4a2e10', roughness: 0.9 },
      Face:  { color: '#8a6040', roughness: 0.7 },
    },
    primaryWeapon: WEAPON_DEFAULTS.greataxe,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // API CHARACTER IDs — maps game.ts hero ids → unique 3D models/colours
  // ═══════════════════════════════════════════════════════════════════════════

  // ── CRUSADE — HUMAN ────────────────────────────────────────────────────────
  'human_warrior': {
    modelId: 'knight_male',
    scale: [0.72, 0.72, 0.72],
    materials: {
      Armor:      { color: '#a8b8c8', metalness: 0.88, roughness: 0.2 },
      Armor_Dark: { color: '#0a1a3a', metalness: 0.65, roughness: 0.4 },
      Skin:       { color: '#c08050', roughness: 0.6 },
      Detail:     { color: '#d4a017', metalness: 0.88, roughness: 0.15 },
      Red:        { color: '#1a4a8a', roughness: 0.65 },
    },
    primaryWeapon: WEAPON_DEFAULTS.sword,
    secondaryWeapon: { ...WEAPON_DEFAULTS.shield, attachBone: 'Fist.L' },
  },

  'human_worg': {
    modelId: 'viking_male',
    scale: [0.72 * 1.1, 0.72 * 1.05, 0.72 * 1.1],
    materials: {
      Skin:  { color: '#8a5828', roughness: 0.65 },
      Face:  { color: '#8a5828', emissive: '#883300', emissiveIntensity: 0.06 },
      Pants: { color: '#2a1808', roughness: 0.9 },
      Main:  { color: '#6a4820', roughness: 0.8 },
      Light: { color: '#9a7040', roughness: 0.8 },
      Hair:  { color: '#e8c860', roughness: 0.85 },
    },
    primaryWeapon: WEAPON_DEFAULTS.greatsword,
  },

  'human_mage': {
    modelId: 'wizard',
    scale: [0.72 * 0.95, 0.72 * 0.95, 0.72 * 0.95],
    materials: {
      Main:    { color: '#1a1060', roughness: 0.75 },
      Skin:    { color: '#c08050', roughness: 0.6 },
      Details: { color: '#2a1880', emissive: '#440088', emissiveIntensity: 0.15 },
      Grey:    { color: '#0e0c20', roughness: 0.9 },
      Face:    { color: '#c08050', emissive: '#330066', emissiveIntensity: 0.1 },
    },
    primaryWeapon: WEAPON_DEFAULTS.fire_staff,
  },

  'human_ranger': {
    modelId: 'ninja_male',
    scale: [0.72 * 0.92, 0.72 * 0.92, 0.72 * 0.92],
    materials: {
      Main:    { color: '#2a3a18', roughness: 0.85 },
      Skin:    { color: '#b87848', roughness: 0.65 },
      Details: { color: '#3a4a22', emissive: '#0a1400', emissiveIntensity: 0.04 },
      Grey:    { color: '#1e2a12', roughness: 0.9 },
      Face:    { color: '#b87848' },
    },
    primaryWeapon: WEAPON_DEFAULTS.daggers,
  },

  // ── CRUSADE — BARBARIAN ────────────────────────────────────────────────────
  'barbarian_warrior': {
    modelId: 'viking_male',
    scale: [0.72 * 1.22, 0.72 * 1.05, 0.72 * 1.22],
    materials: {
      Skin:  { color: '#7a4e28', roughness: 0.7 },
      Face:  { color: '#7a4e28', emissive: '#0033aa', emissiveIntensity: 0.08 },
      Pants: { color: '#2a1a10', roughness: 0.9 },
      Main:  { color: '#3a2010', roughness: 0.88 },
      Light: { color: '#6a4a28', roughness: 0.85 },
      Hair:  { color: '#0e0808', roughness: 0.95 },
    },
    primaryWeapon: WEAPON_DEFAULTS.greataxe,
  },

  'barbarian_worg': {
    // Goblin berserker scout — green-skinned, bone-armor, dual axes
    modelId: 'goblin_male',
    scale: [0.72 * 1.05, 0.72 * 1.0, 0.72 * 1.05],
    materials: {
      Main: { color: '#1a2e08', roughness: 0.85 },
      Skin: { color: '#3a6010', roughness: 0.7 },
      Details: { color: '#2a1800', emissive: '#110500', emissiveIntensity: 0.06 },
      Grey: { color: '#1e1a10', roughness: 0.9 },
      Face: { color: '#3a6010', emissive: '#1a3000', emissiveIntensity: 0.06 },
    },
    primaryWeapon: WEAPON_DEFAULTS.greataxe,
  },

  'barbarian_mage': {
    modelId: 'witch',
    scale: [0.72 * 0.95, 0.72 * 0.95, 0.72 * 0.95],
    materials: {
      Main:    { color: '#2a0810', roughness: 0.8 },
      Skin:    { color: '#8a5828', roughness: 0.65 },
      Details: { color: '#4a1020', emissive: '#440000', emissiveIntensity: 0.12 },
      Grey:    { color: '#1a0e10', roughness: 0.9 },
      Face:    { color: '#8a5828', emissive: '#660022', emissiveIntensity: 0.1 },
    },
    primaryWeapon: WEAPON_DEFAULTS.fire_staff,
  },

  'barbarian_ranger': {
    modelId: 'ranger_rpg',
    scale: [0.0072, 0.0072, 0.0072],
    textures: { diffuse: 'models/characters/rpg-textures/ranger.png' },
    materials: {
      Ranger_Texture: { color: '#c8b890', roughness: 0.8 },
      Bow_Texture:    { color: '#8a6030', roughness: 0.85 },
    },
    primaryWeapon: { modelId: 'bow', position: [0, 0, 0], rotation: [Math.PI / 2, Math.PI / 2, 0], scale: 19 },
    modelPackType: 'rpg',
    labelHeight: 1.58, hpRingHeight: 1.40, selectionRingRadius: 0.48,
  },

  // ── FABLED — DWARF ─────────────────────────────────────────────────────────
  'dwarf_warrior': {
    modelId: 'dwarf',
    scale: [0.72 * 1.06, 0.72 * 0.90, 0.72 * 1.06],
    materials: {
      Skin:       { color: '#7a4028', roughness: 0.65 },
      Face:       { color: '#7a4028' },
      Armor:      { color: '#a8b0b8', metalness: 0.85, roughness: 0.25 },
      Armor_Dark: { color: '#202428', metalness: 0.9, roughness: 0.2 },
      Detail:     { color: '#d4a017', emissive: '#884400', emissiveIntensity: 0.12, metalness: 0.7 },
      Red:        { color: '#0a2a6a', roughness: 0.7 },
    },
    primaryWeapon: WEAPON_DEFAULTS.war_hammer,
    secondaryWeapon: { ...WEAPON_DEFAULTS.shield, attachBone: 'Fist.L' },
  },

  'dwarf_worg': {
    modelId: 'dwarf',
    scale: [0.72 * 1.08, 0.72 * 0.90, 0.72 * 1.08],
    materials: {
      Skin:       { color: '#5a3820', roughness: 0.7 },
      Face:       { color: '#5a3820', emissive: '#331100', emissiveIntensity: 0.06 },
      Armor:      { color: '#4a3010', metalness: 0.5, roughness: 0.8 },
      Armor_Dark: { color: '#1a1008', metalness: 0.4, roughness: 0.9 },
      Detail:     { color: '#553300', roughness: 0.85 },
      Red:        { color: '#4a2010', roughness: 0.9 },
    },
    primaryWeapon: WEAPON_DEFAULTS.greataxe,
  },

  'dwarf_mage': {
    modelId: 'dwarf',
    scale: [0.72 * 1.05, 0.72 * 0.88, 0.72 * 1.05],
    materials: {
      Skin:       { color: '#8a5030', roughness: 0.65 },
      Face:       { color: '#8a5030', emissive: '#cc4400', emissiveIntensity: 0.15 },
      Armor:      { color: '#1a0c00', metalness: 0.7, roughness: 0.5 },
      Armor_Dark: { color: '#0a0600', metalness: 0.8, roughness: 0.4 },
      Detail:     { color: '#ff5500', emissive: '#ff5500', emissiveIntensity: 0.55, metalness: 0.6 },
      Red:        { color: '#cc2200', roughness: 0.7 },
    },
    primaryWeapon: WEAPON_DEFAULTS.fire_staff,
  },

  'dwarf_ranger': {
    modelId: 'dwarf',
    scale: [0.72 * 1.0, 0.72 * 0.88, 0.72 * 1.0],
    materials: {
      Skin:       { color: '#7a5030', roughness: 0.7 },
      Face:       { color: '#7a5030' },
      Armor:      { color: '#2a2820', metalness: 0.5, roughness: 0.7 },
      Armor_Dark: { color: '#101008', metalness: 0.4, roughness: 0.8 },
      Detail:     { color: '#604820', roughness: 0.8 },
      Red:        { color: '#3a2808', roughness: 0.9 },
    },
    primaryWeapon: WEAPON_DEFAULTS.war_hammer,
  },

  // ── FABLED — ELF ──────────────────────────────────────────────────────────
  'elf_warrior': {
    modelId: 'knight_golden_male',
    scale: [0.72 * 0.95, 0.72 * 0.95, 0.72 * 0.95],
    materials: {
      Armor:      { color: '#c8e0a8', metalness: 0.82, roughness: 0.18 },
      Armor_Dark: { color: '#1a3010', metalness: 0.6, roughness: 0.4 },
      Skin:       { color: '#d4c890', roughness: 0.5 },
      Detail:     { color: '#b8d060', metalness: 0.9, roughness: 0.12 },
      Red:        { color: '#1a3818', roughness: 0.7 },
    },
    primaryWeapon: WEAPON_DEFAULTS.greatsword,
  },

  'elf_worg': {
    modelId: 'ninja_female',
    scale: [0.72 * 0.90, 0.72 * 0.90, 0.72 * 0.90],
    materials: {
      Skin:   { color: '#d4c890', roughness: 0.5 },
      Armor:  { color: '#0e2208', metalness: 0.5, roughness: 0.55 },
      Detail: { color: '#3a6020', emissive: '#1a4010', emissiveIntensity: 0.12, metalness: 0.6 },
      Hair:   { color: '#c8c050', roughness: 0.65 },
    },
    primaryWeapon: WEAPON_DEFAULTS.greatsword,
  },

  'elf_mage': {
    // Elven sorceress in an elegant silk kimono; cool moonlit palette, arcane glow
    modelId: 'kimono_female',
    scale: [0.72 * 0.90, 0.72 * 0.90, 0.72 * 0.90],
    materials: {
      Main: { color: '#1a3028', roughness: 0.7 },
      Skin: { color: '#d4c890', roughness: 0.45 },
      Details: { color: '#2a4838', emissive: '#004433', emissiveIntensity: 0.22 },
      Grey: { color: '#0c1a14', roughness: 0.88 },
      Face: { color: '#d4c890', emissive: '#004422', emissiveIntensity: 0.1 },
    },
    primaryWeapon: WEAPON_DEFAULTS.fire_staff,
  },

  'elf_ranger': {
    modelId: 'ranger_rpg',
    scale: [0.0072, 0.0072, 0.0072],
    textures: { diffuse: 'models/characters/rpg-textures/ranger.png' },
    materials: {
      Ranger_Texture: { color: '#c8e8b0', emissive: '#006600', emissiveIntensity: 0.05, roughness: 0.75 },
      Bow_Texture:    { color: '#c0b060', roughness: 0.8 },
    },
    primaryWeapon: { modelId: 'bow', position: [0, 0, 0], rotation: [Math.PI / 2, Math.PI / 2, 0], scale: 19 },
    modelPackType: 'rpg',
    labelHeight: 1.58, hpRingHeight: 1.40, selectionRingRadius: 0.48,
  },

  // ── LEGION — ORC ──────────────────────────────────────────────────────────
  'orc_warrior': {
    modelId: 'orc',
    scale: [0.72 * 1.28, 0.72 * 1.02, 0.72 * 1.28],
    materials: {
      Skin:  { color: '#2e4820', roughness: 0.75 },
      Face:  { color: '#2e4820' },
      Pants: { color: '#2a1808', roughness: 0.9 },
      Teeth: { color: '#c8a050' },
    },
    primaryWeapon: WEAPON_DEFAULTS.greataxe,
  },

  'orc_worg': {
    modelId: 'orc',
    scale: [0.72 * 1.2, 0.72 * 1.05, 0.72 * 1.2],
    materials: {
      Skin:  { color: '#6a1810', emissive: '#440000', emissiveIntensity: 0.12, roughness: 0.8 },
      Face:  { color: '#6a1810', emissive: '#880000', emissiveIntensity: 0.25 },
      Pants: { color: '#100606', roughness: 0.9 },
      Teeth: { color: '#909090', metalness: 0.3 },
    },
    primaryWeapon: WEAPON_DEFAULTS.greatsword,
  },

  'orc_mage': {
    modelId: 'orc',
    scale: [0.72 * 1.15, 0.72 * 1.05, 0.72 * 1.15],
    materials: {
      Skin:  { color: '#28380a', emissive: '#004400', emissiveIntensity: 0.06, roughness: 0.8 },
      Face:  { color: '#28380a', emissive: '#cc4400', emissiveIntensity: 0.3 },
      Pants: { color: '#060610', roughness: 0.95 },
      Teeth: { color: '#303030' },
    },
    primaryWeapon: WEAPON_DEFAULTS.fire_staff,
  },

  'orc_ranger': {
    // Goblin jungle scout — lighter build, camouflage rags, daggers
    modelId: 'goblin_male',
    scale: [0.72 * 0.95, 0.72 * 0.92, 0.72 * 0.95],
    materials: {
      Main: { color: '#28380a', roughness: 0.88 },
      Skin: { color: '#4a6a18', roughness: 0.72 },
      Details: { color: '#1a2c08', emissive: '#0a1800', emissiveIntensity: 0.04 },
      Grey: { color: '#202816', roughness: 0.92 },
      Face: { color: '#4a6a18', emissive: '#1a2800', emissiveIntensity: 0.04 },
    },
    primaryWeapon: WEAPON_DEFAULTS.daggers,
  },

  // ── LEGION — UNDEAD ───────────────────────────────────────────────────────
  'undead_warrior': {
    modelId: 'knight_male',
    scale: [0.72 * 1.05, 0.72 * 1.05, 0.72 * 1.05],
    materials: {
      Armor:      { color: '#18140c', metalness: 0.6, roughness: 0.85 },
      Armor_Dark: { color: '#080808', metalness: 0.5, roughness: 0.95 },
      Skin:       { color: '#d0c8a0', emissive: '#550088', emissiveIntensity: 0.35, roughness: 0.85 },
      Detail:     { color: '#2a1000', roughness: 0.95 },
      Red:        { color: '#1a0606', roughness: 0.95 },
    },
    primaryWeapon: WEAPON_DEFAULTS.greatsword,
  },

  'undead_worg': {
    modelId: 'zombie_male',
    scale: [0.72 * 1.1, 0.72 * 1.05, 0.72 * 1.1],
    materials: {
      Clothes:     { color: '#1a1818', roughness: 0.95 },
      Skin:        { color: '#8a8870', emissive: '#001100', emissiveIntensity: 0.05, roughness: 0.9 },
      Face:        { color: '#a0a080', emissive: '#336600', emissiveIntensity: 0.35 },
      Pants:       { color: '#101008', roughness: 0.9 },
      DarkClothes: { color: '#080808', roughness: 0.95 },
      Bones:       { color: '#c8c0a0', roughness: 0.8 },
      Guts:        { color: '#180808' },
      Brain:       { color: '#1a0808' },
    },
    primaryWeapon: WEAPON_DEFAULTS.greataxe,
  },

  'undead_mage': {
    modelId: 'zombie_male',
    scale: [0.72 * 0.9, 0.72 * 0.9, 0.72 * 0.9],
    materials: {
      Clothes:     { color: '#c0c8d0', roughness: 0.8 },
      Skin:        { color: '#b0a898', emissive: '#220044', emissiveIntensity: 0.05, roughness: 0.9 },
      Face:        { color: '#c0b8a8', emissive: '#6600cc', emissiveIntensity: 0.5 },
      Pants:       { color: '#c8cad0', roughness: 0.85 },
      DarkClothes: { color: '#1a1820', roughness: 0.95 },
      Bones:       { color: '#d8d0b8', roughness: 0.8 },
      Guts:        { color: '#080808' },
      Brain:       { color: '#080808' },
    },
    primaryWeapon: WEAPON_DEFAULTS.dark_staff,
  },

  'undead_ranger': {
    // Undead female assassin — rotting flesh, necrotic purple glow, daggers
    modelId: 'zombie_female',
    scale: [0.72 * 0.88, 0.72 * 0.88, 0.72 * 0.88],
    materials: {
      Clothes: { color: '#080608', roughness: 0.95 },
      Skin: { color: '#9a9880', emissive: '#110033', emissiveIntensity: 0.04, roughness: 0.9 },
      Face: { color: '#b0ae90', emissive: '#8800cc', emissiveIntensity: 0.55 },
      Pants: { color: '#0c0a0e', roughness: 0.95 },
      DarkClothes: { color: '#060408', roughness: 0.98 },
      Bones: { color: '#c8c0a0', roughness: 0.8 },
      Guts: { color: '#100808' },
      Brain: { color: '#0e0808' },
    },
    primaryWeapon: WEAPON_DEFAULTS.daggers,
  },

  // ── PIRATES ────────────────────────────────────────────────────────────────
  'pirate_king': {
    modelId: 'pirate_male',
    scale: [0.72, 0.72, 0.72],
    materials: {
      Clothes: { color: '#1a0808', roughness: 0.8 },
      Beige:   { color: '#e8d8c0', roughness: 0.85 },
      Skin:    { color: '#a05828', roughness: 0.7 },
      Gold:    { color: '#c8900a', metalness: 0.85, roughness: 0.2 },
      Brown:   { color: '#3a1a08', roughness: 0.88 },
      Face:    { color: '#a05828', emissive: '#662200', emissiveIntensity: 0.08 },
      Black:   { color: '#0a0608' },
      Red:     { color: '#880808', roughness: 0.85 },
    },
    primaryWeapon: WEAPON_DEFAULTS.greatsword,
    accessoryAttachments: [
      { modelId: 'pirate_hat', bone: 'Head', position: [0, 0.08, 0], rotation: [0, 0, 0], scale: 0.9 },
      { modelId: 'captain_cape', bone: 'Spine', position: [0, 0, -0.1], rotation: [0, 0, 0], scale: 1.0 },
    ],
  },

  'sky_captain': {
    modelId: 'soldier_male',
    scale: [0.72, 0.72, 0.72],
    materials: {
      Main:    { color: '#0a1a3a', roughness: 0.7 },
      Skin:    { color: '#b87848', roughness: 0.65 },
      Details: { color: '#c8a030', metalness: 0.6, roughness: 0.35 },
      Grey:    { color: '#182030', roughness: 0.85 },
      Face:    { color: '#b87848', emissive: '#220800', emissiveIntensity: 0.05 },
    },
    primaryWeapon: WEAPON_DEFAULTS.sword,
    secondaryWeapon: { ...WEAPON_DEFAULTS.shield, attachBone: 'Fist.L' },
  },

  'faith_barrier': {
    modelId: 'cleric_rpg',
    scale: [0.0072, 0.0072, 0.0072],
    textures: { diffuse: 'models/characters/rpg-textures/cleric.png' },
    materials: {
      Cleric_Texture: { color: '#e8e0c8', emissive: '#886600', emissiveIntensity: 0.08, roughness: 0.7 },
    },
    primaryWeapon: { modelId: 'war_hammer', position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0], scale: 19 },
    animMap: {
      attack1: 'Staff_Attack', attack2: 'Punch', cast: 'Spell1',
      special1: 'Spell2', stunned: 'RecieveHit', block: 'Idle_Weapon',
      victory: 'Idle_Weapon', idle2: 'Idle_Weapon',
    },
    modelPackType: 'rpg',
    labelHeight: 1.58, hpRingHeight: 1.40, selectionRingRadius: 0.48,
  },

  // ── RPG Pack Characters ──────────────────────────────────────────────────
  'warrior_rpg_hero': {
    modelId: 'warrior_rpg',
    scale: [0.0072, 0.0072, 0.0072],
    textures: { diffuse: 'models/characters/rpg-textures/warrior.png' },
    materials: {},
    primaryWeapon: { modelId: 'sword', position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0], scale: 56 },
    secondaryWeapon: { modelId: 'shield', position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0], scale: 24, attachBone: 'Fist.L' },
    modelPackType: 'rpg',
    labelHeight: 1.58, hpRingHeight: 1.40, selectionRingRadius: 0.48,
  },

  'rogue_rpg_hero': {
    modelId: 'rogue_rpg',
    scale: [0.0072, 0.0072, 0.0072],
    textures: { diffuse: 'models/characters/rpg-textures/rogue.png' },
    materials: {},
    primaryWeapon: { modelId: 'daggers', position: [0, 0, 0], rotation: [Math.PI / 2, 0, Math.PI / 6], scale: 43 },
    modelPackType: 'rpg',
    labelHeight: 1.58, hpRingHeight: 1.40, selectionRingRadius: 0.48,
  },

  'wizard_rpg_hero': {
    modelId: 'wizard_rpg',
    scale: [0.0072, 0.0072, 0.0072],
    textures: { diffuse: 'models/characters/rpg-textures/wizard.png' },
    materials: {},
    primaryWeapon: { modelId: 'fire_staff', position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0], scale: 15 },
    modelPackType: 'rpg',
    labelHeight: 1.58, hpRingHeight: 1.40, selectionRingRadius: 0.48,
  },

  'monk_rpg_hero': {
    modelId: 'monk_rpg',
    scale: [0.0072, 0.0072, 0.0072],
    textures: { diffuse: 'models/characters/rpg-textures/monk.png' },
    materials: {},
    primaryWeapon: { modelId: 'war_hammer', position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0], scale: 19 },
    modelPackType: 'rpg',
    labelHeight: 1.58, hpRingHeight: 1.40, selectionRingRadius: 0.48,
  },
};

export function getCharacterConfig(characterId: string): CharacterConfig {
  return CHARACTER_CONFIGS[characterId] ?? CHARACTER_CONFIGS['orcish-warrior'];
}

export function getFormConfig(characterId: string, formId: WorgeFormId | null): CharacterConfig {
  if (!formId) return getCharacterConfig(characterId);
  const def = WORGE_FORM_DEFS.find(d => d.formId === formId);
  if (def && WORGE_FORM_CONFIGS[def.configKey]) return WORGE_FORM_CONFIGS[def.configKey];
  return getCharacterConfig(characterId);
}

export function getAnimationName(state: AnimState, config: CharacterConfig): string {
  return config.animMap?.[state] ?? DEFAULT_ANIM_MAP[state] ?? 'Idle';
}

export function isWorge(characterId: string): boolean {
  return characterId.endsWith('_worg');
}

// ── Weapon fallback map ─────────────────────────────────────────────────────
// Maps weapon types that don't have GLBs yet to the closest visual substitute.

export const WEAPON_FALLBACK: Record<string, string> = {
  crossbow:     'bow',
  gun:          'bow',
  lance:        'greatsword',
  focus:        'dark_staff',
  mace:         'war_hammer',
  axe:          'greataxe',
  spear:        'greatsword',
  greathammer:  'war_hammer',
  sword_shield: 'sword',  // shield added as secondary
};

// Weapon types that automatically add a shield as secondary weapon.
const SHIELD_COMBO_WEAPONS = new Set(['sword_shield']);

/** RPG pack models need ~86× weapon scale compared to Quaternius models. */
const RPG_WEAPON_SCALE_MULTIPLIER = 86;

/**
 * Resolve a weapon type string into a concrete WeaponConfig + optional shield.
 * Handles fallback for missing GLBs and auto-scales for RPG-pack models.
 */
export function resolveWeaponConfig(
  weaponType: string | undefined,
  config: CharacterConfig,
): { primary: WeaponConfig; secondary?: SecondaryWeaponConfig } {
  if (!weaponType) {
    return { primary: config.primaryWeapon, secondary: config.secondaryWeapon };
  }

  // Resolve fallback if no GLB for this weapon type
  const resolvedType = WEAPON_DEFAULTS[weaponType] ? weaponType : (WEAPON_FALLBACK[weaponType] ?? weaponType);
  const baseConfig = WEAPON_DEFAULTS[resolvedType] ?? config.primaryWeapon;

  // Auto-scale for RPG pack models
  const isRpg = config.modelPackType === 'rpg';
  const primary: WeaponConfig = isRpg
    ? { ...baseConfig, scale: baseConfig.scale * RPG_WEAPON_SCALE_MULTIPLIER }
    : baseConfig;

  // Auto-add shield for combo weapon types
  let secondary: SecondaryWeaponConfig | undefined = config.secondaryWeapon;
  if (SHIELD_COMBO_WEAPONS.has(weaponType)) {
    const shieldBase = WEAPON_DEFAULTS.shield;
    secondary = {
      ...shieldBase,
      scale: isRpg ? shieldBase.scale * RPG_WEAPON_SCALE_MULTIPLIER : shieldBase.scale,
      attachBone: 'Fist.L',
    };
  }

  return { primary, secondary };
}

export const ACCESSORY_MODEL_URLS = [
  '/models/accessories/knight_helm.glb',
  '/models/accessories/shoulder_plate_l.glb',
  '/models/accessories/shoulder_plate_r.glb',
  '/models/accessories/orc_shoulder_spike_l.glb',
  '/models/accessories/orc_shoulder_spike_r.glb',
  '/models/accessories/pirate_hat.glb',
  '/models/accessories/captain_cape.glb',
];

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
  // Ultimate Animated Character Pack (Nov 2019) — loaded on demand
  '/models/characters/blue_soldier_female.glb',
  '/models/characters/blue_soldier_male.glb',
  '/models/characters/casual2_female.glb',
  '/models/characters/casual2_male.glb',
  '/models/characters/casual3_female.glb',
  '/models/characters/casual3_male.glb',
  '/models/characters/casual_bald.glb',
  '/models/characters/casual_female.glb',
  '/models/characters/casual_male.glb',
  '/models/characters/chef_female.glb',
  '/models/characters/chef_male.glb',
  '/models/characters/cowboy_female.glb',
  '/models/characters/cowboy_male.glb',
  '/models/characters/doctor_female_old.glb',
  '/models/characters/doctor_female_young.glb',
  '/models/characters/doctor_male_old.glb',
  '/models/characters/doctor_male_young.glb',
  '/models/characters/goblin_female.glb',
  '/models/characters/goblin_male.glb',
  '/models/characters/kimono_female.glb',
  '/models/characters/kimono_male.glb',
  '/models/characters/knight_golden_female.glb',
  '/models/characters/knight_golden_male.glb',
  '/models/characters/knight_male.glb',
  '/models/characters/ninja_female.glb',
  '/models/characters/ninja_male.glb',
  '/models/characters/ninja_sand.glb',
  '/models/characters/ninja_sand_female.glb',
  '/models/characters/old_classy_female.glb',
  '/models/characters/old_classy_male.glb',
  '/models/characters/pirate_female.glb',
  '/models/characters/pirate_male.glb',
  '/models/characters/soldier_female.glb',
  '/models/characters/soldier_male.glb',
  '/models/characters/suit_female.glb',
  '/models/characters/suit_male.glb',
  '/models/characters/viking_female.glb',
  '/models/characters/viking_male.glb',
  '/models/characters/witch.glb',
  '/models/characters/wizard.glb',
  '/models/characters/worker_female.glb',
  '/models/characters/worker_male.glb',
  '/models/characters/zombie_female.glb',
  '/models/characters/zombie_male.glb',
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
  // Worge beast form models
  '/models/characters/warbear.glb',
  '/models/characters/werewolf.glb',
  '/models/characters/raptor.glb',
];