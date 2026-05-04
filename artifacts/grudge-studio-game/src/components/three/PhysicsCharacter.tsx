/**
 * PhysicsCharacter — Rapier rigid body wrapper for any character model.
 *
 * Adds a kinematic capsule collider sized from the character config.
 * Position is synced from the walk/animation system each frame via
 * `setNextKinematicTranslation()`.
 *
 * Also creates a Cannon-ES target body in the combat world so weapon
 * hitboxes can detect collisions with this character.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { getBodyDimensions } from '@/lib/physics/character-body-config';
import { RAPIER_PLAYER, RAPIER_ENEMY } from '@/lib/physics/collision-groups';
import {
  createCharacterTargetBody,
  removeBody,
} from '@/lib/physics/cannon-combat-world';
import type * as CANNON from 'cannon-es';

interface PhysicsCharacterProps {
  /** Character config ID for body dimensions */
  characterId: string;
  /** Is this a player-controlled unit? */
  isPlayer: boolean;
  /** Unit ID for combat hit callbacks */
  unitId: string;
  /** World-space position (static fallback; ignored when `worldPosRef` is provided) */
  position: [number, number, number];
  /**
   * Optional live world-position ref. When supplied, this drives the kinematic
   * body each frame instead of the static `position` prop. Required for any
   * caller that animates position imperatively (walks, dashes, knock-backs)
   * — Rapier RigidBodies do NOT inherit parent group transforms.
   */
  worldPosRef?: React.RefObject<THREE.Vector3>;
  /** Called when a weapon hitbox collides with this character in the cannon-es world */
  onCombatHit?: (data: { attackerUnitId: string; collideEvent: any }) => void;
  /** Children (CharacterModel, etc.) */
  children: React.ReactNode;
}

export function PhysicsCharacter({
  characterId,
  isPlayer,
  unitId,
  position,
  worldPosRef,
  onCombatHit,
  children,
}: PhysicsCharacterProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const cannonBodyRef = useRef<CANNON.Body | null>(null);

  const dims = useMemo(() => getBodyDimensions(characterId), [characterId]);
  const collisionGroups = isPlayer ? RAPIER_PLAYER : RAPIER_ENEMY;

  // ── Live position ref: prefer caller-supplied worldPosRef, else fall back
  //    to the static `position` prop (kept in sync via effect).
  const internalPosRef = useRef(
    new THREE.Vector3(
      worldPosRef?.current?.x ?? position[0],
      worldPosRef?.current?.y ?? position[1],
      worldPosRef?.current?.z ?? position[2],
    ),
  );
  useEffect(() => {
    if (!worldPosRef) internalPosRef.current.set(...position);
  }, [position, worldPosRef]);

  const livePos = () => worldPosRef?.current ?? internalPosRef.current;

  // ── Cannon-ES target body (for weapon hitbox detection) ─────────────────
  useEffect(() => {
    const body = createCharacterTargetBody({
      isPlayer,
      unitId,
      radius: dims.radius,
      halfHeight: dims.halfHeight,
      onHit: (data) => onCombatHit?.(data),
    });
    cannonBodyRef.current = body;

    // Set initial position from the live source
    const p = livePos();
    body.position.set(p.x, p.y + dims.feetOffset, p.z);

    return () => {
      if (cannonBodyRef.current) {
        removeBody(cannonBodyRef.current);
        cannonBodyRef.current = null;
      }
    };
  }, [unitId, isPlayer, dims, onCombatHit]);

  useFrame(() => {
    const p = livePos();
    if (rigidBodyRef.current) {
      rigidBodyRef.current.setNextKinematicTranslation({
        x: p.x,
        y: p.y + dims.feetOffset,
        z: p.z,
      });
    }
    if (cannonBodyRef.current) {
      cannonBodyRef.current.position.set(p.x, p.y + dims.feetOffset, p.z);
    }
  });

  // Initial RigidBody mount position — pulls from live source so the body
  // never spawns at origin then teleports on frame 1.
  const initial = livePos();
  return (
    <RigidBody
      ref={rigidBodyRef}
      type="kinematicPosition"
      colliders={false}
  position = { [initial.x, initial.y + dims.feetOffset, initial.z]}
      collisionGroups={collisionGroups}
    >
      <CapsuleCollider args={[dims.halfHeight, dims.radius]} />
      {/* Children rendered at ground level (offset down by feetOffset) */}
      <group position={[0, -dims.feetOffset, 0]}>
        {children}
      </group>
    </RigidBody>
  );
}
