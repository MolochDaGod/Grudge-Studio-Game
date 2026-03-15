import { useEffect, useRef, useState, useCallback } from "react";
import { TacticalUnit } from "@/store/use-game-store";
import { Map } from "lucide-react";

interface MinimapProps {
  units: TacticalUnit[];
  gridW: number;
  gridH: number;
  tileSize: number;
  currentUnitId: string | null;
  onFocusTile?: (wx: number, wz: number) => void;
  obstacles?: Set<string>;
}

const W = 160;
const H = 120;

export function Minimap({ units, gridW, gridH, currentUnitId, onFocusTile, obstacles }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cellW = W / gridW;
    const cellH = H / gridH;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "rgba(0,0,0,0.82)";
    ctx.fillRect(0, 0, W, H);

    // Grid tiles (checkerboard)
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        if (obstacles?.has(`${x},${y}`)) {
          ctx.fillStyle = "rgba(80,40,20,0.8)";
        } else {
          ctx.fillStyle = (x + y) % 2 === 0 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)";
        }
        ctx.fillRect(x * cellW + 0.5, y * cellH + 0.5, cellW - 1, cellH - 1);
      }
    }

    // Units
    for (const u of units) {
      if (u.hp <= 0) continue;
      const px = u.position.x * cellW + cellW / 2;
      const py = u.position.y * cellH + cellH / 2;
      const r = Math.max(2.5, Math.min(cellW, cellH) * 0.38);

      const isActive = u.id === currentUnitId;

      if (isActive) {
        // Outer glow
        ctx.beginPath();
        ctx.arc(px, py, r + 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,215,0,0.25)";
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = isActive
        ? "#ffd700"
        : u.isPlayerControlled
        ? "#22c55e"
        : "#ef4444";
      ctx.fill();

      // HP arc (remaining HP as arc around unit)
      const hpPct = u.hp / u.maxHp;
      ctx.beginPath();
      ctx.arc(px, py, r + 1.5, -Math.PI / 2, -Math.PI / 2 + hpPct * Math.PI * 2);
      ctx.strokeStyle = u.isPlayerControlled ? "#4ade80" : "#f87171";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
  }, [units, gridW, gridH, currentUnitId, obstacles]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onFocusTile) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const tileX = (mx / W) * gridW;
    const tileY = (my / H) * gridH;
    // Convert tile to world coords (approximate — tileSize is implicit)
    onFocusTile(tileX * 2, tileY * 2);
  };

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center gap-1 text-[9px] text-white/35 uppercase tracking-wider hover:text-white/60 transition-colors px-1"
      >
        <Map className="w-2.5 h-2.5" />
        {collapsed ? "Map" : "Hide"}
      </button>
      {!collapsed && (
        <div className="relative rounded-sm overflow-hidden border border-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onClick={handleClick}
            style={{ display: "block", cursor: onFocusTile ? "crosshair" : "default" }}
          />
          {/* Legend */}
          <div className="absolute bottom-1 left-1 flex items-center gap-2 pointer-events-none">
            <div className="flex items-center gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[7px] text-white/40">Ally</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-[7px] text-white/40">Enemy</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              <span className="text-[7px] text-white/40">Active</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
