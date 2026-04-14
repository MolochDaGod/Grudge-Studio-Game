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
  /** Height (world units) of obstacle/wall tiles. Ruins get ~0.54, fortress maps get 3–4. */
  wallHeight: number;
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
// LEVEL 1 — Graveyard Ruins (40×40)  ← compact arena
// Three lanes separated by tomb clusters, flanking paths, central chokepoint
// ============================================================
function makeRuinsLevel(): LevelDef {
  const G = 40, TS = 1.5;
  const obs = new Set<string>(), vis = new Set<string>();
  const mid = G / 2; // 20

  // ── North lane divider: broken wall with central gap ──────────────────
  blockLine(obs, vis, 10, 10, 30, 10, 1, mid-2, mid+1);  // horizontal wall y=10
  // ── South lane divider ────────────────────────────────────────────────
  blockLine(obs, vis, 10, 29, 30, 29, 1, mid-2, mid+1);  // horizontal wall y=29

  // ── Cover clusters (gravestone groups) — 2×2 blocks for half-cover ───
  // Top lane (y 2-9)
  const topCover: Array<[number,number]> = [[8,4],[14,3],[20,5],[26,3],[32,4]];
  // Mid lane (y 12-27) — the main fighting area
  const midCover: Array<[number,number]> = [
    [10,15],[14,20],[18,16],[22,22],[26,18],[30,14],[30,24],
    [16,25],[24,13],
  ];
  // Bottom lane (y 31-38)
  const botCover: Array<[number,number]> = [[8,34],[14,35],[20,33],[26,35],[32,34]];

  for (const [cx,cy] of [...topCover, ...midCover, ...botCover]) {
    for (let dx = 0; dx <= 1; dx++) for (let dy = 0; dy <= 1; dy++) {
      const x = cx+dx, y = cy+dy;
      if (x >= 0 && x < G && y >= 0 && y < G) { obs.add(K(x,y)); vis.add(K(x,y)); }
    }
  }

  // ── Large collapsed structure (center) — creates a chokepoint ────────
  blockRect(obs, vis, 17, 17, 22, 22, [[19,17],[20,17],[19,22],[20,22]]); // 6×6 with N+S doors

  // ── Clear spawn zones ────────────────────────────────────────────────
  for (let x = 1; x <= 5; x++) for (let y = 10; y <= 29; y++) { obs.delete(K(x,y)); vis.delete(K(x,y)); }
  for (let x = 34; x <= 38; x++) for (let y = 10; y <= 29; y++) { obs.delete(K(x,y)); vis.delete(K(x,y)); }

  const ruin = (n: number) => M('ruins', `ruin_${n}.glb`);
  const props: PropPlacement[] = [];

  // Cover cluster props — one ruin per cluster
  const allClusters = [...topCover, ...midCover, ...botCover];
  allClusters.forEach(([tx,tz], i) => {
    const p = pw(tx, tz, TS);
    const n = (i % 21) + 1;
    const rot = (i * 0.37) % 2;
    props.push({ modelUrl: ruin(n), x: p.x, z: p.z, rotY: rot * Math.PI, scale: 0.011 });
  });

  // Wall-line props (large ruin pieces along the lane dividers)
  for (const tx of [11, 16, 24, 29]) {
    const p1 = pw(tx, 10, TS), p2 = pw(tx, 29, TS);
    props.push({ modelUrl: ruin(14), x: p1.x, z: p1.z, rotY: 0, scale: 0.013 });
    props.push({ modelUrl: ruin(15), x: p2.x, z: p2.z, rotY: Math.PI, scale: 0.013 });
  }

  // Central ruin structure
  const ctr = pw(mid, mid, TS);
  props.push({ modelUrl: ruin(17), x: ctr.x, z: ctr.z, rotY: 0, scale: 0.015 });
  props.push({ modelUrl: ruin(18), x: ctr.x - 3, z: ctr.z + 3, rotY: Math.PI/2, scale: 0.012 });
  props.push({ modelUrl: ruin(19), x: ctr.x + 3, z: ctr.z - 3, rotY: -Math.PI/2, scale: 0.012 });

  // Scattered atmosphere props along edges
  for (let i = 1; i <= 10; i++) {
    const p = pw(i * 4, i % 2 === 0 ? 1 : G-2, TS);
    props.push({ modelUrl: ruin((i % 21) + 1), x: p.x, z: p.z, rotY: i * 0.6, scale: 0.009 });
  }

  return {
    id: 'ruins', name: 'Graveyard of the Fallen', theme: 'ruins',
    description: 'A compact burial ground — three lanes of crumbling cover separated by broken tomb walls.',
    gridW: G, gridH: G, tileSize: TS,
    skyColor: '#7a96a8', fogColor: '#9ab8cc', fogNear: 60, fogFar: 300,
    obstacleTiles: obs, visionBlockers: vis,
    props,
    playerSpawn: { xMin: 1, xMax: 5, yMin: 14, yMax: 26 },
    enemySpawn:  { xMin: 34, xMax: 38, yMin: 14, yMax: 26 },
    groundColor: '#242c18', groundColor2: '#2e3a20',
    wallHeight: 0.54,
  };
}

// ============================================================
// LEVEL 2 — Orc Stronghold (50×50)  ← compact fortress courtyard
// Single wall ring, central keep, barracks as cover, two gate flanking routes
// ============================================================
function makeOrcLevel(): LevelDef {
  const G = 50, TS = 1.5;
  const obs = new Set<string>(), vis = new Set<string>();
  const mid = G / 2; // 25
  const OW = 4, GAP = 3;

  // ── Perimeter wall ────────────────────────────────────────────────────
  blockLine(obs, vis, OW, OW, G-OW, OW, 2, mid-GAP, mid+GAP);   // N
  blockLine(obs, vis, OW, G-OW, G-OW, G-OW, 2, mid-GAP, mid+GAP); // S
  blockLine(obs, vis, OW, OW, OW, G-OW, 2, mid-GAP, mid+GAP);   // W
  blockLine(obs, vis, G-OW, OW, G-OW, G-OW, 2, mid-GAP, mid+GAP); // E

  // ── Corner towers (radius 3) ─────────────────────────────────────────
  blockDot(obs, vis, OW, OW, 3);
  blockDot(obs, vis, G-OW, OW, 3);
  blockDot(obs, vis, OW, G-OW, 3);
  blockDot(obs, vis, G-OW, G-OW, 3);

  // ── Central keep structure (8×8 with doors on all 4 sides) ───────────
  const KS = 21, KE = 29;
  blockLine(obs, vis, KS, KS, KE, KS, 1, mid-1, mid+1); // N keep wall
  blockLine(obs, vis, KS, KE, KE, KE, 1, mid-1, mid+1); // S
  blockLine(obs, vis, KS, KS, KS, KE, 1, mid-1, mid+1); // W
  blockLine(obs, vis, KE, KS, KE, KE, 1, mid-1, mid+1); // E

  // ── Barracks (4 small buildings for cover in courtyard) ──────────────
  blockRect(obs, vis, 9, 9, 13, 13);    // NW barracks
  blockRect(obs, vis, G-13, 9, G-9, 13);  // NE
  blockRect(obs, vis, 9, G-13, 13, G-9);  // SW
  blockRect(obs, vis, G-13, G-13, G-9, G-9); // SE

  // ── Fence lines for mid-field cover ──────────────────────────────────
  blockLine(obs, vis, 14, 18, 19, 18, 1); // W fence
  blockLine(obs, vis, G-19, 18, G-14, 18, 1); // E fence
  blockLine(obs, vis, 14, G-18, 19, G-18, 1);
  blockLine(obs, vis, G-19, G-18, G-14, G-18, 1);

  // ── Clear spawn zones ────────────────────────────────────────────────
  for (let x = OW+1; x <= OW+6; x++) for (let y = mid-5; y <= mid+5; y++) { obs.delete(K(x,y)); vis.delete(K(x,y)); }
  for (let x = G-OW-6; x <= G-OW-1; x++) for (let y = mid-5; y <= mid+5; y++) { obs.delete(K(x,y)); vis.delete(K(x,y)); }

  const ORC = (f: string) => M('orc', f);
  const props: PropPlacement[] = [
    // Central keep
    { modelUrl: ORC('fortress_full.glb'), x: mid*TS, z: mid*TS, rotY: 0, scale: 0.008 },
    // Corner towers
    { modelUrl: ORC('tower_3_full.glb'), x: OW*TS, z: OW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: ORC('tower_4_full.glb'), x: (G-OW)*TS, z: OW*TS, rotY: Math.PI/2, scale: 0.009 },
    { modelUrl: ORC('tower_3_full.glb'), x: OW*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: ORC('tower_4_full.glb'), x: (G-OW)*TS, z: (G-OW)*TS, rotY: -Math.PI/2, scale: 0.009 },
    // Walls
    { modelUrl: ORC('wall_1_full.glb'), x: mid*TS, z: OW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: ORC('wall_1_full.glb'), x: mid*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: ORC('wall_2_01.glb'),   x: OW*TS, z: mid*TS, rotY: Math.PI/2, scale: 0.009 },
    { modelUrl: ORC('wall_2_01.glb'),   x: (G-OW)*TS, z: mid*TS, rotY: -Math.PI/2, scale: 0.009 },
    // Gates
    { modelUrl: ORC('minnor_gates_01.glb'), x: OW*TS, z: mid*TS, rotY: Math.PI/2, scale: 0.009 },
    { modelUrl: ORC('minnor_gates_02.glb'), x: (G-OW)*TS, z: mid*TS, rotY: -Math.PI/2, scale: 0.009 },
    // Barracks
    { modelUrl: ORC('barracks.glb'), x: 11*TS, z: 11*TS, rotY: 0, scale: 0.008 },
    { modelUrl: ORC('barracks.glb'), x: (G-11)*TS, z: 11*TS, rotY: Math.PI/2, scale: 0.008 },
    { modelUrl: ORC('barracks.glb'), x: 11*TS, z: (G-11)*TS, rotY: Math.PI, scale: 0.008 },
    { modelUrl: ORC('barracks.glb'), x: (G-11)*TS, z: (G-11)*TS, rotY: -Math.PI/2, scale: 0.008 },
    // Fences
    { modelUrl: ORC('fense_full.glb'), x: 16*TS, z: 18*TS, rotY: 0, scale: 0.009 },
    { modelUrl: ORC('fense_full.glb'), x: (G-16)*TS, z: 18*TS, rotY: 0, scale: 0.009 },
    { modelUrl: ORC('fense_full.glb'), x: 16*TS, z: (G-18)*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: ORC('fense_full.glb'), x: (G-16)*TS, z: (G-18)*TS, rotY: Math.PI, scale: 0.009 },
    // Braziers (flanking keep doors)
    { modelUrl: ORC('brazier_01.glb'), x: (KS-2)*TS, z: mid*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ORC('brazier_01.glb'), x: (KE+2)*TS, z: mid*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ORC('brazier_01.glb'), x: mid*TS, z: (KS-2)*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ORC('brazier_01.glb'), x: mid*TS, z: (KE+2)*TS, rotY: 0, scale: 0.010 },
    // Drums + firewoods
    { modelUrl: ORC('alarm_drum.glb'), x: mid*TS, z: (OW+2)*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ORC('alarm_drum.glb'), x: mid*TS, z: (G-OW-2)*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ORC('firewoods.glb'),  x: 16*TS, z: mid*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ORC('firewoods.glb'),  x: (G-16)*TS, z: mid*TS, rotY: Math.PI, scale: 0.010 },
    // Props
    { modelUrl: ORC('props_full.glb'), x: (KS+1)*TS, z: (KS+1)*TS, rotY: 0, scale: 0.008 },
    { modelUrl: ORC('props_full.glb'), x: (KE-1)*TS, z: (KE-1)*TS, rotY: Math.PI, scale: 0.008 },
    // Watchtowers flanking W/E gates
    { modelUrl: ORC('tower_01.glb'), x: (OW+3)*TS, z: mid*TS, rotY: 0, scale: 0.008 },
    { modelUrl: ORC('tower_02.glb'), x: (G-OW-3)*TS, z: mid*TS, rotY: Math.PI, scale: 0.008 },
  ];

  return {
    id: 'orc', name: 'Orc Stronghold', theme: 'orc',
    description: 'A compact orc fortress courtyard — rush the keep or flank through the barracks.',
    gridW: G, gridH: G, tileSize: TS,
    skyColor: '#5a1800', fogColor: '#7a2a08', fogNear: 40, fogFar: 250,
    obstacleTiles: obs, visionBlockers: vis, props,
    playerSpawn: { xMin: OW+1, xMax: OW+6, yMin: mid-5, yMax: mid+5 },
    enemySpawn:  { xMin: G-OW-6, xMax: G-OW-1, yMin: mid-5, yMax: mid+5 },
    groundColor: '#3a2010', groundColor2: '#4a2a18',
    wallHeight: 3.5,
  };
}

// ============================================================
// LEVEL 3 — Elven Citadel (60×60)  ← compact sacred grove
// Outer wall, inner garden ring with tree-cover, central shrine, diagonal lanes
// ============================================================
function makeElvenLevel(): LevelDef {
  const G = 60, TS = 1.5;
  const obs = new Set<string>(), vis = new Set<string>();
  const mid = G / 2; // 30
  const OW = 5, GAP = 3;

  // ── Outer wall ────────────────────────────────────────────────────────
  blockLine(obs, vis, OW, OW, G-OW, OW, 2, mid-GAP, mid+GAP);   // N
  blockLine(obs, vis, OW, G-OW, G-OW, G-OW, 2, mid-GAP, mid+GAP); // S
  blockLine(obs, vis, OW, OW, OW, G-OW, 2, mid-GAP, mid+GAP);   // W
  blockLine(obs, vis, G-OW, OW, G-OW, G-OW, 2, mid-GAP, mid+GAP); // E

  // ── Corner towers ────────────────────────────────────────────────────
  blockDot(obs, vis, OW, OW, 3); blockDot(obs, vis, G-OW, OW, 3);
  blockDot(obs, vis, OW, G-OW, 3); blockDot(obs, vis, G-OW, G-OW, 3);
  // Mid-wall watchtowers
  blockDot(obs, vis, mid, OW, 2); blockDot(obs, vis, mid, G-OW, 2);
  blockDot(obs, vis, OW, mid, 2); blockDot(obs, vis, G-OW, mid, 2);

  // ── Central shrine (6×6 with 4 doors) ────────────────────────────────
  const KS = 27, KE = 33;
  blockLine(obs, vis, KS, KS, KE, KS, 1, mid-1, mid+1);
  blockLine(obs, vis, KS, KE, KE, KE, 1, mid-1, mid+1);
  blockLine(obs, vis, KS, KS, KS, KE, 1, mid-1, mid+1);
  blockLine(obs, vis, KE, KS, KE, KE, 1, mid-1, mid+1);

  // ── Garden pillars / tree groves (staggered cover) ───────────────────
  // NW quadrant
  const groves: Array<[number,number]> = [
    [12,12],[18,10],[12,18],[20,16],  // NW
    [G-12,12],[G-18,10],[G-12,18],[G-20,16], // NE
    [12,G-12],[18,G-10],[12,G-18],[20,G-16], // SW
    [G-12,G-12],[G-18,G-10],[G-12,G-18],[G-20,G-16], // SE
    // Mid-field cover (diagonal approach lanes)
    [16,24],[24,16],[G-16,24],[G-24,16],
    [16,G-24],[24,G-16],[G-16,G-24],[G-24,G-16],
  ];
  for (const [cx,cy] of groves) {
    for (let dx = 0; dx <= 1; dx++) for (let dy = 0; dy <= 1; dy++) {
      obs.add(K(cx+dx, cy+dy)); vis.add(K(cx+dx, cy+dy));
    }
  }

  // ── Arsenal buildings (4 small, symmetrical) ─────────────────────────
  blockRect(obs, vis, 10, mid-2, 13, mid+2);  // W arsenal
  blockRect(obs, vis, G-13, mid-2, G-10, mid+2); // E arsenal

  // ── Clear spawn zones ────────────────────────────────────────────────
  for (let x = OW+1; x <= OW+7; x++) for (let y = mid-6; y <= mid+6; y++) { obs.delete(K(x,y)); vis.delete(K(x,y)); }
  for (let x = G-OW-7; x <= G-OW-1; x++) for (let y = mid-6; y <= mid+6; y++) { obs.delete(K(x,y)); vis.delete(K(x,y)); }

  const ELV = (f: string) => M('elven', f);
  const props: PropPlacement[] = [
    // Central shrine
    { modelUrl: ELV('fortress_full.glb'), x: mid*TS, z: mid*TS, rotY: 0, scale: 0.007 },
    // Corner towers
    { modelUrl: ELV('tower_3_full.glb'), x: OW*TS, z: OW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: ELV('tower_4_full.glb'), x: (G-OW)*TS, z: OW*TS, rotY: Math.PI/2, scale: 0.009 },
    { modelUrl: ELV('tower_3_full.glb'), x: OW*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: ELV('tower_4_full.glb'), x: (G-OW)*TS, z: (G-OW)*TS, rotY: -Math.PI/2, scale: 0.009 },
    // Mid-wall watchtowers
    { modelUrl: ELV('watchtoer_1.glb'), x: mid*TS, z: OW*TS, rotY: 0, scale: 0.008 },
    { modelUrl: ELV('watchtoer_1.glb'), x: mid*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.008 },
    { modelUrl: ELV('watchtoer_1.glb'), x: OW*TS, z: mid*TS, rotY: Math.PI/2, scale: 0.008 },
    { modelUrl: ELV('watchtoer_1.glb'), x: (G-OW)*TS, z: mid*TS, rotY: -Math.PI/2, scale: 0.008 },
    // Walls
    { modelUrl: ELV('wall_1_full.glb'), x: (OW+10)*TS, z: OW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: ELV('wall_1_full.glb'), x: (G-OW-10)*TS, z: OW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: ELV('wall_1_full.glb'), x: (OW+10)*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: ELV('wall_1_full.glb'), x: (G-OW-10)*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: ELV('wall_2.glb'), x: OW*TS, z: (OW+10)*TS, rotY: Math.PI/2, scale: 0.009 },
    { modelUrl: ELV('wall_2.glb'), x: OW*TS, z: (G-OW-10)*TS, rotY: Math.PI/2, scale: 0.009 },
    { modelUrl: ELV('wall_2.glb'), x: (G-OW)*TS, z: (OW+10)*TS, rotY: -Math.PI/2, scale: 0.009 },
    { modelUrl: ELV('wall_2.glb'), x: (G-OW)*TS, z: (G-OW-10)*TS, rotY: -Math.PI/2, scale: 0.009 },
    // Gates
    { modelUrl: ELV('minnor_gates_2.glb'), x: OW*TS, z: mid*TS, rotY: Math.PI/2, scale: 0.009 },
    { modelUrl: ELV('minnor_gates_4.glb'), x: (G-OW)*TS, z: mid*TS, rotY: -Math.PI/2, scale: 0.009 },
    { modelUrl: ELV('minnor_gates_2.glb'), x: mid*TS, z: OW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: ELV('minnor_gates_4.glb'), x: mid*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.009 },
    // Arsenals
    { modelUrl: ELV('arsenal_1.glb'), x: 11*TS, z: mid*TS, rotY: Math.PI/2, scale: 0.008 },
    { modelUrl: ELV('arsenal_1.glb'), x: (G-11)*TS, z: mid*TS, rotY: -Math.PI/2, scale: 0.008 },
    // Kazarms in corners
    { modelUrl: ELV('kazarm_1.glb'), x: 13*TS, z: 13*TS, rotY: 0, scale: 0.008 },
    { modelUrl: ELV('kazarm_1.glb'), x: (G-13)*TS, z: 13*TS, rotY: Math.PI/2, scale: 0.008 },
    { modelUrl: ELV('kazarm_1.glb'), x: 13*TS, z: (G-13)*TS, rotY: Math.PI, scale: 0.008 },
    { modelUrl: ELV('kazarm_1.glb'), x: (G-13)*TS, z: (G-13)*TS, rotY: -Math.PI/2, scale: 0.008 },
    // Braziers flanking shrine
    { modelUrl: ELV('brazier_1.glb'), x: (KS-2)*TS, z: (KS-2)*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ELV('brazier_1.glb'), x: (KE+2)*TS, z: (KS-2)*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ELV('brazier_1.glb'), x: (KS-2)*TS, z: (KE+2)*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ELV('brazier_1.glb'), x: (KE+2)*TS, z: (KE+2)*TS, rotY: 0, scale: 0.010 },
    // Decorative fire bells + andirons
    { modelUrl: ELV('fire_bell_1.glb'), x: mid*TS, z: (KS-4)*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ELV('fire_bell_1.glb'), x: mid*TS, z: (KE+4)*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ELV('andiron1.glb'),    x: (KS-4)*TS, z: mid*TS, rotY: 0, scale: 0.010 },
    { modelUrl: ELV('andiron1.glb'),    x: (KE+4)*TS, z: mid*TS, rotY: 0, scale: 0.010 },
    // Bridges at gates
    { modelUrl: ELV('bridge_full.glb'), x: (OW-2)*TS, z: mid*TS, rotY: Math.PI/2, scale: 0.009 },
    { modelUrl: ELV('bridge_full.glb'), x: (G-OW+2)*TS, z: mid*TS, rotY: -Math.PI/2, scale: 0.009 },
    // Fences near mid
    { modelUrl: ELV('fense_full.glb'), x: 20*TS, z: mid*TS, rotY: Math.PI/2, scale: 0.008 },
    { modelUrl: ELV('fense_full.glb'), x: (G-20)*TS, z: mid*TS, rotY: -Math.PI/2, scale: 0.008 },
  ];

  return {
    id: 'elven', name: 'Elven Citadel', theme: 'elven',
    description: 'A sacred elven grove — diagonal approach lanes through garden pillars, shrine at the center.',
    gridW: G, gridH: G, tileSize: TS,
    skyColor: '#5590c8', fogColor: '#80b0d0', fogNear: 80, fogFar: 400,
    obstacleTiles: obs, visionBlockers: vis, props,
    playerSpawn: { xMin: OW+1, xMax: OW+7, yMin: mid-6, yMax: mid+6 },
    enemySpawn:  { xMin: G-OW-7, xMax: G-OW-1, yMin: mid-6, yMax: mid+6 },
    groundColor: '#152a18', groundColor2: '#1e3820',
    wallHeight: 3.8,
  };
}

// ============================================================
// LEVEL 4 — Iron Bastion / Medieval Castle (70×70)  ← compact fortress
// Two wall rings, central keep, buildings as natural cover, gate approaches
// ============================================================
function makeMedievalLevel(): LevelDef {
  const G = 70, TS = 1.5;
  const obs = new Set<string>(), vis = new Set<string>();

  const OW = 6, MW = 18, IW = 28, GAP = 3, mid = G/2;

  // ── Outer wall ──
  blockLine(obs, vis, OW, OW, G-OW, OW, 2, mid-GAP, mid+GAP);
  blockLine(obs, vis, OW, G-OW, G-OW, G-OW, 2, mid-GAP, mid+GAP);
  blockLine(obs, vis, OW, OW, OW, G-OW, 2, mid-GAP, mid+GAP);
  blockLine(obs, vis, G-OW, OW, G-OW, G-OW, 2, mid-GAP, mid+GAP);
  // Outer corners
  blockDot(obs, vis, OW, OW, 3); blockDot(obs, vis, G-OW, OW, 3);
  blockDot(obs, vis, OW, G-OW, 3); blockDot(obs, vis, G-OW, G-OW, 3);

  // ── Inner wall ──
  blockLine(obs, vis, MW, MW, G-MW, MW, 2, mid-GAP, mid+GAP);
  blockLine(obs, vis, MW, G-MW, G-MW, G-MW, 2, mid-GAP, mid+GAP);
  blockLine(obs, vis, MW, MW, MW, G-MW, 2, mid-GAP, mid+GAP);
  blockLine(obs, vis, G-MW, MW, G-MW, G-MW, 2, mid-GAP, mid+GAP);
  // Inner towers
  blockDot(obs, vis, MW, MW, 3); blockDot(obs, vis, G-MW, MW, 3);
  blockDot(obs, vis, MW, G-MW, 3); blockDot(obs, vis, G-MW, G-MW, 3);
  // Mid-wall towers
  blockDot(obs, vis, mid, MW, 2); blockDot(obs, vis, mid, G-MW, 2);
  blockDot(obs, vis, MW, mid, 2); blockDot(obs, vis, G-MW, mid, 2);

  // ── Central keep ──
  blockLine(obs, vis, IW, IW, G-IW, IW, 1, mid-2, mid+2);
  blockLine(obs, vis, IW, G-IW, G-IW, G-IW, 1, mid-2, mid+2);
  blockLine(obs, vis, IW, IW, IW, G-IW, 1, mid-2, mid+2);
  blockLine(obs, vis, G-IW, IW, G-IW, G-IW, 1, mid-2, mid+2);
  blockDot(obs, vis, IW, IW, 2); blockDot(obs, vis, G-IW, IW, 2);
  blockDot(obs, vis, IW, G-IW, 2); blockDot(obs, vis, G-IW, G-IW, 2);

  // ── Buildings (cover) ──
  // Outer courtyard barracks
  blockRect(obs, vis, OW+2, OW+2, OW+6, OW+6);
  blockRect(obs, vis, G-OW-6, OW+2, G-OW-2, OW+6);
  blockRect(obs, vis, OW+2, G-OW-6, OW+6, G-OW-2);
  blockRect(obs, vis, G-OW-6, G-OW-6, G-OW-2, G-OW-2);
  // Mid courtyard armouries
  blockRect(obs, vis, MW+2, MW+2, MW+6, MW+6);
  blockRect(obs, vis, G-MW-6, MW+2, G-MW-2, MW+6);
  blockRect(obs, vis, MW+2, G-MW-6, MW+6, G-MW-2);
  blockRect(obs, vis, G-MW-6, G-MW-6, G-MW-2, G-MW-2);

  // Clear spawn zones
  for (let x = MW+2; x <= MW+8; x++) for (let y = mid-6; y <= mid+6; y++) { obs.delete(K(x,y)); vis.delete(K(x,y)); }
  for (let x = G-MW-8; x <= G-MW-2; x++) for (let y = mid-6; y <= mid+6; y++) { obs.delete(K(x,y)); vis.delete(K(x,y)); }

  const MED = (f: string) => M('medieval', f);
  const props: PropPlacement[] = [
    // Central fortress
    { modelUrl: MED('fortress_full.glb'), x: mid*TS, z: mid*TS, rotY: 0, scale: 0.007 },
    // Outer corner towers
    { modelUrl: MED('tower_04_full.glb'), x: OW*TS, z: OW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: MED('tower_05_full.glb'), x: (G-OW)*TS, z: OW*TS, rotY: Math.PI/2, scale: 0.009 },
    { modelUrl: MED('tower_04_full.glb'), x: OW*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: MED('tower_05_full.glb'), x: (G-OW)*TS, z: (G-OW)*TS, rotY: -Math.PI/2, scale: 0.009 },
    // Outer walls
    { modelUrl: MED('wall_01_full.glb'), x: (OW+10)*TS, z: OW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: MED('wall_01_full.glb'), x: (G-OW-10)*TS, z: OW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: MED('wall_01_full.glb'), x: (OW+10)*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: MED('wall_01_full.glb'), x: (G-OW-10)*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: MED('wall_02_1.glb'), x: OW*TS, z: (OW+10)*TS, rotY: Math.PI/2, scale: 0.009 },
    { modelUrl: MED('wall_02_1.glb'), x: OW*TS, z: (G-OW-10)*TS, rotY: Math.PI/2, scale: 0.009 },
    { modelUrl: MED('wall_02_1.glb'), x: (G-OW)*TS, z: (OW+10)*TS, rotY: -Math.PI/2, scale: 0.009 },
    { modelUrl: MED('wall_02_1.glb'), x: (G-OW)*TS, z: (G-OW-10)*TS, rotY: -Math.PI/2, scale: 0.009 },
    // Outer gates
    { modelUrl: MED('minnor_gates_01.glb'), x: mid*TS, z: OW*TS, rotY: 0, scale: 0.009 },
    { modelUrl: MED('minnor_gates_02.glb'), x: mid*TS, z: (G-OW)*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: MED('minnor_gates_01.glb'), x: OW*TS, z: mid*TS, rotY: Math.PI/2, scale: 0.009 },
    { modelUrl: MED('minnor_gates_02.glb'), x: (G-OW)*TS, z: mid*TS, rotY: -Math.PI/2, scale: 0.009 },
    // Inner wall towers
    { modelUrl: MED('tower_03_1_full.glb'), x: MW*TS, z: MW*TS, rotY: 0, scale: 0.008 },
    { modelUrl: MED('tower_03_1_full.glb'), x: (G-MW)*TS, z: MW*TS, rotY: Math.PI/2, scale: 0.008 },
    { modelUrl: MED('tower_03_1_full.glb'), x: MW*TS, z: (G-MW)*TS, rotY: Math.PI, scale: 0.008 },
    { modelUrl: MED('tower_03_1_full.glb'), x: (G-MW)*TS, z: (G-MW)*TS, rotY: -Math.PI/2, scale: 0.008 },
    // Inner wall mid-towers
    { modelUrl: MED('tower_02_1.glb'), x: mid*TS, z: MW*TS, rotY: 0, scale: 0.008 },
    { modelUrl: MED('tower_02_1.glb'), x: mid*TS, z: (G-MW)*TS, rotY: Math.PI, scale: 0.008 },
    { modelUrl: MED('tower_02_1.glb'), x: MW*TS, z: mid*TS, rotY: Math.PI/2, scale: 0.008 },
    { modelUrl: MED('tower_02_1.glb'), x: (G-MW)*TS, z: mid*TS, rotY: -Math.PI/2, scale: 0.008 },
    // Inner gates
    { modelUrl: MED('minnor_gates_01.glb'), x: MW*TS, z: mid*TS, rotY: Math.PI/2, scale: 0.008 },
    { modelUrl: MED('minnor_gates_02.glb'), x: (G-MW)*TS, z: mid*TS, rotY: -Math.PI/2, scale: 0.008 },
    // Keep wall segments
    { modelUrl: MED('wall_01_full.glb'), x: mid*TS, z: IW*TS, rotY: 0, scale: 0.008 },
    { modelUrl: MED('wall_01_full.glb'), x: mid*TS, z: (G-IW)*TS, rotY: Math.PI, scale: 0.008 },
    // Keep corner towers
    { modelUrl: MED('tower_04_full.glb'), x: IW*TS, z: IW*TS, rotY: 0, scale: 0.007 },
    { modelUrl: MED('tower_05_full.glb'), x: (G-IW)*TS, z: IW*TS, rotY: Math.PI/2, scale: 0.007 },
    { modelUrl: MED('tower_04_full.glb'), x: IW*TS, z: (G-IW)*TS, rotY: Math.PI, scale: 0.007 },
    { modelUrl: MED('tower_05_full.glb'), x: (G-IW)*TS, z: (G-IW)*TS, rotY: -Math.PI/2, scale: 0.007 },
    // Barracks
    { modelUrl: MED('barracks.glb'), x: (OW+4)*TS, z: (OW+4)*TS, rotY: 0, scale: 0.008 },
    { modelUrl: MED('barracks.glb'), x: (G-OW-4)*TS, z: (OW+4)*TS, rotY: Math.PI/2, scale: 0.008 },
    { modelUrl: MED('barracks.glb'), x: (OW+4)*TS, z: (G-OW-4)*TS, rotY: Math.PI, scale: 0.008 },
    { modelUrl: MED('barracks.glb'), x: (G-OW-4)*TS, z: (G-OW-4)*TS, rotY: -Math.PI/2, scale: 0.008 },
    // Armouries
    { modelUrl: MED('ammourry.glb'), x: (MW+4)*TS, z: (MW+4)*TS, rotY: 0, scale: 0.008 },
    { modelUrl: MED('ammourry.glb'), x: (G-MW-4)*TS, z: (MW+4)*TS, rotY: Math.PI/2, scale: 0.008 },
    { modelUrl: MED('ammourry.glb'), x: (MW+4)*TS, z: (G-MW-4)*TS, rotY: Math.PI, scale: 0.008 },
    { modelUrl: MED('ammourry.glb'), x: (G-MW-4)*TS, z: (G-MW-4)*TS, rotY: -Math.PI/2, scale: 0.008 },
    // Stairs
    { modelUrl: MED('stairs_full1.glb'), x: mid*TS, z: (MW+3)*TS, rotY: 0, scale: 0.009 },
    { modelUrl: MED('stairs_full1.glb'), x: mid*TS, z: (G-MW-3)*TS, rotY: Math.PI, scale: 0.009 },
    // Braziers
    { modelUrl: MED('brazier.glb'), x: (IW+1)*TS, z: mid*TS, rotY: 0, scale: 0.010 },
    { modelUrl: MED('brazier.glb'), x: (G-IW-1)*TS, z: mid*TS, rotY: 0, scale: 0.010 },
    { modelUrl: MED('brazier.glb'), x: mid*TS, z: (IW+1)*TS, rotY: 0, scale: 0.010 },
    { modelUrl: MED('brazier.glb'), x: mid*TS, z: (G-IW-1)*TS, rotY: 0, scale: 0.010 },
    // Decorative
    { modelUrl: MED('firewoods.glb'), x: (MW+8)*TS, z: mid*TS, rotY: 0, scale: 0.010 },
    { modelUrl: MED('firewoods.glb'), x: (G-MW-8)*TS, z: mid*TS, rotY: Math.PI, scale: 0.010 },
    { modelUrl: MED('sentry_hurt.glb'), x: (MW+2)*TS, z: mid*TS, rotY: 0, scale: 0.009 },
    { modelUrl: MED('sentry_hurt.glb'), x: (G-MW-2)*TS, z: mid*TS, rotY: Math.PI, scale: 0.009 },
    { modelUrl: MED('props_full.glb'), x: (IW+3)*TS, z: (IW+3)*TS, rotY: 0, scale: 0.007 },
    { modelUrl: MED('props_full.glb'), x: (G-IW-3)*TS, z: (G-IW-3)*TS, rotY: Math.PI, scale: 0.007 },
    // Fences in mid courtyard
    { modelUrl: MED('fense_fyull.glb'), x: (MW+10)*TS, z: (MW+2)*TS, rotY: 0, scale: 0.008 },
    { modelUrl: MED('fense_fyull.glb'), x: (G-MW-10)*TS, z: (MW+2)*TS, rotY: Math.PI, scale: 0.008 },
    { modelUrl: MED('fense_fyull.glb'), x: (MW+10)*TS, z: (G-MW-2)*TS, rotY: 0, scale: 0.008 },
    { modelUrl: MED('fense_fyull.glb'), x: (G-MW-10)*TS, z: (G-MW-2)*TS, rotY: Math.PI, scale: 0.008 },
    // Bridge
    { modelUrl: MED('bridge_full.glb'), x: mid*TS, z: (OW-2)*TS, rotY: 0, scale: 0.009 },
    { modelUrl: MED('bridge_full.glb'), x: mid*TS, z: (G-OW+2)*TS, rotY: Math.PI, scale: 0.009 },
  ];

  return {
    id: 'medieval', name: 'Iron Bastion', theme: 'medieval',
    description: 'A compact medieval castle — two wall rings, buildings for cover, gate approaches.',
    gridW: G, gridH: G, tileSize: TS,
    skyColor: '#6090c0', fogColor: '#90b8d8', fogNear: 80, fogFar: 450,
    obstacleTiles: obs, visionBlockers: vis, props,
    playerSpawn: { xMin: MW+2, xMax: MW+8, yMin: mid-6, yMax: mid+6 },
    enemySpawn:  { xMin: G-MW-8, xMax: G-MW-2, yMin: mid-6, yMax: mid+6 },
    groundColor: '#202428', groundColor2: '#2a2e34',
    wallHeight: 4.2,
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

/** Returns the level merged with any saved map-editor data from localStorage */
export function getLevelWithEdits(id: string): LevelDef {
  const base = getLevelById(id);
  try {
    const raw = localStorage.getItem(`grudge-editor-${id}`);
    if (!raw) return base;
    const data = JSON.parse(raw) as { props?: PropPlacement[] };
    if (!data.props) return base;
    return { ...base, props: data.props };
  } catch {
    return base;
  }
}
