import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import {
  generateIsland, saveIslandState, loadIslandState, applyIslandState,
  type Island, type ResourceNode, type ResourceKind,
} from "@/lib/island-generator";

// ── Constants ──────────────────────────────────────────────────────────────
const TILE_PX   = 9;
const RESPAWN_MS = 30_000;

const TILE_COLORS: Record<string, string> = {
  water: "#1a3a5c", beach: "#c2a96e", grass: "#4a7c3f",
  forest: "#2d5a27", rock: "#6b6b6b",
};

const NODE_EMOJI: Record<ResourceKind, string> = {
  gem: "💎", berry: "🍒", herb: "🌿", hemp: "🌾", fish: "🐟",
  hare: "🐇", deer: "🦌", market: "🏪", hero_chat: "💬",
};

const HARVESTABLE: ResourceKind[] = ["gem","berry","herb","hemp","fish","hare","deer"];

// ── Worker ─────────────────────────────────────────────────────────────────
type WorkerStatus = "idle" | "moving" | "harvesting" | "returning" | "depositing";
interface Worker {
  x: number; y: number;
  tx: number; ty: number;  // target
  status: WorkerStatus;
  targetNodeId: string | null;
  inventory: Partial<Record<ResourceKind, number>>;
  progress: number;
  marketX: number; marketY: number;
}

function initWorker(island: Island): Worker {
  const mkt = island.nodes.find(n => n.kind === "market");
  const mx = mkt?.x ?? Math.floor(island.gridW / 2);
  const my = mkt?.y ?? Math.floor(island.gridH / 2);
  return { x: mx, y: my, tx: mx, ty: my, status: "idle", targetNodeId: null,
    inventory: {}, progress: 0, marketX: mx, marketY: my };
}

// ── Island page component ──────────────────────────────────────────────────
export default function IslandPage() {
  const [seed, setSeed]   = useState("grudge-island-1");
  const [island, setIsland] = useState<Island | null>(null);
  const [nodes, setNodes] = useState<ResourceNode[]>([]);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [selected, setSelected] = useState<ResourceNode | null>(null);
  const [totalHarvested, setTotalHarvested] = useState<Partial<Record<ResourceKind,number>>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef  = useRef<ResourceNode[]>([]);
  const workerRef = useRef<Worker | null>(null);
  nodesRef.current  = nodes;
  workerRef.current = worker;

  // Generate island from seed
  const generate = useCallback((s: string) => {
    const isl = generateIsland(s);
    const saved = loadIslandState();
    const final = saved?.seed === s ? applyIslandState(isl, saved) : isl;
    setIsland(final);
    setNodes(final.nodes);
    setWorker(initWorker(final));
    setSelected(null);
    setTotalHarvested({});
  }, []);

  useEffect(() => { generate(seed); }, []); // eslint-disable-line

  // Auto-save when nodes change
  useEffect(() => {
    if (!island || nodes.length === 0) return;
    saveIslandState({ ...island, nodes });
  }, [nodes, island]);

  // Canvas render
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs || !island) return;
    const ctx = cvs.getContext("2d")!;
    cvs.width  = island.gridW * TILE_PX;
    cvs.height = island.gridH * TILE_PX;

    // Tiles
    for (let y = 0; y < island.gridH; y++)
      for (let x = 0; x < island.gridW; x++) {
        ctx.fillStyle = TILE_COLORS[island.tiles[y][x]];
        ctx.fillRect(x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX);
      }

    // Nodes
    ctx.font = `${TILE_PX + 2}px serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const n of nodes) {
      if (n.depleted) { ctx.globalAlpha = 0.25; }
      ctx.fillText(NODE_EMOJI[n.kind], n.x * TILE_PX + TILE_PX / 2, n.y * TILE_PX + TILE_PX / 2);
        ctx.globalAlpha = 1;
    }
  }, [island, nodes, worker]);

  // Worker AI tick (500ms)
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setNodes(prev => prev.map(n =>
        n.depleted && n.respawnAt && now >= n.respawnAt
          ? { ...n, depleted: false, qty: n.maxQty, respawnAt: 0 }
          : n
      ));

      setWorker(prev => {
        if (!prev) return prev;
        const ns = nodesRef.current;
        const w = { ...prev };

        if (w.status === "idle") {
          const targets = ns.filter(n => HARVESTABLE.includes(n.kind) && !n.depleted);
          if (!targets.length) return w;
          const t = targets[Math.floor(Math.random() * targets.length)];
          w.tx = t.x; w.ty = t.y; w.targetNodeId = t.id; w.status = "moving";
        }

        if (w.status === "moving") {
          const dx = w.tx - w.x, dy = w.ty - w.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 1) {
            w.x = w.tx; w.y = w.ty;
            w.status = w.targetNodeId ? "harvesting" : "depositing";
            w.progress = 0;
          } else {
            const speed = 1.5;
            w.x += (dx / dist) * speed;
            w.y += (dy / dist) * speed;
          }
        }

        if (w.status === "harvesting") {
          w.progress += 0.2;
          if (w.progress >= 1) {
            const node = ns.find(n => n.id === w.targetNodeId);
            if (node && !node.depleted) {
              const harvested = 1;
              w.inventory = { ...w.inventory, [node.kind]: (w.inventory[node.kind] ?? 0) + harvested };
              const newQty = node.qty - harvested;
              setNodes(nds => nds.map(n => n.id === node.id
                ? { ...n, qty: newQty, depleted: newQty <= 0, respawnAt: newQty <= 0 ? Date.now() + RESPAWN_MS : 0 }
                : n
              ));
              setTotalHarvested(th => ({ ...th, [node.kind]: (th[node.kind] ?? 0) + harvested }));
            }
            w.tx = w.marketX; w.ty = w.marketY; w.targetNodeId = null; w.status = "returning"; w.progress = 0;
          }
        }

        if (w.status === "returning") {
          const dx = w.tx - w.x, dy = w.ty - w.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 1) { w.x = w.tx; w.y = w.ty; w.status = "depositing"; w.progress = 0; }
          else { w.x += (dx / dist) * 1.5; w.y += (dy / dist) * 1.5; }
        }

        if (w.status === "depositing") {
          w.progress += 0.3;
          if (w.progress >= 1) { w.inventory = {}; w.status = "idle"; w.progress = 0; }
        }

        return w;
      });
    }, 500);
    return () => clearInterval(id);
  }, []);

  // Canvas click → select node
  const onCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!island) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = Math.floor((e.clientX - rect.left) / TILE_PX);
    const cy = Math.floor((e.clientY - rect.top)  / TILE_PX);
    const hit = nodes.find(n => Math.abs(n.x - cx) <= 1 && Math.abs(n.y - cy) <= 1);
    setSelected(hit ?? null);
  }, [island, nodes]);

  const inventoryEntries = worker ? Object.entries(worker.inventory).filter(([,v]) => v > 0) : [];
  const harvestedEntries = Object.entries(totalHarvested).filter(([,v]) => v > 0);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex flex-col items-center py-6 px-4 gap-6">
      {/* Header */}
      <div className="flex items-center gap-4 w-full max-w-3xl">
        <Link href="/">
          <button type="button" className="text-white/60 hover:text-white text-sm border border-white/20 px-3 py-1 rounded">← Back</button>
        </Link>
        <h1 className="text-2xl font-display font-bold tracking-widest uppercase text-primary">🏝 Island Explorer</h1>
      </div>

      {/* Seed controls */}
      <div className="flex gap-3 items-center w-full max-w-3xl">
        <input
          className="flex-1 bg-black/40 border border-white/20 rounded px-3 py-2 text-sm font-mono"
          value={seed} onChange={e => setSeed(e.target.value)}
          placeholder="Enter island seed…"
        />
        <button type="button" onClick={() => generate(seed)}
          className="bg-primary text-black font-bold px-4 py-2 rounded hover:brightness-110 text-sm">
          Generate
        </button>
        <button type="button" onClick={() => { const s = Math.random().toString(36).slice(2, 10); setSeed(s); generate(s); }}
          className="bg-white/10 border border-white/20 px-3 py-2 rounded text-sm hover:bg-white/20">
          🎲 Random
        </button>
      </div>

      {/* Canvas + info row */}
      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-5xl items-start">
        <div className="rounded-lg overflow-hidden border border-white/10 shadow-2xl cursor-crosshair flex-shrink-0">
          <canvas ref={canvasRef} onClick={onCanvasClick} className="block" />
        </div>

        <div className="flex flex-col gap-4 flex-1 min-w-[200px]">
          {/* Legend */}
          <div className="bg-white/5 border border-white/10 rounded p-3">
            <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Legend</p>
            <div className="grid grid-cols-2 gap-1 text-sm">
              {(Object.entries(NODE_EMOJI) as [ResourceKind, string][]).map(([k, e]) => (
                <span key={k}>{e} {k}</span>
              ))}
            </div>
            <div className="mt-2 text-sm">👷 Worker</div>
          </div>

          {/* Worker status */}
          {worker && (
            <div className="bg-white/5 border border-white/10 rounded p-3 text-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-1">Worker</p>
              <p>Status: <span className="text-yellow-300 font-bold">{worker.status}</span></p>
              {inventoryEntries.length > 0 && (
                <p className="mt-1">Carrying: {inventoryEntries.map(([k,v]) => `${NODE_EMOJI[k as ResourceKind]}×${v}`).join(" ")}</p>
              )}
            </div>
          )}

          {/* Totals */}
          {harvestedEntries.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded p-3 text-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-1">Total Harvested</p>
              {harvestedEntries.map(([k, v]) => (
                <div key={k}>{NODE_EMOJI[k as ResourceKind]} {k}: <span className="text-green-400 font-bold">{v}</span></div>
              ))}
            </div>
          )}

          {/* Node detail */}
          {selected && (
            <div className="bg-white/5 border border-primary/40 rounded p-3 text-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-1">Selected Node</p>
              <p className="text-lg">{NODE_EMOJI[selected.kind]} <span className="font-bold">{selected.kind}</span></p>
              <p>Position: ({selected.x}, {selected.y})</p>
              {selected.maxQty > 0 && <p>Qty: {selected.qty}/{selected.maxQty}</p>}
              {selected.depleted && <p className="text-red-400">⏳ Respawning…</p>}
            </div>
          )}

          {/* Node list */}
          <div className="bg-white/5 border border-white/10 rounded p-3 text-sm max-h-48 overflow-y-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">All Nodes ({nodes.length})</p>
            {nodes.map(n => (
              <div key={n.id} onClick={() => setSelected(n)}
                className={`flex items-center gap-2 py-0.5 cursor-pointer hover:text-white ${n.depleted ? "text-white/30" : "text-white/80"}`}>
                <span>{NODE_EMOJI[n.kind]}</span>
                <span className="flex-1">{n.kind}</span>
                {n.maxQty > 0 && <span className="text-white/40 text-xs">{n.qty}/{n.maxQty}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
