import * as THREE from 'three';
import type { AnimState } from './character-model-map';

// ── Bone name normalization ──────────────────────────────────────────────────
// Strips vendor prefixes so bone tracks from Mixamo, Quaternius, RPG Pack, etc.
// can be matched against a target skeleton with different naming.

const STRIP_PREFIXES = [
  /^mixamorig[01]?:/i,
  /^CharacterArmature\|/i,
  /^Armature\|/i,
  /^Root\//i,
];

export function normalizeBoneName(name: string): string {
  let n = name;
  for (const re of STRIP_PREFIXES) {
    n = n.replace(re, '');
  }
  // Unify common suffixes: .L/.R → _L/_R
  n = n.replace(/\.L$/i, '_L').replace(/\.R$/i, '_R');
  // Lowercase for comparison
  return n.toLowerCase();
}

// ── Canonical bone name map ──────────────────────────────────────────────────
// Maps normalized names across rig conventions so retargetClip can remap tracks.

type CanonicalBone =
  | 'hips' | 'spine' | 'spine1' | 'spine2' | 'neck' | 'head'
  | 'leftshoulder' | 'leftarm' | 'leftforearm' | 'lefthand'
  | 'rightshoulder' | 'rightarm' | 'rightforearm' | 'righthand'
  | 'leftupleg' | 'leftleg' | 'leftfoot' | 'lefttoebase'
  | 'rightupleg' | 'rightleg' | 'rightfoot' | 'righttoebase';

const CANONICAL_ALIASES: Record<string, CanonicalBone> = {
  // Mixamo style (after stripping mixamorig: prefix and lowercasing)
  'hips': 'hips', 'spine': 'spine', 'spine1': 'spine1', 'spine2': 'spine2',
  'neck': 'neck', 'head': 'head',
  'leftshoulder': 'leftshoulder', 'leftarm': 'leftarm',
  'leftforearm': 'leftforearm', 'lefthand': 'lefthand',
  'rightshoulder': 'rightshoulder', 'rightarm': 'rightarm',
  'rightforearm': 'rightforearm', 'righthand': 'righthand',
  'leftupleg': 'leftupleg', 'leftleg': 'leftleg',
  'leftfoot': 'leftfoot', 'lefttoebase': 'lefttoebase',
  'rightupleg': 'rightupleg', 'rightleg': 'rightleg',
  'rightfoot': 'rightfoot', 'righttoebase': 'righttoebase',
  // Mixamo alternate naming (some exports use these)
  'left_shoulder': 'leftshoulder', 'right_shoulder': 'rightshoulder',
  'left_arm': 'leftarm', 'right_arm': 'rightarm',
  'left_forearm': 'leftforearm', 'right_forearm': 'rightforearm',
  'left_hand': 'lefthand', 'right_hand': 'righthand',
  'left_upleg': 'leftupleg', 'right_upleg': 'rightupleg',
  'left_leg': 'leftleg', 'right_leg': 'rightleg',
  'left_foot': 'leftfoot', 'right_foot': 'rightfoot',
  'left_toebase': 'lefttoebase', 'right_toebase': 'righttoebase',
  // Quaternius Ultimate Animated pack style (Blender export)
  'fist_l': 'lefthand', 'fist_r': 'righthand',
  'arm_l': 'leftarm', 'arm_r': 'rightarm',
  'forearm_l': 'leftforearm', 'forearm_r': 'rightforearm',
  'shoulder_l': 'leftshoulder', 'shoulder_r': 'rightshoulder',
  'leg_l': 'leftleg', 'leg_r': 'rightleg',
  'foot_l': 'leftfoot', 'foot_r': 'rightfoot',
  'thigh_l': 'leftupleg', 'thigh_r': 'rightupleg',
  'body': 'spine', // Quaternius "Body" bone = Spine
  // RPG Characters pack aliases
  'upperarm_l': 'leftarm', 'upperarm_r': 'rightarm',
  'lowerarm_l': 'leftforearm', 'lowerarm_r': 'rightforearm',
  'hand_l': 'lefthand', 'hand_r': 'righthand',
  'upperleg_l': 'leftupleg', 'upperleg_r': 'rightupleg',
  'lowerleg_l': 'leftleg', 'lowerleg_r': 'rightleg',
};

// Bones that should NEVER have position tracks retargeted (causes floating/explosion)
// Only rotation (quaternion) tracks should be transferred for these.
const ROTATION_ONLY_BONES = new Set<CanonicalBone>([
  'leftarm', 'rightarm', 'leftforearm', 'rightforearm',
  'lefthand', 'righthand', 'leftshoulder', 'rightshoulder',
  'leftupleg', 'rightupleg', 'leftleg', 'rightleg',
  'leftfoot', 'rightfoot', 'lefttoebase', 'righttoebase',
  'neck', 'head',
  'spine1', 'spine2',
]);

function toCanonical(normalized: string): CanonicalBone | null {
  return CANONICAL_ALIASES[normalized] ?? null;
}

// ── Retarget an animation clip ──────────────────────────────────────────────
// Takes a clip authored for one skeleton and remaps its bone track names
// to match a target skeleton. Tracks that can't be mapped are dropped.

export function retargetClip(
  clip: THREE.AnimationClip,
  /** Bone names on the source model (the one the clip was made for) */
  sourceBoneNames: string[],
  /** Bone names on the target model (the one we want to play the clip on) */
  targetBoneNames: string[],
  /** Scale ratio: targetHeight / sourceHeight. Applied to position tracks. */
  scaleRatio = 1.0,
): THREE.AnimationClip {
  // Build source canonical → raw name map
  const sourceMap = new Map<CanonicalBone, string>();
  for (const name of sourceBoneNames) {
    const canon = toCanonical(normalizeBoneName(name));
    if (canon) sourceMap.set(canon, name);
  }

  // Build target canonical → raw name map
  const targetMap = new Map<CanonicalBone, string>();
  for (const name of targetBoneNames) {
    const canon = toCanonical(normalizeBoneName(name));
    if (canon) targetMap.set(canon, name);
  }

  const newTracks: THREE.KeyframeTrack[] = [];

  for (const track of clip.tracks) {
    // Track names are like "boneName.position" or "boneName.quaternion"
    const dotIdx = track.name.indexOf('.');
    if (dotIdx < 0) continue; // Skip tracks without property (shouldn't happen)

    const bonePart = track.name.substring(0, dotIdx);
    const propPart = track.name.substring(dotIdx); // ".position", ".quaternion", etc.

    const sourceNorm = normalizeBoneName(bonePart);
    const sourceCanon = toCanonical(sourceNorm);

    if (!sourceCanon) {
      // Can't map this bone — DROP it (don't try direct name match,
      // unmapped bones like fingers/toes cause deformation artifacts)
      continue;
    }

    const targetBoneName = targetMap.get(sourceCanon);
    if (!targetBoneName) continue; // No equivalent bone on target

    // Drop position tracks for non-root bones — only Hips should have position.
    // Mixamo bakes absolute position into every bone; on a different-sized
    // skeleton this makes limbs explode outward or float.
    if (propPart === '.position' && ROTATION_ONLY_BONES.has(sourceCanon)) {
      continue;
    }

    // For Hips position: strip root motion (zero out X/Z movement)
    // so characters don't walk off their tile during attack anims.
    if (propPart === '.position' && sourceCanon === 'hips') {
      const newTrack = track.clone();
      newTrack.name = targetBoneName + propPart;
      const values = newTrack.values as Float32Array;
      // Get the first-frame position as the rest pose
      const restX = values[0], restZ = values[2];
      for (let i = 0; i < values.length; i += 3) {
        // Lock X and Z to rest pose (no lateral/forward drift)
        values[i]     = restX; // X
        // Y (values[i+1]) keeps the bounce/height animation
        values[i + 2] = restZ; // Z
        // Apply scale correction
        if (scaleRatio !== 1.0) {
          values[i]     *= scaleRatio;
          values[i + 1] *= scaleRatio;
          values[i + 2] *= scaleRatio;
        }
      }
      newTracks.push(newTrack);
      continue;
    }

    const newTrack = track.clone();
    newTrack.name = targetBoneName + propPart;

    // Apply scale correction to any remaining position tracks
    if (propPart === '.position' && scaleRatio !== 1.0) {
      const values = newTrack.values as Float32Array;
      for (let i = 0; i < values.length; i++) {
        values[i] *= scaleRatio;
      }
    }

    newTracks.push(newTrack);
  }

  return new THREE.AnimationClip(clip.name, clip.duration, newTracks, clip.blendMode);
}

// ── Collect all bone names from a scene ─────────────────────────────────────

export function collectBoneNames(scene: THREE.Object3D): string[] {
  const names: string[] = [];
  scene.traverse((obj) => {
    if ((obj as THREE.Bone).isBone || obj.type === 'Bone') {
      names.push(obj.name);
    }
  });
  return names;
}

// ── Mixamo Animation Library Catalog ────────────────────────────────────────
// Organized catalog of common Mixamo animation clip names for different contexts.
// These match the GLB clip names from Mixamo auto-rigged exports.

export type AnimCategory = 'locomotion' | 'combat_melee' | 'combat_ranged' | 'magic' | 'idle' | 'emote' | 'death' | 'hit' | 'utility';

export interface MixamoClipDef {
  /** Mixamo download clip name (what appears in the GLB) */
  clipName: string;
  /** Logical anim state it maps to */
  state: AnimState;
  category: AnimCategory;
  /** Description for UI/catalog */
  label: string;
  /** If true, this is a weapon-specific clip (only use when weapon matches) */
  weaponType?: string;
}

export const MIXAMO_ANIM_LIBRARY: MixamoClipDef[] = [
  // ── Locomotion ────────────────────────────────────────────────────────────
  { clipName: 'Idle',           state: 'idle',    category: 'locomotion', label: 'Idle' },
  { clipName: 'Walking',        state: 'walk',    category: 'locomotion', label: 'Walking' },
  { clipName: 'Running',        state: 'run',     category: 'locomotion', label: 'Running' },
  { clipName: 'Sneaking',       state: 'sneak',   category: 'locomotion', label: 'Sneak Walk' },
  { clipName: 'Crouching Idle', state: 'hide',    category: 'locomotion', label: 'Crouch Idle' },

  // ── Idle variants ─────────────────────────────────────────────────────────
  { clipName: 'Idle_2',         state: 'idle2',   category: 'idle', label: 'Idle Variant' },
  { clipName: 'Looking Around', state: 'idle2',   category: 'idle', label: 'Looking Around' },
  { clipName: 'Breathing Idle', state: 'idle',    category: 'idle', label: 'Breathing Idle' },

  // ── Melee combat ──────────────────────────────────────────────────────────
  { clipName: 'Sword And Shield Slash', state: 'attack1', category: 'combat_melee', label: 'Sword Slash', weaponType: 'sword' },
  { clipName: 'Great Sword Slash',      state: 'attack1', category: 'combat_melee', label: 'Greatsword Slash', weaponType: 'greatsword' },
  { clipName: 'Standing Melee Attack Downward', state: 'attack2', category: 'combat_melee', label: 'Overhead Strike' },
  { clipName: 'Sword And Shield Attack', state: 'attack2', category: 'combat_melee', label: 'Shield Bash', weaponType: 'sword' },
  { clipName: 'Mutant Punch',           state: 'attack3', category: 'combat_melee', label: 'Heavy Punch' },
  { clipName: 'Flying Kick',            state: 'attack4', category: 'combat_melee', label: 'Flying Kick' },
  { clipName: 'Standing Melee Attack Horizontal', state: 'attack3', category: 'combat_melee', label: 'Horizontal Slash' },
  { clipName: 'Axe Swing',              state: 'attack1', category: 'combat_melee', label: 'Axe Swing', weaponType: 'greataxe' },
  { clipName: 'Hammer Strike',          state: 'attack1', category: 'combat_melee', label: 'Hammer Strike', weaponType: 'war_hammer' },
  { clipName: 'Dagger Stab',            state: 'attack1', category: 'combat_melee', label: 'Dagger Stab', weaponType: 'daggers' },
  { clipName: 'Dual Dagger Combo',      state: 'attack2', category: 'combat_melee', label: 'Dual Dagger Combo', weaponType: 'daggers' },

  // ── Ranged combat ─────────────────────────────────────────────────────────
  { clipName: 'Standing Aim Recoil',    state: 'attack1', category: 'combat_ranged', label: 'Bow Shoot', weaponType: 'bow' },
  { clipName: 'Standing Draw Arrow',    state: 'cast',    category: 'combat_ranged', label: 'Draw Arrow', weaponType: 'bow' },
  { clipName: 'Bow_Attack_Shoot',       state: 'attack1', category: 'combat_ranged', label: 'Bow Attack (RPG)', weaponType: 'bow' },
  { clipName: 'Bow_Attack_Draw',        state: 'cast',    category: 'combat_ranged', label: 'Bow Draw (RPG)', weaponType: 'bow' },

  // ── Magic ─────────────────────────────────────────────────────────────────
  { clipName: 'Standing 1H Magic Attack 01', state: 'cast', category: 'magic', label: 'Cast Spell' },
  { clipName: 'Standing 2H Magic Attack 01', state: 'cast', category: 'magic', label: 'Cast Staff', weaponType: 'fire_staff' },
  { clipName: 'Spell1',                 state: 'cast',     category: 'magic', label: 'Spell 1 (RPG)' },
  { clipName: 'Spell2',                 state: 'special2', category: 'magic', label: 'Spell 2 (RPG)' },
  { clipName: 'Shoot_OneHanded',        state: 'cast',     category: 'magic', label: 'One-Hand Cast (Quaternius)' },

  // ── Hit / block / death ───────────────────────────────────────────────────
  { clipName: 'Standing React Small From Front', state: 'hurt', category: 'hit', label: 'Hit React' },
  { clipName: 'RecieveHit',             state: 'hurt',    category: 'hit', label: 'Receive Hit' },
  { clipName: 'Standing Block',         state: 'block',   category: 'hit', label: 'Shield Block' },
  { clipName: 'Stunned',                state: 'stunned', category: 'hit', label: 'Stunned' },
  { clipName: 'Defeat',                 state: 'stunned', category: 'hit', label: 'Defeat (Quaternius)' },
  { clipName: 'Death',                  state: 'dead',    category: 'death', label: 'Death' },
  { clipName: 'Dying Backwards',        state: 'dead',    category: 'death', label: 'Death Backwards' },

  // ── Emote / victory ───────────────────────────────────────────────────────
  { clipName: 'Victory',                state: 'victory', category: 'emote', label: 'Victory' },
  { clipName: 'Salute',                 state: 'emote',   category: 'emote', label: 'Salute' },
  { clipName: 'Clapping',               state: 'emote',   category: 'emote', label: 'Clapping' },
  { clipName: 'PickUp',                 state: 'emote',   category: 'emote', label: 'Pick Up (Quaternius)' },
  { clipName: 'Waving',                 state: 'emote',   category: 'emote', label: 'Waving' },

  // ── Utility ───────────────────────────────────────────────────────────────
  { clipName: 'Roll',                   state: 'attack3', category: 'utility', label: 'Roll' },
  { clipName: 'Jump',                   state: 'attack4', category: 'utility', label: 'Jump' },
  { clipName: 'StandUp',               state: 'block',   category: 'utility', label: 'Stand Up (Quaternius)' },
  { clipName: 'SitDown',               state: 'idle2',   category: 'utility', label: 'Sit Down (Quaternius)' },
];

// ── Weapon-specific animation defaults ──────────────────────────────────────
// When buildAnimMap resolves animations, weapon type influences which clip to
// pick for attack1/attack2/cast etc.

const WEAPON_ANIM_DEFAULTS: Record<string, Partial<Record<AnimState, string>>> = {
  // When external FBX clips are loaded, these names match the FBX clipNames
  // from animation-library.ts. When FBX fails to load, the embedded GLB
  // fallback names (SwordSlash, Punch, etc.) still work via the Idle fallback.

  // ── Sword & Shield: FBX shield-sword set ────────────────────────────────
  sword: {
    idle: 'ssIdle', walk: 'ssStrafeL', run: 'ssRunFwd', sneak: 'ssStrafeR',
    attack1: 'ssAttack1', attack2: 'ssAttack2', attack3: 'ssAttack3', attack4: 'ssAttack4',
    block: 'ssBlock', hurt: 'ssBlockHit', idle2: 'ssBlockIdle', emote: 'ssDrawSword',
    cast: 'ssAttack2', special1: 'ssRunBwd',
  },
  sword_shield: {
    idle: 'ssIdle', walk: 'ssStrafeL', run: 'ssRunFwd', sneak: 'ssStrafeR',
    attack1: 'ssAttack1', attack2: 'ssAttack2', attack3: 'ssAttack3', attack4: 'ssAttack4',
    block: 'ssBlock', hurt: 'ssBlockHit', idle2: 'ssBlockIdle', emote: 'ssDrawSword',
    cast: 'ssAttack2', special1: 'ssRunBwd',
  },
  greatsword: {
    idle: 'ssIdle', walk: 'ssStrafeL', run: 'ssRunFwd',
    attack1: 'ssAttack1', attack2: 'ssAttack2', attack3: 'ssAttack3', attack4: 'ssAttack4',
    block: 'ssBlock', hurt: 'ssBlockHit',
  },
  rusted_sword: {
    idle: 'ssIdle', walk: 'ssStrafeL', run: 'ssRunFwd',
    attack1: 'ssAttack1', attack2: 'ssAttack2', attack3: 'ssAttack3',
    block: 'ssBlock', hurt: 'ssBlockHit',
  },
  // ── Heavy melee: FBX melee set ───────────────────────────────────────────
  greataxe: {
    idle: 'meleeIdle', walk: 'meleeWalk', run: 'meleeRun', sneak: 'meleeStrafeL',
    attack1: 'meleeAttack1', attack2: 'meleeAttack2', attack3: 'meleeAttack3',
    attack4: 'meleeCombo1', special1: 'meleeCombo2', special2: 'meleeCombo3',
    block: 'meleeBlock', hurt: 'RecieveHit', hide: 'meleeCrouch', emote: 'meleeJump',
    idle2: 'meleeWalkBwd',
  },
  war_hammer: {
    idle: 'meleeIdle', walk: 'meleeWalk', run: 'meleeRun', sneak: 'meleeStrafeL',
    attack1: 'meleeAttack1', attack2: 'meleeAttack2', attack3: 'meleeAttack3',
    attack4: 'meleeCombo1', special1: 'meleeCombo2', special2: 'meleeCombo3',
    block: 'meleeBlock', hurt: 'RecieveHit', hide: 'meleeCrouch',
  },
  daggers: {
    idle: 'meleeIdle', walk: 'meleeWalk', run: 'meleeRun', sneak: 'meleeStrafeL',
    attack1: 'meleeAttack1', attack2: 'meleeAttack2', attack3: 'meleeAttack3',
    attack4: 'meleeCombo1', special1: 'meleeCombo2', special2: 'meleeCombo3',
    block: 'meleeBlock', hurt: 'RecieveHit', hide: 'meleeCrouch',
  },
  mace: {
    idle: 'meleeIdle', walk: 'meleeWalk', run: 'meleeRun',
    attack1: 'meleeAttack1', attack2: 'meleeAttack2', attack3: 'meleeAttack3',
    block: 'meleeBlock', hurt: 'RecieveHit',
  },
  axe: {
    idle: 'meleeIdle', walk: 'meleeWalk', run: 'meleeRun',
    attack1: 'meleeAttack1', attack2: 'meleeAttack2', attack3: 'meleeAttack3',
    attack4: 'meleeCombo1', block: 'meleeBlock', hurt: 'RecieveHit',
  },
  spear: {
    idle: 'meleeIdle', walk: 'meleeWalk', run: 'meleeRun',
    attack1: 'meleeAttack1', attack2: 'meleeAttack2', attack3: 'meleeAttack3',
    attack4: 'meleeCombo1', block: 'meleeBlock', hurt: 'RecieveHit',
  },
  lance: {
    idle: 'meleeIdle', walk: 'meleeWalk', run: 'meleeRun',
    attack1: 'meleeAttack1', attack2: 'meleeAttack2', attack3: 'meleeAttack3',
    attack4: 'meleeCombo1', block: 'meleeBlock', hurt: 'RecieveHit',
  },
  // ── Bow: FBX bow set ────────────────────────────────────────────────────
  bow: {
    idle: 'bowIdle', walk: 'bowWalkFwd', run: 'bowRunFwd', sneak: 'bowAimStrafeL',
    attack1: 'bowFire', attack2: 'bowAim', cast: 'bowDraw',
    block: 'bowBlock', hurt: 'RecieveHit', attack4: 'bowJump',
    idle2: 'bowAimWalk', special1: 'bowRunBwd',
  },
  crossbow: {
    idle: 'bowIdle', walk: 'bowWalkFwd', run: 'bowRunFwd',
    attack1: 'bowFire', attack2: 'bowAim', cast: 'bowDraw',
    block: 'bowBlock', hurt: 'RecieveHit', attack4: 'bowJump',
  },
  // ── Magic: FBX staff set ─────────────────────────────────────────────────
  fire_staff: {
    idle: 'staffIdle', walk: 'staffWalkFwd', run: 'staffRunFwd',
    cast: 'staffCast1', special1: 'staffCast2', attack4: 'staffJump',
    hurt: 'staffHitLarge', stunned: 'staffHitSmall', dead: 'staffDeath',
    idle2: 'staffIdle2', special2: 'staffRunBwd',
  },
  dark_staff: {
    idle: 'staffIdle', walk: 'staffWalkFwd', run: 'staffRunFwd',
    cast: 'staffCast1', special1: 'staffCast2', attack4: 'staffJump',
    hurt: 'staffHitLarge', stunned: 'staffHitSmall', dead: 'staffDeath',
    idle2: 'staffIdle2',
  },
  focus: {
    idle: 'staffIdle', walk: 'staffWalkFwd', run: 'staffRunFwd',
    cast: 'staffCast1', special1: 'staffCast2',
    hurt: 'staffHitLarge', stunned: 'staffHitSmall', dead: 'staffDeath',
    idle2: 'staffIdle2',
  },
  // ── Shield: block stance only ─────────────────────────────────────────────
  shield: { block: 'ssBlock' },
  // ── Gun: FBX pistol set ──────────────────────────────────────────────────
  gun: {
    idle: 'pistolIdle', walk: 'pistolWalk', run: 'pistolRun',
    attack1: 'pistolIdle', attack2: 'pistolIdle', cast: 'pistolIdle',
    attack4: 'pistolJump', hide: 'pistolKneel', sneak: 'pistolStrafe',
    hurt: 'RecieveHit', idle2: 'pistolWalkBwd', special1: 'pistolRunBwd',
  },
};

// ── buildAnimMap ────────────────────────────────────────────────────────────
// Merges: DEFAULT_ANIM_MAP → weapon defaults → character per-config overrides
// → runtime user overrides into a final mapping.

import { DEFAULT_ANIM_MAP, getCharacterConfig } from './character-model-map';

export function buildAnimMap(
  characterId: string,
  weaponType?: string,
  userOverrides?: Partial<Record<AnimState, string>>,
): Record<AnimState, string> {
  const config = getCharacterConfig(characterId);

  // Layer 1: global defaults
  const result = { ...DEFAULT_ANIM_MAP };

  // Layer 2: weapon-specific defaults
  if (weaponType && WEAPON_ANIM_DEFAULTS[weaponType]) {
    Object.assign(result, WEAPON_ANIM_DEFAULTS[weaponType]);
  }

  // Layer 3: per-character config overrides
  if (config.animMap) {
    Object.assign(result, config.animMap);
  }

  // Layer 4: runtime user overrides (e.g., from Mixamo retarget UI)
  if (userOverrides) {
    Object.assign(result, userOverrides);
  }

  return result;
}

// ── Helpers for the library catalog ─────────────────────────────────────────

export function getClipsByCategory(category: AnimCategory): MixamoClipDef[] {
  return MIXAMO_ANIM_LIBRARY.filter(c => c.category === category);
}

export function getClipsByWeapon(weaponType: string): MixamoClipDef[] {
  return MIXAMO_ANIM_LIBRARY.filter(c => !c.weaponType || c.weaponType === weaponType);
}

export function getClipForState(state: AnimState, weaponType?: string): MixamoClipDef | undefined {
  // Prefer weapon-specific first
  if (weaponType) {
    const specific = MIXAMO_ANIM_LIBRARY.find(c => c.state === state && c.weaponType === weaponType);
    if (specific) return specific;
  }
  return MIXAMO_ANIM_LIBRARY.find(c => c.state === state && !c.weaponType);
}
