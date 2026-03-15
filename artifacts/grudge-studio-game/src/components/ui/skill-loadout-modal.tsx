import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronLeft, Sword, Star, Clock, Target, Zap } from "lucide-react";
import { WeaponSkillTree, Skill, SkillSlot, TIER_STYLES, SLOT_LABELS } from "@/lib/weapon-skills";
import { FantasyButton } from "./fantasy-button";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;
const UI = (path: string) => `${BASE}images/ui/${path}`;

interface SkillLoadoutModalProps {
  heroName: string;
  heroPortrait: string;
  heroSpecialAbility?: string;
  heroSpecialAbilityDesc?: string;
  weapon: WeaponSkillTree;
  onConfirm: (loadout: Record<SkillSlot, string>) => void;
  onBack: () => void;
}

function SkillCard({
  skill,
  selected,
  onClick,
}: {
  skill: Skill;
  selected: boolean;
  onClick: () => void;
}) {
  const tier = TIER_STYLES[skill.tier] ?? TIER_STYLES.T1;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full text-left rounded border transition-all duration-150 overflow-hidden",
        "flex flex-col gap-1 p-3",
        selected
          ? "border-primary shadow-[0_0_18px_rgba(212,160,23,0.5)] z-10"
          : "border-white/10 hover:border-white/30 hover:bg-white/[0.04]"
      )}
      style={{
        backgroundImage: selected
          ? `url('${UI("HUD/Action Bar/Slots/ActionBar_MainSlot_Background.png")}')`
          : undefined,
        backgroundSize: selected ? "100% 100%" : undefined,
        backgroundRepeat: selected ? "no-repeat" : undefined,
        filter: selected ? "brightness(1.1)" : undefined,
        backgroundColor: selected ? undefined : "rgba(255,255,255,0.025)",
      }}
    >
      {/* Selected checkmark */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute top-1.5 right-1.5 z-10"
          >
            <CheckCircle2 className="w-4 h-4 text-primary fill-primary/20" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tier badge */}
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-2xl leading-none">{skill.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-display text-sm font-bold text-white leading-tight">{skill.name}</span>
            <span
              className="text-[8px] font-bold px-1 py-0.5 rounded uppercase tracking-widest shrink-0"
              style={{ backgroundColor: tier.color + "22", color: tier.color, border: `1px solid ${tier.color}44` }}
            >
              {tier.label}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-[10px] text-white/55 italic leading-snug line-clamp-2">{skill.description}</p>

      {/* Stats row */}
      {skill.stats.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {skill.stats.map((s, i) => (
            <span key={i} className="text-[9px] bg-white/8 border border-white/12 rounded px-1 py-0.5 text-white/65 font-mono">{s}</span>
          ))}
        </div>
      )}

      {/* Meta chips */}
      <div className="flex items-center gap-2 mt-1 text-[9px] text-white/35">
        <span className="flex items-center gap-0.5"><Target className="w-2.5 h-2.5" />Rng {skill.range}</span>
        {skill.cooldown > 0 && skill.cooldown < 999 && (
          <span className="flex items-center gap-0.5 text-orange-400/70"><Clock className="w-2.5 h-2.5" />CD {skill.cooldown}</span>
        )}
        {skill.cooldown === 999 && (
          <span className="flex items-center gap-0.5 text-yellow-400/80"><Star className="w-2.5 h-2.5" />Once per battle</span>
        )}
        {skill.aoe && <span className="flex items-center gap-0.5 text-yellow-300/70"><Zap className="w-2.5 h-2.5" />AoE</span>}
      </div>
    </button>
  );
}

export function SkillLoadoutModal({
  heroName,
  heroPortrait,
  heroSpecialAbility,
  heroSpecialAbilityDesc,
  weapon,
  onConfirm,
  onBack,
}: SkillLoadoutModalProps) {
  // Initialize with first skill of each slot
  const [chosen, setChosen] = useState<Record<SkillSlot, string>>(() => {
    const init = {} as Record<SkillSlot, string>;
    for (const slotDef of weapon.slots) {
      if (slotDef.skills.length > 0) {
        init[slotDef.slot] = slotDef.skills[0].id;
      }
    }
    return init;
  });

  const handleConfirm = () => {
    onConfirm(chosen);
  };

  // Group slots in pairs for layout: top row [1,2,3], bottom row [4,5]
  const topSlots = weapon.slots.filter(s => s.slot <= 3);
  const bottomSlots = weapon.slots.filter(s => s.slot > 3);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/88 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 280, damping: 26 }}
          className="w-full max-w-[1100px] max-h-[92vh] flex flex-col rounded-sm border border-primary/30 shadow-[0_0_80px_rgba(0,0,0,0.95)] bg-[#09090f] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-white/8 bg-[#0a0a14] shrink-0">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              Change Weapon
            </button>

            <div className="w-px h-6 bg-white/10" />

            {/* Portrait + name */}
            <div className="relative h-12 w-9 rounded overflow-hidden border border-white/15 shrink-0">
              <img
                src={heroPortrait}
                alt={heroName}
                className="absolute inset-0 w-full h-full object-cover object-top"
                onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="font-display text-lg font-bold text-white">{heroName}</h2>
                <div className="flex items-center gap-1.5 text-sm text-primary/80 font-display">
                  <span className="text-xl leading-none">{weapon.icon}</span>
                  <span className="font-bold">{weapon.displayName}</span>
                </div>
              </div>
              <p className="text-[11px] text-white/35 italic mt-0.5 line-clamp-1">{weapon.description}</p>
            </div>

            <div className="shrink-0 text-right">
              <div className="text-[10px] text-white/25 uppercase tracking-widest">Configure Loadout</div>
              <div className="text-xs text-primary/60 font-display">Select one skill per slot</div>
            </div>
          </div>

          {/* Slot grid */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-4">

            {/* Top row: slots 1, 2, 3 */}
            {topSlots.length > 0 && (
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${topSlots.length}, 1fr)` }}>
                {topSlots.map(slotDef => {
                  const slotMeta = SLOT_LABELS[slotDef.slot];
                  return (
                    <div key={slotDef.slot} className="flex flex-col gap-2">
                      {/* Slot header */}
                      <div className="flex items-center gap-2 pb-1 border-b border-white/8">
                        <span
                          className="font-display font-bold text-xs uppercase tracking-widest"
                          style={{ color: slotMeta.color }}
                        >
                          {slotMeta.roman}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white/70 uppercase tracking-wide">{slotDef.label}</div>
                          <div className="text-[9px] text-white/30 italic">{slotDef.sublabel}</div>
                        </div>
                      </div>

                      {/* Skill options */}
                      <div className="flex flex-col gap-2">
                        {slotDef.skills.map(skill => (
                          <SkillCard
                            key={skill.id}
                            skill={skill}
                            selected={chosen[slotDef.slot] === skill.id}
                            onClick={() => setChosen(prev => ({ ...prev, [slotDef.slot]: skill.id }))}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom row: slots 4, 5 */}
            {bottomSlots.length > 0 && (
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${bottomSlots.length}, 1fr)` }}>
                {bottomSlots.map(slotDef => {
                  const slotMeta = SLOT_LABELS[slotDef.slot];
                  return (
                    <div key={slotDef.slot} className="flex flex-col gap-2">
                      {/* Slot header */}
                      <div className="flex items-center gap-2 pb-1 border-b border-white/8">
                        <span
                          className="font-display font-bold text-xs uppercase tracking-widest"
                          style={{ color: slotMeta.color }}
                        >
                          {slotMeta.roman}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white/70 uppercase tracking-wide">{slotDef.label}</div>
                          <div className="text-[9px] text-white/30 italic">{slotDef.sublabel}</div>
                        </div>
                      </div>

                      {/* Skill options */}
                      <div className="grid grid-cols-2 gap-2">
                        {slotDef.skills.map(skill => (
                          <SkillCard
                            key={skill.id}
                            skill={skill}
                            selected={chosen[slotDef.slot] === skill.id}
                            onClick={() => setChosen(prev => ({ ...prev, [slotDef.slot]: skill.id }))}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Special ability panel */}
            {heroSpecialAbility && (
              <div className="rounded border border-yellow-600/25 bg-yellow-950/20 px-4 py-3 flex items-start gap-3">
                <Star className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-display font-bold text-yellow-300 uppercase tracking-wider mb-0.5">
                    Class Passive — {heroSpecialAbility}
                  </div>
                  <p className="text-[10px] text-yellow-200/50 italic leading-snug">{heroSpecialAbilityDesc}</p>
                  <p className="text-[9px] text-white/25 mt-1">This ability is always active — it cannot be removed from your loadout.</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/8 bg-[#0a0a14] shrink-0">
            {/* Loadout summary */}
            <div className="flex items-center gap-3">
              {weapon.slots.map(slotDef => {
                const slotMeta = SLOT_LABELS[slotDef.slot];
                const skill = slotDef.skills.find(s => s.id === chosen[slotDef.slot]);
                return (
                  <div key={slotDef.slot} className="flex flex-col items-center gap-0.5">
                    <div
                      className="w-10 h-10 rounded border flex items-center justify-center text-lg relative overflow-hidden"
                      style={{
                        backgroundImage: `url('${UI("HUD/Action Bar/Slots/ActionBar_MainSlot_Background.png")}')`,
                        backgroundSize: "100% 100%",
                        borderColor: slotMeta.color + "66",
                        filter: "brightness(0.85)",
                      }}
                    >
                      {skill ? skill.icon : "?"}
                    </div>
                    <span className="text-[8px] font-display font-bold" style={{ color: slotMeta.color }}>
                      {slotMeta.roman}
                    </span>
                  </div>
                );
              })}
            </div>

            <FantasyButton onClick={handleConfirm} size="lg" className="px-10 gap-2">
              <Sword className="w-4 h-4" />
              Confirm Loadout
            </FantasyButton>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
