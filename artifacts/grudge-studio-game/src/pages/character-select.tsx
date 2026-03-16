import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetCharacters } from "@workspace/api-client-react";
import { WeaponPicker } from "@/components/ui/weapon-picker";
import { SkillLoadoutModal } from "@/components/ui/skill-loadout-modal";
import { FantasyButton } from "@/components/ui/fantasy-button";
import { useGameStore, TacticalUnit } from "@/store/use-game-store";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, Skull, Sword, Shield, Swords, Zap, Heart, ChevronRight, Info, Star } from "lucide-react";
import { CHARACTER_LORE } from "@/lib/lore";
import { getHeroWeaponOptions } from "@/lib/hero-weapons";
import { WEAPON_SKILL_TREES, SkillSlot } from "@/lib/weapon-skills";
import { getLevelWithEdits } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { Character } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL;

// ── Faction metadata ──────────────────────────────────────────────────────────
const FACTIONS = [
  {
    id: "Crusade",
    name: "The Crusade",
    subtitle: "Holy Warriors of Mankind",
    description: "Champions of justice and glory — knights, battle-mages and barbarian berserkers fighting under the banner of righteousness.",
    races: ["Human", "Barbarian"],
    emoji: "⚔️",
    accent: "#3b82f6",
    bg: "from-blue-950 via-[#0c1428] to-[#07091a]",
    border: "border-blue-700/50",
    glow: "shadow-[0_0_60px_rgba(59,130,246,0.2)]",
    hoverGlow: "hover:shadow-[0_0_80px_rgba(59,130,246,0.4)]",
    activeBg: "bg-blue-900/20",
    activeBorder: "border-blue-500",
    badgeBg: "bg-blue-950/60 border-blue-700/50 text-blue-300",
    tagText: "text-blue-400",
    art: "🛡️",
  },
  {
    id: "Fabled",
    name: "The Fabled",
    subtitle: "Ancient Legends",
    description: "Races bound by age-old legend — dwarven forge-masters and elven bladedancers wielding mastery of craft, nature and arcane arts.",
    races: ["Dwarf", "Elf"],
    emoji: "✨",
    accent: "#a855f7",
    bg: "from-purple-950 via-[#110b1e] to-[#07050f]",
    border: "border-purple-700/50",
    glow: "shadow-[0_0_60px_rgba(168,85,247,0.2)]",
    hoverGlow: "hover:shadow-[0_0_80px_rgba(168,85,247,0.4)]",
    activeBg: "bg-purple-900/20",
    activeBorder: "border-purple-500",
    badgeBg: "bg-purple-950/60 border-purple-700/50 text-purple-300",
    tagText: "text-purple-400",
    art: "🌿",
  },
  {
    id: "Legion",
    name: "The Legion",
    subtitle: "Iron Horde of Darkness",
    description: "Ruthless conquerors driven by power and dark sorcery — orc warchiefs and undead necromancers who bend the world to their will.",
    races: ["Orc", "Undead"],
    emoji: "☠️",
    accent: "#ef4444",
    bg: "from-red-950 via-[#1a0808] to-[#0a0404]",
    border: "border-red-700/50",
    glow: "shadow-[0_0_60px_rgba(239,68,68,0.2)]",
    hoverGlow: "hover:shadow-[0_0_80px_rgba(239,68,68,0.4)]",
    activeBg: "bg-red-900/20",
    activeBorder: "border-red-500",
    badgeBg: "bg-red-950/60 border-red-700/50 text-red-300",
    tagText: "text-red-400",
    art: "⚡",
  },
  {
    id: "Pirates",
    name: "The Pirates",
    subtitle: "Rogues of the Open Sea",
    description: "Outcasts and renegades sailing beyond the law — secret heroes with unmatched cunning, explosive firepower and unpredictable tricks.",
    races: ["Barbarian", "Human"],
    emoji: "⚓",
    accent: "#f59e0b",
    bg: "from-amber-950 via-[#1a1008] to-[#0a0800]",
    border: "border-amber-600/50",
    glow: "shadow-[0_0_60px_rgba(245,158,11,0.2)]",
    hoverGlow: "hover:shadow-[0_0_80px_rgba(245,158,11,0.4)]",
    activeBg: "bg-amber-900/20",
    activeBorder: "border-amber-500",
    badgeBg: "bg-amber-950/60 border-amber-600/50 text-amber-300",
    tagText: "text-amber-400",
    art: "🏴‍☠️",
    secret: true,
  },
];

const RARITY_COLOR: Record<string, string> = {
  common: "#9ca3af", uncommon: "#4ade80", rare: "#60a5fa",
  epic: "#c084fc", legendary: "#f59e0b",
};
const RARITY_GLOW: Record<string, string> = {
  legendary: "shadow-[0_0_22px_rgba(245,158,11,0.45)]",
  epic: "shadow-[0_0_16px_rgba(192,132,252,0.35)]",
  rare: "shadow-[0_0_10px_rgba(96,165,250,0.3)]",
  uncommon: "", common: "",
};
const CLASS_ICON: Record<string, string> = {
  Warrior: "⚔", Worg: "🐺", Mage: "✦", Ranger: "🏹",
};

// ── Hero card for Step 2 (larger, full portrait focus) ───────────────────────
function HeroCard({
  character,
  selected,
  onClick,
  disabled,
  equipped,
}: {
  character: Character;
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
  equipped?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const rColor = RARITY_COLOR[character.rarity] ?? "#9ca3af";
  const rglow = RARITY_GLOW[character.rarity] ?? "";
  const lore = CHARACTER_LORE[character.id];
  const classIcon = CLASS_ICON[character.role] ?? "◆";

  return (
    <motion.div
      whileHover={!disabled ? { y: -6, scale: 1.02 } : {}}
      onClick={!disabled ? onClick : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative rounded-sm border overflow-hidden transition-all duration-300 flex flex-col",
        disabled && !selected ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
        selected
          ? `border-primary ring-2 ring-primary shadow-[0_0_35px_rgba(218,165,32,0.5)] ${rglow}`
          : `border-white/10 hover:border-white/30 ${rglow}`,
      )}
    >
      {/* Rarity bar */}
      <div className="h-0.5 w-full shrink-0" style={{ background: rColor }} />

      {/* Portrait — tall */}
      <div className="relative overflow-hidden bg-black/70" style={{ height: 280 }}>
        <img
          src={`${BASE}images/chars/${character.id}.png`}
          alt={character.name}
          className={cn(
            "w-full h-full object-cover object-top transition-transform duration-700",
            hovered && !disabled ? "scale-110" : "scale-100",
          )}
          onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07070f] via-[#07070f]/40 to-transparent" />

        {/* Selected frame overlay */}
        {selected && (
          <div className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url('${BASE}images/ui/Lobby/Hero Select/Hero Frame/HeroSelect_Hero_Selected.png')`,
              backgroundSize: "100% 100%", backgroundRepeat: "no-repeat",
              opacity: 0.7, mixBlendMode: "screen",
            }} />
        )}
        {/* RPG hero frame */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url('${BASE}images/ui/Lobby/Hero Select/Hero Frame/HeroSelect_Hero_Frame.png')`,
            backgroundSize: "100% 100%", backgroundRepeat: "no-repeat",
            opacity: selected ? 0.85 : 0.45, mixBlendMode: "screen",
          }} />

        {/* Rarity badge top-left */}
        <div className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded-sm text-[8px] font-bold uppercase tracking-wider border"
          style={{ borderColor: `${rColor}66`, color: rColor, background: `${rColor}18` }}>
          {character.rarity}
        </div>

        {/* Secret badge */}
        {character.faction === "Pirates" && (
          <div className="absolute top-2 right-2 z-20 px-1.5 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-yellow-400 text-black">
            SECRET
          </div>
        )}

        {/* Selected checkmark */}
        {selected && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center shadow-[0_0_24px_rgba(218,165,32,0.7)]">
              <span className="text-2xl text-primary font-bold">✓</span>
            </div>
          </div>
        )}

        {/* Equipped weapon badge */}
        {equipped && (
          <div className="absolute bottom-2 right-2 z-20">
            <div className="flex items-center gap-1 text-[9px] bg-black/70 border border-primary/40 rounded px-1.5 py-0.5 text-primary font-bold">
              {WEAPON_SKILL_TREES[equipped]?.icon} {WEAPON_SKILL_TREES[equipped]?.displayName}
            </div>
          </div>
        )}

        {/* Name at bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-3 pb-2">
          <div className="font-display font-bold text-white text-glow text-base leading-tight uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
            {character.name}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-white/50">{classIcon}</span>
            <span className="text-[10px] text-white/50">{character.race} {character.role}</span>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="bg-[#07070f] px-3 py-2.5 flex flex-col gap-1.5 shrink-0">
        <div className="grid grid-cols-4 gap-1">
          {([["❤", character.hp, "HP"], ["⚔", character.attack, "ATK"], ["🛡", character.defense, "DEF"], ["⚡", character.speed, "SPD"]] as const).map(([icon, val, lbl]) => (
            <div key={lbl} className="flex flex-col items-center text-center">
              <span className="text-[11px] leading-none">{icon}</span>
              <span className="text-[11px] font-mono font-bold text-white/80 mt-0.5">{val}</span>
              <span className="text-[8px] text-white/25">{lbl}</span>
            </div>
          ))}
        </div>
        {/* Special ability */}
        <div className="border-t border-white/6 pt-1.5">
          <div className="text-[8px] text-primary/60 uppercase tracking-widest mb-0.5">Special</div>
          <div className="text-[10px] font-display font-bold text-white/70 truncate">{character.specialAbility}</div>
          {lore && <div className="text-[9px] text-white/35 italic mt-0.5 truncate">"{lore.quote.slice(1, 45)}…"</div>}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CharacterSelect() {
  const [, setLocation] = useLocation();
  const { data: characters, isLoading, error } = useGetCharacters();

  // Step state: 'faction' → 'hero'
  const [step, setStep] = useState<"faction" | "hero">("faction");
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingHeroId, setPendingHeroId] = useState<string | null>(null);
  const [pendingWeaponType, setPendingWeaponType] = useState<string | null>(null);
  const [weaponByCharId, setWeaponByCharId] = useState<Record<string, string>>({});
  const [loadoutByCharId, setLoadoutByCharId] = useState<Record<string, Record<SkillSlot, string>>>({});

  const { initBattle, setAllCharacters, setPlayerSquad, setEquippedSkills, currentLevelId } = useGameStore();

  useEffect(() => {
    if (characters) setAllCharacters(characters);
  }, [characters, setAllCharacters]);

  const factionChars = characters?.filter(c => c.faction === selectedFaction) ?? [];

  const handleFactionSelect = (factionId: string) => {
    setSelectedFaction(factionId);
    setStep("hero");
    setSelectedIds([]);
    setWeaponByCharId({});
    setLoadoutByCharId({});
  };

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

  const handleWeaponSelect = (weaponType: string) => {
    if (!pendingHeroId) return;
    setPendingWeaponType(weaponType);
  };

  const handleLoadoutConfirm = (loadout: Record<SkillSlot, string>) => {
    if (!pendingHeroId || !pendingWeaponType) return;
    setWeaponByCharId(prev => ({ ...prev, [pendingHeroId]: pendingWeaponType }));
    setLoadoutByCharId(prev => ({ ...prev, [pendingHeroId]: loadout }));
    setSelectedIds(prev => [...prev, pendingHeroId]);
    setPendingHeroId(null);
    setPendingWeaponType(null);
  };

  const handleLoadoutBack = () => setPendingWeaponType(null);

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
      const move = Math.max(12, Math.floor(speed / 7) * 3);
      const range = char.role === 'Ranger' ? 8 : char.role === 'Mage' ? 7 : char.role === 'Worg' ? 3 : 2;
      const spawn = isPlayer ? level.playerSpawn : level.enemySpawn;
      const col = index % 2;
      const row = Math.floor(index / 2);
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
        speed,
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
    const enemyUnits  = enemyChars.map((c, i) => createTacticalUnit(c, false, i));
    initBattle([...playerUnits, ...enemyUnits]);

    playerUnits.forEach((unit, i) => {
      const charId = playerChars[i].id;
      const chosenLoadout = loadoutByCharId[charId];
      if (chosenLoadout) {
        setEquippedSkills(unit.id, chosenLoadout);
      } else {
        const weaponType = weaponByCharId[charId];
        const tree = weaponType ? WEAPON_SKILL_TREES[weaponType] : undefined;
        if (tree) {
          const loadout = {} as Record<SkillSlot, string>;
          for (const slot of tree.slots) {
            if (slot.skills.length > 0) loadout[slot.slot as SkillSlot] = slot.skills[0].id;
          }
          setEquippedSkills(unit.id, loadout);
        }
      }
    });

    setLocation("/level-select");
  };

  const pendingHero = pendingHeroId ? characters?.find(c => c.id === pendingHeroId) : null;
  const activeFaction = FACTIONS.find(f => f.id === selectedFaction);

  // ── Loading / Error ──────────────────────────────────────────────────────
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
        <FantasyButton onClick={() => window.location.reload()}>Retry</FantasyButton>
      </div>
    );
  }

  return (
    <>
      <div
        className="min-h-screen bg-[#07070f] bg-cover bg-center bg-fixed bg-no-repeat overflow-x-hidden"
        style={{ backgroundImage: `url('${BASE}images/select-bg.png')` }}
      >
        <div className="absolute inset-0 bg-[#07070f]/85 backdrop-blur-sm z-0" />

        <div className="relative z-10 min-h-screen flex flex-col">

          {/* ── Top nav ─────────────────────────────────────────────────────── */}
          <div className="flex items-center px-6 pt-6 pb-4 gap-4">
            <FantasyButton variant="ghost" onClick={() => step === 'hero' ? setStep('faction') : setLocation("/")} className="gap-2 shrink-0">
              <ArrowLeft className="w-4 h-4" />
              {step === 'hero' ? 'Back to Factions' : 'Return'}
            </FantasyButton>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[11px] font-mono text-white/30">
              <span className={cn(step === 'faction' ? "text-primary font-bold" : "text-white/50")}>1. Choose Faction</span>
              <ChevronRight className="w-3 h-3" />
              <span className={cn(step === 'hero' ? "text-primary font-bold" : "text-white/25")}>2. Choose Heroes</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white/25">3. Choose Level</span>
            </div>
          </div>

          {/* ── STEP 1: Faction Selection ────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {step === "faction" && (
              <motion.div
                key="step-faction"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col items-center px-6 py-8"
              >
                <div className="text-center mb-10">
                  <h1 className="text-4xl md:text-6xl font-display font-bold text-glow uppercase tracking-wide">
                    Choose Your Faction
                  </h1>
                  <p className="text-white/45 mt-3 font-serif italic text-lg">
                    Align yourself with a great power before entering the realm of grudges.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 w-full max-w-7xl">
                  {FACTIONS.map((faction, i) => {
                    const heroCount = characters.filter(c => c.faction === faction.id).length;
                    return (
                      <motion.button
                        key={faction.id}
                        initial={{ opacity: 0, y: 32 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        onClick={() => handleFactionSelect(faction.id)}
                        className={cn(
                          "group relative rounded-lg border overflow-hidden text-left transition-all duration-300 cursor-pointer",
                          `bg-gradient-to-b ${faction.bg}`,
                          faction.border,
                          faction.glow,
                          faction.hoverGlow,
                          "hover:scale-[1.02] hover:-translate-y-1",
                        )}
                      >
                        {/* Big art emoji behind */}
                        <div className="absolute -right-4 -top-4 text-[9rem] opacity-[0.07] select-none pointer-events-none group-hover:opacity-[0.12] transition-opacity">
                          {faction.art}
                        </div>

                        <div className="relative z-10 p-6 flex flex-col gap-4" style={{ minHeight: 320 }}>
                          {/* Icon + name */}
                          <div>
                            <div className="text-5xl mb-3">{faction.emoji}</div>
                            <div className="font-display text-2xl font-bold text-white uppercase tracking-wide leading-tight">
                              {faction.name}
                            </div>
                            <div className={cn("text-[11px] font-bold uppercase tracking-widest mt-0.5", faction.tagText)}>
                              {faction.subtitle}
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-white/55 text-[13px] leading-relaxed flex-1">
                            {faction.description}
                          </p>

                          {/* Races + hero count */}
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-1.5">
                              {faction.races.map(race => (
                                <span key={race} className={cn("text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wide", faction.badgeBg)}>
                                  {race}
                                </span>
                              ))}
                              {faction.secret && (
                                <span className="text-[9px] px-2 py-0.5 rounded-full border border-amber-600/50 bg-amber-950/60 text-amber-300 font-bold uppercase tracking-wide">
                                  Secret
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-white/35 text-[11px]">
                                <Star className="w-3 h-3" />
                                <span>{heroCount} Champions</span>
                              </div>
                              <div className={cn("flex items-center gap-1 text-[11px] font-bold transition-all group-hover:gap-2", faction.tagText)}>
                                Select <ChevronRight className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom accent line */}
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-60 transition-opacity group-hover:opacity-100"
                          style={{ background: `linear-gradient(90deg, transparent, ${faction.accent}, transparent)` }} />
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Hero Selection ────────────────────────────────────── */}
            {step === "hero" && activeFaction && (
              <motion.div
                key="step-hero"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col pb-36"
              >
                {/* Faction header banner */}
                <div className={cn("relative px-6 py-5 mb-6 border-b overflow-hidden", `bg-gradient-to-r ${activeFaction.bg}`, activeFaction.border.replace("border", "border-b"))}>
                  <div className="absolute right-0 top-0 bottom-0 flex items-center pr-8 text-[8rem] opacity-[0.07] select-none pointer-events-none">
                    {activeFaction.art}
                  </div>
                  <div className="relative z-10 flex items-center gap-4">
                    <span className="text-4xl">{activeFaction.emoji}</span>
                    <div>
                      <h2 className="font-display text-2xl font-bold text-white uppercase tracking-wide">
                        {activeFaction.name}
                      </h2>
                      <p className={cn("text-[11px] font-bold uppercase tracking-widest", activeFaction.tagText)}>
                        Choose 3 champions — {selectedIds.length}/3 selected
                      </p>
                    </div>
                    {/* Mini progress */}
                    <div className="ml-auto flex gap-1.5">
                      {[0,1,2].map(i => (
                        <div key={i} className={cn(
                          "w-8 h-8 rounded border-2 flex items-center justify-center font-display text-lg font-bold transition-all",
                          i < selectedIds.length
                            ? "border-primary bg-primary/20 text-primary shadow-[0_0_12px_rgba(218,165,32,0.5)]"
                            : "border-white/15 text-white/20"
                        )}>
                          {i < selectedIds.length ? "✓" : i + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Character grid */}
                <div className="px-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-4 max-w-7xl mx-auto">
                    {factionChars.map((char, i) => {
                      const equipped = weaponByCharId[char.id];
                      return (
                        <motion.div
                          key={char.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                        >
                          <HeroCard
                            character={char}
                            selected={selectedIds.includes(char.id)}
                            disabled={selectedIds.length >= 3 && !selectedIds.includes(char.id)}
                            onClick={() => handleCardClick(char.id)}
                            equipped={equipped}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Bottom bar: selected squad + enter arena ─────────────────────── */}
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: step === "hero" && selectedIds.length > 0 ? 0 : 100 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-[#07070f]/97 backdrop-blur-md border-t border-primary/40 shadow-[0_-10px_50px_rgba(0,0,0,0.9)]"
        >
          <div className="container mx-auto px-6 py-4 flex flex-col sm:flex-row items-center gap-4">
            {/* Squad preview */}
            <div className="flex items-center gap-3 flex-1">
              <div className="flex -space-x-2">
                {selectedIds.map(id => {
                  const char = characters.find(c => c.id === id);
                  if (!char) return null;
                  return (
                    <div key={id} className="relative w-12 h-14 rounded border-2 border-primary overflow-hidden bg-black shadow-lg">
                      <img src={`${BASE}images/chars/${char.id}.png`} alt={char.name} className="w-full h-full object-cover object-top" onError={e => { (e.currentTarget as HTMLImageElement).style.opacity='0'; }} />
                    </div>
                  );
                })}
                {Array.from({ length: 3 - selectedIds.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="w-12 h-14 rounded border-2 border-dashed border-white/15 bg-white/3 flex items-center justify-center text-white/15 text-xl">
                    +
                  </div>
                ))}
              </div>
              <div>
                <div className="text-[10px] text-white/35 uppercase tracking-widest">Your Squad</div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  {selectedIds.map(id => {
                    const char = characters.find(c => c.id === id);
                    const weapon = weaponByCharId[id];
                    const tree = weapon ? WEAPON_SKILL_TREES[weapon] : undefined;
                    return char ? (
                      <span key={id} className="text-[11px] font-display font-bold text-white/80">
                        {char.name.split(" ")[0]}
                        {tree && <span className="text-primary/50 font-normal ml-1">{tree.icon}</span>}
                      </span>
                    ) : null;
                  })}
                  {selectedIds.length === 0 && <span className="text-[11px] text-white/25 italic">Select 3 champions</span>}
                </div>
              </div>
            </div>

            <FantasyButton
              size="lg"
              onClick={handleStartBattle}
              disabled={selectedIds.length !== 3}
              className="w-full sm:w-auto px-12 shrink-0"
            >
              <Sword className="w-5 h-5 mr-2" /> Enter The Arena
            </FantasyButton>
          </div>
        </motion.div>
      </div>

      {/* Weapon Picker modal */}
      {pendingHero && !pendingWeaponType && (
        <WeaponPicker
          heroName={pendingHero.name}
          heroPortrait={`${BASE}images/chars/${pendingHero.id}.png`}
          weapons={getHeroWeaponOptions(pendingHero.id)}
          onSelect={handleWeaponSelect}
          onCancel={handleCancelWeapon}
        />
      )}

      {/* Skill Loadout modal */}
      {pendingHero && pendingWeaponType && WEAPON_SKILL_TREES[pendingWeaponType] && (
        <SkillLoadoutModal
          heroName={pendingHero.name}
          heroPortrait={`${BASE}images/chars/${pendingHero.id}.png`}
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
