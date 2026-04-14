/**
 * Tactical AI — extracted and enhanced from inline battle.tsx logic.
 *
 * Provides a scoring-based AI that evaluates all possible moves and actions
 * for enemy units each turn.  Supports three difficulty levels:
 *
 *  • easy   — picks randomly from the top 3 scored options
 *  • normal — picks the best scored option
 *  • hard   — same as normal but also considers cover and avoids exposed tiles
 *
 * All functions are pure (no side-effects) — they return decision objects
 * that battle.tsx executes.
 */

import { TacticalUnit } from '@/store/use-game-store';
import {
  calcFacing, facingDefenseMultiplier, bfsPath,
} from '@/lib/combat-engine';
import { hasLineOfSight } from '@/lib/levels'; // used for LOS-aware action scoring
import { Skill, getSkillById, getDefaultSkillLoadout, SkillSlot } from '@/lib/weapon-skills';
import { getCoverAgainst, scoreTileCover } from '@/lib/cover-system';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AIDifficulty = 'easy' | 'normal' | 'hard';

export interface AIMove {
  targetTile: { x: number; y: number };
  path: { x: number; y: number }[];
  facing: 0 | 1 | 2 | 3;
  score: number;
}

export interface AIAction {
  kind: 'skill' | 'basic_attack' | 'ability' | 'skip';
  targetId?: string;
  skill?: Skill;
  score: number;
}

export interface AIDecision {
  move: AIMove | null;
  action: AIAction;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function manhattan(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function pickByDifficulty<T extends { score: number }>(options: T[], difficulty: AIDifficulty): T {
  if (options.length === 0) throw new Error('No options to pick from');
  options.sort((a, b) => b.score - a.score);
  if (difficulty === 'easy') {
    const top = options.slice(0, Math.min(3, options.length));
    return top[Math.floor(Math.random() * top.length)];
  }
  return options[0]; // normal + hard: best option
}

// ── Reachable tiles (BFS flood fill) ──────────────────────────────────────────

export function getReachableTiles(
  start: { x: number; y: number },
  maxMove: number,
  gridW: number,
  gridH: number,
  obstacles: Set<string>,
  occupiedGrid: (string | null)[][],
): { x: number; y: number }[] {
  const queue = [{ ...start, dist: 0 }];
  const visited = new Set([`${start.x},${start.y}`]);
  const reachable: { x: number; y: number }[] = [];

  while (queue.length > 0) {
    const { x, y, dist } = queue.shift()!;
    reachable.push({ x, y });
    if (dist < maxMove) {
      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const nx = x + dx, ny = y + dy;
        const key = `${nx},${ny}`;
        if (nx < 0 || ny < 0 || nx >= gridW || ny >= gridH) continue;
        if (visited.has(key) || obstacles.has(key)) continue;
        if (occupiedGrid[nx]?.[ny] != null && !(nx === start.x && ny === start.y)) continue;
        visited.add(key);
        queue.push({ x: nx, y: ny, dist: dist + 1 });
      }
    }
  }
  return reachable;
}

// ── Move scoring ──────────────────────────────────────────────────────────────

function scoreMoveOptions(
  unit: TacticalUnit,
  reachable: { x: number; y: number }[],
  enemies: TacticalUnit[],
  allies: TacticalUnit[],
  obstacles: Set<string>,
  difficulty: AIDifficulty,
): { tile: { x: number; y: number }; score: number }[] {
  const isRanged = unit.range >= 2;

  return reachable.map(tile => {
    let score = 0;

    // Find nearest enemy
    let nearestDist = Infinity;
    let bestTarget: TacticalUnit | null = null;
    for (const enemy of enemies) {
      const d = manhattan(tile, enemy.position);
      if (d < nearestDist) { nearestDist = d; bestTarget = enemy; }
    }
    if (!bestTarget) return { tile, score: -100 };

    const distToTarget = manhattan(tile, bestTarget.position);

    if (isRanged) {
      // Ranged: prefer to stay at max range, avoid melee range
      if (distToTarget <= unit.range && distToTarget >= 2) {
        score += 30; // in range and safe
        score += Math.abs(distToTarget - unit.range) <= 1 ? 10 : 0; // near ideal range
      } else if (distToTarget <= 1) {
        score -= 15; // too close, dangerous
      } else if (distToTarget <= unit.range) {
        score += 15; // in range but close
      } else {
        score -= distToTarget * 2; // out of range, penalize by distance
      }
    } else {
      // Melee: get adjacent (dist 1) for attack
      if (distToTarget === 1) score += 40;
      else if (distToTarget === 2) score += 15;
      else score -= distToTarget * 3;

      // Flanking bonus: prefer rear of target
      if (bestTarget && distToTarget <= 2) {
        const tf = bestTarget.facing ?? 2;
        const isRear =
          (tf === 0 && tile.y > bestTarget.position.y) ||
          (tf === 1 && tile.x < bestTarget.position.x) ||
          (tf === 2 && tile.y < bestTarget.position.y) ||
          (tf === 3 && tile.x > bestTarget.position.x);
        if (isRear) score += 12;
      }
    }

    // Prefer targeting low HP enemies
    if (bestTarget) {
      const hpPct = bestTarget.hp / bestTarget.maxHp;
      if (hpPct < 0.3) score += 10; // finishing blow territory
      else if (hpPct < 0.5) score += 5;
    }

    // Cover scoring (hard difficulty considers this more heavily)
    if (difficulty === 'hard') {
      const coverScore = scoreTileCover(tile, enemies.map(e => e.position), obstacles);
      score += coverScore * 3;
    } else if (difficulty === 'normal') {
      const coverScore = scoreTileCover(tile, enemies.map(e => e.position), obstacles);
      score += coverScore;
    }

    // Avoid clustering with allies (spread out to avoid AoE)
    const nearbyAllies = allies.filter(a => a.id !== unit.id && manhattan(tile, a.position) <= 2).length;
    if (nearbyAllies >= 2) score -= 5;

    return { tile, score };
  });
}

// ── Action scoring ────────────────────────────────────────────────────────────

function scoreActions(
  unit: TacticalUnit,
  targets: TacticalUnit[],
  equippedSkills: Record<string, Record<SkillSlot, string>>,
  skillCooldowns: Record<string, Record<string, number>>,
  obstacles: Set<string>,
  visionBlockers: Set<string>,
  difficulty: AIDifficulty,
): AIAction[] {
  const actions: AIAction[] = [];
  const currentPos = unit.position;

  // Targets in basic attack range with LOS
  const basicTargets = targets.filter(t =>
    manhattan(currentPos, t.position) <= unit.range && t.hp > 0 &&
    hasLineOfSight(currentPos, t.position, visionBlockers)
  );

  // Score basic attack for each target
  for (const target of basicTargets) {
    let score = 10;
    const hpPct = target.hp / target.maxHp;
    const facingMult = facingDefenseMultiplier(unit, target);

    // Rear attack bonus
    if (facingMult > 1) score += 8;
    // Low HP target bonus
    if (hpPct < 0.3) score += 12;
    else if (hpPct < 0.5) score += 6;
    // Cover penalty (hard mode)
    if (difficulty === 'hard') {
      const cover = getCoverAgainst(currentPos, target.position, obstacles);
      if (cover.label === 'half') score -= 4;
      if (cover.label === 'heavy') score -= 8;
    }

    actions.push({ kind: 'basic_attack', targetId: target.id, score });
  }

  // Score each equipped skill
  const loadout = equippedSkills[unit.id] || getDefaultSkillLoadout(unit.characterId);
  const cdMap = skillCooldowns[unit.id] || {};
  const unitHpPct = unit.hp / unit.maxHp;

  for (const slot of [1, 2, 3, 4, 5] as const) {
    const skillId = loadout[slot];
    if (!skillId) continue;
    const cd = cdMap[skillId] || 0;
    if (cd > 0) continue;
    const skill = getSkillById(skillId);
    if (!skill) continue;

    // Self-target skills (heals, buffs, movement)
    if (skill.selfTarget) {
      let score = 5;
      if (skill.tags.includes('heal')) {
        if (unitHpPct < 0.35) score += 40;
        else if (unitHpPct < 0.55) score += 20;
        else score -= 15; // don't waste heals at high HP
      }
      if (skill.tags.includes('move')) {
        // Movement skills: useful when no enemies in range
        if (basicTargets.length === 0) score += 15;
        else score -= 10; // already in range, don't waste on movement
      }
      if (skill.tags.includes('buff')) {
        score += 8;
      }
      actions.push({ kind: 'skill', skill, score });
      continue;
    }

    // Offensive skills targeting enemies
    for (const target of targets) {
      if (target.hp <= 0) continue;
      const dist = manhattan(currentPos, target.position);
      const effectiveRange = skill.attackType === 'dash'
        ? (skill.range + (skill.dashBonus ?? 0))
        : skill.range;
      if (dist > effectiveRange) continue;
      // LOS check for normal attacks (jump/dash ignore LOS)
      if (skill.attackType !== 'jump' && skill.attackType !== 'dash') {
        if (!hasLineOfSight(currentPos, target.position, visionBlockers)) continue;
      }

      let score = 12;

      // Damage multiplier
      if (skill.dmgMultiplier) score += skill.dmgMultiplier * 15;

      // AoE bonus
      if (skill.aoe) {
        const clustered = targets.filter(t =>
          t.hp > 0 && manhattan(target.position, t.position) <= 2
        ).length;
        if (clustered >= 3) score += 30;
        else if (clustered >= 2) score += 18;
        else score += 5;
      }

      // Status effects
      if (skill.applyStatus === 'stunned') score += 20;
      if (skill.applyStatus === 'frozen') score += 16;
      if (skill.applyStatus === 'poisoned') score += 10;

      // Already has the status? Lower priority
      if (skill.applyStatus && target.statusEffects.includes(skill.applyStatus)) {
        score -= 15;
      }

      // Ultimate management
      if (skill.tags.includes('ultimate')) {
        const targetHpPct = target.hp / target.maxHp;
        if (targetHpPct < 0.3 || targets.filter(t => t.hp > 0).length >= 3) {
          score += 35; // good time for ult
        } else {
          score -= 30; // save it
        }
      }

      // Armor pen vs high defense
      if (skill.armorPen && target.defense > 15) {
        score += skill.armorPen * 0.3;
      }

      // Cover awareness (hard)
      if (difficulty === 'hard') {
        const cover = getCoverAgainst(currentPos, target.position, obstacles);
        if (cover.label === 'half') score -= 3;
        if (cover.label === 'heavy') score -= 6;
        // Armor pen partially negates cover
        if (skill.armorPen && cover.isProtected) score += skill.armorPen * 0.15;
      }

      // Finishing blow bonus
      if (skill.dmgMultiplier) {
        const estimatedDmg = Math.floor(unit.attack * skill.dmgMultiplier);
        if (estimatedDmg >= target.hp) score += 20; // likely kill
      }

      // Rear attack bonus
      const facingMult = facingDefenseMultiplier(unit, target);
      if (facingMult > 1) score += 6;

      actions.push({ kind: 'skill', targetId: target.id, skill, score });
    }
  }

  // Skip action (fallback)
  actions.push({ kind: 'skip', score: 0 });

  return actions;
}

// ── Main AI decision function ─────────────────────────────────────────────────

/**
 * Compute the best move + action for an AI-controlled unit.
 *
 * @returns AIDecision with the chosen move tile/path and action.
 *          move is null if the unit has already moved or is frozen/stunned.
 */
export function computeAIDecision(
  unit: TacticalUnit,
  allUnits: TacticalUnit[],
  gridW: number,
  gridH: number,
  obstacles: Set<string>,
  visionBlockers: Set<string>,
  equippedSkills: Record<string, Record<SkillSlot, string>>,
  skillCooldowns: Record<string, Record<string, number>>,
  difficulty: AIDifficulty = 'normal',
): AIDecision {
  const enemies = allUnits.filter(u => u.isPlayerControlled && u.hp > 0);
  const allies  = allUnits.filter(u => !u.isPlayerControlled && u.hp > 0);

  // ── Move phase ────────────────────────────────────────────────────────────
  let moveDecision: AIMove | null = null;

  if (!unit.hasMoved && enemies.length > 0) {
    const effectiveMove = unit.statusEffects.includes('frozen') ? 1 : unit.move;

    // Build occupied grid
    const occupiedGrid: (string | null)[][] = Array(gridW).fill(null).map(() => Array(gridH).fill(null));
    allUnits.forEach(u => {
      if (u.hp > 0) occupiedGrid[u.position.x][u.position.y] = u.id;
    });

    const reachable = getReachableTiles(unit.position, effectiveMove, gridW, gridH, obstacles, occupiedGrid);
    const scored = scoreMoveOptions(unit, reachable, enemies, allies, obstacles, difficulty);
    const filtered = scored.filter(s => s.score > -100);

    if (filtered.length > 0) {
      const chosen = pickByDifficulty(filtered, difficulty);
      const occupied = new Set<string>();
      allUnits.forEach(u => {
        if (u.hp > 0 && u.id !== unit.id) occupied.add(`${u.position.x},${u.position.y}`);
      });
      const path = bfsPath(unit.position, chosen.tile, gridW, gridH, occupied, obstacles);
      const facing = calcFacing(unit.position, chosen.tile);

      moveDecision = {
        targetTile: chosen.tile,
        path,
        facing,
        score: chosen.score,
      };
    }
  }

  // ── Action phase ──────────────────────────────────────────────────────────
  // Use the position after move (if moving)
  const posAfterMove = moveDecision?.targetTile ?? unit.position;
  const unitAfterMove = { ...unit, position: posAfterMove };

  const actionOptions = scoreActions(
    unitAfterMove, enemies, equippedSkills, skillCooldowns, obstacles, visionBlockers, difficulty,
  );

  const action = pickByDifficulty(actionOptions, difficulty);

  return { move: moveDecision, action };
}
