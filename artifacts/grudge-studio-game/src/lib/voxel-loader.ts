import * as THREE from 'three';

// ── Types ────────────────────────────────────────────────────────────────────

export interface VoxelModelConfig {
  /** Path to the voxel GLB (relative to BASE_URL) */
  modelUrl: string;
  /** Uniform scale to apply (default 1.0) */
  voxelScale?: number;
  /** Y offset to center the model at foot level */
  voxelPivotY?: number;
  /** If true, the model has no embedded animations — use procedural tween */
  proceduralAnim?: boolean;
}

export interface SyntheticSkeleton {
  root: THREE.Bone;
  body: THREE.Bone;
  head: THREE.Bone;
  leftArm: THREE.Bone;
  rightArm: THREE.Bone;
  leftLeg: THREE.Bone;
  rightLeg: THREE.Bone;
  skeleton: THREE.Skeleton;
}

// ── Auto-scale a voxel GLB to character size ────────────────────────────────
// Voxel models from MagicaVoxel exports can be any size. This computes a
// scale factor to make the model approximately `targetHeight` world units tall.

export function computeVoxelScale(scene: THREE.Object3D, targetHeight = 1.4): number {
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  const currentHeight = size.y;
  if (currentHeight <= 0) return 1;
  return targetHeight / currentHeight;
}

// ── Center pivot at foot level ──────────────────────────────────────────────

export function centerVoxelPivot(scene: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(scene);
  // Shift so bottom of bounding box sits at Y=0
  const offsetY = -box.min.y;
  scene.position.y += offsetY;
  return offsetY;
}

// ── Generate synthetic skeleton ─────────────────────────────────────────────
// Creates a simple 7-bone skeleton (root, body, head, 2 arms, 2 legs) that can
// be used for basic procedural animations (idle bob, walk bounce, attack lunge).
// The skeleton bones are positioned based on the model's bounding box.

export function generateSyntheticSkeleton(scene: THREE.Object3D): SyntheticSkeleton {
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  const h = size.y;
  const w = size.x;

  // Create bones
  const root = new THREE.Bone();
  root.name = 'Root';
  root.position.set(center.x, box.min.y, center.z);

  const body = new THREE.Bone();
  body.name = 'Body';
  body.position.set(0, h * 0.4, 0);
  root.add(body);

  const head = new THREE.Bone();
  head.name = 'Head';
  head.position.set(0, h * 0.35, 0);
  body.add(head);

  const leftArm = new THREE.Bone();
  leftArm.name = 'LeftArm';
  leftArm.position.set(-w * 0.4, h * 0.2, 0);
  body.add(leftArm);

  const rightArm = new THREE.Bone();
  rightArm.name = 'RightArm';
  rightArm.position.set(w * 0.4, h * 0.2, 0);
  body.add(rightArm);

  const leftLeg = new THREE.Bone();
  leftLeg.name = 'LeftLeg';
  leftLeg.position.set(-w * 0.15, 0, 0);
  root.add(leftLeg);

  const rightLeg = new THREE.Bone();
  rightLeg.name = 'RightLeg';
  rightLeg.position.set(w * 0.15, 0, 0);
  root.add(rightLeg);

  const skeleton = new THREE.Skeleton([root, body, head, leftArm, rightArm, leftLeg, rightLeg]);

  return { root, body, head, leftArm, rightArm, leftLeg, rightLeg, skeleton };
}

// ── Procedural animation keyframe generators ────────────────────────────────
// Creates AnimationClips that work with the synthetic skeleton bones.

export function createIdleBobClip(duration = 2.0): THREE.AnimationClip {
  const times = [0, duration * 0.5, duration];
  const bodyY = new Float32Array([0, 0.04, 0,   0, 0.08, 0,   0, 0.04, 0]);
  const headR = new Float32Array([
    0, 0, 0, 1,
    0.02, 0, 0, 0.9998,
    0, 0, 0, 1,
  ]);

  return new THREE.AnimationClip('VoxelIdle', duration, [
    new THREE.VectorKeyframeTrack('Body.position', times, bodyY),
    new THREE.QuaternionKeyframeTrack('Head.quaternion', times, headR),
  ]);
}

export function createWalkBounceClip(duration = 0.8): THREE.AnimationClip {
  const times = [0, duration * 0.25, duration * 0.5, duration * 0.75, duration];
  const bodyY = new Float32Array([
    0, 0, 0,   0, 0.06, 0,   0, 0, 0,   0, 0.06, 0,   0, 0, 0,
  ]);
  // Alternating leg swing
  const leftLegR = new Float32Array([
    0.15, 0, 0, 0.989,   0, 0, 0, 1,   -0.15, 0, 0, 0.989,   0, 0, 0, 1,   0.15, 0, 0, 0.989,
  ]);
  const rightLegR = new Float32Array([
    -0.15, 0, 0, 0.989,   0, 0, 0, 1,   0.15, 0, 0, 0.989,   0, 0, 0, 1,   -0.15, 0, 0, 0.989,
  ]);
  const leftArmR = new Float32Array([
    -0.1, 0, 0, 0.995,   0, 0, 0, 1,   0.1, 0, 0, 0.995,   0, 0, 0, 1,   -0.1, 0, 0, 0.995,
  ]);
  const rightArmR = new Float32Array([
    0.1, 0, 0, 0.995,   0, 0, 0, 1,   -0.1, 0, 0, 0.995,   0, 0, 0, 1,   0.1, 0, 0, 0.995,
  ]);

  return new THREE.AnimationClip('VoxelWalk', duration, [
    new THREE.VectorKeyframeTrack('Body.position', times, bodyY),
    new THREE.QuaternionKeyframeTrack('LeftLeg.quaternion', times, leftLegR),
    new THREE.QuaternionKeyframeTrack('RightLeg.quaternion', times, rightLegR),
    new THREE.QuaternionKeyframeTrack('LeftArm.quaternion', times, leftArmR),
    new THREE.QuaternionKeyframeTrack('RightArm.quaternion', times, rightArmR),
  ]);
}

export function createAttackLungeClip(duration = 0.9): THREE.AnimationClip {
  const times = [0, duration * 0.3, duration * 0.5, duration];
  const bodyPos = new Float32Array([
    0, 0, 0,
    0, 0.05, 0.2,
    0, 0.02, 0.3,
    0, 0, 0,
  ]);
  const rightArmR = new Float32Array([
    0, 0, 0, 1,
    -0.5, 0, 0, 0.866,
    -0.7, 0, 0, 0.714,
    0, 0, 0, 1,
  ]);

  return new THREE.AnimationClip('VoxelAttack', duration, [
    new THREE.VectorKeyframeTrack('Body.position', times, bodyPos),
    new THREE.QuaternionKeyframeTrack('RightArm.quaternion', times, rightArmR),
  ]);
}

export function createDeathClip(duration = 1.2): THREE.AnimationClip {
  const times = [0, duration * 0.4, duration];
  const rootR = new Float32Array([
    0, 0, 0, 1,
    -0.3, 0, 0, 0.954,
    -0.707, 0, 0, 0.707,
  ]);

  return new THREE.AnimationClip('VoxelDeath', duration, [
    new THREE.QuaternionKeyframeTrack('Root.quaternion', times, rootR),
  ]);
}

// ── All procedural clips bundled ────────────────────────────────────────────

export function getVoxelProceduralClips(): THREE.AnimationClip[] {
  return [
    createIdleBobClip(),
    createWalkBounceClip(),
    createAttackLungeClip(),
    createDeathClip(),
  ];
}

// ── AnimState → procedural clip name mapping ────────────────────────────────

import type { AnimState } from './character-model-map';

export const VOXEL_ANIM_MAP: Record<AnimState, string> = {
  idle:     'VoxelIdle',
  idle2:    'VoxelIdle',
  emote:    'VoxelIdle',
  walk:     'VoxelWalk',
  run:      'VoxelWalk',
  sneak:    'VoxelWalk',
  hide:     'VoxelIdle',
  attack1:  'VoxelAttack',
  attack2:  'VoxelAttack',
  attack3:  'VoxelAttack',
  attack4:  'VoxelAttack',
  cast:     'VoxelAttack',
  hurt:     'VoxelAttack',
  stunned:  'VoxelIdle',
  poisoned: 'VoxelWalk',
  block:    'VoxelIdle',
  frozen:   'VoxelIdle',
  dead:     'VoxelDeath',
  victory:  'VoxelIdle',
  special1: 'VoxelAttack',
  special2: 'VoxelAttack',
};
