import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;
const UI = (path: string) => `${BASE}images/ui/${path}`;

interface HealthBarProps {
  current: number;
  max: number;
  label?: string;
  isEnemy?: boolean;
}

export function HealthBar({ current, max, label, isEnemy = false }: HealthBarProps) {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  const isLow = percentage <= 25;
  const isMid = percentage > 25 && percentage <= 50;

  return (
    <div className={cn("w-full flex flex-col gap-1", isEnemy ? "items-end" : "items-start")}>
      {label && (
        <div className="flex justify-between w-full items-baseline">
          <span className="font-display font-bold text-sm text-foreground tracking-wider">{label}</span>
          <span className="text-xs font-mono text-muted-foreground">{Math.ceil(current)} / {max}</span>
        </div>
      )}

      {/* Bar track — craftpix UnitFrame bar texture as background, darkened */}
      <div
        className="h-4 w-full rounded-sm overflow-hidden relative shadow-inner"
        style={{
          backgroundImage: `url('${UI("HUD/Unit Frames/Main/Bars/UnitFrame_Main_Bar_Primary_Fill.png")}')`,
          backgroundSize: "100% 100%",
          filter: "brightness(0.18) saturate(0.6)",
        }}
      >
        {/* Craftpix fill texture, hue-shifted for low HP */}
        <motion.div
          className="h-full relative"
          initial={{ width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          style={{
            backgroundImage: `url('${UI("HUD/Unit Frames/Main/Bars/UnitFrame_Main_Bar_Primary_Fill.png")}')`,
            backgroundSize: "100% 100%",
            filter: isLow
              ? "hue-rotate(240deg) saturate(2) brightness(1.2)"
              : isMid
              ? "hue-rotate(60deg) saturate(1.5) brightness(1.1)"
              : "hue-rotate(90deg) saturate(1.4) brightness(1.1)",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/30" />
        </motion.div>

        {/* Text overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[9px] font-bold font-mono text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
            {Math.ceil(current)}/{max}
          </span>
        </div>
      </div>
    </div>
  );
}

interface StatBarProps {
  current: number;
  max: number;
  label: string;
  fillClass: string;
  borderClass?: string;
}

export function StatBar({ current, max, label, fillClass, borderClass = "border-white/10" }: StatBarProps) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const isMana = fillClass.includes("blue");

  return (
    <div className="w-full flex flex-col gap-0.5">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/55">{label}</span>
        <span className="text-[10px] font-mono text-white/40">{Math.ceil(current)}/{max}</span>
      </div>
      {/* Track */}
      <div
        className={cn("h-2 w-full border rounded-sm overflow-hidden", borderClass)}
        style={{
          backgroundImage: `url('${UI(
            isMana
              ? "HUD/Unit Frames/Main/Bars/UnitFrame_Main_Bar_Secondary_Fill.png"
              : "HUD/Unit Frames/Main/Bars/UnitFrame_Main_Bar_Primary_Fill.png"
          )}')`,
          backgroundSize: "100% 100%",
          filter: "brightness(0.15) saturate(0.4)",
        }}
      >
        <motion.div
          initial={{ width: `${pct}%` }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
          style={{
            height: "100%",
            backgroundImage: `url('${UI(
              isMana
                ? "HUD/Unit Frames/Main/Bars/UnitFrame_Main_Bar_Secondary_Fill.png"
                : "HUD/Unit Frames/Main/Bars/UnitFrame_Main_Bar_Primary_Fill.png"
            )}')`,
            backgroundSize: "100% 100%",
            filter: isMana
              ? "hue-rotate(160deg) saturate(1.8) brightness(1.2)"
              : "hue-rotate(20deg) saturate(1.6) brightness(1.1)",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/20" />
        </motion.div>
      </div>
    </div>
  );
}

interface ActionBarProps {
  ct: number;
  speed: number;
  isActive?: boolean;
}

export function ActionBar({ ct, speed, isActive = false }: ActionBarProps) {
  const pct = Math.max(0, Math.min(100, ct));
  const isFull = pct >= 100;

  return (
    <div className="w-full flex flex-col gap-0.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
          <svg className="w-2.5 h-2.5 fill-amber-400" viewBox="0 0 24 24">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          Action
        </span>
        <span className={cn("text-[10px] font-mono", isFull ? "text-amber-300 font-bold" : "text-white/40")}>
          {isActive ? "ACTING" : isFull ? "READY!" : `${Math.round(pct)}%`}
        </span>
      </div>

      <div
        className="relative h-3 w-full rounded-sm overflow-hidden border border-amber-900/50"
        style={{
          backgroundImage: `url('${UI("HUD/Unit Frames/Main/Bars/UnitFrame_Main_Bar_Primary_Fill.png")}')`,
          backgroundSize: "100% 100%",
          filter: "brightness(0.15) hue-rotate(30deg)",
        }}
      >
        <motion.div
          className={cn(
            "h-full relative",
            isFull
              ? "bg-gradient-to-r from-amber-500 to-yellow-300"
              : "bg-gradient-to-r from-amber-800 to-amber-600",
          )}
          initial={{ width: `${pct}%` }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/25" />
          {isFull && (
            <div className="absolute inset-0 animate-pulse opacity-60 bg-yellow-200 mix-blend-screen" />
          )}
        </motion.div>

        {[25, 50, 75].map(p => (
          <div key={p} className="absolute top-0 bottom-0 w-px bg-black/40 pointer-events-none" style={{ left: `${p}%` }} />
        ))}
      </div>

      <div className="text-[9px] text-white/25 font-mono">SPD {speed}</div>
    </div>
  );
}
