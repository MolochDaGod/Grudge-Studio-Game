import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HealthBarProps {
  current: number;
  max: number;
  label?: string;
  isEnemy?: boolean;
}

export function HealthBar({ current, max, label, isEnemy = false }: HealthBarProps) {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  
  let colorClass = "bg-green-600";
  if (percentage <= 25) colorClass = "bg-destructive";
  else if (percentage <= 50) colorClass = "bg-yellow-500";

  return (
    <div className={cn("w-full flex flex-col gap-1", isEnemy ? "items-end" : "items-start")}>
      {label && (
        <div className="flex justify-between w-full items-baseline">
          <span className="font-display font-bold text-sm text-foreground tracking-wider">{label}</span>
          <span className="text-xs font-mono text-muted-foreground">{Math.ceil(current)} / {max}</span>
        </div>
      )}
      
      <div className="h-4 w-full bg-black border border-border rounded-sm overflow-hidden relative shadow-inner">
        <div className="absolute inset-0 bg-secondary/30" />
        <motion.div 
          className={cn("h-full relative shadow-[0_0_10px_rgba(0,0,0,0.5)]", colorClass)}
          initial={{ width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          style={{ transformOrigin: isEnemy ? "right" : "left" }}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/30" />
        </motion.div>
      </div>
    </div>
  );
}

// ─── Generic stat bar (mana, stamina, etc.) ───────────────────────────────────
interface StatBarProps {
  current: number;
  max: number;
  label: string;
  /** Tailwind bg-* class for the fill colour */
  fillClass: string;
  /** Tailwind border-* class for the track border */
  borderClass?: string;
}

export function StatBar({ current, max, label, fillClass, borderClass = "border-white/10" }: StatBarProps) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div className="w-full flex flex-col gap-0.5">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/55">{label}</span>
        <span className="text-[10px] font-mono text-white/40">{Math.ceil(current)}/{max}</span>
      </div>
      <div className={cn("h-2 w-full bg-black border rounded-sm overflow-hidden", borderClass)}>
        <motion.div
          className={cn("h-full", fillClass)}
          initial={{ width: `${pct}%` }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        >
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/20" />
        </motion.div>
      </div>
    </div>
  );
}

// ─── Action bar (CT charge / turn readiness) ─────────────────────────────────
interface ActionBarProps {
  /** Current CT value 0-100 */
  ct: number;
  speed: number;
  /** Is this unit currently taking its turn? */
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

      <div className="relative h-3 w-full bg-black border border-amber-900/50 rounded-sm overflow-hidden">
        <div className="absolute inset-0 bg-amber-950/20" />

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
            <div className="absolute inset-0 animate-pulse opacity-50 bg-yellow-200 mix-blend-screen" />
          )}
        </motion.div>

        {/* Segment tick marks at 25 / 50 / 75% */}
        {[25, 50, 75].map(p => (
          <div
            key={p}
            className="absolute top-0 bottom-0 w-px bg-black/40 pointer-events-none"
            style={{ left: `${p}%` }}
          />
        ))}
      </div>

      <div className="text-[9px] text-white/25 font-mono">SPD {speed}</div>
    </div>
  );
}
