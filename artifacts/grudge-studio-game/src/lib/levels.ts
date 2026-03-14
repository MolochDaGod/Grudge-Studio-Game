export type FacingDir = 0 | 1 | 2 | 3; // N=0, E=1, S=2, W=3

export interface PropPlacement {
  modelUrl: string;
  x: number; // world X
  z: number; // world Z
  rotY: number; // Y rotation in radians
  scale: number;
  /** Tiles blocked by this prop (relative to prop grid position) */
  blockedTiles?: Array<[number, number]>;
}

export interface LevelDef {
  id: string;
  name: string;
  description: string;
  theme: 'ruins' | 'orc' | 'elven' | 'medieval';
  gridW: number;
  gridH: number;
  tileSize: number;
  /** Sky/background hex */
  skyColor: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  /** Tiles that cannot be entered */
  obstacleTiles: Set<string>;
  /** Tiles that block line of sight */
  visionBlockers: Set<string>;
  /** Props to place in scene */
  props: PropPlacement[];
  /** Player spawn zone */
  playerSpawn: { xMin: number; xMax: number; yMin: number; yMax: number };
  /** Enemy spawn zone */
  enemySpawn: { xMin: number; xMax: number; yMin: number; yMax: number };
  /** Ground color */
  groundColor: string;
  groundColor2: string;
}

const BASE = import.meta.env.BASE_URL;
const MAPS = `${BASE}models/maps`;

function key(x: number, y: number) { return `${x},${y}`; }

// ============================================================
// LEVEL 1 — Ruins of the Fallen (80x80)
// ============================================================
function makeRuinsLevel(): LevelDef {
  const G = 80, TS = 1.5;
  const obs = new Set<string>();
  const vis = new Set<string>();

  // Scattered ruin clusters
  const clusters = [
    [10, 10], [15, 12], [10, 15],
    [25, 20], [28, 22], [25, 25],
    [38, 10], [40, 14],
    [35, 35], [38, 38], [40, 36],
    [50, 20], [52, 23],
    [55, 50], [57, 52], [60, 50],
    [20, 55], [22, 58],
    [65, 15], [68, 18],
    [65, 65], [68, 68],
    [30, 65], [33, 68],
  ];

  for (const [cx, cy] of clusters) {
    // 3x3 cluster of obstacles
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const x = cx + dx, y = cy + dy;
        if (x > 0 && x < G - 1 && y > 0 && y < G - 1 && Math.random() > 0.35) {
          obs.add(key(x, y));
          vis.add(key(x, y));
        }
      }
    }
  }

  const props: PropPlacement[] = [
    { modelUrl: `${MAPS}/ruins/_ruin_1.glb`,  x: 14 * TS, z: 11 * TS, rotY: 0,               scale: 0.012 },
    { modelUrl: `${MAPS}/ruins/_ruin_14.glb`, x: 26 * TS, z: 22 * TS, rotY: Math.PI / 3,      scale: 0.013, blockedTiles: [[-1,0],[0,0],[1,0],[-1,1],[0,1],[1,1]] },
    { modelUrl: `${MAPS}/ruins/_ruin_15.glb`, x: 38 * TS, z: 36 * TS, rotY: Math.PI / 4,      scale: 0.013, blockedTiles: [[-1,-1],[0,-1],[1,-1],[0,0],[0,1]] },
    { modelUrl: `${MAPS}/ruins/_ruin_2.glb`,  x: 54 * TS, z: 21 * TS, rotY: -Math.PI / 4,     scale: 0.011 },
    { modelUrl: `${MAPS}/ruins/_ruin_3.glb`,  x: 57 * TS, z: 51 * TS, rotY: Math.PI / 6,      scale: 0.012 },
    { modelUrl: `${MAPS}/ruins/_ruin_5.glb`,  x: 21 * TS, z: 56 * TS, rotY: Math.PI,          scale: 0.012 },
    { modelUrl: `${MAPS}/ruins/_ruin_7.glb`,  x: 66 * TS, z: 16 * TS, rotY: Math.PI / 2,      scale: 0.012 },
    { modelUrl: `${MAPS}/ruins/_ruin_7.glb`,  x: 31 * TS, z: 66 * TS, rotY: -Math.PI / 3,     scale: 0.012 },
    { modelUrl: `${MAPS}/ruins/_ruin_14.glb`, x: 66 * TS, z: 66 * TS, rotY: Math.PI * 0.75,   scale: 0.013, blockedTiles: [[-1,0],[0,0],[1,0]] },
  ];

  return {
    id: 'ruins', name: 'Ruins of the Fallen', theme: 'ruins',
    description: 'Ancient burial grounds where warriors clash among crumbling tombstones.',
    gridW: G, gridH: G, tileSize: TS,
    skyColor: '#2d4a1e', fogColor: '#3a5a28', fogNear: 60, fogFar: 300,
    obstacleTiles: obs, visionBlockers: vis,
    props,
    playerSpawn: { xMin: 2, xMax: 6, yMin: 30, yMax: 50 },
    enemySpawn:  { xMin: 74, xMax: 78, yMin: 30, yMax: 50 },
    groundColor:  '#2a3820', groundColor2: '#334422',
  };
}

// ============================================================
// LEVEL 2 — Orc Stronghold (100x100)
// ============================================================
function makeOrcLevel(): LevelDef {
  const G = 100, TS = 1.5;
  const obs = new Set<string>();
  const vis = new Set<string>();

  // Outer perimeter walls (ring ~10 tiles from edge)
  const RING = 15;
  const addWall = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.max(Math.abs(dx), Math.abs(dy));
    for (let i = 0; i <= len; i++) {
      const x = Math.round(x1 + (dx / len) * i);
      const y = Math.round(y1 + (dy / len) * i);
      obs.add(key(x, y));
      vis.add(key(x, y));
    }
  };

  // Ring outer walls with gaps (gates) at E and W
  for (let x = RING; x <= G - RING; x++) {
    if (x < 45 || x > 55) { // Gap in N wall (gate at center)
      obs.add(key(x, RING)); vis.add(key(x, RING));
    }
    if (x < 45 || x > 55) { // Gap in S wall
      obs.add(key(x, G - RING)); vis.add(key(x, G - RING));
    }
  }
  for (let y = RING; y <= G - RING; y++) {
    if (y < 45 || y > 55) { // Gap in W wall
      obs.add(key(RING, y)); vis.add(key(RING, y));
    }
    if (y < 45 || y > 55) { // Gap in E wall
      obs.add(key(G - RING, y)); vis.add(key(G - RING, y));
    }
  }

  // Inner ring around center fortress
  const INNER = 35;
  const INNER2 = G - INNER;
  for (let x = INNER; x <= INNER2; x++) {
    if (x < 47 || x > 53) { obs.add(key(x, INNER)); vis.add(key(x, INNER)); }
    if (x < 47 || x > 53) { obs.add(key(x, INNER2)); vis.add(key(x, INNER2)); }
  }
  for (let y = INNER; y <= INNER2; y++) {
    if (y < 47 || y > 53) { obs.add(key(INNER, y)); vis.add(key(INNER, y)); }
    if (y < 47 || y > 53) { obs.add(key(INNER2, y)); vis.add(key(INNER2, y)); }
  }

  // Corner towers
  const corners = [[RING, RING], [G-RING, RING], [RING, G-RING], [G-RING, G-RING]];
  for (const [cx, cy] of corners) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        obs.add(key(cx + dx, cy + dy)); vis.add(key(cx + dx, cy + dy));
      }
    }
  }

  const props: PropPlacement[] = [
    { modelUrl: `${MAPS}/orc/fortress_full.glb`,  x: 50 * TS, z: 50 * TS, rotY: 0,           scale: 0.012, blockedTiles: Array.from({length:6}, (_,i) => [i-3, 0] as [number,number]) },
    { modelUrl: `${MAPS}/orc/tower_3_full.glb`,   x: RING * TS, z: RING * TS, rotY: 0,         scale: 0.010 },
    { modelUrl: `${MAPS}/orc/tower_4_full.glb`,   x: (G-RING)*TS, z: RING*TS, rotY: Math.PI/2, scale: 0.010 },
    { modelUrl: `${MAPS}/orc/tower_3_full.glb`,   x: RING*TS, z: (G-RING)*TS, rotY: Math.PI,   scale: 0.010 },
    { modelUrl: `${MAPS}/orc/tower_4_full.glb`,   x: (G-RING)*TS, z: (G-RING)*TS, rotY: -Math.PI/2, scale: 0.010 },
    { modelUrl: `${MAPS}/orc/wall_1_full.glb`,    x: 50 * TS, z: RING * TS, rotY: 0,           scale: 0.010 },
    { modelUrl: `${MAPS}/orc/wall_1_full.glb`,    x: 50 * TS, z: (G-RING)*TS, rotY: Math.PI,   scale: 0.010 },
    { modelUrl: `${MAPS}/orc/bridge_full.glb`,    x: RING * TS, z: 50 * TS, rotY: Math.PI/2,   scale: 0.010 },
    { modelUrl: `${MAPS}/orc/bridge_full.glb`,    x: (G-RING)*TS, z: 50 * TS, rotY: -Math.PI/2, scale: 0.010 },
  ];

  return {
    id: 'orc', name: 'Orc Stronghold', theme: 'orc',
    description: 'A brutal orc fortress where only the cunning survive the siege.',
    gridW: G, gridH: G, tileSize: TS,
    skyColor: '#3d1a05', fogColor: '#5c2a10', fogNear: 80, fogFar: 400,
    obstacleTiles: obs, visionBlockers: vis,
    props,
    playerSpawn: { xMin: 2, xMax: 8, yMin: 40, yMax: 60 },
    enemySpawn:  { xMin: 92, xMax: 98, yMin: 40, yMax: 60 },
    groundColor:  '#5c3a1a', groundColor2: '#4a2e10',
  };
}

// ============================================================
// LEVEL 3 — Elven Citadel (120x120)
// ============================================================
function makeElvenLevel(): LevelDef {
  const G = 120, TS = 1.5;
  const obs = new Set<string>();
  const vis = new Set<string>();

  const addWall = (x1: number, y1: number, x2: number, y2: number, gap?: [number, number, number, number]) => {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.max(Math.abs(dx), Math.abs(dy));
    for (let i = 0; i <= len; i++) {
      const x = Math.round(x1 + (dx / len) * i);
      const y = Math.round(y1 + (dy / len) * i);
      if (gap) {
        const [gx1, gy1, gx2, gy2] = gap;
        if (x >= gx1 && x <= gx2 && y >= gy1 && y <= gy2) continue;
      }
      obs.add(key(x, y)); vis.add(key(x, y));
    }
  };

  // Outer walls (20 tiles in)
  const O = 18;
  addWall(O, O, G-O, O, [55, O, 65, O]);    // N with gate
  addWall(O, G-O, G-O, G-O, [55, G-O, 65, G-O]); // S with gate
  addWall(O, O, O, G-O, [O, 55, O, 65]);    // W with gate
  addWall(G-O, O, G-O, G-O, [G-O, 55, G-O, 65]); // E with gate

  // Inner citadel walls
  const I = 40;
  addWall(I, I, G-I, I, [57, I, 63, I]);
  addWall(I, G-I, G-I, G-I, [57, G-I, 63, G-I]);
  addWall(I, I, I, G-I, [I, 57, I, 63]);
  addWall(G-I, I, G-I, G-I, [G-I, 57, G-I, 63]);

  // Tree groves (scattered 3x3 impassable clumps)
  const groves = [[8,8],[8,G-10],[G-10,8],[G-10,G-10],[30,30],[30,G-32],[G-32,30],[G-32,G-32]];
  for (const [gx, gy] of groves) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        obs.add(key(gx+dx, gy+dy)); vis.add(key(gx+dx, gy+dy));
      }
    }
  }

  // Corner towers for outer wall
  const outerCorners = [[O, O], [G-O, O], [O, G-O], [G-O, G-O]];
  for (const [cx, cy] of outerCorners) {
    for (let dx = -3; dx <= 3; dx++)
      for (let dy = -3; dy <= 3; dy++) {
        obs.add(key(cx+dx, cy+dy)); vis.add(key(cx+dx, cy+dy));
      }
  }

  const props: PropPlacement[] = [
    { modelUrl: `${MAPS}/elven/fortress_full.glb`,  x: 60*TS, z: 60*TS, rotY: 0,             scale: 0.012 },
    { modelUrl: `${MAPS}/elven/tower_3_full.glb`,   x: O*TS,  z: O*TS,  rotY: 0,             scale: 0.011 },
    { modelUrl: `${MAPS}/elven/tower_4_full.glb`,   x: (G-O)*TS, z: O*TS, rotY: Math.PI/2,   scale: 0.011 },
    { modelUrl: `${MAPS}/elven/tower_3_full.glb`,   x: O*TS, z: (G-O)*TS, rotY: Math.PI,     scale: 0.011 },
    { modelUrl: `${MAPS}/elven/tower_4_full.glb`,   x: (G-O)*TS, z: (G-O)*TS, rotY: -Math.PI/2, scale: 0.011 },
    { modelUrl: `${MAPS}/elven/wall_1_full.glb`,    x: 60*TS, z: O*TS,  rotY: 0,             scale: 0.010 },
    { modelUrl: `${MAPS}/elven/wall_1_full.glb`,    x: 60*TS, z: (G-O)*TS, rotY: Math.PI,    scale: 0.010 },
    { modelUrl: `${MAPS}/elven/bridge_full.glb`,    x: O*TS,  z: 60*TS, rotY: Math.PI/2,     scale: 0.010 },
    { modelUrl: `${MAPS}/elven/bridge_full.glb`,    x: (G-O)*TS, z: 60*TS, rotY: -Math.PI/2, scale: 0.010 },
  ];

  return {
    id: 'elven', name: 'Elven Citadel', theme: 'elven',
    description: 'The ancient citadel of the elves, defended by silver walls and ancient groves.',
    gridW: G, gridH: G, tileSize: TS,
    skyColor: '#0d2b1e', fogColor: '#1a4030', fogNear: 100, fogFar: 500,
    obstacleTiles: obs, visionBlockers: vis,
    props,
    playerSpawn: { xMin: 2, xMax: 10, yMin: 50, yMax: 70 },
    enemySpawn:  { xMin: 110, xMax: 118, yMin: 50, yMax: 70 },
    groundColor:  '#1a3320', groundColor2: '#224428',
  };
}

// ============================================================
// LEVEL 4 — Medieval Fortress (140x140)
// ============================================================
function makeMedievalLevel(): LevelDef {
  const G = 140, TS = 1.5;
  const obs = new Set<string>();
  const vis = new Set<string>();

  const addWallSeg = (x1: number, y1: number, x2: number, y2: number, gapStart?: number, gapEnd?: number, axis?: 'x' | 'y') => {
    const isHoriz = y1 === y2;
    const isVert  = x1 === x2;
    if (isHoriz) {
      for (let x = Math.min(x1,x2); x <= Math.max(x1,x2); x++) {
        if (axis==='x' && gapStart !== undefined && x >= gapStart && x <= (gapEnd??gapStart)) continue;
        obs.add(key(x, y1)); vis.add(key(x, y1));
      }
    } else if (isVert) {
      for (let y = Math.min(y1,y2); y <= Math.max(y1,y2); y++) {
        if (axis==='y' && gapStart !== undefined && y >= gapStart && y <= (gapEnd??gapStart)) continue;
        obs.add(key(x1, y)); vis.add(key(x1, y));
      }
    }
  };

  const ct = 70; // center

  // Outer curtain wall (25 in from edge), gate S center
  const O = 22;
  addWallSeg(O, O, G-O, O, 66, 74, 'x');        // N
  addWallSeg(O, G-O, G-O, G-O, 66, 74, 'x');    // S
  addWallSeg(O, O, O, G-O, 66, 74, 'y');        // W
  addWallSeg(G-O, O, G-O, G-O, 66, 74, 'y');    // E

  // Inner walls
  const I = 45;
  addWallSeg(I, I, G-I, I, 66, 74, 'x');
  addWallSeg(I, G-I, G-I, G-I, 66, 74, 'x');
  addWallSeg(I, I, I, G-I, 66, 74, 'y');
  addWallSeg(G-I, I, G-I, G-I, 66, 74, 'y');

  // Keep wall (innermost)
  const K = 60;
  addWallSeg(K, K, G-K, K, ct-2, ct+2, 'x');
  addWallSeg(K, G-K, G-K, G-K, ct-2, ct+2, 'x');
  addWallSeg(K, K, K, G-K, ct-2, ct+2, 'y');
  addWallSeg(G-K, K, G-K, G-K, ct-2, ct+2, 'y');

  // Towers at outer corners
  for (const [cx, cy] of [[O,O],[G-O,O],[O,G-O],[G-O,G-O]]) {
    for (let dx = -3; dx <= 3; dx++)
      for (let dy = -3; dy <= 3; dy++) {
        obs.add(key(cx+dx, cy+dy)); vis.add(key(cx+dx, cy+dy));
      }
  }
  // Towers at inner corners
  for (const [cx, cy] of [[I,I],[G-I,I],[I,G-I],[G-I,G-I]]) {
    for (let dx = -2; dx <= 2; dx++)
      for (let dy = -2; dy <= 2; dy++) {
        obs.add(key(cx+dx, cy+dy)); vis.add(key(cx+dx, cy+dy));
      }
  }

  // Scattered buildings between walls
  const buildings = [[30,30],[30,G-32],[G-32,30],[G-32,G-32],[55,30],[55,G-32]];
  for (const [bx, by] of buildings) {
    for (let dx = -2; dx <= 3; dx++)
      for (let dy = -2; dy <= 3; dy++) {
        obs.add(key(bx+dx, by+dy)); vis.add(key(bx+dx, by+dy));
      }
  }

  const props: PropPlacement[] = [
    { modelUrl: `${MAPS}/medieval/_fortress_full.glb`,    x: ct*TS, z: ct*TS,   rotY: 0,             scale: 0.012 },
    { modelUrl: `${MAPS}/medieval/_tower_01.glb`,         x: O*TS,  z: O*TS,    rotY: 0,             scale: 0.011 },
    { modelUrl: `${MAPS}/medieval/_tower_02_1.glb`,       x: (G-O)*TS, z: O*TS, rotY: Math.PI/2,     scale: 0.011 },
    { modelUrl: `${MAPS}/medieval/_tower_01.glb`,         x: O*TS,  z: (G-O)*TS, rotY: Math.PI,      scale: 0.011 },
    { modelUrl: `${MAPS}/medieval/_tower_02_1.glb`,       x: (G-O)*TS, z: (G-O)*TS, rotY: -Math.PI/2, scale: 0.011 },
    { modelUrl: `${MAPS}/medieval/_tower_03_1_full.glb`,  x: I*TS,  z: I*TS,    rotY: 0,             scale: 0.010 },
    { modelUrl: `${MAPS}/medieval/_tower_03_1_full.glb`,  x: (G-I)*TS, z: I*TS, rotY: Math.PI/2,     scale: 0.010 },
    { modelUrl: `${MAPS}/medieval/_tower_03_1_full.glb`,  x: I*TS,  z: (G-I)*TS, rotY: Math.PI,      scale: 0.010 },
    { modelUrl: `${MAPS}/medieval/_tower_03_1_full.glb`,  x: (G-I)*TS, z: (G-I)*TS, rotY: -Math.PI/2, scale: 0.010 },
    { modelUrl: `${MAPS}/medieval/_wall_01_full.glb`,     x: ct*TS, z: O*TS,    rotY: 0,             scale: 0.010 },
    { modelUrl: `${MAPS}/medieval/_wall_01_full.glb`,     x: ct*TS, z: (G-O)*TS, rotY: Math.PI,      scale: 0.010 },
    { modelUrl: `${MAPS}/medieval/_barracks.glb`,         x: 30*TS, z: 30*TS,   rotY: 0,             scale: 0.011 },
    { modelUrl: `${MAPS}/medieval/_barracks.glb`,         x: (G-32)*TS, z: 30*TS, rotY: Math.PI/2,   scale: 0.011 },
  ];

  return {
    id: 'medieval', name: 'Medieval Fortress', theme: 'medieval',
    description: 'Storm the ramparts of an impenetrable stone fortress.',
    gridW: G, gridH: G, tileSize: TS,
    skyColor: '#1a2535', fogColor: '#2a3548', fogNear: 120, fogFar: 600,
    obstacleTiles: obs, visionBlockers: vis,
    props,
    playerSpawn: { xMin: 2, xMax: 12, yMin: 55, yMax: 85 },
    enemySpawn:  { xMin: 128, xMax: 138, yMin: 55, yMax: 85 },
    groundColor:  '#3a3a30', groundColor2: '#2a2a20',
  };
}

// Build once on module load
export const LEVELS: LevelDef[] = [
  makeRuinsLevel(),
  makeOrcLevel(),
  makeElvenLevel(),
  makeMedievalLevel(),
];

export function getLevelById(id: string): LevelDef {
  return LEVELS.find(l => l.id === id) ?? LEVELS[0];
}

// ============================================================
// Line-of-sight check (Bresenham)
// ============================================================
export function hasLineOfSight(
  from: { x: number; y: number },
  to: { x: number; y: number },
  visionBlockers: Set<string>,
): boolean {
  let x0 = from.x, y0 = from.y;
  const x1 = to.x, y1 = to.y;
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    if (x0 === x1 && y0 === y1) return true;
    if (visionBlockers.has(key(x0, y0))) return false;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx)  { err += dx; y0 += sy; }
  }
}
