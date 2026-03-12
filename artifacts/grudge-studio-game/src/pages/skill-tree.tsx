import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGameStore } from "@/store/use-game-store";
import { FantasyButton } from "@/components/ui/fantasy-button";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, RotateCcw, Sword, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Skill,
  SkillSlot,
  WeaponSkillTree,
  getWeaponTree,
  getDefaultSkillLoadout,
  SLOT_LABELS,
  TIER_STYLES,
} from "@/lib/weapon-skills";
import { CHARACTER_LORE } from "@/lib/lore";

type Loadout = Record<SkillSlot, string>;

export default function SkillTree() {
  const [, setLocation] = useLocation();
  const { units, allCharacters, phase, setEquippedSkills } = useGameStore();

  // Get only player-controlled units
  const playerUnits = units.filter(u => u.isPlayerControlled);

  // Active character index being configured
  const [activeIdx, setActiveIdx] = useState(0);
  const activeUnit = playerUnits[activeIdx];

  // Loadouts per unit ID
  const [loadouts, setLoadouts] = useState<Record<string, Loadout>>({});

  // Tooltip
  const [hoveredSkill, setHoveredSkill] = useState<Skill | null>(null);

  // Route guard
  useEffect(() => {
    if (phase !== 'battle' || playerUnits.length === 0) {
      setLocation("/select");
    }
  }, [phase, playerUnits, setLocation]);

  // Initialize loadouts with defaults
  useEffect(() => {
    if (playerUnits.length === 0) return;
    const initial: Record<string, Loadout> = {};
    for (const unit of playerUnits) {
      initial[unit.id] = getDefaultSkillLoadout(unit.characterId);
    }
    setLoadouts(initial);
  }, [playerUnits.length]);

  if (!activeUnit) return null;

  const weaponTree: WeaponSkillTree | undefined = getWeaponTree(activeUnit.characterId);
  const currentLoadout: Loadout = loadouts[activeUnit.id] || {};
  const lore = CHARACTER_LORE[activeUnit.characterId];

  const selectSkill = (slot: SkillSlot, skillId: string) => {
    setLoadouts(prev => ({
      ...prev,
      [activeUnit.id]: { ...prev[activeUnit.id], [slot]: skillId }
    }));
  };

  const resetLoadout = () => {
    setLoadouts(prev => ({
      ...prev,
      [activeUnit.id]: getDefaultSkillLoadout(activeUnit.characterId)
    }));
  };

  const handleEnterArena = () => {
    // Apply all loadouts to the store
    for (const unit of playerUnits) {
      const loadout = loadouts[unit.id] || getDefaultSkillLoadout(unit.characterId);
      setEquippedSkills(unit.id, loadout);
    }
    setLocation("/battle");
  };

  // Count configured skills across all units
  const totalConfigured = playerUnits.reduce((acc, u) => {
    const l = loadouts[u.id];
    return acc + (l ? Object.keys(l).length : 0);
  }, 0);

  return (
    <div
      className="min-h-screen flex flex-col bg-background overflow-hidden"
      style={{
        backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(212,160,23,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,0,0,0.08) 0%, transparent 60%)`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-black/60 backdrop-blur-sm shrink-0">
        <FantasyButton variant="ghost" onClick={() => setLocation("/select")} className="gap-2 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Squad
        </FantasyButton>
        <div className="text-center">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-primary text-glow uppercase tracking-widest">
            Skill Forge
          </h1>
          <p className="text-xs text-muted-foreground font-serif italic">
            Configure weapon abilities for each warrior
          </p>
        </div>
        <FantasyButton
          onClick={handleEnterArena}
          className="gap-2 text-sm"
          size="sm"
        >
          Enter Arena <ArrowRight className="w-4 h-4" />
        </FantasyButton>
      </div>

      {/* Character Tabs */}
      <div className="flex gap-0 border-b border-white/10 bg-black/40 shrink-0">
        {playerUnits.map((unit, idx) => {
          const loreData = CHARACTER_LORE[unit.characterId];
          const tree = getWeaponTree(unit.characterId);
          const isActive = idx === activeIdx;
          return (
            <button
              key={unit.id}
              onClick={() => setActiveIdx(idx)}
              className={cn(
                "relative flex items-center gap-3 px-4 py-3 text-left transition-all border-b-2 flex-1 min-w-0",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-transparent text-muted-foreground hover:text-white hover:bg-white/5"
              )}
            >
              <div className="w-10 h-10 rounded overflow-hidden shrink-0 border border-white/20">
                <img
                  src={`${import.meta.env.BASE_URL}images/chars/${unit.characterId}.png`}
                  alt={unit.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 hidden sm:block">
                <div className="font-display text-xs font-bold uppercase truncate">{unit.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{tree?.icon} {tree?.displayName}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Character Info + Action Bar Preview */}
        <div className="w-64 lg:w-72 border-r border-white/10 bg-black/50 flex flex-col shrink-0 overflow-y-auto">
          {/* Portrait */}
          <div className="relative overflow-hidden shrink-0">
            <img
              src={`${import.meta.env.BASE_URL}images/chars/${activeUnit.characterId}.png`}
              alt={activeUnit.name}
              className="w-full h-48 object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="font-display text-sm font-bold uppercase text-primary text-glow">{activeUnit.name}</div>
              {lore && <div className="text-[10px] text-primary/80 uppercase tracking-widest">{lore.title}</div>}
            </div>
          </div>

          {/* Weapon Info */}
          {weaponTree && (
            <div className="p-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{weaponTree.icon}</span>
                <div>
                  <div className="font-display text-xs font-bold text-white uppercase">{weaponTree.displayName}</div>
                  <div className="text-[10px] text-muted-foreground">Weapon Type</div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{weaponTree.description}</p>
            </div>
          )}

          {/* Action Bar Preview */}
          <div className="p-3 border-b border-white/10 shrink-0">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-bold">Action Bar Preview</div>
            <div className="flex gap-1.5">
              {([1, 2, 3, 4, 5] as SkillSlot[]).map(slot => {
                const selectedSkillId = currentLoadout[slot];
                const slotDef = weaponTree?.slots.find(s => s.slot === slot);
                const selectedSkill = slotDef?.skills.find(s => s.id === selectedSkillId);
                const slotStyle = SLOT_LABELS[slot];

                return (
                  <div
                    key={slot}
                    className="flex-1 aspect-square flex flex-col items-center justify-center rounded border border-white/10 bg-black/60 relative overflow-hidden group"
                    style={{ borderColor: selectedSkill ? slotStyle.color + '60' : undefined }}
                  >
                    {selectedSkill ? (
                      <>
                        <div className="text-lg leading-none">{selectedSkill.icon}</div>
                        <div className="text-[8px] text-white/60 mt-0.5 text-center leading-tight px-0.5 truncate w-full text-center">{selectedSkill.name}</div>
                        <div
                          className="absolute top-0.5 right-0.5 text-[7px] font-bold px-0.5 rounded"
                          style={{ color: slotStyle.color }}
                        >
                          {slotStyle.roman}
                        </div>
                      </>
                    ) : (
                      <div className="text-white/20 text-xs font-display">{slotStyle.roman}</div>
                    )}
                    {/* Hotkey */}
                    <div className="absolute bottom-0.5 left-0.5 text-[7px] text-white/30 font-mono">{slot}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reset Button */}
          <div className="p-3">
            <button
              onClick={resetLoadout}
              className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-white py-2 border border-white/10 rounded hover:border-white/30 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset Skills
            </button>
          </div>

          {/* Lore Quote */}
          {lore && (
            <div className="px-3 pb-3 mt-auto">
              <div className="border-l-2 border-primary/40 pl-2">
                <p className="text-[9px] text-muted-foreground italic leading-relaxed">{lore.quote}</p>
              </div>
            </div>
          )}
        </div>

        {/* Center: Skill Slots */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {weaponTree ? (
            <div className="space-y-4 max-w-3xl mx-auto">
              {/* Slot count */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-muted-foreground">
                  <span className="text-primary font-bold">{Object.keys(currentLoadout).length}</span>/5 slots configured
                </div>
                <div className="flex items-center gap-1">
                  {([1, 2, 3, 4, 5] as SkillSlot[]).map(slot => {
                    const selected = !!currentLoadout[slot];
                    const slotStyle = SLOT_LABELS[slot];
                    return (
                      <div
                        key={slot}
                        className="w-2 h-2 rounded-full"
                        style={{ background: selected ? slotStyle.color : '#ffffff20' }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Skill Slots */}
              {weaponTree.slots.map(slotDef => {
                const slotStyle = SLOT_LABELS[slotDef.slot];
                const selectedId = currentLoadout[slotDef.slot];

                return (
                  <motion.div
                    key={slotDef.slot}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (slotDef.slot - 1) * 0.08 }}
                    className="bg-black/40 border border-white/10 rounded-lg overflow-hidden"
                  >
                    {/* Slot Header */}
                    <div
                      className="flex items-center gap-3 px-4 py-2.5"
                      style={{ borderLeft: `3px solid ${slotStyle.color}` }}
                    >
                      <div
                        className="w-7 h-7 rounded flex items-center justify-center font-display text-sm font-bold border"
                        style={{ color: slotStyle.color, borderColor: slotStyle.color + '40', background: slotStyle.color + '15' }}
                      >
                        {slotStyle.roman}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white uppercase tracking-wider">{slotDef.label}</div>
                        <div className="text-[10px] text-muted-foreground">{slotDef.sublabel}</div>
                      </div>
                    </div>

                    {/* Skill Options */}
                    <div className="p-3 grid grid-cols-2 lg:grid-cols-3 gap-2">
                      {slotDef.skills.map(skill => {
                        const isSelected = selectedId === skill.id;
                        const tierStyle = TIER_STYLES[skill.tier];
                        const isUltimate = skill.slot === 5;

                        return (
                          <motion.button
                            key={skill.id}
                            onClick={() => selectSkill(slotDef.slot, skill.id)}
                            onMouseEnter={() => setHoveredSkill(skill)}
                            onMouseLeave={() => setHoveredSkill(null)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                              "relative text-left p-3 rounded border transition-all duration-200 group",
                              isSelected
                                ? "border-primary bg-primary/15 shadow-[0_0_15px_rgba(212,160,23,0.2)]"
                                : "border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/5",
                              isUltimate && !isSelected && "border-primary/20 bg-gradient-to-br from-black/60 to-primary/5"
                            )}
                          >
                            {/* Tier badge */}
                            <div
                              className="absolute top-1.5 right-1.5 text-[8px] font-bold px-1 py-0.5 rounded"
                              style={{ color: tierStyle.color, background: tierStyle.bg }}
                            >
                              {skill.tier}
                            </div>

                            {/* Icon + Name */}
                            <div className="flex items-center gap-2 mb-1.5 pr-6">
                              <span className="text-2xl leading-none">{skill.icon}</span>
                              <div>
                                <div className={cn(
                                  "text-xs font-bold leading-tight",
                                  isSelected ? "text-primary" : "text-white"
                                )}>
                                  {skill.name}
                                </div>
                                {skill.cooldown > 0 && (
                                  <div className="text-[9px] text-muted-foreground">
                                    {skill.cooldown === 999 ? '⚡ Ultimate' : `CD: ${skill.cooldown}`}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Description */}
                            <p className="text-[10px] text-muted-foreground leading-relaxed mb-2 line-clamp-2">
                              {skill.description}
                            </p>

                            {/* Stats tags */}
                            <div className="flex flex-wrap gap-1">
                              {skill.stats.map((stat, i) => (
                                <span
                                  key={i}
                                  className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                                  style={{
                                    background: isSelected ? 'rgba(212,160,23,0.2)' : 'rgba(255,255,255,0.07)',
                                    color: isSelected ? '#d4a017' : '#9ca3af',
                                    border: `1px solid ${isSelected ? 'rgba(212,160,23,0.3)' : 'rgba(255,255,255,0.08)'}`
                                  }}
                                >
                                  {stat}
                                </span>
                              ))}
                            </div>

                            {/* Selected indicator */}
                            {isSelected && (
                              <div className="absolute inset-0 pointer-events-none rounded overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />
                              </div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground italic">
              No weapon data found for this character.
            </div>
          )}
        </div>

        {/* Right: Tooltip / Help Panel */}
        <div className="w-52 lg:w-64 border-l border-white/10 bg-black/50 flex flex-col shrink-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {hoveredSkill ? (
              <motion.div
                key={hoveredSkill.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="p-4 flex-1"
              >
                <div className="text-3xl mb-2">{hoveredSkill.icon}</div>
                <div className="font-display text-sm font-bold text-primary uppercase mb-1">{hoveredSkill.name}</div>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      color: TIER_STYLES[hoveredSkill.tier].color,
                      background: TIER_STYLES[hoveredSkill.tier].bg
                    }}
                  >
                    {hoveredSkill.tier}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    Slot {SLOT_LABELS[hoveredSkill.slot].roman} · {SLOT_LABELS[hoveredSkill.slot].label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">{hoveredSkill.description}</p>
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Stats</div>
                  {hoveredSkill.stats.map((stat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-primary/60 shrink-0" />
                      <span className="text-[10px] text-white font-mono">{stat}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="grid grid-cols-2 gap-2">
                    {hoveredSkill.range > 0 && (
                      <div className="text-center">
                        <div className="text-[9px] text-muted-foreground uppercase">Range</div>
                        <div className="text-sm font-bold text-white font-mono">{hoveredSkill.range === 999 ? '∞' : hoveredSkill.range}</div>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-[9px] text-muted-foreground uppercase">Cooldown</div>
                      <div className="text-sm font-bold text-white font-mono">
                        {hoveredSkill.cooldown === 999 ? 'Ultimate' : hoveredSkill.cooldown === 0 ? 'None' : `${hoveredSkill.cooldown} turns`}
                      </div>
                    </div>
                  </div>
                </div>
                {hoveredSkill.tags.includes('ultimate') && (
                  <div className="mt-3 p-2 rounded border border-primary/30 bg-primary/5">
                    <div className="text-[9px] text-primary font-bold uppercase mb-0.5">⚡ Ultimate</div>
                    <div className="text-[9px] text-muted-foreground">Once per battle. Cannot be reset after use.</div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center justify-center p-4 text-center"
              >
                <Zap className="w-8 h-8 text-primary/30 mb-3" />
                <div className="text-xs text-muted-foreground italic leading-relaxed">
                  Hover over a skill to see its details
                </div>
                <div className="mt-6 text-[10px] text-muted-foreground/60 border-t border-white/5 pt-4 w-full">
                  <div className="mb-2 font-bold text-muted-foreground uppercase tracking-wider">Slot Guide</div>
                  {([1, 2, 3, 4, 5] as SkillSlot[]).map(slot => {
                    const s = SLOT_LABELS[slot];
                    return (
                      <div key={slot} className="flex items-center gap-2 mb-1">
                        <span className="font-display font-bold text-[10px]" style={{ color: s.color }}>{s.roman}</span>
                        <span>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Footer: Navigate between characters + Enter Arena */}
      <div className="border-t border-white/10 bg-black/70 px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
            disabled={activeIdx === 0}
            className="w-8 h-8 rounded border border-white/20 flex items-center justify-center text-muted-foreground hover:text-white hover:border-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground">
            {activeIdx + 1} / {playerUnits.length}
          </span>
          <button
            onClick={() => setActiveIdx(i => Math.min(playerUnits.length - 1, i + 1))}
            disabled={activeIdx === playerUnits.length - 1}
            className="w-8 h-8 rounded border border-white/20 flex items-center justify-center text-muted-foreground hover:text-white hover:border-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          <span className="text-primary font-bold">{totalConfigured}</span> / {playerUnits.length * 5} skills configured
        </div>

        <FantasyButton onClick={handleEnterArena} className="gap-2">
          <Sword className="w-4 h-4" /> Enter The Arena
        </FantasyButton>
      </div>
    </div>
  );
}
