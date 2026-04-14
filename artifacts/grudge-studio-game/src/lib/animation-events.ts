/**
 * Animation Event Dispatcher
 *
 * Replaces hardcoded setTimeout chains with animation-driven timing.
 * Combat events fire based on normalized animation time (0–1) rather than
 * guessed millisecond offsets, so VFX/damage/reactions always sync to the
 * actual animation frame — even under frame drops or variable FPS.
 *
 * Architecture:
 *   1. battle.tsx calls `createCombatSequence(...)` which returns a CombatSequence
 *   2. The sequence defines events at normalized times (0.0 = start, 1.0 = end)
 *   3. CharacterModel's useFrame checks the mixer time and fires events as they pass
 *   4. Events dispatch via window CustomEvents so battle.tsx can react
 *
 * This is a fire-and-forget system — create the sequence, dispatch it,
 * and the 3D layer handles timing automatically.
 */

import type { AnimState } from './character-model-map';
import type { EffectType } from '../components/three/CombatEffects';

// ── Event Types ──────────────────────────────────────────────────────────────

export type CombatEventType =
  | 'windup_start'    // Animation begins — caster VFX (magic circle, energy charge)
  | 'impact'          // Weapon/projectile connects — spawn hit VFX, apply damage visual
  | 'projectile'      // Launch projectile from caster toward target
  | 'target_react'    // Target plays hurt/block/dead animation
  | 'impact_vfx'      // Secondary impact effects (explosion, shatter, etc.)
  | 'camera_shake'    // Camera shake at impact
  | 'crit_burst'      // Crit flash effect
  | 'return_idle'     // Attacker returns to idle
  | 'end_turn'        // Signal to end the turn
  | 'counter_attack'  // Defender counter-attacks
  | 'quick_attack'    // Attacker strikes again
  | 'dash_forward'    // Melee dash toward target
  | 'aoe_ring';       // AoE ring effect at target

export interface CombatEvent {
  /** Normalized time in the animation (0.0 = start, 1.0 = end) */
  t: number;
  type: CombatEventType;
  /** Arbitrary data payload for the event handler */
  data?: Record<string, any>;
}

export interface CombatSequence {
  /** Unique ID for this sequence */
  id: string;
  /** Unit ID of the attacker/caster */
  attackerId: string;
  /** Unit ID of the target (if any) */
  targetId?: string;
  /** Total duration in milliseconds (derived from animation clip length) */
  durationMs: number;
  /** The AnimState being played */
  animState: AnimState;
  /** Ordered list of events at normalized times */
  events: CombatEvent[];
  /** World positions for VFX origin/target */
  fromPos: [number, number, number];
  toPos: [number, number, number];
  /** Effect metadata */
  effectType?: EffectType;
  effectColor?: string;
}

// ── Sequence Builder ─────────────────────────────────────────────────────────

interface SequenceConfig {
  attackerId: string;
  targetId?: string;
  durationMs: number;
  animState: AnimState;
  fromPos: [number, number, number];
  toPos: [number, number, number];
  effectType?: EffectType;
  effectColor?: string;
  isMelee?: boolean;
  isMagic?: boolean;
  isRanged?: boolean;
  isCrit?: boolean;
  isAoe?: boolean;
  isUltimate?: boolean;
  isLethal?: boolean;
  blocked?: boolean;
  // Passive combat results
  counterAttack?: boolean;
  quickAttack?: boolean;
}

let _seqCounter = 0;

/**
 * Create a combat event sequence with properly timed events.
 * Times are normalized (0–1) based on animation duration.
 *
 * Standard timeline for a 1-second attack:
 *   0.00  windup_start (magic circle, energy charge)
 *   0.10  dash_forward (melee only — lunge toward target)
 *   0.35  impact (weapon connects — this is where damage VFX fires)
 *   0.38  projectile (ranged — launches from caster position)
 *   0.40  camera_shake (if crit or powerful)
 *   0.42  crit_burst (if critical hit)
 *   0.45  target_react (hurt/block/dead animation on target)
 *   0.55  impact_vfx (explosion, shatter, etc.)
 *   0.60  aoe_ring (if AoE skill)
 *   0.75  quick_attack (if passive triggered)
 *   0.80  counter_attack (if defender has counter passive)
 *   0.92  return_idle
 *   1.00  end_turn
 */
export function createCombatSequence(config: SequenceConfig): CombatSequence {
  const events: CombatEvent[] = [];
  const id = `seq_${++_seqCounter}_${Date.now()}`;

  // ── Windup phase (t = 0.00–0.10) ──────────────────────────────────────────
  if (config.isMagic) {
    events.push({ t: 0.00, type: 'windup_start', data: { fx: 'magic_circle' } });
    events.push({ t: 0.02, type: 'windup_start', data: { fx: 'energy_charge' } });
  }

  // ── Melee dash (t = 0.05) ─────────────────────────────────────────────────
  if (config.isMelee) {
    events.push({ t: 0.05, type: 'dash_forward' });
  }

  // ── Projectile launch (t = 0.35 for ranged) ──────────────────────────────
  if (config.isRanged || config.isMagic) {
    events.push({ t: 0.35, type: 'projectile' });
  }

  // ── Impact (t = 0.38 for melee, 0.65 for ranged after travel) ────────────
  const impactT = (config.isRanged || config.isMagic) ? 0.65 : 0.38;
  events.push({ t: impactT, type: 'impact' });

  // ── Camera shake ──────────────────────────────────────────────────────────
  if (config.isCrit || config.isUltimate) {
    events.push({
      t: impactT + 0.02,
      type: 'camera_shake',
      data: {
        intensity: config.isUltimate ? 0.35 : config.isCrit ? 0.28 : 0.18,
        duration: config.isUltimate ? 500 : config.isCrit ? 380 : 280,
      },
    });
  }

  // ── Crit burst ────────────────────────────────────────────────────────────
  if (config.isCrit) {
    events.push({ t: impactT + 0.04, type: 'crit_burst' });
  }

  // ── Target reaction (hurt/block/dead) ────────────────────────────────────
  events.push({
    t: impactT + 0.05,
    type: 'target_react',
    data: {
      blocked: config.blocked,
      lethal: config.isLethal,
    },
  });

  // ── Impact VFX (element-specific explosion) ──────────────────────────────
  events.push({ t: impactT + 0.12, type: 'impact_vfx' });

  // ── AoE ring ─────────────────────────────────────────────────────────────
  if (config.isAoe) {
    events.push({ t: impactT + 0.08, type: 'aoe_ring' });
  }

  // ── Quick attack (passive) ────────────────────────────────────────────────
  if (config.quickAttack) {
    events.push({ t: 0.78, type: 'quick_attack' });
  }

  // ── Counter attack (passive) ──────────────────────────────────────────────
  if (config.counterAttack) {
    events.push({ t: 0.82, type: 'counter_attack' });
  }

  // ── Return to idle + end turn ────────────────────────────────────────────
  events.push({ t: 0.92, type: 'return_idle' });
  events.push({ t: 1.00, type: 'end_turn' });

  // Sort by time
  events.sort((a, b) => a.t - b.t);

  return {
    id,
    attackerId: config.attackerId,
    targetId: config.targetId,
    durationMs: config.durationMs,
    animState: config.animState,
    events,
    fromPos: config.fromPos,
    toPos: config.toPos,
    effectType: config.effectType,
    effectColor: config.effectColor,
  };
}

// ── Sequence Runner ──────────────────────────────────────────────────────────
// Manages active sequences and fires events based on elapsed time.

interface ActiveSequence {
  sequence: CombatSequence;
  startTime: number;
  firedEvents: Set<number>; // indices of events already fired
}

const _activeSequences: ActiveSequence[] = [];

/**
 * Start a combat sequence. Call this from battle.tsx instead of setTimeout chains.
 * Events will be dispatched as window CustomEvents.
 */
export function startSequence(sequence: CombatSequence): void {
  _activeSequences.push({
    sequence,
    startTime: performance.now(),
    firedEvents: new Set(),
  });
}

/**
 * Tick all active sequences. Call this from a useFrame hook.
 * Fires window CustomEvents for each event whose time has passed.
 */
export function tickSequences(): void {
  const now = performance.now();
  const toRemove: number[] = [];

  for (let i = 0; i < _activeSequences.length; i++) {
    const active = _activeSequences[i];
    const elapsed = now - active.startTime;
    const normalizedT = Math.min(1, elapsed / active.sequence.durationMs);

    for (let j = 0; j < active.sequence.events.length; j++) {
      if (active.firedEvents.has(j)) continue;
      const event = active.sequence.events[j];
      if (normalizedT >= event.t) {
        active.firedEvents.add(j);
        // Dispatch as window CustomEvent
        window.dispatchEvent(new CustomEvent('combat-event', {
          detail: {
            sequenceId: active.sequence.id,
            attackerId: active.sequence.attackerId,
            targetId: active.sequence.targetId,
            eventType: event.type,
            eventData: event.data ?? {},
            fromPos: active.sequence.fromPos,
            toPos: active.sequence.toPos,
            effectType: active.sequence.effectType,
            effectColor: active.sequence.effectColor,
            normalizedTime: normalizedT,
            elapsedMs: elapsed,
          },
        }));
      }
    }

    // Remove completed sequences
    if (normalizedT >= 1) {
      toRemove.push(i);
    }
  }

  // Clean up completed sequences (reverse order to maintain indices)
  for (let i = toRemove.length - 1; i >= 0; i--) {
    _activeSequences.splice(toRemove[i], 1);
  }
}

/**
 * Cancel all active sequences for a unit (e.g., when they die mid-animation).
 */
export function cancelSequences(unitId: string): void {
  for (let i = _activeSequences.length - 1; i >= 0; i--) {
    if (_activeSequences[i].sequence.attackerId === unitId ||
        _activeSequences[i].sequence.targetId === unitId) {
      _activeSequences.splice(i, 1);
    }
  }
}

/**
 * Check if any sequences are active for a unit.
 */
export function hasActiveSequence(unitId: string): boolean {
  return _activeSequences.some(
    a => a.sequence.attackerId === unitId || a.sequence.targetId === unitId,
  );
}

// ── Weapon Bone Contact Point ────────────────────────────────────────────────

import * as THREE from 'three';

const _weaponWorldPos = new THREE.Vector3();

/**
 * Get the world-space position of the weapon tip bone.
 * Used to spawn VFX at the actual weapon contact point instead of tile center.
 *
 * @param charScene The character's cloned scene (with weapon attached to Fist.R)
 * @returns World position of the weapon tip, or null if bone not found
 */
export function getWeaponContactPoint(charScene: THREE.Object3D): THREE.Vector3 | null {
  let weaponBone: THREE.Object3D | null = null;
  charScene.traverse((o) => {
    // Look for the weapon child attached to Fist.R
    if (o.name === 'Fist.R' || o.name === 'Fist_R') {
      weaponBone = o;
    }
  });
  if (!weaponBone) return null;
  (weaponBone as THREE.Object3D).getWorldPosition(_weaponWorldPos);
  // Offset slightly forward (weapon tip is above the hand bone)
  _weaponWorldPos.y += 0.3;
  return _weaponWorldPos.clone();
}

/**
 * Get the world-space position of a named bone.
 * Useful for spawning effects at specific body parts (head for stun stars, etc.)
 */
export function getBoneWorldPosition(
  charScene: THREE.Object3D,
  boneName: string,
): THREE.Vector3 | null {
  let bone: THREE.Object3D | null = null;
  charScene.traverse((o) => { if (o.name === boneName) bone = o; });
  if (!bone) return null;
  const pos = new THREE.Vector3();
  (bone as THREE.Object3D).getWorldPosition(pos);
  return pos;
}
