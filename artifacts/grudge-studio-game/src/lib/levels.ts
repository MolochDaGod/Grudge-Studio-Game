export type FacingDir = 0 | 1 | 2 | 3; // N=0, E=1, S=2, W=3

export interface PropPlacement {
  modelUrl: string;
  x: number;
  z: number;
  rotY: number;
  scale: number;
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
  skyColor: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  obstacleTiles: Set<string>;
  visionBlockers: Set<string>;
  props: PropPlacement[];
  playerSpawn: { xMin: number; xMax: number; yMin: number; yMax: number };
  enemySpawn:  { xMin: number; xMax: number; yMin: number; yMax: number };
  groundColor:  string;
  groundColor2: string;
}

declare const import_meta_env: { BASE_URL: string };
const BASE = import.meta.env.BASE_URL;
const M = (theme: string, file: string) => `${BASE}models/maps/${theme}/${file}`;

function K(x: number, y: number) { return `${x},${y}`; }

function blockRect(
  obs: Set<string>, vis: Set<string>,
  x0: number, y0: number, x1: number, y1: number,
  doorways?: Array<[number,number]>,
) {
  const dset = new Set<string>(doorways?.map(([a,b]) => K(a,b)) ?? []);
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      if (!dset.has(K(x,y))) { obs.add(K(x,y)); vis.add(K(x,y)); }
    }
  }
}

function blockLine(
  obs: Set<string>, vis: Set<string>,
  x0: number, y0: number, x1: number, y1: number,
  thickness = 1,
  gapFrom?: number, gapTo?: number,
) {
  if (y0 === y1) {
    for (let x = Math.min(x0,x1); x <= Math.max(x0,x1); x++) {
      if (gapFrom !== undefined && x >= gapFrom && x <= (gapTo ?? gapFrom)) continue;
      for (let t = 0; t < thickness; t++) {
        obs.add(K(x, y0+t)); vis.add(K(x, y0+t));
      }
    }
  } else if (x0 === x1) {
    for (let y = Math.min(y0,y1); y <= Math.max(y0,y1); y++) {
      if (gapFrom !== undefined && y >= gapFrom && y <= (gapTo ?? gapFrom)) continue;
      for (let t = 0; t < thickness; t++) {
        obs.add(K(x0+t, y)); vis.add(K(x0+t, y));
      }
    }
  }
}

function blockDot(obs: Set<string>, vis: Set<string>, cx: number, cy: number, r: number) {
  for (let dx = -r; dx <= r; dx++)
    for (let dy = -r; dy <= r; dy++) {
      if (dx*dx + dy*dy <= r*r + 0.5) { obs.add(K(cx+dx, cy+dy)); vis.add(K(cx+dy, cy+dx)); }
    }
}

function pw(tx: number, tz: number, ts: number) { return { x: tx * ts, z: tz * ts }; }

// ============================================================
// LEVEL 1 — Graveyard Ruins (80×80)
// ============================================================
function makeRuinsLevel(): LevelDef {
  const G = 80, TS = 1.5;
  const obs = new Set<string>(), vis = new Set<string>();

  // --- Gravestone/tombstone clusters (each 2-4 tiles) ---
  const clusters: Array<[number, number]> = [
    [8,6],[9,7],[11,6],[12,8],            // NW cluster
    [18,5],[20,7],[22,6],[19,9],           // N-NW cluster
    [36,5],[38,7],[40,6],[37,9],[39,11],   // N-center cluster
    [54,5],[56,7],[58,6],[55,9],           // N-NE cluster
    [67,6],[69,8],[71,7],[70,5],           // NE cluster
    [6,18],[8,20],[7,22],[9,19],           // W-N cluster
    [6,38],[8,40],[7,42],[9,39],           // W-center cluster
    [6,56],[8,58],[7,60],[9,57],           // W-S cluster
    [6,67],[8,69],[7,71],[9,68],           // SW cluster
    [71,17],[73,19],[72,21],[74,18],       // E-N cluster
    [72,38],[74,40],[73,42],[75,39],       // E-center cluster
    [71,56],[73,58],[72,60],[74,57],       // E-S cluster
    [71,68],[73,70],[72,72],[74,69],       // SE cluster
    [22,67],[24,69],[23,71],[25,68],       // S-SW cluster
    [36,68],[38,70],[40,69],[37,72],[39,73],// S-center cluster
    [54,67],[56,69],[55,71],[57,68],       // S-SE cluster
    // Interior scattered ruins
    [18,22],[20,24],[19,26],
    [27,34],[29,36],[28,38],
    [42,18],[44,20],[43,22],[45,19],
    [55,25],[57,27],[56,29],[58,26],
    [22,45],[24,47],[23,49],
    [60,45],[62,47],[61,49],
    [35,57],[37,59],[36,61],[38,58],
    [50,56],[52,58],[51,60],[53,57],
  ];

  for (const [cx, cy] of clusters) {
    // Each cluster item blocks a ~2×2 area with some randomness
    for (let dx = 0; dx <= 1; dx++) for (let dy = 0; dy <= 1; dy++) {
      const x = cx + dx, y = cy + dy;
      if (x > 0 && x < G-1 && y > 0 && y < G-1) {
        obs.add(K(x, y)); vis.add(K(x, y));
      }
    }
  }

  // Broken wall lines (2-tile thick)
  blockLine(obs, vis, 14, 30, 14, 46, 2, 37, 39);   // W interior wall, gate at y=37-39
  blockLine(obs, vis, 62, 32, 62, 48, 2, 39, 41);   // E interior wall
  blockLine(obs, vis, 30, 14, 46, 14, 2, 37, 39);   // N interior wall
  blockLine(obs, vis, 30, 62, 46, 62, 2, 37, 39);   // S interior wall

  // Large collapsed structure (center-left)
  blockRect(obs, vis, 22, 26, 30, 34, [[26,27],[26,28],[26,29],[26,30]]);
  blockRect(obs, vis, 50, 44, 58, 52, [[54,45],[54,46],[54,47],[54,48]]);

  // Keep spawn zones clear
  for (let x = 2; x <= 10; x++) for (let y = 30; y <= 50; y++) { obs.delete(K(x,y)); vis.delete(K(x,y)); }
  for (let x = 70; x <= 78; x++) for (let y = 30; y <= 50; y++) { obs.delete(K(x,y)); vis.delete(K(x,y)); }

  const ruin = (n: number) => M('ruins', `ruin_${n}.glb`);
  const props: PropPlacement[] = [];
  // Dense prop placement — all 21 ruin types used multiple times
  const ruinDefs: Array<[number, number, number, number, number]> = [
    // tx, tz, rotY*PI, scale, ruin#
    [8, 6, 0, 0.011, 1],   [10, 7, 0.5, 0.012, 2],  [12, 6, 1, 0.010, 3],
    [9, 9, 1.5, 0.011, 4], [19, 5, 0, 0.012, 5],    [21, 7, 0.33, 0.011, 6],
    [37, 5, 0.66, 0.012, 7],[39, 7, 1, 0.010, 8],   [55, 5, 0, 0.011, 9],
    [57, 7, 0.5, 0.012, 10],[68, 6, 1, 0.011, 11],  [70, 8, 0, 0.010, 12],
    [7, 19, 0.33, 0.012, 13],[7, 39, 0.66, 0.011, 14],[7, 57, 1, 0.010, 15],
    [7, 68, 0.5, 0.012, 16],[72, 18, 0, 0.011, 17], [73, 39, 1, 0.012, 18],
    [73, 57, 0.33, 0.011, 19],[73, 69, 0.66, 0.010, 20],[23, 68, 0, 0.012, 21],
    // Interior ruins
    [37, 68, 0.5, 0.011, 1], [55, 68, 1, 0.012, 2],  [19, 23, 0, 0.010, 3],
    [28, 35, 0.75, 0.011, 4],[43, 19, 0.25, 0.012, 5],[56, 26, 1.5, 0.011, 6],
    [23, 46, 0, 0.010, 7],  [61, 46, 0.5, 0.012, 8], [36, 58, 0.33, 0.011, 9],
    [51, 57, 1, 0.012, 10], [16, 31, 0, 0.010, 11],  [63, 33, 0.5, 0.011, 12],
    [16, 43, 0.75, 0.012, 13],[63, 43, 0.25, 0.011, 14],
    // Large ruin structures (walls, columns)
    [22, 27, 0, 0.013, 14], [24, 32, 0.5, 0.013, 15],[51, 45, 0.25, 0.013, 16],
    [53, 50, 1, 0.013, 17], [32, 15, 0, 0.012, 18],  [44, 15, 0.5, 0.012, 19],
    [33, 63, 0.75, 0.012, 20],[45, 63, 0.25, 0.012, 21],
  ];

  for (const [tx, tz, rotFrac, sc, n] of ruinDefs) {
    const p = pw(tx, tz, TS);
    props.push({ modelUrl: ruin(n), x: p.x, z: p.z, rotY: rotFrac * Math.PI, scale: sc });
  }

  return {
    id: 'ruins', name: 'Graveyard of the Fallen', theme: 'ruins',
    description: 'Ancient burial grounds where warriors clash among crumbling tombstones.',
    gridW: G, gridH: G, tileSize: TS,
    skyColor: '#1a2a12', fogColor: '#2a3a20', fogNear: 60, fogFar: 280,
    obstacleTiles: obs, visionBlockers: vis,
    props,
    playerSpawn: { xMin: 2, xMax: 8, yMin: 30, yMax: 50 },
    enemySpawn:  { xMin: 72, xMax: 78, yMin: 30, yMax: 50 },
    groundColor: '#242c18', groundColor2: '#2e3a20',
  };
}

// ============================================================
// LEVEL 2 — Orc Stronghold (100×100)
// ============================================================
function makeOrcLevel(): LevelDef {
  const G = 100, TS = 1.5;
  const obs = new Set<string>(), vis = new Set<string>();

  // ── Outer perimeter wall (8 tiles from edge) ──
  const OW = 8;                     // outer wall ring offset
  const GAP = 4;                    // gate gap half-width

  blockLine(obs, vis, OW, OW, G-OW, OW, 2, G/2-GAP, G/2+GAP);   // N outer
  blockLine(obs, vis, OW, G-OW, G-OW, G-OW, 2, G/2-GAP, G/2+GAP); // S outer
  blockLine(obs, vis, OW, OW, OW, G-OW, 2, G/2-GAP, G/2+GAP);   // W outer
  blockLine(obs, vis, G-OW, OW, G-OW, G-OW, 2, G/2-GAP, G/2+GAP); // E outer

  // ── Outer corner towers (5×5 each) ──
  blockDot(obs, vis, OW, OW, 4);
  blockDot(obs, vis, G-OW, OW, 4);
  blockDot(obs, vis, OW, G-OW, 4);
  blockDot(obs, vis, G-OW, G-OW, 4);

  // ── Inner fortress wall (28 tiles from edge) ──
  const IW = 28;
  blockLine(obs, vis, IW, IW, G-IW, IW, 2, G/2-GAP, G/2+GAP);
  blockLine(obs, vis, IW, G-IW, G-IW, G-IW, 2, G/2-GAP, G/2+GAP);
  blockLine(obs, vis, IW, IW, IW, G-IW, 2, G/2-GAP, G/2+GAP);
  blockLine(obs, vis, G-IW, IW, G-IW, G-IW, 2, G/2-GAP, G/2+GAP);

  // ── Inner corner towers (4×4) ──
  blockDot(obs, vis, IW, IW, 3);
  blockDot(obs, vis, G-IW, IW, 3);
  blockDot(obs, vis, IW, G-IW, 3);
  blockDot(obs, vis, G-IW, G-IW, 3);

  // ── Central keep (20×20 block with doorways) ──
  const KS = 38, KE = 62;
  blockLine(obs, vis, KS, KS, KE, KS, 2, G/2-3, G/2+3);  // N keep
  blockLine(obs, vis, KS, KE, KE, KE, 2, G/2-3, G/2+3);  // S keep
  blockLine(obs, vis, KS, KS, KS, KE, 2, G/2-3, G/2+3);  // W keep
  blockLine(obs, vis, KE, KS, KE, KE, 2, G/2-3, G/2+3);  // E keep

  // ── Barracks buildings (inner courtyard) ──
  blockRect(obs, vis, 18, 18, 24, 26, [[21,18],[21,19],[22,18],[22,19]]); // NW barracks
  blockRect(obs, vis, 76, 18, 82, 26, [[79,18],[79,19],[80,18],[80,19]]); // NE barracks
  blockRect(obs, vis, 18, 74, 24, 82, [[21,74],[21,75],[22,74],[22,75]]); // SW barracks
  blockRect(obs, vis, 76, 74, 82, 82, [[79,74],[79,75],[80,74],[80,75]]); // SE barracks

  // ── Arsenal/shed buildings ──
  blockRect(obs, vis, 32, 18, 38, 24);
  blockRect(obs, vis, 62, 18, 68, 24);
  blockRect(obs, vis, 32, 76, 38, 82);
  blockRect(obs, vis, 62, 76, 68, 82);

  // ── Fences along inner courtyard ──
  blockLine(obs, vis, 32, 36, 38, 36, 1);
  blockLine(obs, vis, 62, 36, 68, 36, 1);
  blockLine(obs, vis, 32, 64, 38, 64, 1);
  blockLine(obs, vis, 62, 64, 68, 64, 1);

  // Keep spawn zones clear
  for (let x = IW+3; x <= IW+10; x++) for (let y = G/2-8; y <= G/2+8; y++) { obs.delete(K(x,y)); vis.delete(K(x,y)); }
  for (let x = G-IW-10; x <= G-IW-3; x++) for (let y = G/2-8; y <= G/2+8; y++) { obs.delete(K(x,y)); vis.delete(K(x,y)); }

  const ORC = (f: string) => M('orc', f);
  const props: PropPlacement[] = [
    // Central fortress keep
    { modelUrl: ORC('fortress_full.glb'), x: G/2*TS, z: G/2*TS, rotY: 0, scale: 0.010 },

    // Outer wall towers (corners)
    { modelUrl: ORC('tower_3_full.glb'), x: OW*TS, z: OW*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ORC('tower_4_full.glb'), x: (G-OW)*TS, z: OW*TS, rotY: Math.PI/2, scale: 0.010 },
    { modelUrl: ORC('tower_3_full.glb'), x: OW*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: ORC('tower_4_full.glb'), x: (G-OW)*TS, z: (G-OW)*TS, rotY: -Math.PI/2, scale: 0.010 },

    // Inner wall corner towers
    { modelUrl: ORC('tower_5_full.glb'), x: IW*TS, z: IW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: ORC('tower_5_full.glb'), x: (G-IW)*TS, z: IW*TS, rotY: Math.PI/2, scale: 0.009 },
    { modelUrl: ORC('tower_5_full.glb'), x: IW*TS, z: (G-IW)*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: ORC('tower_5_full.glb'), x: (G-IW)*TS, z: (G-IW)*TS, rotY: -Math.PI/2, scale: 0.009 },

    // Outer wall segments
    { modelUrl: ORC('wall_1_full.glb'), x: G/4*TS, z: OW*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ORC('wall_1_full.glb'), x: 3*G/4*TS, z: OW*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ORC('wall_1_full.glb'), x: G/4*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: ORC('wall_1_full.glb'), x: 3*G/4*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: ORC('wall_2_01.glb'),   x: OW*TS, z: G/4*TS, rotY: Math.PI/2, scale: 0.010 },
    { modelUrl: ORC('wall_2_01.glb'),   x: OW*TS, z: 3*G/4*TS, rotY: Math.PI/2, scale: 0.010 },
    { modelUrl: ORC('wall_2_01.glb'),   x: (G-OW)*TS, z: G/4*TS, rotY: -Math.PI/2, scale: 0.010 },
    { modelUrl: ORC('wall_2_01.glb'),   x: (G-OW)*TS, z: 3*G/4*TS, rotY: -Math.PI/2, scale: 0.010 },

    // Gates on outer wall
    { modelUrl: ORC('minnor_gates_01.glb'), x: G/2*TS, z: OW*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ORC('minnor_gates_02.glb'), x: G/2*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: ORC('minnor_gates_01.glb'), x: OW*TS, z: G/2*TS, rotY: Math.PI/2, scale: 0.010 },
    { modelUrl: ORC('minnor_gates_02.glb'), x: (G-OW)*TS, z: G/2*TS, rotY: -Math.PI/2, scale: 0.010 },

    // Inner wall segments
    { modelUrl: ORC('wall_1_full.glb'), x: (IW+10)*TS, z: IW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: ORC('wall_1_full.glb'), x: (G-IW-10)*TS, z: IW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: ORC('wall_1_full.glb'), x: (IW+10)*TS, z: (G-IW)*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: ORC('wall_1_full.glb'), x: (G-IW-10)*TS, z: (G-IW)*TS, rotY: Math.PI, scale: 0.009 },

    // Barracks (inner courtyard, 4 corners)
    { modelUrl: ORC('barracks.glb'), x: 21*TS, z: 22*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ORC('barracks.glb'), x: 79*TS, z: 22*TS, rotY: Math.PI/2, scale: 0.010 },
    { modelUrl: ORC('barracks.glb'), x: 21*TS, z: 78*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: ORC('barracks.glb'), x: 79*TS, z: 78*TS, rotY: -Math.PI/2, scale: 0.010 },

    // Arsenal buildings
    { modelUrl: ORC('arsenal.glb'), x: 35*TS, z: 21*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ORC('arsenal.glb'), x: 65*TS, z: 21*TS, rotY: Math.PI/2, scale: 0.010 },
    { modelUrl: ORC('arsenal.glb'), x: 35*TS, z: 79*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: ORC('arsenal.glb'), x: 65*TS, z: 79*TS, rotY: -Math.PI/2, scale: 0.010 },

    // Shed (outer courtyard extras)
    { modelUrl: ORC('shed_01.glb'), x: 15*TS, z: 40*TS, rotY: 0, scale: 0.011 },
    { modelUrl: ORC('shed_01.glb'), x: 85*TS, z: 40*TS, rotY: Math.PI, scale: 0.011 },
    { modelUrl: ORC('shed_01.glb'), x: 15*TS, z: 60*TS, rotY: 0, scale: 0.011 },
    { modelUrl: ORC('shed_01.glb'), x: 85*TS, z: 60*TS, rotY: Math.PI, scale: 0.011 },

    // Stairs (for traversal near gates)
    { modelUrl: ORC('stairs_full.glb'), x: G/2*TS+4, z: (IW+3)*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ORC('stairs_full.glb'), x: G/2*TS+4, z: (G-IW-3)*TS, rotY: Math.PI, scale: 0.010 },

    // Fences (inner courtyard perimeter)
    { modelUrl: ORC('fense_full.glb'), x: 35*TS, z: 36*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ORC('fense_full.glb'), x: 65*TS, z: 36*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ORC('fense_full.glb'), x: 35*TS, z: 64*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: ORC('fense_full.glb'), x: 65*TS, z: 64*TS, rotY: Math.PI, scale: 0.010 },

    // Bridges
    { modelUrl: ORC('bridge_full.glb'), x: G/2*TS, z: (IW-2)*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ORC('bridge_full.glb'), x: G/2*TS, z: (G-IW+2)*TS, rotY: Math.PI, scale: 0.010 },

    // Decorative props
    { modelUrl: ORC('brazier_01.glb'), x: 34*TS, z: 34*TS, rotY: 0, scale: 0.012 },
    { modelUrl: ORC('brazier_01.glb'), x: 66*TS, z: 34*TS, rotY: 0, scale: 0.012 },
    { modelUrl: ORC('brazier_01.glb'), x: 34*TS, z: 66*TS, rotY: 0, scale: 0.012 },
    { modelUrl: ORC('brazier_01.glb'), x: 66*TS, z: 66*TS, rotY: 0, scale: 0.012 },
    { modelUrl: ORC('alarm_drum.glb'), x: G/2*TS, z: 40*TS, rotY: 0, scale: 0.012 },
    { modelUrl: ORC('alarm_drum.glb'), x: G/2*TS, z: 60*TS, rotY: 0, scale: 0.012 },
    { modelUrl: ORC('firewoods.glb'),  x: 44*TS, z: 44*TS, rotY: 0, scale: 0.012 },
    { modelUrl: ORC('firewoods.glb'),  x: 56*TS, z: 44*TS, rotY: 0, scale: 0.012 },
    { modelUrl: ORC('props_full.glb'), x: 44*TS, z: 56*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ORC('props_full.glb'), x: 56*TS, z: 56*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: ORC('tower_01.glb'), x: (IW+5)*TS, z: G/2*TS, rotY: 0, scale: 0.009 },
    { modelUrl: ORC('tower_02.glb'), x: (G-IW-5)*TS, z: G/2*TS, rotY: Math.PI/2, scale: 0.009 },
  ];

  return {
    id: 'orc', name: 'Orc Stronghold', theme: 'orc',
    description: 'A brutal orc fortress where only the cunning survive the siege.',
    gridW: G, gridH: G, tileSize: TS,
    skyColor: '#3d1a0a', fogColor: '#4a2008', fogNear: 80, fogFar: 400,
    obstacleTiles: obs, visionBlockers: vis, props,
    playerSpawn: { xMin: IW+3, xMax: IW+10, yMin: G/2-8, yMax: G/2+8 },
    enemySpawn:  { xMin: G-IW-10, xMax: G-IW-3, yMin: G/2-8, yMax: G/2+8 },
    groundColor: '#3a2010', groundColor2: '#4a2a18',
  };
}

// ============================================================
// LEVEL 3 — Elven Citadel (120×120)
// ============================================================
function makeElvenLevel(): LevelDef {
  const G = 120, TS = 1.5;
  const obs = new Set<string>(), vis = new Set<string>();

  const OW = 10, IW = 32, GAP = 5;

  // Outer wall
  blockLine(obs, vis, OW, OW, G-OW, OW, 2, G/2-GAP, G/2+GAP);
  blockLine(obs, vis, OW, G-OW, G-OW, G-OW, 2, G/2-GAP, G/2+GAP);
  blockLine(obs, vis, OW, OW, OW, G-OW, 2, G/2-GAP, G/2+GAP);
  blockLine(obs, vis, G-OW, OW, G-OW, G-OW, 2, G/2-GAP, G/2+GAP);
  // Outer towers
  blockDot(obs, vis, OW, OW, 5); blockDot(obs, vis, G-OW, OW, 5);
  blockDot(obs, vis, OW, G-OW, 5); blockDot(obs, vis, G-OW, G-OW, 5);

  // Inner wall
  blockLine(obs, vis, IW, IW, G-IW, IW, 2, G/2-GAP, G/2+GAP);
  blockLine(obs, vis, IW, G-IW, G-IW, G-IW, 2, G/2-GAP, G/2+GAP);
  blockLine(obs, vis, IW, IW, IW, G-IW, 2, G/2-GAP, G/2+GAP);
  blockLine(obs, vis, G-IW, IW, G-IW, G-IW, 2, G/2-GAP, G/2+GAP);
  // Inner towers
  blockDot(obs, vis, IW, IW, 4); blockDot(obs, vis, G-IW, IW, 4);
  blockDot(obs, vis, IW, G-IW, 4); blockDot(obs, vis, G-IW, G-IW, 4);

  // Mid-wall watch towers (along inner wall)
  const mid = G/2;
  blockDot(obs, vis, mid, IW, 3); blockDot(obs, vis, mid, G-IW, 3);
  blockDot(obs, vis, IW, mid, 3); blockDot(obs, vis, G-IW, mid, 3);

  // Central fortress keep
  const KS = 45, KE = 75;
  blockLine(obs, vis, KS, KS, KE, KS, 2, mid-4, mid+4);
  blockLine(obs, vis, KS, KE, KE, KE, 2, mid-4, mid+4);
  blockLine(obs, vis, KS, KS, KS, KE, 2, mid-4, mid+4);
  blockLine(obs, vis, KE, KS, KE, KE, 2, mid-4, mid+4);

  // Barracks / buildings (inner courtyard)
  blockRect(obs, vis, 20, 20, 28, 28);  blockRect(obs, vis, G-28, 20, G-20, 28);
  blockRect(obs, vis, 20, G-28, 28, G-20); blockRect(obs, vis, G-28, G-28, G-20, G-20);
  // Arsenal
  blockRect(obs, vis, 38, 20, 46, 28); blockRect(obs, vis, G-46, 20, G-38, 28);
  blockRect(obs, vis, 38, G-28, 46, G-20); blockRect(obs, vis, G-46, G-28, G-38, G-20);

  // Clear spawn zones
  for (let x = IW+3; x <= IW+12; x++) for (let y = mid-10; y <= mid+10; y++) { obs.delete(K(x,y)); vis.delete(K(x,y)); }
  for (let x = G-IW-12; x <= G-IW-3; x++) for (let y = mid-10; y <= mid+10; y++) { obs.delete(K(x,y)); vis.delete(K(x,y)); }

  const ELV = (f: string) => M('elven', f);
  const props: PropPlacement[] = [
    // Central fortress
    { modelUrl: ELV('fortress_full.glb'), x: mid*TS, z: mid*TS, rotY: 0, scale: 0.010 },

    // Outer corner towers
    { modelUrl: ELV('tower_3_full.glb'), x: OW*TS, z: OW*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ELV('tower_4_full.glb'), x: (G-OW)*TS, z: OW*TS, rotY: Math.PI/2, scale: 0.010 },
    { modelUrl: ELV('tower_3_full.glb'), x: OW*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: ELV('tower_4_full.glb'), x: (G-OW)*TS, z: (G-OW)*TS, rotY: -Math.PI/2, scale: 0.010 },
    // Outer mid-wall towers
    { modelUrl: ELV('watchtoer_1.glb'), x: mid*TS, z: OW*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ELV('watchtoer_1.glb'), x: mid*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: ELV('watchtoer_1.glb'), x: OW*TS, z: mid*TS, rotY: Math.PI/2, scale: 0.010 },
    { modelUrl: ELV('watchtoer_1.glb'), x: (G-OW)*TS, z: mid*TS, rotY: -Math.PI/2, scale: 0.010 },

    // Outer wall segments
    { modelUrl: ELV('wall_1_full.glb'), x: (OW+15)*TS, z: OW*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ELV('wall_1_full.glb'), x: (G-OW-15)*TS, z: OW*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ELV('wall_1_full.glb'), x: (OW+15)*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: ELV('wall_1_full.glb'), x: (G-OW-15)*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: ELV('wall_2.glb'),   x: OW*TS, z: (OW+15)*TS, rotY: Math.PI/2, scale: 0.010 },
    { modelUrl: ELV('wall_2.glb'),   x: OW*TS, z: (G-OW-15)*TS, rotY: Math.PI/2, scale: 0.010 },
    { modelUrl: ELV('wall_2.glb'),   x: (G-OW)*TS, z: (OW+15)*TS, rotY: -Math.PI/2, scale: 0.010 },
    { modelUrl: ELV('wall_2.glb'),   x: (G-OW)*TS, z: (G-OW-15)*TS, rotY: -Math.PI/2, scale: 0.010 },

    // Gates on outer wall
    { modelUrl: ELV('minnor_gates_2.glb'), x: mid*TS, z: OW*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ELV('minnor_gates_4.glb'), x: mid*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: ELV('minnor_gates_2.glb'), x: OW*TS, z: mid*TS, rotY: Math.PI/2, scale: 0.010 },
    { modelUrl: ELV('minnor_gates_4.glb'), x: (G-OW)*TS, z: mid*TS, rotY: -Math.PI/2, scale: 0.010 },

    // Inner wall corners & mid
    { modelUrl: ELV('tower_5_full.glb'), x: IW*TS, z: IW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: ELV('tower_5_full.glb'), x: (G-IW)*TS, z: IW*TS, rotY: Math.PI/2, scale: 0.009 },
    { modelUrl: ELV('tower_5_full.glb'), x: IW*TS, z: (G-IW)*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: ELV('tower_5_full.glb'), x: (G-IW)*TS, z: (G-IW)*TS, rotY: -Math.PI/2, scale: 0.009 },
    { modelUrl: ELV('tower_1.glb'), x: mid*TS, z: IW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: ELV('tower_1.glb'), x: mid*TS, z: (G-IW)*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: ELV('tower_2.glb'), x: IW*TS, z: mid*TS, rotY: Math.PI/2, scale: 0.009 },
    { modelUrl: ELV('tower_2.glb'), x: (G-IW)*TS, z: mid*TS, rotY: -Math.PI/2, scale: 0.009 },

    // Barracks / kazarm
    { modelUrl: ELV('kazarm_1.glb'), x: 24*TS, z: 24*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ELV('kazarm_1.glb'), x: (G-24)*TS, z: 24*TS, rotY: Math.PI/2, scale: 0.010 },
    { modelUrl: ELV('kazarm_1.glb'), x: 24*TS, z: (G-24)*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: ELV('kazarm_1.glb'), x: (G-24)*TS, z: (G-24)*TS, rotY: -Math.PI/2, scale: 0.010 },
    // Arsenal
    { modelUrl: ELV('arsenal_1.glb'), x: 42*TS, z: 24*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ELV('arsenal_1.glb'), x: (G-42)*TS, z: 24*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: ELV('arsenal_1.glb'), x: 42*TS, z: (G-24)*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ELV('arsenal_1.glb'), x: (G-42)*TS, z: (G-24)*TS, rotY: Math.PI, scale: 0.010 },

    // Stairs
    { modelUrl: ELV('stairs_full.glb'), x: mid*TS, z: (IW+4)*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ELV('stairs_full.glb'), x: mid*TS, z: (G-IW-4)*TS, rotY: Math.PI, scale: 0.010 },

    // Fences
    { modelUrl: ELV('fense_full.glb'), x: 40*TS, z: 38*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ELV('fense_full.glb'), x: (G-40)*TS, z: 38*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: ELV('fense_full.glb'), x: 40*TS, z: (G-38)*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ELV('fense_full.glb'), x: (G-40)*TS, z: (G-38)*TS, rotY: Math.PI, scale: 0.010 },

    // Bridges
    { modelUrl: ELV('bridge_full.glb'), x: mid*TS, z: (IW-3)*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ELV('bridge_full.glb'), x: mid*TS, z: (G-IW+3)*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: ELV('bridge_full.glb'), x: (IW-3)*TS, z: mid*TS, rotY: Math.PI/2, scale: 0.010 },
    { modelUrl: ELV('bridge_full.glb'), x: (G-IW+3)*TS, z: mid*TS, rotY: -Math.PI/2, scale: 0.010 },

    // Decorative props
    { modelUrl: ELV('brazier_1.glb'),   x: (KS+2)*TS, z: (KS+2)*TS, rotY: 0, scale: 0.012 },
    { modelUrl: ELV('brazier_1.glb'),   x: (KE-2)*TS, z: (KS+2)*TS, rotY: 0, scale: 0.012 },
    { modelUrl: ELV('brazier_1.glb'),   x: (KS+2)*TS, z: (KE-2)*TS, rotY: 0, scale: 0.012 },
    { modelUrl: ELV('brazier_1.glb'),   x: (KE-2)*TS, z: (KE-2)*TS, rotY: 0, scale: 0.012 },
    { modelUrl: ELV('fire_bell_1.glb'), x: mid*TS, z: (KS-4)*TS, rotY: 0, scale: 0.012 },
    { modelUrl: ELV('fire_bell_1.glb'), x: mid*TS, z: (KE+4)*TS, rotY: 0, scale: 0.012 },
    { modelUrl: ELV('andiron1.glb'),    x: (KS-4)*TS, z: mid*TS, rotY: 0, scale: 0.012 },
    { modelUrl: ELV('andiron1.glb'),    x: (KE+4)*TS, z: mid*TS, rotY: 0, scale: 0.012 },
    { modelUrl: ELV('props_full.glb'),  x: 50*TS, z: 50*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ELV('props_full.glb'),  x: (G-50)*TS, z: (G-50)*TS, rotY: Math.PI, scale: 0.010 },
  ];

  return {
    id: 'elven', name: 'Elven Citadel', theme: 'elven',
    description: 'The ancient citadel of the elves, defended by silver walls and sacred groves.',
    gridW: G, gridH: G, tileSize: TS,
    skyColor: '#061a10', fogColor: '#0d2a1a', fogNear: 100, fogFar: 500,
    obstacleTiles: obs, visionBlockers: vis, props,
    playerSpawn: { xMin: IW+3, xMax: IW+12, yMin: mid-10, yMax: mid+10 },
    enemySpawn:  { xMin: G-IW-12, xMax: G-IW-3, yMin: mid-10, yMax: mid+10 },
    groundColor: '#152a18', groundColor2: '#1e3820',
  };
}

// ============================================================
// LEVEL 4 — Iron Bastion / Medieval Castle (140×140)
// ============================================================
function makeMedievalLevel(): LevelDef {
  const G = 140, TS = 1.5;
  const obs = new Set<string>(), vis = new Set<string>();

  const OW = 12, MW = 35, IW = 55, GAP = 5, mid = G/2;

  // ── Outer wall (3 rings) ──
  blockLine(obs, vis, OW, OW, G-OW, OW, 2, mid-GAP, mid+GAP);
  blockLine(obs, vis, OW, G-OW, G-OW, G-OW, 2, mid-GAP, mid+GAP);
  blockLine(obs, vis, OW, OW, OW, G-OW, 2, mid-GAP, mid+GAP);
  blockLine(obs, vis, G-OW, OW, G-OW, G-OW, 2, mid-GAP, mid+GAP);
  // Outer corners (large towers)
  blockDot(obs, vis, OW, OW, 5); blockDot(obs, vis, G-OW, OW, 5);
  blockDot(obs, vis, OW, G-OW, 5); blockDot(obs, vis, G-OW, G-OW, 5);

  // ── Middle wall ──
  blockLine(obs, vis, MW, MW, G-MW, MW, 2, mid-GAP, mid+GAP);
  blockLine(obs, vis, MW, G-MW, G-MW, G-MW, 2, mid-GAP, mid+GAP);
  blockLine(obs, vis, MW, MW, MW, G-MW, 2, mid-GAP, mid+GAP);
  blockLine(obs, vis, G-MW, MW, G-MW, G-MW, 2, mid-GAP, mid+GAP);
  // Mid towers
  blockDot(obs, vis, MW, MW, 4); blockDot(obs, vis, G-MW, MW, 4);
  blockDot(obs, vis, MW, G-MW, 4); blockDot(obs, vis, G-MW, G-MW, 4);
  // Mid-wall mid towers
  blockDot(obs, vis, mid, MW, 3); blockDot(obs, vis, mid, G-MW, 3);
  blockDot(obs, vis, MW, mid, 3); blockDot(obs, vis, G-MW, mid, 3);

  // ── Inner keep wall ──
  blockLine(obs, vis, IW, IW, G-IW, IW, 2, mid-4, mid+4);
  blockLine(obs, vis, IW, G-IW, G-IW, G-IW, 2, mid-4, mid+4);
  blockLine(obs, vis, IW, IW, IW, G-IW, 2, mid-4, mid+4);
  blockLine(obs, vis, G-IW, IW, G-IW, G-IW, 2, mid-4, mid+4);
  // Keep towers
  blockDot(obs, vis, IW, IW, 4); blockDot(obs, vis, G-IW, IW, 4);
  blockDot(obs, vis, IW, G-IW, 4); blockDot(obs, vis, G-IW, G-IW, 4);

  // ── Buildings ──
  // Outer courtyard buildings (between outer and middle wall)
  blockRect(obs, vis, OW+3, OW+3, OW+10, OW+12);  // NW bldg
  blockRect(obs, vis, G-OW-10, OW+3, G-OW-3, OW+12); // NE
  blockRect(obs, vis, OW+3, G-OW-12, OW+10, G-OW-3); // SW
  blockRect(obs, vis, G-OW-10, G-OW-12, G-OW-3, G-OW-3); // SE

  // Middle courtyard buildings (between middle and inner wall)
  blockRect(obs, vis, MW+3, MW+3, MW+12, MW+12);
  blockRect(obs, vis, G-MW-12, MW+3, G-MW-3, MW+12);
  blockRect(obs, vis, MW+3, G-MW-12, MW+12, G-MW-3);
  blockRect(obs, vis, G-MW-12, G-MW-12, G-MW-3, G-MW-3);
  // Inner barracks
  blockRect(obs, vis, IW+3, IW+3, IW+10, IW+10);
  blockRect(obs, vis, G-IW-10, IW+3, G-IW-3, IW+10);
  blockRect(obs, vis, IW+3, G-IW-10, IW+10, G-IW-3);
  blockRect(obs, vis, G-IW-10, G-IW-10, G-IW-3, G-IW-3);

  // Clear spawn zones
  for (let x = IW+3; x <= IW+15; x++) for (let y = mid-12; y <= mid+12; y++) { obs.delete(K(x,y)); vis.delete(K(x,y)); }
  for (let x = G-IW-15; x <= G-IW-3; x++) for (let y = mid-12; y <= mid+12; y++) { obs.delete(K(x,y)); vis.delete(K(x,y)); }

  const MED = (f: string) => M('medieval', f);
  const props: PropPlacement[] = [
    // Central fortress
    { modelUrl: MED('fortress_full.glb'), x: mid*TS, z: mid*TS, rotY: 0, scale: 0.009 },

    // ── Outer corner towers ──
    { modelUrl: MED('tower_04_full.glb'), x: OW*TS, z: OW*TS, rotY: 0, scale: 0.010 },
    { modelUrl: MED('tower_05_full.glb'), x: (G-OW)*TS, z: OW*TS, rotY: Math.PI/2, scale: 0.010 },
    { modelUrl: MED('tower_04_full.glb'), x: OW*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: MED('tower_05_full.glb'), x: (G-OW)*TS, z: (G-OW)*TS, rotY: -Math.PI/2, scale: 0.010 },
    // Outer mid-wall towers
    { modelUrl: MED('tower_02_1.glb'), x: mid*TS, z: OW*TS, rotY: 0, scale: 0.010 },
    { modelUrl: MED('tower_02_1.glb'), x: mid*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: MED('tower_02_1.glb'), x: OW*TS, z: mid*TS, rotY: Math.PI/2, scale: 0.010 },
    { modelUrl: MED('tower_02_1.glb'), x: (G-OW)*TS, z: mid*TS, rotY: -Math.PI/2, scale: 0.010 },

    // ── Outer wall segments ──
    { modelUrl: MED('wall_01_full.glb'), x: (OW+18)*TS, z: OW*TS, rotY: 0, scale: 0.010 },
    { modelUrl: MED('wall_01_full.glb'), x: (G-OW-18)*TS, z: OW*TS, rotY: 0, scale: 0.010 },
    { modelUrl: MED('wall_01_full.glb'), x: (OW+18)*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: MED('wall_01_full.glb'), x: (G-OW-18)*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: MED('wall_02_1.glb'), x: OW*TS, z: (OW+18)*TS, rotY: Math.PI/2, scale: 0.010 },
    { modelUrl: MED('wall_02_1.glb'), x: OW*TS, z: (G-OW-18)*TS, rotY: Math.PI/2, scale: 0.010 },
    { modelUrl: MED('wall_02_1.glb'), x: (G-OW)*TS, z: (OW+18)*TS, rotY: -Math.PI/2, scale: 0.010 },
    { modelUrl: MED('wall_02_1.glb'), x: (G-OW)*TS, z: (G-OW-18)*TS, rotY: -Math.PI/2, scale: 0.010 },

    // Outer gates
    { modelUrl: MED('minnor_gates_01.glb'), x: mid*TS, z: OW*TS, rotY: 0, scale: 0.010 },
    { modelUrl: MED('minnor_gates_02.glb'), x: mid*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: MED('minnor_gates_01.glb'), x: OW*TS, z: mid*TS, rotY: Math.PI/2, scale: 0.010 },
    { modelUrl: MED('minnor_gates_02.glb'), x: (G-OW)*TS, z: mid*TS, rotY: -Math.PI/2, scale: 0.010 },

    // ── Middle wall ──
    { modelUrl: MED('tower_03_1_full.glb'), x: MW*TS, z: MW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: MED('tower_03_1_full.glb'), x: (G-MW)*TS, z: MW*TS, rotY: Math.PI/2, scale: 0.009 },
    { modelUrl: MED('tower_03_1_full.glb'), x: MW*TS, z: (G-MW)*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: MED('tower_03_1_full.glb'), x: (G-MW)*TS, z: (G-MW)*TS, rotY: -Math.PI/2, scale: 0.009 },
    { modelUrl: MED('tower_02_1.glb'), x: mid*TS, z: MW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: MED('tower_02_1.glb'), x: mid*TS, z: (G-MW)*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: MED('tower_02_1.glb'), x: MW*TS, z: mid*TS, rotY: Math.PI/2, scale: 0.009 },
    { modelUrl: MED('tower_02_1.glb'), x: (G-MW)*TS, z: mid*TS, rotY: -Math.PI/2, scale: 0.009 },
    { modelUrl: MED('wall_01_full.glb'), x: (MW+14)*TS, z: MW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: MED('wall_01_full.glb'), x: (G-MW-14)*TS, z: MW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: MED('wall_01_full.glb'), x: (MW+14)*TS, z: (G-MW)*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: MED('wall_01_full.glb'), x: (G-MW-14)*TS, z: (G-MW)*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: MED('minnor_gates_01.glb'), x: mid*TS, z: MW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: MED('minnor_gates_02.glb'), x: mid*TS, z: (G-MW)*TS, rotY: Math.PI, scale: 0.009 },

    // ── Inner keep ──
    { modelUrl: MED('tower_04_full.glb'), x: IW*TS, z: IW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: MED('tower_05_full.glb'), x: (G-IW)*TS, z: IW*TS, rotY: Math.PI/2, scale: 0.009 },
    { modelUrl: MED('tower_04_full.glb'), x: IW*TS, z: (G-IW)*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: MED('tower_05_full.glb'), x: (G-IW)*TS, z: (G-IW)*TS, rotY: -Math.PI/2, scale: 0.009 },
    { modelUrl: MED('wall_01_full.glb'), x: (IW+8)*TS, z: IW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: MED('wall_01_full.glb'), x: (G-IW-8)*TS, z: IW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: MED('wall_01_full.glb'), x: (IW+8)*TS, z: (G-IW)*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: MED('wall_01_full.glb'), x: (G-IW-8)*TS, z: (G-IW)*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: MED('minnor_gates_01.glb'), x: mid*TS, z: IW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: MED('minnor_gates_02.glb'), x: mid*TS, z: (G-IW)*TS, rotY: Math.PI, scale: 0.009 },

    // ── Buildings ──
    { modelUrl: MED('barracks.glb'), x: (OW+7)*TS, z: (OW+7)*TS, rotY: 0, scale: 0.010 },
    { modelUrl: MED('barracks.glb'), x: (G-OW-7)*TS, z: (OW+7)*TS, rotY: Math.PI/2, scale: 0.010 },
    { modelUrl: MED('barracks.glb'), x: (OW+7)*TS, z: (G-OW-7)*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: MED('barracks.glb'), x: (G-OW-7)*TS, z: (G-OW-7)*TS, rotY: -Math.PI/2, scale: 0.010 },

    { modelUrl: MED('ammourry.glb'), x: (MW+7)*TS, z: (MW+7)*TS, rotY: 0, scale: 0.010 },
    { modelUrl: MED('ammourry.glb'), x: (G-MW-7)*TS, z: (MW+7)*TS, rotY: Math.PI/2, scale: 0.010 },
    { modelUrl: MED('ammourry.glb'), x: (MW+7)*TS, z: (G-MW-7)*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: MED('ammourry.glb'), x: (G-MW-7)*TS, z: (G-MW-7)*TS, rotY: -Math.PI/2, scale: 0.010 },

    { modelUrl: MED('barracks.glb'), x: (IW+7)*TS, z: (IW+7)*TS, rotY: 0, scale: 0.009 },
    { modelUrl: MED('barracks.glb'), x: (G-IW-7)*TS, z: (IW+7)*TS, rotY: Math.PI/2, scale: 0.009 },
    { modelUrl: MED('barracks.glb'), x: (IW+7)*TS, z: (G-IW-7)*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: MED('barracks.glb'), x: (G-IW-7)*TS, z: (G-IW-7)*TS, rotY: -Math.PI/2, scale: 0.009 },

    // ── Stairs ──
    { modelUrl: MED('stairs_full1.glb'), x: mid*TS, z: (IW+4)*TS, rotY: 0, scale: 0.010 },
    { modelUrl: MED('stairs_full1.glb'), x: mid*TS, z: (G-IW-4)*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: MED('stairs_full1.glb'), x: mid*TS, z: (MW+4)*TS, rotY: 0, scale: 0.010 },
    { modelUrl: MED('stairs_full1.glb'), x: mid*TS, z: (G-MW-4)*TS, rotY: Math.PI, scale: 0.010 },

    // ── Bridges ──
    { modelUrl: MED('bridge_full.glb'), x: mid*TS, z: (OW-3)*TS, rotY: 0, scale: 0.010 },
    { modelUrl: MED('bridge_full.glb'), x: mid*TS, z: (G-OW+3)*TS, rotY: Math.PI, scale: 0.010 },

    // ── Fences ──
    { modelUrl: MED('fense_fyull.glb'), x: (IW+18)*TS, z: (IW+3)*TS, rotY: 0, scale: 0.010 },
    { modelUrl: MED('fense_fyull.glb'), x: (G-IW-18)*TS, z: (IW+3)*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: MED('fense_fyull.glb'), x: (IW+18)*TS, z: (G-IW-3)*TS, rotY: 0, scale: 0.010 },
    { modelUrl: MED('fense_fyull.glb'), x: (G-IW-18)*TS, z: (G-IW-3)*TS, rotY: Math.PI, scale: 0.010 },

    // ── Decorative props ──
    { modelUrl: MED('brazier.glb'),    x: (IW+2)*TS, z: (IW+2)*TS, rotY: 0, scale: 0.012 },
    { modelUrl: MED('brazier.glb'),    x: (G-IW-2)*TS, z: (IW+2)*TS, rotY: 0, scale: 0.012 },
    { modelUrl: MED('brazier.glb'),    x: (IW+2)*TS, z: (G-IW-2)*TS, rotY: 0, scale: 0.012 },
    { modelUrl: MED('brazier.glb'),    x: (G-IW-2)*TS, z: (G-IW-2)*TS, rotY: 0, scale: 0.012 },
    { modelUrl: MED('fire_bell.glb'),  x: mid*TS, z: (IW-5)*TS, rotY: 0, scale: 0.012 },
    { modelUrl: MED('fire_bell.glb'),  x: mid*TS, z: (G-IW+5)*TS, rotY: 0, scale: 0.012 },
    { modelUrl: MED('firewoods.glb'),  x: (IW+15)*TS, z: mid*TS, rotY: 0, scale: 0.012 },
    { modelUrl: MED('firewoods.glb'),  x: (G-IW-15)*TS, z: mid*TS, rotY: 0, scale: 0.012 },
    { modelUrl: MED('sentry_hurt.glb'), x: (MW+3)*TS, z: mid*TS, rotY: 0, scale: 0.011 },
    { modelUrl: MED('sentry_hurt.glb'), x: (G-MW-3)*TS, z: mid*TS, rotY: Math.PI, scale: 0.011 },
    { modelUrl: MED('props_full.glb'), x: (IW+5)*TS, z: (IW+5)*TS, rotY: 0, scale: 0.009 },
    { modelUrl: MED('props_full.glb'), x: (G-IW-5)*TS, z: (G-IW-5)*TS, rotY: Math.PI, scale: 0.009 },
  ];

  return {
    id: 'medieval', name: 'Iron Bastion', theme: 'medieval',
    description: 'A mighty medieval castle with three rings of walls and a heavily fortified keep.',
    gridW: G, gridH: G, tileSize: TS,
    skyColor: '#101820', fogColor: '#182030', fogNear: 120, fogFar: 600,
    obstacleTiles: obs, visionBlockers: vis, props,
    playerSpawn: { xMin: IW+3, xMax: IW+15, yMin: mid-12, yMax: mid+12 },
    enemySpawn:  { xMin: G-IW-15, xMax: G-IW-3, yMin: mid-12, yMax: mid+12 },
    groundColor: '#202428', groundColor2: '#2a2e34',
  };
}

// ============================================================
// BRESENHAM LINE-OF-SIGHT
// ============================================================
export function hasLineOfSight(
  from: { x: number; y: number },
  to:   { x: number; y: number },
  blockers: Set<string>,
): boolean {
  let x0 = from.x, y0 = from.y;
  const x1 = to.x, y1 = to.y;
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    if (x0 === x1 && y0 === y1) return true;
    if (blockers.has(`${x0},${y0}`)) return false;
    const e2 = 2 * err;
    if (e2 >= dy) { if (x0 === x1) break; err += dy; x0 += sx; }
    if (e2 <= dx) { if (y0 === y1) break; err += dx; y0 += sy; }
  }
  return true;
}

export const LEVELS: LevelDef[] = [
  makeRuinsLevel(),
  makeOrcLevel(),
  makeElvenLevel(),
  makeMedievalLevel(),
];

export function getLevelById(id: string): LevelDef {
  return LEVELS.find(l => l.id === id) ?? LEVELS[0];
}
