/**
 * Cover System — Mario+Rabbids-style directional cover mechanics.
 *
 * Tiles adjacent to obstacles gain "half cover" from the direction of the obstacle.
 * If an attacker's line to the defender passes through the cover direction, the
 * defender receives a damage reduction.
 *
 * Full cover (completely behind an obstacle) is already handled by the existing
 * visionBlockers / line-of-sight system — if LOS fails, the attack can't target
 * at all.  This module handles the intermediate "partial cover" case.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type CoverDirection = 'N' | 'E' | 'S' | 'W';

export interface CoverInfo {
  /** Which direction(s) this tile has cover from (obstacle is in that direction) */
  directions: CoverDirection[];
  /** Whether cover applies against a specific attacker position */
  isProtected: boolean;
  /** Damage multiplier (1.0 = no cover, 0.75 = half cover, 0.5 = heavy cover) */
  damageMultiplier: number;
  /** Label for UI display */
  label: 'none' | 'half' | 'heavy';
}

// ── Cardinal offset map ───────────────────────────────────────────────────────

const DIR_OFFSETS: Record<CoverDirection, { dx: number; dy: number }> = {
  N: { dx:  0, dy: -1 },
  E: { dx:  1, dy:  0 },
  S: { dx:  0, dy:  1 },
  W: { dx: -1, dy:  0 },
};

/** Opposite direction lookup — used by higher-level cover flanking logic */
export const OPPOSITE: Record<CoverDirection, CoverDirection> = {
  N: 'S', S: 'N', E: 'W', W: 'E',
};

// ── Core helpers ──────────────────────────────────────────────────────────────

/**
 * Returns which directions a tile has cover from, based on adjacent obstacles.
 * A tile at (x,y) has cover from direction D if the tile in direction D is an obstacle.
 *
 * Example: if (x, y-1) is an obstacle, the defender has cover from the North.
 */
export function getTileCoverDirections(
  x: number,
  y: number,
  obstacles: Set<string>,
): CoverDirection[] {
  const dirs: CoverDirection[] = [];
  for (const [dir, { dx, dy }] of Object.entries(DIR_OFFSETS) as [CoverDirection, { dx: number; dy: number }][]) {
    const nx = x + dx;
    const ny = y + dy;
    if (obstacles.has(`${nx},${ny}`)) {
      dirs.push(dir);
    }
  }
  return dirs;
}

/**
 * Determine the primary attack direction from attacker → defender.
 * Returns the cardinal direction the attack is coming FROM (relative to defender).
 *
 * If attacker is north of defender → attack comes from N.
 */
export function getAttackDirection(
  attacker: { x: number; y: number },
  defender: { x: number; y: number },
): CoverDirection {
  const dx = attacker.x - defender.x;
  const dy = attacker.y - defender.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0 ? 'E' : 'W';
  }
  return dy > 0 ? 'S' : 'N';
}

/**
 * Check if a defender at (dx, dy) has cover against an attacker at (ax, ay).
 *
 * Cover is granted when the obstacle is between the attacker and defender.
 * Specifically: if the attack comes from direction D, the defender has cover
 * if there's an obstacle in direction D (the obstacle blocks the attack path).
 */
export function getCoverAgainst(
  attackerPos: { x: number; y: number },
  defenderPos: { x: number; y: number },
  obstacles: Set<string>,
): CoverInfo {
  const coverDirs = getTileCoverDirections(defenderPos.x, defenderPos.y, obstacles);

  if (coverDirs.length === 0) {
    return { directions: [], isProtected: false, damageMultiplier: 1.0, label: 'none' };
  }

  const atkDir = getAttackDirection(attackerPos, defenderPos);

  // Cover protects if the obstacle is in the direction the attack comes from.
  // If attack comes from N, cover from N means obstacle is at (x, y-1) — between attacker and defender.
  const protectingDirs = coverDirs.filter(d => d === atkDir);

  // Also count diagonal cover: if attack is from NE quadrant, both N and E cover help partially
  const dx = attackerPos.x - defenderPos.x;
  const dy = attackerPos.y - defenderPos.y;
  const isDiagonal = Math.abs(dx) > 0 && Math.abs(dy) > 0 && Math.abs(Math.abs(dx) - Math.abs(dy)) <= 1;

  if (isDiagonal) {
    // For diagonal attacks, check if either cardinal component has cover
    const hDir: CoverDirection = dx > 0 ? 'E' : 'W';
    const vDir: CoverDirection = dy > 0 ? 'S' : 'N';
    const diagProtecting = coverDirs.filter(d => d === hDir || d === vDir);
    if (diagProtecting.length >= 2) {
      return { directions: coverDirs, isProtected: true, damageMultiplier: 0.5, label: 'heavy' };
    }
    if (diagProtecting.length === 1) {
      return { directions: coverDirs, isProtected: true, damageMultiplier: 0.75, label: 'half' };
    }
  }

  if (protectingDirs.length > 0) {
    // Check for heavy cover: obstacle on both the attack direction and an adjacent direction
    const adjDirs: CoverDirection[] = atkDir === 'N' || atkDir === 'S' ? ['E', 'W'] : ['N', 'S'];
    const hasAdjacentCover = adjDirs.some(d => coverDirs.includes(d));
    if (hasAdjacentCover) {
      return { directions: coverDirs, isProtected: true, damageMultiplier: 0.5, label: 'heavy' };
    }
    return { directions: coverDirs, isProtected: true, damageMultiplier: 0.75, label: 'half' };
  }

  // Has cover directions but they don't face the attacker — no protection
  return { directions: coverDirs, isProtected: false, damageMultiplier: 1.0, label: 'none' };
}

/**
 * Apply cover modifier to a damage value.
 * Returns the reduced damage (always at least 1).
 */
export function applyCoverDamage(baseDamage: number, coverInfo: CoverInfo): number {
  if (!coverInfo.isProtected) return baseDamage;
  return Math.max(1, Math.floor(baseDamage * coverInfo.damageMultiplier));
}

// ── AI scoring helper ─────────────────────────────────────────────────────────

/**
 * Score a tile's cover quality for AI movement decisions.
 * Higher score = better defensive position.
 * Considers cover from all enemy directions.
 */
export function scoreTileCover(
  tilePos: { x: number; y: number },
  enemies: Array<{ x: number; y: number }>,
  obstacles: Set<string>,
): number {
  const coverDirs = getTileCoverDirections(tilePos.x, tilePos.y, obstacles);
  if (coverDirs.length === 0) return 0;

  let score = 0;
  for (const enemy of enemies) {
    const cover = getCoverAgainst(enemy, tilePos, obstacles);
    if (cover.label === 'heavy') score += 3;
    else if (cover.label === 'half') score += 2;
  }
  // Bonus for corner cover (2+ directions)
  if (coverDirs.length >= 2) score += 1;
  if (coverDirs.length >= 3) score += 2;

  return score;
}

// ── Tile overlay data for rendering ───────────────────────────────────────────

export interface CoverOverlay {
  x: number;
  y: number;
  directions: CoverDirection[];
}

/**
 * Generate cover overlay data for all walkable tiles that have adjacent obstacles.
 * Used by TileGrid to render cover direction indicators.
 */
export function getCoverOverlays(
  gridW: number,
  gridH: number,
  obstacles: Set<string>,
): CoverOverlay[] {
  const overlays: CoverOverlay[] = [];
  for (let x = 0; x < gridW; x++) {
    for (let y = 0; y < gridH; y++) {
      if (obstacles.has(`${x},${y}`)) continue; // skip obstacle tiles themselves
      const dirs = getTileCoverDirections(x, y, obstacles);
      if (dirs.length > 0) {
        overlays.push({ x, y, directions: dirs });
      }
    }
  }
  return overlays;
}
