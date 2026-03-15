import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetCharacters } from "@workspace/api-client-react";
import { CharacterCard } from "@/components/ui/character-card";
import { WeaponPicker } from "@/components/ui/weapon-picker";
import { SkillLoadoutModal } from "@/components/ui/skill-loadout-modal";
import { FantasyButton } from "@/components/ui/fantasy-button";
import { useGameStore, TacticalUnit } from "@/store/use-game-store";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Skull, Sword } from "lucide-react";
import { CHARACTER_LORE } from "@/lib/lore";
import { getHeroWeaponOptions } from "@/lib/hero-weapons";
import { WEAPON_SKILL_TREES, SkillSlot } from "@/lib/weapon-skills";
import { getLevelWithEdits } from "@/lib/levels";

export default function CharacterSelect() {
  const [, setLocation] = useLocation();
  const { data: characters, isLoading, error } = useGetCharacters();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingHeroId, setPendingHeroId] = useState<string | null>(null);
  const [pendingWeaponType, setPendingWeaponType] = useState<string | null>(null);
  const [weaponByCharId, setWeaponByCharId] = useState<Record<string, string>>({});
  const [loadoutByCharId, setLoadoutByCharId] = useState<Record<string, Record<SkillSlot, string>>>({});

  const { initBattle, setAllCharacters, setPlayerSquad, setEquippedSkills, currentLevelId } = useGameStore();

  useEffect(() => {
    if (characters) {
      setAllCharacters(characters);
    }
  }, [characters, setAllCharacters]);

  const handleCardClick = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
      setWeaponByCharId(prev => { const n = { ...prev }; delete n[id]; return n; });
      setLoadoutByCharId(prev => { const n = { ...prev }; delete n[id]; return n; });
      return;
    }
    if (selectedIds.length >= 3) return;
    setPendingHeroId(id);
    setPendingWeaponType(null);
  };

  // Step 1: weapon chosen → show loadout screen
  const handleWeaponSelect = (weaponType: string) => {
    if (!pendingHeroId) return;
    setPendingWeaponType(weaponType);
  };

  // Step 2a: loadout confirmed → finalize hero entry
  const handleLoadoutConfirm = (loadout: Record<SkillSlot, string>) => {
    if (!pendingHeroId || !pendingWeaponType) return;
    setWeaponByCharId(prev => ({ ...prev, [pendingHeroId]: pendingWeaponType }));
    setLoadoutByCharId(prev => ({ ...prev, [pendingHeroId]: loadout }));
    setSelectedIds(prev => [...prev, pendingHeroId]);
    setPendingHeroId(null);
    setPendingWeaponType(null);
  };

  // Step 2b: go back to weapon picker
  const handleLoadoutBack = () => {
    setPendingWeaponType(null);
  };

  const handleCancelWeapon = () => {
    setPendingHeroId(null);
    setPendingWeaponType(null);
  };

  const handleStartBattle = () => {
    if (selectedIds.length !== 3 || !characters) return;

    setPlayerSquad(selectedIds);

    const level = getLevelWithEdits(currentLevelId);

    const playerChars = characters.filter(c => selectedIds.includes(c.id));

    const possibleEnemies = characters.filter(c => !selectedIds.includes(c.id));
    const enemyChars = [...possibleEnemies].sort(() => 0.5 - Math.random()).slice(0, 3);

    let unitIdCounter = 1;

    const createTacticalUnit = (char: typeof characters[0], isPlayer: boolean, index: number): TacticalUnit => {
      const speed = char.speed;
      // 3× movement so units can actually cross the map
      const move = Math.max(12, Math.floor(speed / 7) * 3);
      const range = char.role === 'Ranger' ? 8
                  : char.role === 'Mage'   ? 7
                  : char.role === 'Worg'   ? 3
                  : 2;

      // Spawn teams on opposite sides of the map using level spawn zones
      const spawn = isPlayer ? level.playerSpawn : level.enemySpawn;
      const col = index % 2;
      const row = Math.floor(index / 2);
      // Space units out within the spawn band
      const x = Math.min(spawn.xMax, spawn.xMin + col * 3);
      const y = Math.min(spawn.yMax, spawn.yMin + row * 5);

      const maxMana    = Math.round(Math.max(20, 10 + speed * 3));
      const maxStamina = Math.round(Math.max(40, 30 + speed * 2));

      return {
        id: `unit_${unitIdCounter++}`,
        characterId: char.id,
        name: char.name,
        race: char.race,
        role: char.role,
        hp: char.hp,
        maxHp: char.hp,
        mana: maxMana,
        maxMana,
        stamina: maxStamina,
        maxStamina,
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

    playerUnits.forEach((unit, i) => {
      const charId = playerChars[i].id;
      // Use player-chosen loadout first; fall back to default if somehow missing
      const chosenLoadout = loadoutByCharId[charId];
      if (chosenLoadout) {
        setEquippedSkills(unit.id, chosenLoadout);
      } else {
        // Fallback: auto-assign first skill per slot
        const weaponType = weaponByCharId[charId];
        const tree = weaponType ? WEAPON_SKILL_TREES[weaponType] : undefined;
        if (tree) {
          const loadout = {} as Record<SkillSlot, string>;
          for (const slot of tree.slots) {
            if (slot.skills.length > 0) {
              loadout[slot.slot as SkillSlot] = slot.skills[0].id;
            }
          }
          setEquippedSkills(unit.id, loadout);
        }
      }
    });

    setLocation("/level-select");
  };

  const pendingHero = pendingHeroId ? characters?.find(c => c.id === pendingHeroId) : null;

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
    <>
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
              <p className="text-muted-foreground mt-2 font-serif italic drop-shadow-md text-white/80">
                Select 3 warriors. Choose their weapon before the fight.
              </p>
            </div>
            <div className="w-[100px]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {characters.map((char, i) => {
              const equipped = weaponByCharId[char.id];
              const tree = equipped ? WEAPON_SKILL_TREES[equipped] : undefined;
              return (
                <motion.div
                  key={char.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <CharacterCard
                    character={char}
                    selected={selectedIds.includes(char.id)}
                    onClick={() => handleCardClick(char.id)}
                  />
                  {tree && selectedIds.includes(char.id) && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-sm"
                    >
                      <span className="text-sm">{tree.icon}</span>
                      <span className="text-xs font-display text-primary font-semibold">{tree.displayName}</span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          // Remove from party to allow re-selection after new weapon+loadout
                          setSelectedIds(prev => prev.filter(x => x !== char.id));
                          setWeaponByCharId(prev => { const n = { ...prev }; delete n[char.id]; return n; });
                          setLoadoutByCharId(prev => { const n = { ...prev }; delete n[char.id]; return n; });
                          setPendingHeroId(char.id);
                          setPendingWeaponType(null);
                        }}
                        className="ml-auto text-[10px] text-primary/50 hover:text-primary underline"
                      >
                        change
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
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
                <div className="flex gap-3 text-primary font-display font-bold flex-wrap">
                  {selectedIds.map(id => {
                    const char = characters.find(c => c.id === id);
                    const weapon = weaponByCharId[id];
                    const tree = weapon ? WEAPON_SKILL_TREES[weapon] : undefined;
                    return char ? (
                      <span key={id} className="text-sm">
                        {char.name}
                        {tree && <span className="text-primary/50 font-normal ml-1 text-xs">({tree.icon} {tree.displayName})</span>}
                      </span>
                    ) : null;
                  })}
                  {selectedIds.length === 0 && <span className="text-sm text-muted-foreground">None</span>}
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

      {/* Step 1: Weapon Picker — shown when hero selected but weapon not yet chosen */}
      {pendingHero && !pendingWeaponType && (
        <WeaponPicker
          heroName={pendingHero.name}
          heroPortrait={`${import.meta.env.BASE_URL}images/chars/${pendingHero.id}.png`}
          weapons={getHeroWeaponOptions(pendingHero.id)}
          onSelect={handleWeaponSelect}
          onCancel={handleCancelWeapon}
        />
      )}

      {/* Step 2: Skill Loadout — shown after weapon is chosen, before confirming */}
      {pendingHero && pendingWeaponType && WEAPON_SKILL_TREES[pendingWeaponType] && (
        <SkillLoadoutModal
          heroName={pendingHero.name}
          heroPortrait={`${import.meta.env.BASE_URL}images/chars/${pendingHero.id}.png`}
          heroSpecialAbility={pendingHero.specialAbility}
          heroSpecialAbilityDesc={pendingHero.specialAbilityDescription}
          weapon={WEAPON_SKILL_TREES[pendingWeaponType]}
          onConfirm={handleLoadoutConfirm}
          onBack={handleLoadoutBack}
        />
      )}
    </>
  );
}
