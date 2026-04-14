/**
 * WeaponCollider — Cannon-ES weapon hitbox that tracks a bone's world transform.
 *
 * Follows the annihilate Sword.js / GreatSword.js pattern:
 * - Creates a CANNON.Body with a Box shape sized to the weapon type
 * - Each frame: reads the weapon delegate's world position/quaternion from Three.js
 * - Copies those transforms to the cannon body
 * - Collision events only register damage when the owner is in a canDamage state
 *
 * This is a renderless R3F component — it uses useFrame but produces no JSX.
 */

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {
  createAttackerBody,
  removeBody,
} from '@/lib/physics/cannon-combat-world';
import { getWeaponHitboxExtents } from '@/lib/physics/character-body-config';

interface WeaponColliderProps {
  /** The Three.js object whose world transform we track (weapon delegate or bone) */
  trackObject: THREE.Object3D | null;
  /** Weapon type for hitbox sizing */
  weaponType: string;
  /** Unit ID of the weapon owner */
  unitId: string;
  /** Is this a player weapon? */
  isPlayerWeapon: boolean;
  /** Callback that returns true when this weapon should deal damage */
  canDamage: () => boolean;
  /** Whether the collider is active (disabled when unit is dead, etc.) */
  enabled?: boolean;
}

export function WeaponCollider({
  trackObject,
  weaponType,
  unitId,
  isPlayerWeapon,
  canDamage,
  enabled = true,
}: WeaponColliderProps) {
  const bodyRef = useRef<CANNON.Body | null>(null);
  const canDamageRef = useRef(canDamage);
  canDamageRef.current = canDamage;

  // Reusable temp objects for world-transform extraction (avoid per-frame allocation)
  const _worldPos = useRef(new THREE.Vector3());
  const _worldQuat = useRef(new THREE.Quaternion());

  // ── Create / destroy the cannon body ────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const halfExtents = getWeaponHitboxExtents(weaponType);
    const body = createAttackerBody({
      halfExtents,
      isPlayerWeapon,
      owner: {
        unitId,
        canDamage: () => canDamageRef.current(),
      },
    });
    bodyRef.current = body;

    return () => {
      if (bodyRef.current) {
        removeBody(bodyRef.current);
        bodyRef.current = null;
      }
    };
  }, [weaponType, unitId, isPlayerWeapon, enabled]);

  // ── Track bone transform each frame ─────────────────────────────────────
  // This is the core annihilate pattern from Sword.js update():
  //   owner.swordDelegate.getWorldPosition(tmpVec3);
  //   owner.swordDelegate.getWorldQuaternion(tmpQuat);
  //   this.body.position.copy(tmpVec3);
  //   this.body.quaternion.copy(tmpQuat);
  useFrame(() => {
    if (!bodyRef.current || !trackObject) return;

    trackObject.getWorldPosition(_worldPos.current);
    trackObject.getWorldQuaternion(_worldQuat.current);

    bodyRef.current.position.set(
      _worldPos.current.x,
      _worldPos.current.y,
      _worldPos.current.z,
    );
    bodyRef.current.quaternion.set(
      _worldQuat.current.x,
      _worldQuat.current.y,
      _worldQuat.current.z,
      _worldQuat.current.w,
    );
  });

  // Renderless component
  return null;
}
