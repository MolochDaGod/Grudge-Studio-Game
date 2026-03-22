import { TacticalUnit } from '@/store/use-game-store';
import { AnimState } from '@/components/three/CharacterModel';
import { EffectType } from '@/components/three/CombatEffects';
import { Skill } from '@/lib/weapon-skills';

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
  return damage;
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
  if (skill.tags.includes('ultimate')) return 'special1';
  if (skill.tags.includes('heal') || skill.tags.includes('buff')) return 'cast';
  if (skill.aoe) return 'attack3';
  if (skill.range > 2) return 'attack2';
  return 'attack1';
}

/** Attack animation duration by skill type (ms) */
export function getAtkDuration(skill: Skill): number {
  if (skill.tags?.includes('ultimate')) return 1600;
  if (skill.aoe) return 1400;
  if (skill.range > 2) return 1250;
  if (skill.tags?.includes('heal') || skill.tags?.includes('buff')) return 1100;
  return 1050;
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
