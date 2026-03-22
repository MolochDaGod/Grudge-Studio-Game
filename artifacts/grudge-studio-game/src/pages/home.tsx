import { Link } from "wouter";
import { FantasyButton } from "@/components/ui/fantasy-button";
import { motion } from "framer-motion";
import { Sword, Trophy, ShieldQuestion } from "lucide-react";

const BASE = import.meta.env.BASE_URL;

const HERO_IMAGES = [
  "barbarian_warrior", "barbarian_mage", "barbarian_ranger", "barbarian_worg",
  "dwarf_warrior", "dwarf_mage", "dwarf_ranger", "dwarf_worg",
  "elf_warrior", "elf_mage", "elf_ranger", "elf_worg",
  "human_warrior", "human_mage", "human_ranger", "human_worg",
  "orc_warrior", "orc_mage", "orc_ranger", "orc_worg",
  "undead_warrior", "undead_mage", "undead_ranger", "undead_worg",
  "pirate_king", "sky_captain", "faith_barrier",
  "orc-blood-guard", "orc-warlock", "iron-pilgrim", "grave-shade",
  "saltbone-corsair", "hollow-zealot",
].map(n => `${BASE}images/chars/${n}.png`);

const STRIP = [...HERO_IMAGES, ...HERO_IMAGES];

const LIGHTNING_BOLTS = [
  { left: "8%",  delay: "0s",    duration: "5s",  opacity: 0.55 },
  { left: "22%", delay: "2.1s",  duration: "7s",  opacity: 0.4  },
  { left: "41%", delay: "0.7s",  duration: "4.5s",opacity: 0.65 },
  { left: "58%", delay: "3.4s",  duration: "6s",  opacity: 0.45 },
  { left: "74%", delay: "1.3s",  duration: "5.5s",opacity: 0.5  },
  { left: "89%", delay: "4.2s",  duration: "8s",  opacity: 0.35 },
];

export default function Home() {
  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">

      <style>{`
        @keyframes hero-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes bolt-flash {
          0%,100% { opacity: 0; filter: blur(0px); }
          2%      { opacity: var(--bolt-max); filter: blur(2px); }
          3%      { opacity: 0.05; }
          4%      { opacity: var(--bolt-max); filter: blur(1px); }
          5%,99%  { opacity: 0; }
        }
        @keyframes bolt-glow-pulse {
          0%,100% { opacity: 0; }
          2%      { opacity: 1; }
          5%,99%  { opacity: 0; }
        }
      `}</style>

      {/* ── Scrolling hero panorama ── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div
          style={{
            display: "flex",
            width: "max-content",
            height: "100%",
            animation: "hero-scroll 80s linear infinite",
            willChange: "transform",
          }}
        >
          {STRIP.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="h-full w-auto object-cover object-top select-none pointer-events-none"
              style={{ maxWidth: "none", flexShrink: 0 }}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ))}
        </div>
      </div>

      {/* ── Lightning bolts ── */}
      {LIGHTNING_BOLTS.map((bolt, i) => (
        <div
          key={i}
          className="absolute top-0 h-full pointer-events-none z-10"
          style={{ left: bolt.left, width: "2px" }}
        >
          {/* Main bolt */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, transparent 0%, #a0c8ff 20%, #ffffff 50%, #a0c8ff 80%, transparent 100%)",
              animationName: "bolt-flash",
              animationDuration: bolt.duration,
              animationDelay: bolt.delay,
              animationTimingFunction: "linear",
              animationIterationCount: "infinite",
              ["--bolt-max" as string]: bolt.opacity,
              opacity: 0,
            }}
          />
          {/* Wide glow */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: "40px",
              left: "-19px",
              background: "linear-gradient(180deg, transparent 0%, rgba(100,160,255,0.3) 30%, rgba(180,210,255,0.5) 50%, rgba(100,160,255,0.3) 70%, transparent 100%)",
              filter: "blur(8px)",
              animationName: "bolt-glow-pulse",
              animationDuration: bolt.duration,
              animationDelay: bolt.delay,
              animationTimingFunction: "linear",
              animationIterationCount: "infinite",
              opacity: 0,
            }}
          />
        </div>
      ))}

      {/* ── Darkening vignette — keeps text readable ── */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-background/60 to-black/40" />
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/50 via-transparent to-black/50" />

      {/* ── Page content ── */}
      <div className="relative z-20 container mx-auto px-4 text-center flex flex-col items-center">

        {/* Logo / Title */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-12 flex flex-col items-center"
        >
          <img
            src={`${BASE}images/logo-nobg.png`}
            alt="Grudge Studio Logo"
            className="w-48 h-48 md:w-64 md:h-64 object-contain mb-[-40px] drop-shadow-2xl animate-float"
          />
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-primary to-yellow-700 drop-shadow-[0_5px_25px_rgba(0,0,0,1)] uppercase tracking-widest text-glow mb-4">
            Realm of Grudges
          </h1>
          <p className="text-xl md:text-2xl text-white/80 font-serif italic max-w-2xl mx-auto border-y border-primary/30 py-4">
            "Enter the dark fantasy where clans clash, old gods stir, and grudges are settled in blood."
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-6 items-center"
        >
          <Link href="/select" className="w-full sm:w-auto">
            <FantasyButton size="lg" className="w-full sm:w-64 text-lg">
              <Sword className="w-5 h-5 mr-2" />
              Begin Adventure
            </FantasyButton>
          </Link>

          <Link href="/leaderboard" className="w-full sm:w-auto">
            <FantasyButton variant="secondary" size="lg" className="w-full sm:w-64 text-lg">
              <Trophy className="w-5 h-5 mr-2" />
              Hall of Heroes
            </FantasyButton>
          </Link>
        </motion.div>

        {/* Feature tiles */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-4xl text-left relative z-20"
        >
          <div className="bg-glass p-6 rounded-sm backdrop-blur-sm">
            <ShieldQuestion className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-display text-lg font-bold mb-2">Rich Lore</h3>
            <p className="text-muted-foreground text-sm">Command 27 unique heroes across 4 factions — Crusade, Fabled, Legion, and the secret Pirates. Each hero carries deep lore and a legendary purpose.</p>
          </div>
          <div className="bg-glass p-6 rounded-sm backdrop-blur-sm">
            <Sword className="w-8 h-8 text-destructive mb-4" />
            <h3 className="font-display text-lg font-bold mb-2">Turn-based Combat</h3>
            <p className="text-muted-foreground text-sm">Strategic tactical battles with unique special abilities, weapon loadouts, status effects, and terrain positioning.</p>
          </div>
          <div className="bg-glass p-6 rounded-sm backdrop-blur-sm">
            <Trophy className="w-8 h-8 text-yellow-500 mb-4" />
            <h3 className="font-display text-lg font-bold mb-2">Eternal Glory</h3>
            <p className="text-muted-foreground text-sm">Defeat your enemies, claim victory, and etch your name onto the global leaderboard.</p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
