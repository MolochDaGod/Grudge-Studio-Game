import { useState, useEffect, useRef } from 'react';
import { useProgress } from '@react-three/drei';

const BASE = import.meta.env.BASE_URL;

const HERO_NAMES = [
  "barbarian_warrior", "barbarian_mage", "barbarian_ranger", "barbarian_worg",
  "dwarf_warrior", "dwarf_mage", "dwarf_ranger", "dwarf_worg",
  "elf_warrior", "elf_mage", "elf_ranger", "elf_worg",
  "human_warrior", "human_mage", "human_ranger", "human_worg",
  "orc_warrior", "orc_mage", "orc_ranger", "orc_worg",
  "undead_warrior", "undead_mage", "undead_ranger", "undead_worg",
  "pirate_king", "sky_captain", "faith_barrier",
  "orc-blood-guard", "orc-warlock", "iron-pilgrim", "grave-shade",
  "saltbone-corsair", "hollow-zealot",
];
const HERO_STRIP = [
  ...HERO_NAMES.map(n => `${BASE}images/chars/${n}.png`),
  ...HERO_NAMES.map(n => `${BASE}images/chars/${n}.png`),
];

interface BattleLoadingScreenProps {
  levelName: string;
  onDone: () => void;
}

export function BattleLoadingScreen({ levelName, onDone }: BattleLoadingScreenProps) {
  const { progress } = useProgress();
  const [minPassed, setMinPassed] = useState(false);
  const [fading, setFading] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setMinPassed(true), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        setFading(true);
        setTimeout(onDone, 700);
      }
    }, 9000);
    return () => clearTimeout(t);
  }, [onDone]);

  useEffect(() => {
    if (progress >= 100 && minPassed && !doneRef.current) {
      doneRef.current = true;
      setFading(true);
      const t = setTimeout(onDone, 700);
      return () => clearTimeout(t);
    }
  }, [progress, minPassed, onDone]);

  return (
    <div
      className="absolute inset-0 z-50 overflow-hidden select-none"
      style={{ opacity: fading ? 0 : 1, transition: "opacity 0.7s ease", pointerEvents: fading ? "none" : "all" }}
    >
      <style>{`
        @keyframes ls-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>

      <div className="absolute inset-0 z-0 overflow-hidden">
        <div style={{ display: "flex", width: "max-content", height: "100%", animation: "ls-scroll 80s linear infinite", willChange: "transform" }}>
          {HERO_STRIP.map((src, i) => (
            <img key={i} src={src} alt="" className="h-full w-auto object-cover object-top pointer-events-none" style={{ maxWidth: "none", flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ))}
        </div>
      </div>

      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 px-4">
        <p className="font-display text-xs uppercase tracking-[0.4em] text-primary/70">Realm of Grudges</p>
        <h1 className="font-display text-5xl md:text-6xl font-bold text-white uppercase tracking-widest text-center drop-shadow-[0_0_30px_rgba(200,160,60,0.6)]">
          {levelName}
        </h1>
        <p className="text-white/50 font-serif italic text-base">Preparing the battlefield…</p>

        <div className="w-72 md:w-96 mt-2">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden border border-white/15">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${Math.max(5, Math.round(progress))}%`, transition: "width 0.25s ease" }}
            />
          </div>
          <p className="text-center text-white/30 text-[10px] font-mono mt-2 tracking-widest">
            {Math.round(progress)}%
          </p>
        </div>
      </div>
    </div>
  );
}
