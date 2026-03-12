import { Character } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Shield, Swords, Zap, Heart, Info } from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

interface CharacterCardProps {
  character: Character;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export function CharacterCard({ character, onClick, selected, className }: CharacterCardProps) {
  
  const rarityColors = {
    common: "text-gray-400 border-gray-400",
    uncommon: "text-green-400 border-green-400",
    rare: "text-blue-400 border-blue-400",
    legendary: "text-primary border-primary shadow-[0_0_10px_rgba(218,165,32,0.3)]",
  };

  const factionColors = {
    hero: "bg-blue-950/40 text-blue-200 border-blue-900/50",
    villain: "bg-red-950/40 text-red-200 border-red-900/50",
    neutral: "bg-gray-800/40 text-gray-200 border-gray-700/50",
  };

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.02, y: -5 } : {}}
      onClick={onClick}
      className={cn(
        "relative flex flex-col bg-card border overflow-hidden rounded-sm transition-all duration-300",
        onClick ? "cursor-pointer" : "",
        selected 
          ? "border-primary shadow-[0_0_30px_rgba(218,165,32,0.2)] ring-1 ring-primary" 
          : "border-border hover:border-primary/50 hover:shadow-xl",
        className
      )}
    >
      {/* Rarity Banner Top */}
      <div className={cn("h-1 w-full", rarityColors[character.rarity].split(' ')[0].replace('text-', 'bg-'))} />
      
      <div className="p-5 flex flex-col h-full z-10">
        
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-display font-bold text-xl leading-tight text-glow uppercase">{character.name}</h3>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={cn("text-xs px-2 py-1 uppercase tracking-wider font-bold border", factionColors[character.faction])}>
            {character.faction}
          </span>
          <span className={cn("text-xs px-2 py-1 uppercase tracking-wider font-bold border bg-black/40", rarityColors[character.rarity])}>
            {character.rarity}
          </span>
          <span className="text-xs px-2 py-1 uppercase tracking-wider text-muted-foreground border border-border bg-black/40">
            {character.race}
          </span>
        </div>

        <p className="text-sm text-muted-foreground italic mb-6 flex-grow border-l-2 border-primary/30 pl-3">
          "{character.lore.substring(0, 120)}..."
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4 bg-black/40 p-3 rounded-sm border border-white/5">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Heart className="w-4 h-4 text-red-400" />
            <span className="font-mono">{character.hp} HP</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Swords className="w-4 h-4 text-orange-400" />
            <span className="font-mono">{character.attack} ATK</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="font-mono">{character.defense} DEF</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="font-mono">{character.speed} SPD</span>
          </div>
        </div>

        {/* Special Ability */}
        <div className="mt-auto border-t border-border/50 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs uppercase text-primary font-bold tracking-wider mb-1">Special Ability</span>
              <span className="font-display font-bold text-sm">{character.specialAbility}</span>
            </div>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-popover border-border text-foreground p-3">
                <p>{character.specialAbilityDescription}</p>
                <p className="mt-2 text-destructive font-bold text-xs uppercase">Weakness: {character.weakness}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
      
      {/* Background Decor */}
      <div className="absolute -bottom-10 -right-10 text-9xl opacity-[0.02] font-display pointer-events-none">
        {character.name.charAt(0)}
      </div>
    </motion.div>
  );
}
