import { TacticalUnit } from '@/store/use-game-store';
import { AnimState } from '@/components/three/CharacterModel';
import { EffectType } from '@/components/three/CombatEffects';
import { Skill } from '@/lib/weapon-skills';
import { getCoverAgainst, CoverInfo } from '@/lib/cover-system';

// ── Facing helpers ────────────────────────────────────────────────────────────

/** Compute cardinal facing (0=N 1=E 2=S 3=W) from one tile to another */
export function calcFacing(
  from: { x: number; y: number },
  to: { x: number; y: number },
): 0 | 1 | 2 | 3 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 1 : 3;
  return dy >= 0 ? 2 : 0;
}

/**
 * Facing defence modifier.
 * Rear attacks get +50% damage (returns 1.5), front attacks return 1.0.
 * Phase 3B adds front-block chance on top of this.
 */
export function facingDefenseMultiplier(
  attacker: TacticalUnit,
  defender: TacticalUnit,
): number {
  const dx = attacker.position.x - defender.position.x;
  const dy = attacker.position.y - defender.position.y;
  const df = defender.facing ?? 2;
  let isRear = false;
  if      (df === 0 && dy > 0) isRear = true;
  else if (df === 1 && dx < 0) isRear = true;
  else if (df === 2 && dy < 0) isRear = true;
  else if (df === 3 && dx > 0) isRear = true;
  return isRear ? 1.5 : 1.0;
}

/**
 * Returns true when the attacker is in the defender's **front** arc.
 * Used by the Phase-3B counter-attack/block system.
 */
export function isFrontAttack(
  attacker: TacticalUnit,
  defender: TacticalUnit,
): boolean {
  return facingDefenseMultiplier(attacker, defender) === 1.0;
}

// ── Damage calculation ────────────────────────────────────────────────────────

export function calculateDamage(
  attacker: TacticalUnit,
  defender: TacticalUnit,
  isCrit = false,
  obstacles?: Set<string>,
): number {
  const facingMult = facingDefenseMultiplier(attacker, defender);
  const effectiveDef = facingMult > 1
    ? Math.floor(defender.defense * 0.5)
    : defender.defense;
  let damage = Math.max(
    1,
    attacker.attack - effectiveDef + Math.floor(Math.random() * 6) - 2,
  );
  if (isCrit) damage = Math.floor(damage * 2);
  // Apply cover reduction if obstacles provided
  if (obstacles) {
    const cover = getCoverAgainst(attacker.position, defender.position, obstacles);
    if (cover.isProtected) {
      damage = Math.max(1, Math.floor(damage * cover.damageMultiplier));
    }
  }
  return damage;
}

/** Get cover info between attacker and defender (convenience re-export) */
export function getCombatCover(
  attacker: TacticalUnit,
  defender: TacticalUnit,
  obstacles: Set<string>,
): CoverInfo {
  return getCoverAgainst(attacker.position, defender.position, obstacles);
}

// ── Effect mapping ────────────────────────────────────────────────────────────

export function getEffectColor(skill: Skill): string {
  const s = (skill.stats.join(' ') + ' ' + (skill.description || '')).toLowerCase();
  if (s.includes('fire'))  return '#ff6030';
  if (s.includes('dark') || s.includes('death') || s.includes('void')) return '#9030ff';
  if (s.includes('ice') || s.includes('frost') || s.includes('frozen')) return '#40d0ff';
  if (skill.tags.includes('heal'))    return '#00ff88';
  if (skill.tags.includes('ultimate')) return '#ffd700';
  return '#ffa040';
}

export function getEffectType(skill: Skill, weaponType?: string): EffectType {
  if (skill.tags.includes('ultimate'))  return 'ultimate_nova';
  if (skill.tags.includes('heal'))      return 'heal_burst';
  const s = (skill.stats.join(' ') + ' ' + (skill.description || '')).toLowerCase();
  if (s.includes('fire'))  return 'fire_projectile';
  if (s.includes('dark') || s.includes('death')) return 'dark_projectile';
  if (s.includes('ice') || s.includes('frost'))  return 'ice_projectile';
  if (weaponType === 'bow') return 'arrow';
  if (skill.applyStatus === 'stunned')  return 'status_stun';
  if (skill.applyStatus === 'poisoned') return 'status_poison';
  if (skill.applyStatus === 'frozen')   return 'status_freeze';
  if (skill.range !== undefined && skill.range <= 1) return 'physical_slash';
  return 'impact_flash';
}

// ── Anim state for skills ─────────────────────────────────────────────────────

export function getSkillAnimState(skill: Skill): AnimState {
  // Mobility skills
  if (skill.mobilityType === 'team_jump') return 'attack4';  // Jump animation
  if (skill.mobilityType === 'flight')    return 'special2'; // Jump/fly animation
  if (skill.mobilityType === 'teleport')  return 'cast';     // Cast/blink animation
  // Dash-strike skills
  if (skill.attackType === 'dash' && skill.dmgMultiplier) return 'attack1';
  // Normal combat
  if (skill.tags.includes('ultimate')) return 'special1';
  if (skill.tags.includes('heal') || skill.tags.includes('buff')) return 'cast';
  if (skill.aoe) return 'attack3';
  if (skill.range > 2) return 'attack2';
  return 'attack1';
}

/** Attack animation duration by skill type (ms) */
export function getAtkDuration(skill: Skill): number {
  // Mobility skills have their own timing
  if (skill.mobilityType === 'team_jump') return 700;
  if (skill.mobilityType === 'flight')    return 900;
  if (skill.mobilityType === 'teleport')  return 550;
  // Dash-strike: longer to account for dash-out + hold + return
  if (skill.attackType === 'dash' && skill.returnsToOrigin) return 1400;
  if (skill.attackType === 'dash') return 1200;
  // Normal combat
  if (skill.tags?.includes('ultimate')) return 1600;
  if (skill.aoe) return 1400;
  if (skill.range > 2) return 1250;
  if (skill.tags?.includes('heal') || skill.tags?.includes('buff')) return 1100;
  return 1050;
}

/** Check if a skill is a mobility/movement skill (targets empty tiles, not enemies) */
export function isMobilitySkill(skill: Skill): boolean {
  return !!skill.mobilityType;
}

/**
 * For dash attacks that don't return to origin, find the best adjacent tile
 * near the target for the attacker to land on after striking.
 */
export function findDashLandingTile(
  target: { x: number; y: number },
  origin: { x: number; y: number },
  gridW: number,
  gridH: number,
  occupied: Set<string>,
  obstacles: Set<string>,
): { x: number; y: number } {
  const dirs = [[0,1],[0,-1],[1,0],[-1,0]] as const;
  // Prefer the tile that's on the attacker's approach side
  const dx = origin.x - target.x;
  const dy = origin.y - target.y;
  const sorted = [...dirs].sort((a, b) => {
    // Score: prefer tile in direction of origin (attacker's approach side)
    const scoreA = a[0] * Math.sign(dx) + a[1] * Math.sign(dy);
    const scoreB = b[0] * Math.sign(dx) + b[1] * Math.sign(dy);
    return scoreB - scoreA;
  });
  for (const [ddx, ddy] of sorted) {
    const nx = target.x + ddx, ny = target.y + ddy;
    const key = `${nx},${ny}`;
    if (nx >= 0 && ny >= 0 && nx < gridW && ny < gridH && !occupied.has(key) && !obstacles.has(key)) {
      return { x: nx, y: ny };
    }
  }
  return origin; // fallback: stay at origin if no adjacent tile is free
}

// ── BFS path for movement ─────────────────────────────────────────────────────

export function bfsPath(
  start: { x: number; y: number },
  end: { x: number; y: number },
  gridW: number,
  gridH: number,
  occupied: Set<string>,
  obstacles: Set<string> = new Set(),
): { x: number; y: number }[] {
  if (start.x === end.x && start.y === end.y) return [start];
  const queue: { x: number; y: number; path: { x: number; y: number }[] }[] = [
    { x: start.x, y: start.y, path: [{ x: start.x, y: start.y }] },
  ];
  const visited = new Set<string>([`${start.x},${start.y}`]);
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]] as const;
  while (queue.length > 0) {
    const { x, y, path } = queue.shift()!;
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      const key = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= gridW || ny >= gridH) continue;
      if (visited.has(key)) continue;
      if (obstacles.has(key)) continue;
      if (occupied.has(key) && !(nx === end.x && ny === end.y)) continue;
      visited.add(key);
      const newPath = [...path, { x: nx, y: ny }];
      if (nx === end.x && ny === end.y) return newPath;
      queue.push({ x: nx, y: ny, path: newPath });
    }
  }
  return [start, end];
}
