/**
 * External Mixamo Animation Library
 *
 * Loads FBX animation clips from public/models/animations/ organized by weapon category.
 * Each clip is retargeted on-the-fly to match the target character's bone names
 * via the retargetClip() system in animation-retarget.ts.
 *
 * Usage in CharacterModel:
 *   const externalClips = await loadWeaponAnimations('sword', targetBoneNames);
 *   // merge with embedded GLB clips, external takes priority
 */

import * as THREE from 'three';
import { FBXLoader } from 'three-stdlib';
import type { AnimState } from './character-model-map';
import { retargetClip, collectBoneNames, normalizeBoneName } from './animation-retarget';

const BASE = import.meta.env.BASE_URL;
const fbxUrl = (category: string, file: string) => `${BASE}models/animations/${category}/${file}`;

// ── Animation Manifest ──────────────────────────────────────────────────────
// Maps: FBX filename → clip name to register + AnimState it maps to

interface AnimClipDef {
  file: string;       // filename relative to category folder
  clipName: string;   // name we'll register the clip as (used by buildAnimMap)
  state: AnimState;   // which logical state this clip drives
}

// Shield + Sword animations
const SHIELD_SWORD_CLIPS: AnimClipDef[] = [
  { file: 'ssAttack1.fbx',    clipName: 'ssAttack1',    state: 'attack1' },
  { file: 'ssAttack2.fbx',    clipName: 'ssAttack2',    state: 'attack2' },
  { file: 'ssAttack3.fbx',    clipName: 'ssAttack3',    state: 'attack3' },
  { file: 'ssAttack4.fbx',    clipName: 'ssAttack4',    state: 'attack4' },
  { file: 'ssBlock.fbx',      clipName: 'ssBlock',      state: 'block' },
  { file: 'ssBlockHit.fbx',   clipName: 'ssBlockHit',   state: 'hurt' },
  { file: 'ssBlockIdle.fbx',  clipName: 'ssBlockIdle',  state: 'idle2' },
  { file: 'ssDrawSword.fbx',  clipName: 'ssDrawSword',  state: 'emote' },
  { file: 'ssIdle.fbx',       clipName: 'ssIdle',       state: 'idle' },
  { file: 'ssRunFwd.fbx',     clipName: 'ssRunFwd',     state: 'run' },
  { file: 'ssRunBwd.fbx',     clipName: 'ssRunBwd',     state: 'special1' },
  { file: 'ssStrafeL.fbx',    clipName: 'ssStrafeL',    state: 'walk' },
  { file: 'ssStrafeR.fbx',    clipName: 'ssStrafeR',    state: 'sneak' },
];

// Generic melee animations (axes, hammers, daggers, maces, spears)
const MELEE_CLIPS: AnimClipDef[] = [
  { file: 'melee attack 1.fbx',       clipName: 'meleeAttack1',   state: 'attack1' },
  { file: 'melee attack 2.fbx',       clipName: 'meleeAttack2',   state: 'attack2' },
  { file: 'melee attack 3.fbx',       clipName: 'meleeAttack3',   state: 'attack3' },
  { file: 'melee combo 1.fbx',        clipName: 'meleeCombo1',    state: 'attack4' },
  { file: 'melee combo 2.fbx',        clipName: 'meleeCombo2',    state: 'special1' },
  { file: 'melee combo 3.fbx',        clipName: 'meleeCombo3',    state: 'special2' },
  { file: 'melee block.fbx',          clipName: 'meleeBlock',     state: 'block' },
  { file: 'melee idle.fbx',           clipName: 'meleeIdle',      state: 'idle' },
  { file: 'melee run.fbx',            clipName: 'meleeRun',       state: 'run' },
  { file: 'melee walk forward.fbx',   clipName: 'meleeWalk',      state: 'walk' },
  { file: 'melee jump.fbx',           clipName: 'meleeJump',      state: 'emote' },
  { file: 'melee crouch idle.fbx',    clipName: 'meleeCrouch',    state: 'hide' },
  { file: 'melee strafe left.fbx',    clipName: 'meleeStrafeL',   state: 'sneak' },
  { file: 'melee walk backward.fbx',  clipName: 'meleeWalkBwd',   state: 'idle2' },
  { file: 'melee run backward.fbx',   clipName: 'meleeRunBwd',    state: 'poisoned' },
];

// Bow animations
const BOW_CLIPS: AnimClipDef[] = [
  { file: 'bowFire.fbx',        clipName: 'bowFire',       state: 'attack1' },
  { file: 'bowDraw.fbx',        clipName: 'bowDraw',       state: 'cast' },
  { file: 'bowAim.fbx',         clipName: 'bowAim',        state: 'attack2' },
  { file: 'bowIdle.fbx',        clipName: 'bowIdle',       state: 'idle' },
  { file: 'bowBlock.fbx',       clipName: 'bowBlock',      state: 'block' },
  { file: 'bowRunFwd.fbx',      clipName: 'bowRunFwd',     state: 'run' },
  { file: 'bowWalkFwd.fbx',     clipName: 'bowWalkFwd',    state: 'walk' },
  { file: 'bowJump.fbx',        clipName: 'bowJump',       state: 'attack4' },
  { file: 'bowRunBwd.fbx',      clipName: 'bowRunBwd',     state: 'special1' },
  { file: 'bowAimWalkFwd.fbx',  clipName: 'bowAimWalk',    state: 'idle2' },
  { file: 'bowAimStrafeL.fbx',  clipName: 'bowAimStrafeL', state: 'sneak' },
  { file: 'bowWalkBwd.fbx',     clipName: 'bowWalkBwd',    state: 'poisoned' },
];

// Staff / magic animations
const STAFF_CLIPS: AnimClipDef[] = [
  { file: 'staffCast1.fbx',     clipName: 'staffCast1',    state: 'cast' },
  { file: 'staffCast2.fbx',     clipName: 'staffCast2',    state: 'special1' },
  { file: 'staffDeath.fbx',     clipName: 'staffDeath',    state: 'dead' },
  { file: 'staffHitLarge.fbx',  clipName: 'staffHitLarge', state: 'hurt' },
  { file: 'staffHitSmall.fbx',  clipName: 'staffHitSmall', state: 'stunned' },
  { file: 'staffIdle.fbx',      clipName: 'staffIdle',     state: 'idle' },
  { file: 'staffIdle2.fbx',     clipName: 'staffIdle2',    state: 'idle2' },
  { file: 'staffJump.fbx',      clipName: 'staffJump',     state: 'attack4' },
  { file: 'staffRunFwd.fbx',    clipName: 'staffRunFwd',   state: 'run' },
  { file: 'staffRunBwd.fbx',    clipName: 'staffRunBwd',   state: 'special2' },
  { file: 'staffWalkFwd.fbx',   clipName: 'staffWalkFwd',  state: 'walk' },
  { file: 'staffWalkBwd.fbx',   clipName: 'staffWalkBwd',  state: 'poisoned' },
];

// Pistol animations
const PISTOL_CLIPS: AnimClipDef[] = [
  { file: 'pistol idle.fbx',          clipName: 'pistolIdle',    state: 'idle' },
  { file: 'pistol run.fbx',           clipName: 'pistolRun',     state: 'run' },
  { file: 'pistol walk.fbx',          clipName: 'pistolWalk',    state: 'walk' },
  { file: 'pistol jump.fbx',          clipName: 'pistolJump',    state: 'attack4' },
  { file: 'pistol run backward.fbx',  clipName: 'pistolRunBwd',  state: 'special1' },
  { file: 'pistol walk backward.fbx', clipName: 'pistolWalkBwd', state: 'idle2' },
  { file: 'pistol kneeling idle.fbx', clipName: 'pistolKneel',   state: 'hide' },
  { file: 'pistol strafe.fbx',        clipName: 'pistolStrafe',  state: 'sneak' },
];

// Rifle animations
const RIFLE_CLIPS: AnimClipDef[] = [
  { file: 'rifle fire.fbx',          clipName: 'rifleFire',     state: 'attack1' },
  { file: 'rifle reload.fbx',        clipName: 'rifleReload',   state: 'cast' },
  { file: 'rifle grenade.fbx',       clipName: 'rifleGrenade',  state: 'attack2' },
  { file: 'rifle hit.fbx',           clipName: 'rifleHit',      state: 'hurt' },
  { file: 'rifle idle.fbx',          clipName: 'rifleIdle',     state: 'idle' },
  { file: 'rifle run.fbx',           clipName: 'rifleRun',      state: 'run' },
  { file: 'rifle walk forward.fbx',  clipName: 'rifleWalk',     state: 'walk' },
  { file: 'rifle jump.fbx',          clipName: 'rifleJump',     state: 'attack4' },
  { file: 'rifle run backward.fbx',  clipName: 'rifleRunBwd',   state: 'special1' },
  { file: 'rifle strafe left.fbx',   clipName: 'rifleStrafeL',  state: 'sneak' },
];

// ── Weapon → category + clips mapping ────────────────────────────────────────

interface WeaponAnimSet {
  category: string;     // subfolder name in public/models/animations/
  clips: AnimClipDef[];
}

const WEAPON_ANIM_SETS: Record<string, WeaponAnimSet> = {
  // Sword-type weapons use shield-sword set
  sword:        { category: 'shield-sword', clips: SHIELD_SWORD_CLIPS },
  sword_shield: { category: 'shield-sword', clips: SHIELD_SWORD_CLIPS },
  greatsword:   { category: 'shield-sword', clips: SHIELD_SWORD_CLIPS },
  rusted_sword: { category: 'shield-sword', clips: SHIELD_SWORD_CLIPS },
  // Heavy melee uses generic melee set
  greataxe:     { category: 'melee', clips: MELEE_CLIPS },
  war_hammer:   { category: 'melee', clips: MELEE_CLIPS },
  daggers:      { category: 'melee', clips: MELEE_CLIPS },
  mace:         { category: 'melee', clips: MELEE_CLIPS },
  axe:          { category: 'melee', clips: MELEE_CLIPS },
  spear:        { category: 'melee', clips: MELEE_CLIPS },
  lance:        { category: 'melee', clips: MELEE_CLIPS },
  // Ranged
  bow:          { category: 'bow',   clips: BOW_CLIPS },
  crossbow:     { category: 'bow',   clips: BOW_CLIPS },
  // Magic
  fire_staff:   { category: 'staff', clips: STAFF_CLIPS },
  dark_staff:   { category: 'staff', clips: STAFF_CLIPS },
  focus:        { category: 'staff', clips: STAFF_CLIPS },
  // Firearms
  gun:          { category: 'pistol', clips: PISTOL_CLIPS },
};

// ── FBX Loader + Cache ──────────────────────────────────────────────────────

const _fbxLoader = new FBXLoader();
const _clipCache = new Map<string, THREE.AnimationClip>();
const _loadingPromises = new Map<string, Promise<THREE.AnimationClip | null>>();

/**
 * Load a single FBX file and extract its first AnimationClip.
 * Caches by URL so the same file is never loaded twice.
 */
function loadFbxClip(url: string, clipName: string): Promise<THREE.AnimationClip | null> {
  // Return cached
  if (_clipCache.has(url)) {
    const cached = _clipCache.get(url)!;
    return Promise.resolve(cached);
  }
  // Return in-progress promise
  if (_loadingPromises.has(url)) {
    return _loadingPromises.get(url)!;
  }

  const promise = new Promise<THREE.AnimationClip | null>((resolve) => {
    _fbxLoader.load(
      url,
      (group) => {
        if (group.animations.length === 0) {
          resolve(null);
          return;
        }
        const clip = group.animations[0];
        clip.name = clipName;
        _clipCache.set(url, clip);
        resolve(clip);
      },
      undefined,
      () => {
        // FBX failed to load — not fatal, just skip this clip
        console.warn(`[AnimLib] Failed to load: ${url}`);
        resolve(null);
      },
    );
  });

  _loadingPromises.set(url, promise);
  return promise;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Load all animation clips for a weapon type from external FBX files.
 * Each clip is named with its `clipName` and can be matched by the
 * WEAPON_ANIM_DEFAULTS in animation-retarget.ts.
 *
 * Optionally retargets bone tracks to match a target character skeleton.
 *
 * @param weaponType - e.g. 'sword', 'bow', 'fire_staff'
 * @param targetBoneNames - bone names from the character we want to play these on
 * @returns AnimationClip[] ready to merge into useAnimations
 */
export async function loadWeaponAnimations(
  weaponType: string,
  targetBoneNames?: string[],
): Promise<THREE.AnimationClip[]> {
  const animSet = WEAPON_ANIM_SETS[weaponType];
  if (!animSet) return [];

  const promises = animSet.clips.map(async (def) => {
    const url = fbxUrl(animSet.category, def.file);
    const clip = await loadFbxClip(url, def.clipName);
    if (!clip) return null;

    // Retarget if target bones provided
    if (targetBoneNames && targetBoneNames.length > 0) {
      // Extract source bone names from the clip's track names
      const sourceBones = new Set<string>();
      for (const track of clip.tracks) {
        const dotIdx = track.name.indexOf('.');
        if (dotIdx > 0) sourceBones.add(track.name.substring(0, dotIdx));
      }
      return retargetClip(clip, Array.from(sourceBones), targetBoneNames);
    }

    return clip;
  });

  const results = await Promise.all(promises);
  return results.filter((c): c is THREE.AnimationClip => c !== null);
}

/**
 * Get the AnimState → clipName mapping for a weapon type.
 * This is what buildAnimMap should use as weapon-specific overrides
 * when external animations are loaded.
 */
export function getExternalAnimMap(weaponType: string): Partial<Record<AnimState, string>> {
  const animSet = WEAPON_ANIM_SETS[weaponType];
  if (!animSet) return {};

  const map: Partial<Record<AnimState, string>> = {};
  for (const def of animSet.clips) {
    // Don't override if already set — first clip wins for each state
    if (!map[def.state]) {
      map[def.state] = def.clipName;
    }
  }
  return map;
}

/**
 * Check if a weapon type has external animations available.
 */
export function hasExternalAnimations(weaponType: string): boolean {
  return !!WEAPON_ANIM_SETS[weaponType];
}

/**
 * Preload animations for a weapon type (fire-and-forget).
 * Useful to start loading during character select before battle.
 */
export function preloadWeaponAnimations(weaponType: string): void {
  const animSet = WEAPON_ANIM_SETS[weaponType];
  if (!animSet) return;
  for (const def of animSet.clips) {
    loadFbxClip(fbxUrl(animSet.category, def.file), def.clipName);
  }
}
