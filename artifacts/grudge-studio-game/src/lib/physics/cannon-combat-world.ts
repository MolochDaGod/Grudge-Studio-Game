/**
 * Cannon-ES combat world — secondary physics world dedicated to weapon hitbox
 * detection, following the annihilate Attacker pattern.
 *
 * This world has NO gravity and only contains kinematic sensor bodies that
 * track bone world-positions each frame. Collision events drive the damage
 * system without physically pushing bodies around (collisionResponse=false).
 *
 * Usage:
 *   import { combatWorld, stepCombatWorld, createAttackerBody, removeBody } from './cannon-combat-world';
 */

import * as CANNON from 'cannon-es';
import {
  CANNON_PLAYER_WEAPON,
  CANNON_ENEMY_WEAPON,
  CANNON_ENEMY,
  CANNON_PLAYER,
  CANNON_SHIELD,
} from './collision-groups';

// ── Singleton world ─────────────────────────────────────────────────────────

export const combatWorld = new CANNON.World({
  gravity: new CANNON.Vec3(0, 0, 0), // no gravity — all bodies are kinematic sensors
});

// Low iteration count — we only need overlap detection, not stable stacking
(combatWorld.solver as any).iterations = 1;
combatWorld.broadphase = new CANNON.NaiveBroadphase();

// Forward beginContact/endContact to individual bodies (annihilate pattern)
combatWorld.addEventListener('beginContact', (event: any) => {
  if (event.bodyA) {
    event.bodyA.dispatchEvent({ type: 'beginContact', body: event.bodyB });
  }
  if (event.bodyB) {
    event.bodyB.dispatchEvent({ type: 'beginContact', body: event.bodyA });
  }
});
combatWorld.addEventListener('endContact', (event: any) => {
  if (event.bodyA) {
    event.bodyA.dispatchEvent({ type: 'endContact', body: event.bodyB });
  }
  if (event.bodyB) {
    event.bodyB.dispatchEvent({ type: 'endContact', body: event.bodyA });
  }
});

// ── Step ────────────────────────────────────────────────────────────────────

const FIXED_TIMESTEP = 1 / 60;
const MAX_SUBSTEPS = 1; // single step is fine for sensor overlap checks

/**
 * Advance the combat world by `dt` seconds.
 * Call this once per frame from a React Three Fiber `useFrame` hook.
 */
export function stepCombatWorld(dt: number): void {
  combatWorld.step(FIXED_TIMESTEP, dt, MAX_SUBSTEPS);
}

// ── Body management ─────────────────────────────────────────────────────────

export interface AttackerBodyOptions {
  /** Half-extents for the Box shape: [x, y, z] */
  halfExtents: [number, number, number];
  /** Is this a player's weapon (attacks enemies) or enemy's weapon (attacks players)? */
  isPlayerWeapon: boolean;
  /** Back-reference to the owning entity (unit ID, combat state, etc.) */
  owner: {
    unitId: string;
    /** Returns true when the owner is in a state that can deal damage */
    canDamage: () => boolean;
  };
}

/**
 * Create a weapon hitbox body in the combat world.
 *
 * The body is:
 * - mass 0 (not affected by gravity)
 * - type DYNAMIC (so it triggers collide events despite mass 0)
 * - collisionResponse false (passes through targets, doesn't push them)
 *
 * This is the exact pattern from annihilate's Attacker.js.
 */
export function createAttackerBody(options: AttackerBodyOptions): CANNON.Body {
  const { halfExtents, isPlayerWeapon, owner } = options;
  const groups = isPlayerWeapon ? CANNON_PLAYER_WEAPON : CANNON_ENEMY_WEAPON;

  const body = new CANNON.Body({
    mass: 0,
    type: CANNON.Body.DYNAMIC,
    collisionResponse: false,
    collisionFilterGroup: groups.group,
    collisionFilterMask: groups.mask,
  });

  const shape = new CANNON.Box(
    new CANNON.Vec3(halfExtents[0], halfExtents[1], halfExtents[2]),
  );
  body.addShape(shape);

  // Attach owner reference for collision callbacks (annihilate's body.belongTo)
  (body as any).belongTo = {
    isAttacker: true,
    owner,
  };

  // Track which bodies we're currently overlapping to implement beginCollide filtering
  (body as any)._collidings = new Set<CANNON.Body>();

  body.addEventListener('collide', (event: any) => {
    const collidings = (body as any)._collidings as Set<CANNON.Body>;
    const isBeginCollide = !collidings.has(event.body);
    if (isBeginCollide) collidings.add(event.body);

    // Only process the first frame of contact (beginCollide)
    if (!isBeginCollide) return;
    // Only deal damage during canDamage states
    if (!owner.canDamage()) return;

    const target = (event.body as any).belongTo;
    if (target?.hit) {
      target.hit({
        attackerUnitId: owner.unitId,
        collideEvent: event,
      });
    }
  });

  body.addEventListener('endContact', (event: any) => {
    const collidings = (body as any)._collidings as Set<CANNON.Body>;
    collidings.delete(event.body);
  });

  combatWorld.addBody(body);
  return body;
}

/**
 * Create a character target body in the combat world.
 * This represents the "hittable" body of a character that weapon hitboxes collide with.
 */
export function createCharacterTargetBody(options: {
  isPlayer: boolean;
  unitId: string;
  radius: number;
  halfHeight: number;
  onHit: (data: { attackerUnitId: string; collideEvent: any }) => void;
}): CANNON.Body {
  const { isPlayer, unitId, radius, halfHeight, onHit } = options;
  const groups = isPlayer ? CANNON_PLAYER : CANNON_ENEMY;

  const body = new CANNON.Body({
    mass: 0,
    type: CANNON.Body.KINEMATIC,
    collisionFilterGroup: groups.group,
    collisionFilterMask: groups.mask,
  });

  // Capsule approximation: cylinder + 2 spheres (annihilate pattern)
  const sphereShape = new CANNON.Sphere(radius);
  const cylinderShape = new CANNON.Cylinder(radius, radius, halfHeight * 2, 8);
  body.addShape(sphereShape, new CANNON.Vec3(0, halfHeight, 0));
  body.addShape(sphereShape, new CANNON.Vec3(0, -halfHeight, 0));
  body.addShape(cylinderShape);
  body.fixedRotation = true;

  (body as any).belongTo = {
    isCharacter: true,
    unitId,
    hit: onHit,
  };

  combatWorld.addBody(body);
  return body;
}

/**
 * Remove a body from the combat world and clean up.
 */
export function removeBody(body: CANNON.Body): void {
  combatWorld.removeBody(body);
  (body as any).belongTo = null;
  (body as any)._collidings = null;
}
