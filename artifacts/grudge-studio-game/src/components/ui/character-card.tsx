import { Character } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Shield, Swords, Zap, Heart, Info } from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { CHARACTER_LORE } from "@/lib/lore";

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

  const loreData = CHARACTER_LORE[character.id] || { 
    title: character.role, 
    quote: `"${character.lore.substring(0, 50)}..."`, 
    backstory: character.lore 
  };

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.02, y: -5 } : {}}
      onClick={onClick}
      className={cn(
        "relative flex flex-col bg-card border overflow-hidden rounded-sm transition-all duration-300 h-full",
        onClick ? "cursor-pointer" : "",
        selected 
          ? "border-primary shadow-[0_0_30px_rgba(218,165,32,0.4)] ring-2 ring-primary" 
          : "border-border hover:border-primary/50 hover:shadow-xl",
        className
      )}
    >
      {/* Rarity Banner Top */}
      <div className={cn("h-1 w-full absolute top-0 left-0 z-20", rarityColors[character.rarity].split(' ')[0].replace('text-', 'bg-'))} />
      
      {/* Portrait Section */}
      <div className="h-48 relative overflow-hidden bg-black/60 border-b border-white/10 shrink-0">
         <img 
           src={`${import.meta.env.BASE_URL}images/chars/${character.id}.png`}
           alt={character.name}
           className="w-full h-full object-cover opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all duration-500 hover:scale-110"
           onError={(e) => {
             (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMyMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgYWxpZ25tZW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiNmZmYiPj88L3RleHQ+PC9zdmc+';
           }}
         />
         <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
         
         <div className="absolute bottom-2 left-4 right-4 flex justify-between items-end">
            <h3 className="font-display font-bold text-xl leading-tight text-glow uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{character.name}</h3>
         </div>
      </div>

      <div className="p-4 flex flex-col flex-grow z-10 bg-card">
        
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={cn("text-[10px] px-1.5 py-0.5 uppercase tracking-wider font-bold border rounded-sm", factionColors[character.faction])}>
            {character.faction}
          </span>
          <span className={cn("text-[10px] px-1.5 py-0.5 uppercase tracking-wider font-bold border bg-black/40 rounded-sm", rarityColors[character.rarity])}>
            {character.rarity}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 uppercase tracking-wider text-muted-foreground border border-border bg-black/40 rounded-sm">
            {character.race}
          </span>
        </div>

        <p className="text-xs text-primary/80 font-bold mb-1 uppercase tracking-wider">{loreData.title}</p>
        <p className="text-xs text-muted-foreground italic mb-4 flex-grow border-l-2 border-primary/30 pl-2">
          {loreData.quote}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4 bg-black/40 p-2 rounded-sm border border-white/5 shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <Heart className="w-3 h-3 text-red-400" />
            <span className="font-mono">{character.hp} HP</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <Swords className="w-3 h-3 text-orange-400" />
            <span className="font-mono">{character.attack} ATK</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <Shield className="w-3 h-3 text-blue-400" />
            <span className="font-mono">{character.defense} DEF</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <Zap className="w-3 h-3 text-yellow-400" />
            <span className="font-mono">{character.speed} SPD</span>
          </div>
        </div>

        {/* Special Ability */}
        <div className="mt-auto border-t border-border/50 pt-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-primary font-bold tracking-wider mb-0.5">Special Ability</span>
              <span className="font-display font-bold text-sm leading-none">{character.specialAbility}</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help p-1 hover:bg-white/5 rounded-full transition-colors">
                  <Info className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs bg-popover border-border text-foreground p-3 z-50">
                <p className="text-sm font-bold mb-1 text-primary">{character.specialAbility}</p>
                <p className="text-xs mb-2">{character.specialAbilityDescription}</p>
                <div className="h-px w-full bg-white/10 my-2" />
                <p className="text-xs text-muted-foreground mb-1 font-bold">Lore Background:</p>
                <p className="text-xs text-muted-foreground">{loreData.backstory}</p>
                {character.weakness && (
                   <p className="mt-2 text-destructive font-bold text-xs uppercase">Weakness: {character.weakness}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
      
    </motion.div>
  );
}
