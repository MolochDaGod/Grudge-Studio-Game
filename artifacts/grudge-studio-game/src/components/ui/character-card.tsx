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

const FACTION_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  Crusade:  { label: "Crusade",  bg: "bg-blue-950/40",   text: "text-blue-200",   border: "border-blue-700/60" },
  Fabled:   { label: "Fabled",   bg: "bg-purple-950/40", text: "text-purple-200", border: "border-purple-700/60" },
  Legion:   { label: "Legion",   bg: "bg-red-950/40",    text: "text-red-200",    border: "border-red-700/60" },
  Pirates:  { label: "Pirates",  bg: "bg-amber-950/40",  text: "text-amber-300",  border: "border-amber-600/60" },
  hero:     { label: "Hero",     bg: "bg-blue-950/40",   text: "text-blue-200",   border: "border-blue-900/50" },
  villain:  { label: "Villain",  bg: "bg-red-950/40",    text: "text-red-200",    border: "border-red-900/50" },
  neutral:  { label: "Neutral",  bg: "bg-gray-800/40",   text: "text-gray-200",   border: "border-gray-700/50" },
};

const CLASS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  Warrior: { label: "Warrior", color: "text-red-400",    icon: "⚔" },
  Worg:    { label: "Worg",    color: "text-orange-400", icon: "🐺" },
  Mage:    { label: "Mage",    color: "text-purple-400", icon: "✦" },
  Ranger:  { label: "Ranger",  color: "text-green-400",  icon: "🏹" },
};

const RARITY_CONFIG: Record<string, string> = {
  common:    "text-gray-400 border-gray-400",
  uncommon:  "text-green-400 border-green-400",
  rare:      "text-blue-400 border-blue-400",
  epic:      "text-purple-400 border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.25)]",
  legendary: "text-primary border-primary shadow-[0_0_10px_rgba(218,165,32,0.3)]",
};

const RARITY_TOP_BAR: Record<string, string> = {
  common:    "bg-gray-400",
  uncommon:  "bg-green-400",
  rare:      "bg-blue-400",
  epic:      "bg-purple-400",
  legendary: "bg-primary",
};

const RACE_FACTION_COLORS: Record<string, string> = {
  Human:     "#94a3b8",
  Barbarian: "#f43f5e",
  Dwarf:     "#f59e0b",
  Elf:       "#22d3ee",
  Orc:       "#65a30d",
  Undead:    "#a78bfa",
};

export function CharacterCard({ character, onClick, selected, className }: CharacterCardProps) {
  const rarityClass = RARITY_CONFIG[character.rarity] ?? RARITY_CONFIG.common;
  const topBarClass = RARITY_TOP_BAR[character.rarity] ?? RARITY_TOP_BAR.common;
  const factionCfg = FACTION_CONFIG[character.faction] ?? FACTION_CONFIG.neutral;
  const classCfg = CLASS_CONFIG[character.role] ?? { label: character.role, color: "text-muted-foreground", icon: "◆" };
  const raceColor = RACE_FACTION_COLORS[character.race] ?? "#888";

  const loreData = CHARACTER_LORE[character.id] ?? {
    title: character.role,
    quote: `"${character.lore.substring(0, 60)}..."`,
    backstory: character.lore,
  };

  const isSecret = character.faction === "Pirates";

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
      {/* Rarity Bar Top */}
      <div className={cn("h-1 w-full absolute top-0 left-0 z-20", topBarClass)} />

      {/* Secret Hero Badge */}
      {isSecret && (
        <div className="absolute top-3 right-3 z-30 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[9px] font-black uppercase tracking-wider rounded-sm">
          SECRET
        </div>
      )}

      {/* Portrait Section */}
      <div className="h-52 relative overflow-hidden bg-black/60 border-b border-white/10 shrink-0">
        <img
          src={`${import.meta.env.BASE_URL}images/chars/${character.id}.png`}
          alt={character.name}
          className="w-full h-full object-cover object-top opacity-90 hover:opacity-100 hover:scale-105 transition-all duration-500"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.style.display = "none";
            const parent = el.parentElement;
            if (parent && !parent.querySelector(".portrait-fallback")) {
              const fb = document.createElement("div");
              fb.className = "portrait-fallback absolute inset-0 flex items-center justify-center";
              fb.style.background = `linear-gradient(135deg, ${raceColor}22, #0a0a0f)`;
              fb.innerHTML = `<span style="font-size:4rem;opacity:0.5">${classCfg.icon}</span>`;
              parent.appendChild(fb);
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />

        {/* Name Overlay */}
        <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end z-10">
          <h3 className="font-display font-bold text-lg leading-tight text-glow uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] line-clamp-2">
            {character.name}
          </h3>
        </div>
      </div>

      <div className="p-3 flex flex-col flex-grow z-10 bg-card">
        {/* Tags Row */}
        <div className="flex flex-wrap gap-1 mb-2">
          <span className={cn("text-[9px] px-1.5 py-0.5 uppercase tracking-wider font-bold border rounded-sm", factionCfg.bg, factionCfg.text, factionCfg.border)}>
            {factionCfg.label}
          </span>
          <span className={cn("text-[9px] px-1.5 py-0.5 uppercase tracking-wider font-bold border bg-black/40 rounded-sm", rarityClass)}>
            {character.rarity}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 uppercase tracking-wider border border-border bg-black/40 rounded-sm text-muted-foreground">
            {character.race}
          </span>
          <span className={cn("text-[9px] px-1.5 py-0.5 uppercase tracking-wider font-bold border border-border/50 bg-black/40 rounded-sm", classCfg.color)}>
            {classCfg.icon} {classCfg.label}
          </span>
        </div>

        {/* Title & Quote */}
        <p className="text-[10px] text-primary/80 font-bold mb-0.5 uppercase tracking-wider">{loreData.title}</p>
        <p className="text-[11px] text-muted-foreground italic mb-3 flex-grow border-l-2 border-primary/30 pl-2 line-clamp-2">
          {loreData.quote}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-1.5 mb-3 bg-black/40 p-2 rounded-sm border border-white/5 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-300">
            <Heart className="w-3 h-3 text-red-400 shrink-0" />
            <span className="font-mono">{character.hp} HP</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-300">
            <Swords className="w-3 h-3 text-orange-400 shrink-0" />
            <span className="font-mono">{character.attack} ATK</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-300">
            <Shield className="w-3 h-3 text-blue-400 shrink-0" />
            <span className="font-mono">{character.defense} DEF</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-300">
            <Zap className="w-3 h-3 text-yellow-400 shrink-0" />
            <span className="font-mono">{character.speed} SPD</span>
          </div>
        </div>

        {/* Special Ability */}
        <div className="mt-auto border-t border-border/50 pt-2.5 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] uppercase text-primary font-bold tracking-wider mb-0.5">Special Ability</span>
              <span className="font-display font-bold text-xs leading-tight truncate">{character.specialAbility}</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help p-1 hover:bg-white/5 rounded-full transition-colors shrink-0">
                  <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
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
