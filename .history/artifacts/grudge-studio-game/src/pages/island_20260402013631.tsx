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

    // Worker
    if (worker) {
      ctx.fillStyle = "#ffe066";
      ctx.beginPath();
      ctx.arc(worker.x * TILE_PX + TILE_PX / 2, worker.y * TILE_PX + TILE_PX / 2, TILE_PX * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#222";
      ctx.font = `${TILE_PX - 1}px serif`;
      ctx.fillText("👷", worker.x * TILE_PX + TILE_PX / 2, worker.y * TILE_PX + TILE_PX / 2);
    }
  }, [island, nodes, worker]);

