import { useState } from "react";
import { useLocation } from "wouter";
import { useGetCharacters } from "@workspace/api-client-react";
import { CharacterCard } from "@/components/ui/character-card";
import { FantasyButton } from "@/components/ui/fantasy-button";
import { useGameStore } from "@/store/use-game-store";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Skull } from "lucide-react";

export default function CharacterSelect() {
  const [, setLocation] = useLocation();
  const { data: characters, isLoading, error } = useGetCharacters();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const setCharacters = useGameStore(state => state.setCharacters);

  const handleStartBattle = () => {
    if (!selectedId || !characters) return;
    
    const player = characters.find(c => c.id === selectedId);
    if (!player) return;

    // Pick random enemy that isn't the player
    const possibleEnemies = characters.filter(c => c.id !== selectedId);
    const enemy = possibleEnemies[Math.floor(Math.random() * possibleEnemies.length)];

    setCharacters(player, enemy);
    setLocation("/battle");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="font-display text-xl animate-pulse">Summoning Champions...</p>
      </div>
    );
  }

  if (error || !characters) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-destructive">
        <Skull className="w-16 h-16" />
        <h2 className="font-display text-3xl">The archives are sealed</h2>
        <p>Failed to load character data. Please try again.</p>
        <FantasyButton onClick={() => window.location.reload()}>Retry</FantasyButton>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 pt-8 px-4 md:px-8 container mx-auto">
      
      <div className="flex items-center justify-between mb-12">
        <FantasyButton variant="ghost" onClick={() => setLocation("/")} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Return
        </FantasyButton>
        <div className="text-center">
          <h1 className="text-3xl md:text-5xl font-display font-bold text-glow uppercase">Choose Your Champion</h1>
          <p className="text-muted-foreground mt-2 font-serif italic">Select a warrior to enter the brutal arena.</p>
        </div>
        <div className="w-[100px]" /> {/* Spacer for centering */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {characters.map((char, i) => (
          <motion.div
            key={char.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <CharacterCard 
              character={char}
              selected={selectedId === char.id}
              onClick={() => setSelectedId(char.id)}
            />
          </motion.div>
        ))}
      </div>

      {/* Sticky Bottom Bar for Action */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: selectedId ? 0 : 100 }}
        className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-primary/50 p-6 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
      >
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {selectedId && (
              <>
                <div className="w-12 h-12 bg-black border border-primary flex items-center justify-center rounded-sm">
                  <SwordIcon />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground uppercase tracking-wider">Selected</p>
                  <p className="font-display font-bold text-xl text-primary">{characters.find(c=>c.id===selectedId)?.name}</p>
                </div>
              </>
            )}
          </div>
          <FantasyButton 
            size="lg" 
            onClick={handleStartBattle}
            disabled={!selectedId}
            className="w-full sm:w-auto px-12"
          >
            Enter The Arena
          </FantasyButton>
        </div>
      </motion.div>
    </div>
  );
}

function SwordIcon() {
  return <Sword className="w-6 h-6 text-primary" />;
}
