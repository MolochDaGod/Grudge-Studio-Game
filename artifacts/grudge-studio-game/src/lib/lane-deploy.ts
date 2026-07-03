/**
 * Lane deployment — pre-battle hero placement, march paths, and back-tower command post.
 */
import type { LevelDef } from './levels';

export type LaneId = 'top' | 'mid' | 'bot';

export interface GridPos {
  x: number;
  y: number;
}

export interface LaneDefinition {
  id: LaneId;
  label: string;
  yMin: number;
  yMax: number;
  color: string;
  /** Valid player deploy tiles in this lane */
  deploySlots: GridPos[];
  /** March waypoints from spawn toward mid-map (shown on screen before battle) */
  marchPath: GridPos[];
}

export interface BackTowerZone {
  x: number;
  y: number;
  radius: number;
  label: string;
}

export interface BuildPlacement {
  id: string;
  catalogId: string;
  x: number;
  y: number;
  rotY?: number;
}

export interface DeployAssignment {
  characterId: string;
  laneId: LaneId;
  spawn: GridPos;
  /** How far along marchPath the hero advances at battle start (0 = spawn only) */
  pathStopIndex: number;
}

export interface DeployPlan {
  assignments: DeployAssignment[];
  builds: BuildPlacement[];
}

const LANE_COLORS: Record<LaneId, string> = {
  top: '#f59e0b',
  mid: '#22c55e',
  bot: '#3b82f6',
};

function tileKey(x: number, y: number) {
  return `${x},${y}`;
}

function isWalkable(level: LevelDef, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= level.gridW || y >= level.gridH) return false;
  return !level.obstacleTiles.has(tileKey(x, y));
}

/** Ruins map has explicit lane dividers at y=10 and y=29 */
function ruinsLanes(level: LevelDef): LaneDefinition[] {
  const sp = level.playerSpawn;
  const midX = Math.floor(level.gridW / 2);
  const makeLane = (id: LaneId, yMin: number, yMax: number, rowYs: number[]): LaneDefinition => {
    const deploySlots: GridPos[] = [];
    for (const y of rowYs) {
      for (let x = sp.xMin; x <= sp.xMax; x++) {
        if (isWalkable(level, x, y)) deploySlots.push({ x, y });
      }
    }
    const marchPath: GridPos[] = [];
    const pathY = rowYs[Math.floor(rowYs.length / 2)] ?? Math.floor((yMin + yMax) / 2);
    for (let x = sp.xMax + 1; x <= midX; x += 2) {
      if (isWalkable(level, x, pathY)) marchPath.push({ x, y: pathY });
    }
    return {
      id,
      label: id === 'top' ? 'North Lane' : id === 'mid' ? 'Center Lane' : 'South Lane',
      yMin,
      yMax,
      color: LANE_COLORS[id],
      deploySlots,
      marchPath,
    };
  };
  return [
    makeLane('top', 2, 9, [4, 6, 8]),
    makeLane('mid', 12, 27, [16, 20, 24]),
    makeLane('bot', 31, 38, [33, 35, 37]),
  ];
}

/** Generic: split player spawn rect into three horizontal lanes */
function genericLanes(level: LevelDef): LaneDefinition[] {
  const sp = level.playerSpawn;
  const h = sp.yMax - sp.yMin + 1;
  const third = Math.max(1, Math.floor(h / 3));
  const midX = Math.floor(level.gridW / 2);
  const playerOnWest = sp.xMax < level.gridW / 2;

  const makeLane = (id: LaneId, yMin: number, yMax: number): LaneDefinition => {
    const deploySlots: GridPos[] = [];
    const pathY = Math.floor((yMin + yMax) / 2);
    for (let y = yMin; y <= yMax; y++) {
      for (let x = sp.xMin; x <= sp.xMax; x++) {
        if (isWalkable(level, x, y)) deploySlots.push({ x, y });
      }
    }
    const marchPath: GridPos[] = [];
    if (playerOnWest) {
      for (let x = sp.xMax + 1; x <= midX; x += 2) {
        if (isWalkable(level, x, pathY)) marchPath.push({ x, y: pathY });
      }
    } else {
      for (let x = sp.xMin - 1; x >= midX; x -= 2) {
        if (isWalkable(level, x, pathY)) marchPath.push({ x, y: pathY });
      }
    }
    return {
      id,
      label: id === 'top' ? 'North Lane' : id === 'mid' ? 'Center Lane' : 'South Lane',
      yMin,
      yMax,
      color: LANE_COLORS[id],
      deploySlots,
      marchPath,
    };
  };

  return [
    makeLane('top', sp.yMin, sp.yMin + third - 1),
    makeLane('mid', sp.yMin + third, sp.yMin + 2 * third - 1),
    makeLane('bot', sp.yMin + 2 * third, sp.yMax),
  ];
}

export function getLanesForLevel(level: LevelDef): LaneDefinition[] {
  if (level.id === 'ruins') return ruinsLanes(level);
  return genericLanes(level);
}

export function getBackTowerZone(level: LevelDef): BackTowerZone {
  const sp = level.playerSpawn;
  const midY = Math.floor((sp.yMin + sp.yMax) / 2);
  const onWest = sp.xMax < level.gridW / 2;
  return {
    x: onWest ? sp.xMin : sp.xMax,
    y: midY,
    radius: 2.5,
    label: 'Command Tower',
  };
}

export function isNearBackTower(
  level: LevelDef,
  pos: GridPos,
): boolean {
  const tower = getBackTowerZone(level);
  const dx = pos.x - tower.x;
  const dy = pos.y - tower.y;
  return Math.sqrt(dx * dx + dy * dy) <= tower.radius;
}

export function defaultDeployPlan(
  level: LevelDef,
  characterIds: string[],
): DeployPlan {
  const lanes = getLanesForLevel(level);
  const laneOrder: LaneId[] = ['top', 'mid', 'bot'];
  const assignments: DeployAssignment[] = characterIds.map((characterId, i) => {
    const laneId = laneOrder[i % laneOrder.length];
    const lane = lanes.find((l) => l.id === laneId) ?? lanes[1];
    const spawn = lane.deploySlots[i % lane.deploySlots.length] ?? lane.deploySlots[0] ?? { x: level.playerSpawn.xMin, y: level.playerSpawn.yMin };
    const pathStopIndex = Math.min(2, Math.max(0, lane.marchPath.length - 1));
    return { characterId, laneId, spawn, pathStopIndex };
  });
  return { assignments, builds: [] };
}

export function applyDeployPlanToPositions(
  plan: DeployPlan,
  level: LevelDef,
): Record<string, GridPos> {
  const lanes = getLanesForLevel(level);
  const out: Record<string, GridPos> = {};
  for (const a of plan.assignments) {
    const lane = lanes.find((l) => l.id === a.laneId);
    let pos = { ...a.spawn };
    if (lane && lane.marchPath.length > 0 && a.pathStopIndex > 0) {
      const idx = Math.min(a.pathStopIndex, lane.marchPath.length - 1);
      pos = { ...lane.marchPath[idx] };
    }
    out[a.characterId] = pos;
  }
  return out;
}

export function getLaneHighlightTiles(lanes: LaneDefinition[]): GridPos[] {
  const seen = new Set<string>();
  const tiles: GridPos[] = [];
  for (const lane of lanes) {
    for (const t of [...lane.deploySlots, ...lane.marchPath]) {
      const k = tileKey(t.x, t.y);
      if (!seen.has(k)) {
        seen.add(k);
        tiles.push(t);
      }
    }
  }
  return tiles;
}