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
  /** World-space position (updated by walk system, etc.) */
  position: [number, number, number];
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
  onCombatHit,
  children,
}: PhysicsCharacterProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const cannonBodyRef = useRef<CANNON.Body | null>(null);

  const dims = useMemo(() => getBodyDimensions(characterId), [characterId]);
  const collisionGroups = isPlayer ? RAPIER_PLAYER : RAPIER_ENEMY;

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

    // Set initial position
    body.position.set(position[0], position[1] + dims.feetOffset, position[2]);

    return () => {
      if (cannonBodyRef.current) {
        removeBody(cannonBodyRef.current);
        cannonBodyRef.current = null;
      }
    };
  }, [unitId, isPlayer, dims, onCombatHit]);

  // ── Sync position each frame ────────────────────────────────────────────
  const posRef = useRef(new THREE.Vector3(...position));
  useEffect(() => {
    posRef.current.set(...position);
  }, [position]);

  useFrame(() => {
    // Sync Rapier kinematic body
    if (rigidBodyRef.current) {
      rigidBodyRef.current.setNextKinematicTranslation({
        x: posRef.current.x,
        y: posRef.current.y + dims.feetOffset,
        z: posRef.current.z,
      });
    }

    // Sync Cannon-ES target body
    if (cannonBodyRef.current) {
      cannonBodyRef.current.position.set(
        posRef.current.x,
        posRef.current.y + dims.feetOffset,
        posRef.current.z,
      );
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      type="kinematicPosition"
      colliders={false}
      position={[position[0], position[1] + dims.feetOffset, position[2]]}
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
