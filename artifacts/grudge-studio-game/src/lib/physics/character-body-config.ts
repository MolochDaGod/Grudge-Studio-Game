/**
 * Character physics body configuration.
 *
 * Computes capsule collider dimensions from the CharacterConfig scale,
 * following the annihilate pattern where every character gets:
 *   capsule = 2 spheres (top + bottom caps) + 1 cylinder (middle)
 *
 * Dimensions are in world-space units after the character's scale is applied.
 */

import { getCharacterConfig } from '@/lib/character-model-map';

export interface BodyDimensions {
  /** Half-height of the capsule cylinder segment (Rapier uses half-height) */
  halfHeight: number;
  /** Radius of the capsule sphere caps */
  radius: number;
  /** Full height of the character body (for mesh offset calculations) */
  fullHeight: number;
  /** Y offset from body center to feet (for positioning mesh at ground level) */
  feetOffset: number;
}

// ── Default base dimensions (before scale) ──────────────────────────────────
// These represent a standard humanoid character at scale 1.0.
// Annihilate uses bodyRadius=0.5, bodyHeight=1.65 for Maria at scale ~1.0.
// Our Quaternius models at scale 0.72 need smaller defaults.

const BASE_RADIUS = 0.30;
const BASE_HEIGHT = 1.30;

/**
 * Get physics body dimensions for a character.
 *
 * Priority:
 * 1. Explicit `bodyRadius` / `bodyHeight` on CharacterConfig
 * 2. Computed from config scale (BASE_* × scaleY)
 */
export function getBodyDimensions(characterId: string): BodyDimensions {
  const config = getCharacterConfig(characterId);

  // Scale factor — use Y component as the height reference
  const scaleY = config.scale[1];
  const scaleXZ = Math.max(config.scale[0], config.scale[2]);

  const radius = config.bodyRadius ?? BASE_RADIUS * scaleXZ;
  const fullHeight = config.bodyHeight ?? BASE_HEIGHT * scaleY;

  // Capsule geometry: cylinder height = total - 2 × radius (the sphere caps)
  const cylinderHeight = Math.max(0.1, fullHeight - radius * 2);
  const halfHeight = cylinderHeight / 2;

  return {
    halfHeight,
    radius,
    fullHeight,
    feetOffset: fullHeight / 2,
  };
}

/**
 * Get weapon hitbox dimensions by weapon type.
 * Returns a [halfX, halfY, halfZ] box extent (Cannon-ES Box uses half-extents).
 *
 * Sized to match annihilate's weapon colliders:
 * - GreatSword: Box(0.19, 0.19, 0.74)
 * - Sword: Box(0.11, 0.11, 0.45)
 * - Shield: Box(0.3, 0.11, 0.37)
 */
export function getWeaponHitboxExtents(
  weaponType: string,
): [number, number, number] {
  switch (weaponType) {
    case 'greatsword':
    case 'greataxe':
    case 'war_hammer':
      return [0.20, 0.20, 0.75]; // large two-handers
    case 'sword':
    case 'rusted_sword':
      return [0.12, 0.12, 0.50]; // one-hand swords
    case 'daggers':
      return [0.10, 0.10, 0.30]; // short blades
    case 'fire_staff':
    case 'dark_staff':
      return [0.10, 0.10, 0.80]; // long staves
    case 'bow':
      return [0.08, 0.08, 0.15]; // bow itself (projectiles use separate collider)
    case 'shield':
      return [0.30, 0.12, 0.38]; // shield block area
    default:
      return [0.15, 0.15, 0.50]; // generic fallback
  }
}
