import { Link } from "wouter";
import { FantasyButton } from "@/components/ui/fantasy-button";
import { motion } from "framer-motion";
import { Sword, Trophy, ShieldQuestion } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-overlay"
        style={{ backgroundImage: `url('${import.meta.env.BASE_URL}images/hero-bg.png')` }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-background/80 to-transparent" />
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-background via-transparent to-background opacity-80" />

      <div className="relative z-20 container mx-auto px-4 text-center flex flex-col items-center">
        
        {/* Logo / Title Area */}
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-12 flex flex-col items-center"
        >
          <img 
            src={`${import.meta.env.BASE_URL}images/logo-nobg.png`} 
            alt="Grudge Studio Logo" 
            className="w-48 h-48 md:w-64 md:h-64 object-contain mb-[-40px] drop-shadow-2xl animate-float"
          />
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-primary via-primary/80 to-yellow-800 drop-shadow-[0_5px_15px_rgba(0,0,0,1)] uppercase tracking-widest text-glow mb-4">
            Realm of Grudges
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-serif italic max-w-2xl mx-auto border-y border-primary/20 py-4">
            "Enter the dark fantasy where clans clash, old gods stir, and grudges are settled in blood."
          </p>
        </motion.div>

        {/* Character Portrait Teaser */}
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.8, duration: 1 }}
           className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 opacity-70 mix-blend-screen pointer-events-none"
        >
           <img src={`${import.meta.env.BASE_URL}images/chars/magma-orc-destroyer-nobg.png`} alt="Magma Orc Destroyer" className="h-[80vh] object-contain brightness-200 contrast-125 drop-shadow-[0_0_80px_rgba(255,80,0,0.9)]" />
        </motion.div>

        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.8, duration: 1 }}
           className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 opacity-70 mix-blend-screen pointer-events-none"
        >
           <img src={`${import.meta.env.BASE_URL}images/chars/elven-archer-nobg.png`} alt="Elven Archer" className="h-[80vh] object-contain brightness-200 contrast-125 drop-shadow-[0_0_80px_rgba(80,255,120,0.9)]" />
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

        {/* Features / Info */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-4xl text-left relative z-20"
        >
          <div className="bg-glass p-6 rounded-sm">
            <ShieldQuestion className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-display text-lg font-bold mb-2">Rich Lore</h3>
            <p className="text-muted-foreground text-sm">Play as terrifying villains like the Magma Orc Destroyer, or noble heroes like the Elven Archer.</p>
          </div>
          <div className="bg-glass p-6 rounded-sm">
            <Sword className="w-8 h-8 text-destructive mb-4" />
            <h3 className="font-display text-lg font-bold mb-2">Turn-based Combat</h3>
            <p className="text-muted-foreground text-sm">Strategic battles utilizing unique special abilities, weaknesses, and raw stats.</p>
          </div>
          <div className="bg-glass p-6 rounded-sm">
            <Trophy className="w-8 h-8 text-yellow-500 mb-4" />
            <h3 className="font-display text-lg font-bold mb-2">Eternal Glory</h3>
            <p className="text-muted-foreground text-sm">Defeat your enemies, claim victory, and etch your name onto the global leaderboard.</p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
