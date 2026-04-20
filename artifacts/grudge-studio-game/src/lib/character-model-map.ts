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
  | 'zombie_female' | 'zombie_male'
  // Reallusion Character Creator (CC) pack — dropped into public/models/characters/
  // by the Apr-2026 hero upload. New GLBs uploaded later must be added here to
  // be type-safe (the loader itself loads by string, but the union keeps configs honest).
  | 'assassin_female' | 'assassin_male'
  | 'dwarf_male'
  | 'elf_female' | 'elf_male'
  | 'goblin_new' | 'goblin_backstabber_female' | 'goblin_backstabber_male'
  | 'human_battle_mage_female' | 'human_battle_mage_male'
  | 'lizardfolk_male'
  | 'night_stalker_female' | 'night_stalker_male'
  | 'orc_scout_female' | 'orc_scout_male'
  | 'swordman'
  | 'vampire_aristocrat_female' | 'vampire_aristocrat_male'
  | 'undead_grave_knight_female' | 'undead_grave_knight_male'
  | 'vampire_female'
  | 'werewolf_mixamo'
  | 'mixamo_generic'
  // Apr-2026 second batch — static voxel-style GLBs (no skeleton, no clips)
  | 'growerz_yellow' | 'growerz_dread' | 'growerz_green' | 'growerz_led'
  | 'racalvin';

export interface AccessoryConfig {
  modelId: string;
  bone: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export type ModelPackType = 'quaternius' | 'rpg' | 'cc';

export interface CharacterConfig {
  modelId: ModelId;
  scale: [number, number, number];
  materials: Record<string, MaterialOverride>;
  primaryWeapon: WeaponConfig;
  secondaryWeapon?: SecondaryWeaponConfig;
  /** Extra bone-attached accessories (helmets, shoulder pads, capes, etc.) */
  accessoryAttachments?: AccessoryConfig[];
  /**
   * Local-space translation applied to the scaled model (world units) so that
   * off-center pivots still render correctly in the middle of a tile square.
   * Default [0, 0, 0].
   */
  modelOffset?: [number, number, number];
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

// ═══════════════════════════════════════════════════════════════════════════
// Reallusion Character Creator (CC) rig metadata
// ═══════════════════════════════════════════════════════════════════════════
//
// Every CC-rigged GLB ships with exactly ONE mocap clip plus a T-Pose, and the
// bounding box Y is roughly 80-120 units tall. We target ~1.6 world units of
// character height so the hero fits inside a 1-unit tile comfortably.
//
// To add a NEW uploaded GLB: drop the file into public/models/characters/, add
// an entry here (scale + the name of its mocap clip), add the modelId to the
// ModelId union above, and reference it from any hero config.

interface CCRigMeta {
  /** Native bounding-box Y (from scripts/inspect-glb.mjs) */
  bboxY: number;
  /** The GLB's single mocap clip name (not the T-Pose) */
  motionClip: string;
  /** Optional hint — approximate chest-forward offset in native units,
   *  needed only if the mesh pivot isn't centered on X/Z. */
  pivotZ?: number;
}

export const CC_RIG_META: Record<string, CCRigMeta> = {
  assassin_female:            { bboxY: 104.30, motionClip: '0_T-Pose(0)' },
  assassin_male:              { bboxY: 105.49, motionClip: '0_T-Pose(0)' },
  dwarf_male:                 { bboxY:  88.10, motionClip: 'sit-talk-378944' },
  elf_female:                 { bboxY: 107.77, motionClip: 'dance-graceful-378939' },
  elf_male:                   { bboxY:  99.63, motionClip: 'walk-think-378989' },
  goblin_new:                 { bboxY:  86.93, motionClip: 'relax-378947' },
  goblin_backstabber_female:  { bboxY:  85.38, motionClip: 'f_h_magespellcast_05' },
  goblin_backstabber_male:    { bboxY:  85.54, motionClip: 'birdcage-378914' },
  human_battle_mage_female:   { bboxY: 104.91, motionClip: 'change-pose-379001' },
  human_battle_mage_male:     { bboxY:  99.14, motionClip: 'walk-think-378989' },
  lizardfolk_male:            { bboxY:  77.83, motionClip: 'walk-relaxed-2loop-378986', pivotZ: -15 },
  night_stalker_female:       { bboxY:  84.23, motionClip: 'dance-graceful-378939', pivotZ: -10 },
  night_stalker_male:         { bboxY:  82.90, motionClip: 'crouch_walk_r_againstwall', pivotZ: -8 },
  orc_scout_female:           { bboxY: 102.48, motionClip: 'walk-2loop-379004' },
  orc_scout_male:             { bboxY:  99.37, motionClip: 'relax-378947' },
  swordman:                   { bboxY: 101.53, motionClip: 'relax-378947' },
  vampire_aristocrat_female:  { bboxY: 118.18, motionClip: 'stand-talk-378997' },
  vampire_aristocrat_male:    { bboxY: 106.31, motionClip: 'walk-think-378989' },
  undead_grave_knight_female: { bboxY:  94.84, motionClip: 'relax-378947' },
  undead_grave_knight_male:   { bboxY:  95.37, motionClip: 'birdcage-378914' },
  vampire_female:             { bboxY: 110.57, motionClip: '0_T-Pose(0)' },
  werewolf_mixamo:            { bboxY:  94.36, motionClip: 'male-idle_279398' },
  mixamo_generic:             { bboxY:  88.10, motionClip: 'sit-talk-378944' },
};

/** Target character height in world units — matches levels.ts `tileSize = 1.5`
 *  so CC heroes fit neatly inside a single tile cube without spilling arms into
 *  the next square. All 4 levels in levels.ts use TS = 1.5. */
const CC_TARGET_HEIGHT = 1.5;

/** Build a MINIMAL animMap for CC heroes.
 *
 *  Layering in buildAnimMap() goes: DEFAULT_ANIM_MAP → WEAPON_ANIM_DEFAULTS →
 *  config.animMap → user overrides. If we populate every AnimState here,
 *  we clobber the weapon-specific FBX clip names in layer 2 and the player's
 *  sword attack will play the mocap clip instead of `ssAttack1`. So we only
 *  set the states that FBX weapon sets DON'T provide (emote, victory,
 *  stunned/frozen/dead, hide). Everything else is left to weapon FBX + the
 *  non-T-Pose fallback in CharacterModel. */
function ccAnimMap(motionClip: string): Partial<Record<AnimState, string>> {
  return {
    emote:    motionClip,
    victory:  motionClip,
    dead:     '0_T-Pose',
    stunned:  '0_T-Pose',
    frozen:   '0_T-Pose',
    hide:     '0_T-Pose',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Static voxel-style heroes (no skeleton, no embedded clips)
// ═══════════════════════════════════════════════════════════════════════════
//
// These go through VoxelCharacterModel (see components/three/VoxelCharacterModel.tsx)
// which auto-scales to ≈1.4 world units, centers the pivot on feet, and drives
// procedural idle/walk/attack clips via voxel-loader.ts. No rigging required.

/** IDs of the four Growerz static meshes (Apr-2026 upload). Available for use
 *  as NPCs, enemies, or swap-in heroes — not currently assigned to any roster slot. */
export const GROWERZ_MODEL_IDS = [
  'growerz_yellow', 'growerz_dread', 'growerz_green', 'growerz_led',
] as const;

/** Build a CharacterConfig for a static voxel-style GLB. */
export function voxelCharacter(
  modelId: ModelId,
  weapon: WeaponConfig,
  opts: {
    materials?: Record<string, MaterialOverride>;
    voxelScale?: number;
  } = {},
): CharacterConfig {
  return {
    modelId,
    scale: [1, 1, 1],
    materials: opts.materials ?? {},
    primaryWeapon: weapon,
    isVoxel: true,
    voxelModelUrl: `models/characters/${modelId}.glb`,
    voxelScale: opts.voxelScale,
    labelHeight: 1.85,
    hpRingHeight: 1.60,
    selectionRingRadius: 0.45,
  };
}

/** Build a CharacterConfig for a CC-rigged hero. Ensures the hero is the right
 *  size to land centered inside a 1×1 tile, with proper label/ring heights,
 *  and weapons auto-upscaled via `modelPackType: 'cc'`. */
export function ccCharacter(
  modelId: ModelId,
  weapon: WeaponConfig,
  opts: {
    materials?: Record<string, MaterialOverride>;
    secondaryWeapon?: SecondaryWeaponConfig;
    heightMultiplier?: number;
    animMap?: Partial<Record<AnimState, string>>;
  } = {},
): CharacterConfig {
  const meta = CC_RIG_META[modelId as string];
  if (!meta) throw new Error(`ccCharacter: unknown CC model id "${modelId}"`);
  const heightMult = opts.heightMultiplier ?? 1.0;
  const s = (CC_TARGET_HEIGHT * heightMult) / meta.bboxY;
  const offsetZ = meta.pivotZ ? -meta.pivotZ * s : 0;
  // Weapons are left at Quaternius-baseline scale here; resolveWeaponConfig()
  // auto-compensates for the small char scale at attach-time.
  return {
    modelId,
    scale: [s, s, s],
    materials: opts.materials ?? {},
    primaryWeapon: weapon,
    secondaryWeapon: opts.secondaryWeapon,
    animMap: opts.animMap ?? ccAnimMap(meta.motionClip),
    modelOffset: [0, 0, offsetZ],
    labelHeight: CC_TARGET_HEIGHT * heightMult + 0.30,
    hpRingHeight: CC_TARGET_HEIGHT * heightMult + 0.10,
    selectionRingRadius: 0.45,
    modelPackType: 'cc',
  };
}

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
    primaryWeapon: WEAPON_DEFAULTS.bow,
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

  // ── CRUSADE — HUMAN ─── (new CC rig models, Apr-2026 upload) ───────────────
  'human_warrior': ccCharacter('swordman', WEAPON_DEFAULTS.sword, {
    secondaryWeapon: { ...WEAPON_DEFAULTS.shield, attachBone: 'Fist.L' },
    materials: { Material_Pbr: { color: '#e6e9ef', metalness: 0.75, roughness: 0.35 } },
  }),
  'human_worg': ccCharacter('assassin_male', WEAPON_DEFAULTS.greatsword, {
    heightMultiplier: 1.05,
    materials: { Material_Pbr: { color: '#c49060', roughness: 0.75 } },
  }),
  'human_mage': ccCharacter('human_battle_mage_male', WEAPON_DEFAULTS.fire_staff, {
    materials: { Material_Pbr: { color: '#5a4cbf', emissive: '#3300aa', emissiveIntensity: 0.12, roughness: 0.55 } },
  }),
  'human_ranger': ccCharacter('night_stalker_male', WEAPON_DEFAULTS.daggers, {
    heightMultiplier: 0.95,
    materials: { Material_Pbr: { color: '#2a3a18', roughness: 0.85 } },
  }),

  // ── CRUSADE — BARBARIAN ─── (new CC rig models) ────────────────────────────
  'barbarian_warrior': ccCharacter('swordman', WEAPON_DEFAULTS.greataxe, {
    heightMultiplier: 1.15,
    materials: { Material_Pbr: { color: '#7a4e28', roughness: 0.75 } },
  }),
  'barbarian_worg': ccCharacter('werewolf_mixamo', WEAPON_DEFAULTS.greataxe, {
    heightMultiplier: 1.10,
    materials: { Material_Pbr: { color: '#4a3a28', roughness: 0.9 } },
  }),
  'barbarian_mage': ccCharacter('human_battle_mage_female', WEAPON_DEFAULTS.fire_staff, {
    heightMultiplier: 1.02,
    materials: { Material_Pbr: { color: '#8a1030', emissive: '#440000', emissiveIntensity: 0.15, roughness: 0.6 } },
  }),
  'barbarian_ranger': ccCharacter('orc_scout_female', WEAPON_DEFAULTS.bow, {
    heightMultiplier: 1.02,
    materials: { Material_Pbr: { color: '#c8b890', roughness: 0.8 } },
  }),

  // ── FABLED — DWARF ─── (new CC rig — dwarf_male + size variants) ──────────
  'dwarf_warrior': ccCharacter('dwarf_male', WEAPON_DEFAULTS.war_hammer, {
    secondaryWeapon: { ...WEAPON_DEFAULTS.shield, attachBone: 'Fist.L' },
    heightMultiplier: 0.85,
    materials: { Material_Pbr: { color: '#a8b0b8', metalness: 0.7, roughness: 0.35 } },
  }),
  'dwarf_worg': ccCharacter('dwarf_male', WEAPON_DEFAULTS.greataxe, {
    heightMultiplier: 0.90,
    materials: { Material_Pbr: { color: '#5a3820', emissive: '#331100', emissiveIntensity: 0.06, roughness: 0.75 } },
  }),
  'dwarf_mage': ccCharacter('dwarf_male', WEAPON_DEFAULTS.fire_staff, {
    heightMultiplier: 0.88,
    materials: { Material_Pbr: { color: '#ff5500', emissive: '#cc2200', emissiveIntensity: 0.25, roughness: 0.55 } },
  }),
  'dwarf_ranger': ccCharacter('dwarf_male', WEAPON_DEFAULTS.bow, {
    heightMultiplier: 0.88,
    materials: { Material_Pbr: { color: '#604820', roughness: 0.8 } },
  }),

  // ── FABLED — ELF ─── (new CC rig — elf_male/elf_female) ───────────────────
  'elf_warrior': ccCharacter('elf_male', WEAPON_DEFAULTS.greatsword, {
    materials: { Material_Pbr: { color: '#c8e0a8', metalness: 0.55, roughness: 0.3 } },
  }),
  'elf_worg': ccCharacter('elf_female', WEAPON_DEFAULTS.greatsword, {
    materials: { Material_Pbr: { color: '#3a6020', emissive: '#1a4010', emissiveIntensity: 0.15, roughness: 0.55 } },
  }),
  'elf_mage': ccCharacter('elf_female', WEAPON_DEFAULTS.fire_staff, {
    materials: { Material_Pbr: { color: '#2a4838', emissive: '#004433', emissiveIntensity: 0.22, roughness: 0.6 } },
  }),
  'elf_ranger': ccCharacter('elf_male', WEAPON_DEFAULTS.bow, {
    materials: { Material_Pbr: { color: '#c8e8b0', emissive: '#006600', emissiveIntensity: 0.08, roughness: 0.7 } },
  }),

  // ── LEGION — ORC ─── (new CC rig — orc_scout + goblin + lizardfolk) ───────
  'orc_warrior': ccCharacter('orc_scout_male', WEAPON_DEFAULTS.greataxe, {
    heightMultiplier: 1.15,
    materials: { Material_Pbr: { color: '#2e4820', roughness: 0.75 } },
  }),
  'orc_worg': ccCharacter('lizardfolk_male', WEAPON_DEFAULTS.greatsword, {
    heightMultiplier: 1.10,
    materials: { Material_Pbr: { color: '#6a1810', emissive: '#440000', emissiveIntensity: 0.2, roughness: 0.8 } },
  }),
  'orc_mage': ccCharacter('goblin_backstabber_male', WEAPON_DEFAULTS.fire_staff, {
    heightMultiplier: 1.05,
    materials: { Material_Pbr: { color: '#28380a', emissive: '#cc4400', emissiveIntensity: 0.22, roughness: 0.8 } },
  }),
  'orc_ranger': ccCharacter('goblin_new', WEAPON_DEFAULTS.daggers, {
    heightMultiplier: 0.95,
    materials: { Material_Pbr: { color: '#4a6a18', roughness: 0.72 } },
  }),

  // ── LEGION — UNDEAD ─── (new CC rig — grave knight + vampire aristocrats) ─
  'undead_warrior': ccCharacter('undead_grave_knight_male', WEAPON_DEFAULTS.greatsword, {
    heightMultiplier: 1.05,
    materials: { Material_Pbr: { color: '#18140c', emissive: '#550088', emissiveIntensity: 0.25, metalness: 0.55, roughness: 0.7 } },
  }),
  'undead_worg': ccCharacter('vampire_aristocrat_male', WEAPON_DEFAULTS.greataxe, {
    heightMultiplier: 1.00,
    materials: { Material_Pbr: { color: '#a0a080', emissive: '#336600', emissiveIntensity: 0.25, roughness: 0.85 } },
  }),
  'undead_mage': ccCharacter('vampire_aristocrat_female', WEAPON_DEFAULTS.dark_staff, {
    materials: { Material_Pbr: { color: '#c0b8a8', emissive: '#6600cc', emissiveIntensity: 0.35, roughness: 0.7 } },
  }),
  'undead_ranger': ccCharacter('undead_grave_knight_female', WEAPON_DEFAULTS.daggers, {
    materials: { Material_Pbr: { color: '#b0ae90', emissive: '#8800cc', emissiveIntensity: 0.4, roughness: 0.85 } },
  }),

  // ── PIRATES ─── (racalvin voxel + CC swordman) ──────────────────────────
  // Racalvin — project creator's canonical hero, Apr-2026 upload
  'pirate_king': voxelCharacter('racalvin', WEAPON_DEFAULTS.greatsword),

  'sky_captain': ccCharacter('swordman', WEAPON_DEFAULTS.sword, {
    secondaryWeapon: { ...WEAPON_DEFAULTS.shield, attachBone: 'Fist.L' },
    heightMultiplier: 1.02,
    materials: { Material_Pbr: { color: '#1a4a8a', metalness: 0.5, roughness: 0.55 } },
  }),

  'faith_barrier': {
    modelId: 'cleric_rpg',
    scale: [0.0072, 0.0072, 0.0072],
    textures: { diffuse: 'models/characters/rpg-textures/cleric.png' },
    materials: {
      Cleric_Texture: { color: '#e8e0c8', emissive: '#886600', emissiveIntensity: 0.08, roughness: 0.7 },
    },
    primaryWeapon: WEAPON_DEFAULTS.war_hammer,
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
    primaryWeapon: WEAPON_DEFAULTS.sword,
    secondaryWeapon: { ...WEAPON_DEFAULTS.shield, attachBone: 'Fist.L' },
    modelPackType: 'rpg',
    labelHeight: 1.58, hpRingHeight: 1.40, selectionRingRadius: 0.48,
  },

  'rogue_rpg_hero': {
    modelId: 'rogue_rpg',
    scale: [0.0072, 0.0072, 0.0072],
    textures: { diffuse: 'models/characters/rpg-textures/rogue.png' },
    materials: {},
    primaryWeapon: WEAPON_DEFAULTS.daggers,
    modelPackType: 'rpg',
    labelHeight: 1.58, hpRingHeight: 1.40, selectionRingRadius: 0.48,
  },

  'wizard_rpg_hero': {
    modelId: 'wizard_rpg',
    scale: [0.0072, 0.0072, 0.0072],
    textures: { diffuse: 'models/characters/rpg-textures/wizard.png' },
    materials: {},
    primaryWeapon: WEAPON_DEFAULTS.fire_staff,
    modelPackType: 'rpg',
    labelHeight: 1.58, hpRingHeight: 1.40, selectionRingRadius: 0.48,
  },

  'monk_rpg_hero': {
    modelId: 'monk_rpg',
    scale: [0.0072, 0.0072, 0.0072],
    textures: { diffuse: 'models/characters/rpg-textures/monk.png' },
    materials: {},
    primaryWeapon: WEAPON_DEFAULTS.war_hammer,
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

/**
 * Quaternius is the reference pack WEAPON_DEFAULTS scales were authored
 * against. Any rig whose character scale differs gets a compensating factor
 * so the weapon renders the same *world* size at attach-time, independent of
 * the model's native size.
 */
const QUATERNIUS_BASELINE_CHAR_SCALE = 0.72;

/** Compute the weapon local-scale compensation factor for a rig:
 *  factor = baselineCharScale / actualCharScale
 *  Quaternius → 1 (pass-through), RPG/CC → automatically larger. */
function weaponScaleFactor(config: CharacterConfig): number {
  const chScale = config.scale?.[0] ?? QUATERNIUS_BASELINE_CHAR_SCALE;
  if (chScale <= 0.0001) return 1;
  return QUATERNIUS_BASELINE_CHAR_SCALE / chScale;
}

function scaleWeapon<T extends WeaponConfig>(w: T, factor: number): T {
  return factor === 1 ? w : { ...w, scale: w.scale * factor };
}

/**
 * Resolve a weapon type string into a concrete WeaponConfig + optional shield.
 * Handles fallback for missing GLBs and auto-scales every rig by the ratio of
 * its character scale to the Quaternius baseline (no per-pack magic numbers).
 */
export function resolveWeaponConfig(
  weaponType: string | undefined,
  config: CharacterConfig,
): { primary: WeaponConfig; secondary?: SecondaryWeaponConfig } {
  const factor = weaponScaleFactor(config);

  if (!weaponType) {
    // Character spawned without an equipped weapon type (e.g. AI enemies) —
    // the per-hero primaryWeapon is already in Quaternius baseline scale, so
    // apply the same factor rather than returning it as-is.
    return {
      primary: scaleWeapon(config.primaryWeapon, factor),
      secondary: config.secondaryWeapon ? scaleWeapon(config.secondaryWeapon, factor) : undefined,
    };
  }

  // Resolve fallback if no GLB for this weapon type
  const resolvedType = WEAPON_DEFAULTS[weaponType] ? weaponType : (WEAPON_FALLBACK[weaponType] ?? weaponType);
  const baseConfig = WEAPON_DEFAULTS[resolvedType] ?? config.primaryWeapon;
  const primary: WeaponConfig = scaleWeapon(baseConfig, factor);

  // Auto-add shield for combo weapon types, using the per-hero secondary as
  // override if provided.
  let secondary: SecondaryWeaponConfig | undefined =
    config.secondaryWeapon ? scaleWeapon(config.secondaryWeapon, factor) : undefined;
  if (SHIELD_COMBO_WEAPONS.has(weaponType)) {
    const shieldBase = WEAPON_DEFAULTS.shield;
    secondary = {
      ...shieldBase,
      scale: shieldBase.scale * factor,
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
  // Reallusion CC pack (Apr-2026 hero upload)
  '/models/characters/assassin_female.glb',
  '/models/characters/assassin_male.glb',
  '/models/characters/dwarf_male.glb',
  '/models/characters/elf_female.glb',
  '/models/characters/elf_male.glb',
  '/models/characters/goblin_new.glb',
  '/models/characters/goblin_backstabber_female.glb',
  '/models/characters/goblin_backstabber_male.glb',
  '/models/characters/human_battle_mage_female.glb',
  '/models/characters/human_battle_mage_male.glb',
  '/models/characters/lizardfolk_male.glb',
  '/models/characters/night_stalker_female.glb',
  '/models/characters/night_stalker_male.glb',
  '/models/characters/orc_scout_female.glb',
  '/models/characters/orc_scout_male.glb',
  '/models/characters/swordman.glb',
  '/models/characters/vampire_aristocrat_female.glb',
  '/models/characters/vampire_aristocrat_male.glb',
  '/models/characters/undead_grave_knight_female.glb',
  '/models/characters/undead_grave_knight_male.glb',
  '/models/characters/vampire_female.glb',
  '/models/characters/werewolf_mixamo.glb',
  '/models/characters/mixamo_generic.glb',
  // Apr-2026 second batch — voxel/static meshes
  '/models/characters/growerz_yellow.glb',
  '/models/characters/growerz_dread.glb',
  '/models/characters/growerz_green.glb',
  '/models/characters/growerz_led.glb',
  '/models/characters/racalvin.glb',
];
