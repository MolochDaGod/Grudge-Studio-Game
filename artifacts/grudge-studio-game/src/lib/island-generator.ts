// ─────────────────────────────────────────────────────────────
// SEEDED PROCEDURAL ISLAND GENERATOR — pure TS, zero deps
// ─────────────────────────────────────────────────────────────

export type TileType = 'water' | 'beach' | 'grass' | 'forest' | 'rock';
export type ResourceKind =
  | 'gem' | 'berry' | 'herb' | 'hemp' | 'fish'
  | 'hare' | 'deer' | 'market' | 'hero_chat';

export interface ResourceNode {
  id: string;
  kind: ResourceKind;
  x: number; y: number;
  depleted: boolean;
  qty: number; maxQty: number;
  respawnAt: number; // Date.now() ms; 0 = available
}

export interface Island {
  seed: string;
  gridW: number; gridH: number;
  tiles: TileType[][];   // [row][col]
  nodes: ResourceNode[];
}

// ── Seeded PRNG (Mulberry32 / FNV hash) ──────────────────────
function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

export function makePrng(seed: string) {
  let s = hashStr(seed) >>> 0;
  return (): number => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Value noise (bilinear + octaves) ─────────────────────────
function makeGrid(rng: () => number, n: number): number[][] {
  return Array.from({ length: n }, () => Array.from({ length: n }, rng));
}

function biSample(g: number[][], u: number, v: number): number {
  const n = g.length;
  const x0 = Math.floor(u) % n, x1 = (x0 + 1) % n;
  const y0 = Math.floor(v) % n, y1 = (y0 + 1) % n;
  const tx = u - Math.floor(u), ty = v - Math.floor(v);
  return (g[y0][x0] * (1 - tx) + g[y0][x1] * tx) * (1 - ty)
       + (g[y1][x0] * (1 - tx) + g[y1][x1] * tx) * ty;
}

function octave(rng: () => number, W: number, H: number, octs: number): number[][] {
  const grids = Array.from({ length: octs }, (_, o) => makeGrid(rng, 4 * (1 << o)));
  return Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => {
      let val = 0, amp = 1, norm = 0, freq = 1;
      for (let o = 0; o < octs; o++) {
        const n = grids[o].length;
        val += biSample(grids[o], (x / W) * n * freq, (y / H) * n * freq) * amp;
        norm += amp; amp *= 0.5; freq *= 2;
      }
      return val / norm;
    })
  );
}

// ── Biome classification ─────────────────────────────────────
function classify(elev: number, moist: number): TileType {
  if (elev < 0.28) return 'water';
  if (elev < 0.36) return 'beach';
  if (elev > 0.72) return 'rock';
  if (moist > 0.58 && elev < 0.70) return 'forest';
  return 'grass';
}

// ── Spacing check (Poisson-disc style) ───────────────────────
function tooClose(nodes: ResourceNode[], x: number, y: number, d: number): boolean {
  return nodes.some(n => Math.hypot(n.x - x, n.y - y) < d);
}

// ── Resource placement ────────────────────────────────────────
function placeNodes(rng: () => number, tiles: TileType[][], W: number, H: number): ResourceNode[] {
  const nodes: ResourceNode[] = [];
  let uid = 0;
  const mk = (kind: ResourceKind, x: number, y: number, qty: number): ResourceNode =>
    ({ id: `${kind}_${uid++}`, kind, x, y, depleted: false, qty, maxQty: qty, respawnAt: 0 });

  const by: Record<TileType, Array<[number, number]>> = { water: [], beach: [], grass: [], forest: [], rock: [] };
  for (let y = 3; y < H - 3; y++)
    for (let x = 3; x < W - 3; x++)
      by[tiles[y][x]].push([x, y]);

  function shuffle(arr: Array<[number, number]>): Array<[number, number]> {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function pickN(pool: Array<[number, number]>, count: number, minD: number, kind: ResourceKind, qty: number) {
    let placed = 0;
    for (const [x, y] of shuffle([...pool])) {
      if (placed >= count) break;
      if (tooClose(nodes, x, y, minD)) continue;
      nodes.push(mk(kind, x, y, qty));
      placed++;
    }
  }

  pickN(by.rock,   3, 5, 'gem',   3);
  pickN(by.grass,  3, 4, 'berry', 5);
  pickN(by.forest, 3, 4, 'herb',  4);
  pickN(by.grass,  1, 6, 'hemp',  8);
  pickN(by.beach,  3, 4, 'fish',  6);
  pickN(by.forest, 2, 5, 'hare',  0);
  pickN(by.grass,  1, 7, 'deer',  0);

  const cx = Math.floor(W / 2), cy = Math.floor(H / 2);
  nodes.push(mk('market',    cx,   cy + 4, 0));
  nodes.push(mk('hero_chat', cx + 4, cy,   0));
  return nodes;
}

// ── Main export ───────────────────────────────────────────────
export function generateIsland(seed: string, W = 64, H = 64): Island {
  const rng  = makePrng(seed);
  const rng2 = makePrng(seed + '_m');
  const elev  = octave(rng,  W, H, 4);
  const moist = octave(rng2, W, H, 3);

  const cx = W / 2, cy = H / 2, maxR = Math.min(W, H) * 0.48;
  const tiles: TileType[][] = Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) =>
      classify(elev[y][x] - (Math.hypot(x - cx, y - cy) / maxR) * 0.8, moist[y][x])
    )
  );
  return { seed, gridW: W, gridH: H, tiles, nodes: placeNodes(rng, tiles, W, H) };
}

// ── Persistence ───────────────────────────────────────────────
const STORE_KEY = 'grudge-island';

export interface IslandState {
  seed: string;
  nodes: Array<{ id: string; qty: number; depleted: boolean; respawnAt: number }>;
}

export function saveIslandState(island: Island) {
  localStorage.setItem(STORE_KEY, JSON.stringify({
    seed: island.seed,
    nodes: island.nodes.map(({ id, qty, depleted, respawnAt }) => ({ id, qty, depleted, respawnAt })),
  } satisfies IslandState));
}

export function loadIslandState(): IslandState | null {
  try { const r = localStorage.getItem(STORE_KEY); return r ? JSON.parse(r) : null; }
  catch { return null; }
}

export function applyIslandState(island: Island, state: IslandState): Island {
  if (state.seed !== island.seed) return island;
  const map = new Map(state.nodes.map(n => [n.id, n]));
  return { ...island, nodes: island.nodes.map(n => ({ ...n, ...(map.get(n.id) ?? {}) })) };
}

