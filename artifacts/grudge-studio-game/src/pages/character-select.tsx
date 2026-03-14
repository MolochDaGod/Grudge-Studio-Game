import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetCharacters } from "@workspace/api-client-react";
import { CharacterCard } from "@/components/ui/character-card";
import { FantasyButton } from "@/components/ui/fantasy-button";
import { useGameStore, TacticalUnit } from "@/store/use-game-store";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Skull, Sword } from "lucide-react";
import { CHARACTER_LORE } from "@/lib/lore";

export default function CharacterSelect() {
  const [, setLocation] = useLocation();
  const { data: characters, isLoading, error } = useGetCharacters();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const { initBattle, setAllCharacters, setPlayerSquad } = useGameStore();

  useEffect(() => {
    if (characters) {
      setAllCharacters(characters);
    }
  }, [characters, setAllCharacters]);

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      if (selectedIds.length < 3) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const handleStartBattle = () => {
    if (selectedIds.length !== 3 || !characters) return;
    
    setPlayerSquad(selectedIds);

    const playerChars = characters.filter(c => selectedIds.includes(c.id));
    
    // Pick 3 random enemies that aren't the player
    const possibleEnemies = characters.filter(c => !selectedIds.includes(c.id));
    const enemyChars = [...possibleEnemies].sort(() => 0.5 - Math.random()).slice(0, 3);

    let unitIdCounter = 1;

    const createTacticalUnit = (char: typeof characters[0], isPlayer: boolean, index: number): TacticalUnit => {
      const speed = char.speed;
      // Larger board → more movement
      const move = Math.max(4, Math.floor(speed / 7));
      // Ranged characters get meaningful range on 16×12 board
      const range = char.role === 'Ranger' ? 6
                  : char.role === 'Warlock' ? 5
                  : char.role === 'Ambusher' ? 3
                  : 2;

      // Player starts on the left (x=0,1), enemies on the right (x=14,15)
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = isPlayer ? col : (15 - col);
      const y = row * 4 + 2; // spread vertically across the 12-tile height

      return {
        id: `unit_${unitIdCounter++}`,
        characterId: char.id,
        name: char.name,
        race: char.race,
        role: char.role,
        hp: char.hp,
        maxHp: char.hp,
        attack: char.attack,
        defense: char.defense,
        speed: speed,
        move,
        range,
        position: { x, y },
        facing: (isPlayer ? 1 : 3) as 0 | 1 | 2 | 3,
        isPlayerControlled: isPlayer,
        specialAbility: char.specialAbility,
        specialAbilityDescription: char.specialAbilityDescription,
        specialAbilityCooldown: 0,
        ct: Math.floor(Math.random() * 20),
        faction: char.faction,
        rarity: char.rarity,
        statusEffects: [],
        statusDurations: {},
        hasMoved: false,
        hasActed: false,
      };
    };

    const playerUnits = playerChars.map((c, i) => createTacticalUnit(c, true, i));
    const enemyUnits = enemyChars.map((c, i) => createTacticalUnit(c, false, i));

    initBattle([...playerUnits, ...enemyUnits]);
    setLocation("/level-select");
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
    <div 
      className="min-h-screen pb-32 bg-background bg-cover bg-center bg-fixed bg-no-repeat"
      style={{ backgroundImage: `url('${import.meta.env.BASE_URL}images/select-bg.png')` }}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-0" />
      
      <div className="relative z-10 pt-8 px-4 md:px-8 container mx-auto">
        <div className="flex items-center justify-between mb-12">
          <FantasyButton variant="ghost" onClick={() => setLocation("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Return
          </FantasyButton>
          <div className="text-center">
            <h1 className="text-3xl md:text-5xl font-display font-bold text-glow uppercase">Assemble Your Squad</h1>
            <p className="text-muted-foreground mt-2 font-serif italic drop-shadow-md text-white/80">Select 3 warriors to enter the tactical arena.</p>
          </div>
          <div className="w-[100px]" />
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
                selected={selectedIds.includes(char.id)}
                onClick={() => toggleSelection(char.id)}
              />
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: selectedIds.length > 0 ? 0 : 100 }}
        className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-primary/50 p-6 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
      >
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-black border border-primary flex items-center justify-center rounded-sm">
              <span className="font-display text-primary text-xl font-bold">{selectedIds.length}/3</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wider">Champions Selected</p>
              <div className="flex gap-2 text-primary font-display font-bold">
                {selectedIds.map(id => characters.find(c => c.id === id)?.name).join(", ") || "None"}
              </div>
            </div>
          </div>
          <FantasyButton 
            size="lg" 
            onClick={handleStartBattle}
            disabled={selectedIds.length !== 3}
            className="w-full sm:w-auto px-12"
          >
            <Sword className="w-5 h-5 mr-2" /> Enter The Arena
          </FantasyButton>
        </div>
      </motion.div>
    </div>
  );
}
