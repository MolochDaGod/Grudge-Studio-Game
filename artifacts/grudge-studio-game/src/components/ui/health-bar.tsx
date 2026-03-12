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
  
  // Determine color based on health percentage
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
        {/* Track background */}
        <div className="absolute inset-0 bg-secondary/30" />
        
        {/* Animated fill */}
        <motion.div 
          className={cn("h-full relative shadow-[0_0_10px_rgba(0,0,0,0.5)]", colorClass)}
          initial={{ width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          style={{ transformOrigin: isEnemy ? "right" : "left" }}
        >
          {/* Highlight top edge */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/30" />
        </motion.div>
      </div>
    </div>
  );
}
