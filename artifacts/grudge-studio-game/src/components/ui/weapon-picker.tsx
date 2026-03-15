import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { WeaponSkillTree } from "@/lib/weapon-skills";
import { FantasyButton } from "./fantasy-button";

interface WeaponPickerProps {
  heroName: string;
  heroPortrait: string;
  weapons: WeaponSkillTree[];
  onSelect: (weaponType: string) => void;
  onCancel: () => void;
}

const SLOT_LABELS = ['Attack', 'Core', 'Utility', 'Special', 'Ultimate'];

export function WeaponPicker({ heroName, heroPortrait, weapons, onSelect, onCancel }: WeaponPickerProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full max-w-4xl border border-primary/30 rounded-sm shadow-[0_0_80px_rgba(0,0,0,0.95)] overflow-hidden relative bg-[#0c0c18]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-primary/15 bg-[#0a0a14]">
            <div className="flex items-center gap-4">
              <img
                src={heroPortrait}
                alt={heroName}
                className="w-12 h-12 rounded-sm object-cover border border-primary/30"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div>
                <p className="text-xs text-primary/60 uppercase tracking-widest font-display">Choose Weapon</p>
                <h2 className="font-display text-xl font-bold text-primary text-glow">{heroName}</h2>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Weapon Cards */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {weapons.map((weapon, i) => (
              <motion.button
                key={weapon.weaponType}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => onSelect(weapon.weaponType)}
                className="group text-left border border-white/10 hover:border-primary/50 rounded-sm p-5 transition-all duration-200 bg-white/[0.03] hover:bg-white/[0.06] hover:shadow-[0_0_24px_rgba(212,160,23,0.18)] focus:outline-none focus:border-primary/60"
              >
                {/* Icon + Name */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{weapon.icon}</span>
                  <div>
                    <h3 className="font-display font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                      {weapon.displayName}
                    </h3>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  {weapon.description}
                </p>

                {/* Skill Previews — slot 1 to 3 */}
                <div className="space-y-1.5">
                  {weapon.slots.slice(0, 3).map((slot) => {
                    const skill = slot.skills[0];
                    if (!skill) return null;
                    return (
                      <div key={slot.slot} className="flex items-center gap-2">
                        <span className="text-sm w-5 text-center">{skill.icon}</span>
                        <span className="text-xs text-foreground/70 font-medium">{skill.name}</span>
                        <span className="ml-auto text-[10px] text-primary/50 font-mono">{slot.label}</span>
                      </div>
                    );
                  })}
                  {weapon.slots.length > 3 && (
                    <p className="text-[10px] text-muted-foreground/40 pt-1">+{weapon.slots.length - 3} more skills</p>
                  )}
                </div>

                {/* Select CTA */}
                <div className="mt-4 pt-3 border-t border-white/5">
                  <span className="text-xs text-primary/70 font-display uppercase tracking-wider group-hover:text-primary transition-colors">
                    Equip {weapon.displayName} →
                  </span>
                </div>
              </motion.button>
            ))}
          </div>

          <div className="px-6 pb-4 flex justify-end">
            <FantasyButton variant="ghost" size="sm" onClick={onCancel}>Cancel</FantasyButton>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
