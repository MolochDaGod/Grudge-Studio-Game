import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { WeaponPicker } from "@/components/ui/weapon-picker";
import { SkillLoadoutModal } from "@/components/ui/skill-loadout-modal";
import { FantasyButton } from "@/components/ui/fantasy-button";
import { useGameStore, TacticalUnit } from "@/store/use-game-store";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sword, Shield, Clock, Target, Zap, Heart, ChevronRight, Star } from "lucide-react";
import { CHARACTER_LORE } from "@/lib/lore";
import { getHeroWeaponOptions } from "@/lib/hero-weapons";
import { WEAPON_SKILL_TREES, SkillSlot, SLOT_LABELS, TIER_STYLES, WeaponSkillTree, Skill } from "@/lib/weapon-skills";
import { getLevelWithEdits } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { CHARACTERS as LOCAL_CHARACTERS, type GameCharacter } from "@/lib/characters";
import {
  loadCampaignState, chooseFaction, getUnlockedHeroIds,
  getNextCampaignLevel, getHeroUnlockedByLevel,
  SELECTABLE_FACTIONS, type FactionId, type CampaignState,
} from "@/lib/campaign";

const BASE = import.meta.env.BASE_URL;

// ── Faction metadata ──────────────────────────────────────────────────────────
const FACTIONS = [
  {
    id: "Crusade",
    name: "The Crusade",
    subtitle: "Holy Warriors of Mankind",
    description: "Champions of justice and glory — knights, battle-mages and barbarian berserkers fighting under the banner of righteousness.",
    races: ["Human", "Barbarian"],
    emblem: `${import.meta.env.BASE_URL}images/emblems/crusade.png`,
    accent: "#3b82f6",
    bg: "from-blue-950 via-[#0c1428] to-[#07091a]",
    border: "border-blue-700/50",
    glow: "shadow-[0_0_60px_rgba(59,130,246,0.2)]",
    hoverGlow: "hover:shadow-[0_0_80px_rgba(59,130,246,0.4)]",
    activeBg: "bg-blue-900/20",
    activeBorder: "border-blue-500",
    badgeBg: "bg-blue-950/60 border-blue-700/50 text-blue-300",
    tagText: "text-blue-400",
  },
  {
    id: "Fabled",
    name: "The Fabled",
    subtitle: "Ancient Legends",
    description: "Races bound by age-old legend — dwarven forge-masters and elven bladedancers wielding mastery of craft, nature and arcane arts.",
    races: ["Dwarf", "Elf"],
    emblem: `${import.meta.env.BASE_URL}images/emblems/fabled.png`,
    accent: "#a855f7",
    bg: "from-purple-950 via-[#110b1e] to-[#07050f]",
    border: "border-purple-700/50",
    glow: "shadow-[0_0_60px_rgba(168,85,247,0.2)]",
    hoverGlow: "hover:shadow-[0_0_80px_rgba(168,85,247,0.4)]",
    activeBg: "bg-purple-900/20",
    activeBorder: "border-purple-500",
    badgeBg: "bg-purple-950/60 border-purple-700/50 text-purple-300",
    tagText: "text-purple-400",
  },
  {
    id: "Legion",
    name: "The Legion",
    subtitle: "Iron Horde of Darkness",
    description: "Ruthless conquerors driven by power and dark sorcery — orc warchiefs and undead necromancers who bend the world to their will.",
    races: ["Orc", "Undead"],
    emblem: `${import.meta.env.BASE_URL}images/emblems/legion.png`,
    accent: "#ef4444",
    bg: "from-red-950 via-[#1a0808] to-[#0a0404]",
    border: "border-red-700/50",
    glow: "shadow-[0_0_60px_rgba(239,68,68,0.2)]",
    hoverGlow: "hover:shadow-[0_0_80px_rgba(239,68,68,0.4)]",
    activeBg: "bg-red-900/20",
    activeBorder: "border-red-500",
    badgeBg: "bg-red-950/60 border-red-700/50 text-red-300",
    tagText: "text-red-400",
  },
  {
    id: "Pirates",
    name: "The Pirates",
    subtitle: "Rogues of the Open Sea",
    description: "Outcasts and renegades sailing beyond the law — secret heroes with unmatched cunning, explosive firepower and unpredictable tricks.",
    races: ["Barbarian", "Human"],
    emblem: `${import.meta.env.BASE_URL}images/emblems/pirates.png`,
    accent: "#f59e0b",
    bg: "from-amber-950 via-[#1a1008] to-[#0a0800]",
    border: "border-amber-600/50",
    glow: "shadow-[0_0_60px_rgba(245,158,11,0.2)]",
    hoverGlow: "hover:shadow-[0_0_80px_rgba(245,158,11,0.4)]",
    activeBg: "bg-amber-900/20",
    activeBorder: "border-amber-500",
    badgeBg: "bg-amber-950/60 border-amber-600/50 text-amber-300",
    tagText: "text-amber-400",
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
  character: GameCharacter;
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
  const isFaithBarrier = character.id === "faith_barrier";

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
          : isFaithBarrier
            ? "border-amber-400/60 shadow-[0_0_18px_rgba(251,191,36,0.25),0_0_36px_rgba(34,211,238,0.12)] hover:border-amber-300/80 hover:shadow-[0_0_28px_rgba(251,191,36,0.45),0_0_52px_rgba(34,211,238,0.22)]"
            : `border-white/10 hover:border-white/30 ${rglow}`,
      )}
    >
      {/* FaithBarrier — dual-storm outer glow ring */}
      {isFaithBarrier && (
        <div className="absolute inset-0 rounded-sm pointer-events-none z-30"
          style={{
            boxShadow: selected
              ? "inset 0 0 0 2px rgba(251,191,36,0.8), inset 0 0 0 4px rgba(34,211,238,0.25)"
              : "inset 0 0 0 1.5px rgba(251,191,36,0.45), inset 0 0 0 3px rgba(34,211,238,0.15)",
          }} />
      )}
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
          style={isFaithBarrier ? {
            filter: "contrast(1.15) saturate(0.6) sepia(0.25) brightness(0.9)",
          } : undefined}
          onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
        />
        {/* FaithBarrier — storm overlay (amber top, teal bottom) */}
        {isFaithBarrier && (
          <div className="absolute inset-0 pointer-events-none z-[5]"
            style={{
              background: "linear-gradient(180deg, rgba(251,191,36,0.08) 0%, transparent 40%, transparent 60%, rgba(34,211,238,0.07) 100%)",
              mixBlendMode: "overlay",
            }} />
        )}
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
          {/* FaithBarrier — Both Shores witness tag */}
          {isFaithBarrier && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(251,191,36,0.6), rgba(34,211,238,0.6))" }} />
              <span className="text-[8px] font-black uppercase tracking-widest"
                style={{ background: "linear-gradient(90deg, #fbbf24, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                ◈ Creation &amp; End ◈
              </span>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(34,211,238,0.6), rgba(251,191,36,0.6))" }} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CharacterSelect() {
  const [, setLocation] = useLocation();
  // ── Campaign state ───────────────────────────────────────────────────────────
  const [campaign, setCampaign] = useState<CampaignState>(loadCampaignState);
  const unlockedIds = new Set(getUnlockedHeroIds(campaign));
  const nextLevelId = getNextCampaignLevel(campaign);
  const nextUnlockHero = nextLevelId ? getHeroUnlockedByLevel(campaign, nextLevelId) : null;

  // Filter characters: only show unlocked heroes (campaign-gated)
  // If no faction chosen yet, show all for faction selection step
  const characters = campaign.faction
    ? LOCAL_CHARACTERS.filter(c => unlockedIds.has(c.id))
    : LOCAL_CHARACTERS;

  // Step state: 'faction' → 'hero' → 'forge'
  const [step, setStep] = useState<"faction" | "hero" | "forge">("faction");
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingHeroId, setPendingHeroId] = useState<string | null>(null);
  const [pendingWeaponType, setPendingWeaponType] = useState<string | null>(null);
  const [weaponByCharId, setWeaponByCharId] = useState<Record<string, string>>({});
  const [loadoutByCharId, setLoadoutByCharId] = useState<Record<string, Record<SkillSlot, string>>>({});

  const { initBattle, setAllCharacters, setPlayerSquad, setEquippedSkills, currentLevelId } = useGameStore();

  useEffect(() => {
    setAllCharacters(characters as any);
  }, [characters, setAllCharacters]);

  const charList = characters;
  const factionChars = charList.filter(c => c.faction === selectedFaction);

  const handleFactionSelect = (factionId: string) => {
    // If player hasn't chosen a campaign faction yet, lock it in
    if (!campaign.faction && SELECTABLE_FACTIONS.includes(factionId as FactionId)) {
      const newState = chooseFaction(factionId as FactionId);
      setCampaign(newState);
    }
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
    if (selectedIds.length !== 3 || characters.length === 0) return;
    setPlayerSquad(selectedIds);
    const level = getLevelWithEdits(currentLevelId);
    const playerChars = characters.filter(c => selectedIds.includes(c.id));

    // Pick an enemy faction that is different from the player's faction
    const allFactionIds = [...new Set(charList.map(c => c.faction))];
    const otherFactions = allFactionIds.filter(f => f !== selectedFaction);
    const enemyFaction = otherFactions[Math.floor(Math.random() * otherFactions.length)];
    const possibleEnemies = charList.filter(c => c.faction === enemyFaction);
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
      // Use the player's chosen weapon, or default to the character's first weapon option
      const chosenWeapon = isPlayer ? (weaponByCharId[char.id] ?? '') : '';
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
        weaponType: chosenWeapon,
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
        statusImmunities: {},
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

  // Characters are embedded — always available, no loading/error states needed

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
            <FantasyButton variant="ghost" onClick={() => {
              if (step === 'forge') setStep('hero');
              else if (step === 'hero') setStep('faction');
              else setLocation("/");
            }} className="gap-2 shrink-0">
              <ArrowLeft className="w-4 h-4" />
              {step === 'forge' ? 'Back to Heroes' : step === 'hero' ? 'Back to Factions' : 'Return'}
            </FantasyButton>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[11px] font-mono text-white/30">
              <span className={cn(step === 'faction' ? "text-primary font-bold" : "text-white/50")}>1. Choose Faction</span>
              <ChevronRight className="w-3 h-3" />
              <span className={cn(step === 'hero' ? "text-primary font-bold" : step === 'forge' ? "text-white/50" : "text-white/25")}>2. Choose Heroes</span>
              <ChevronRight className="w-3 h-3" />
              <span className={cn(step === 'forge' ? "text-primary font-bold" : "text-white/25")}>3. Skill Forge</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white/25">4. Choose Level</span>
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
                        {/* Large ghost emblem — top right */}
                        <img
                          src={faction.emblem}
                          alt=""
                          className="absolute -right-4 -top-4 w-48 h-48 object-contain opacity-[0.08] select-none pointer-events-none group-hover:opacity-[0.16] transition-opacity"
                        />

                        <div className="relative z-10 p-6 flex flex-col gap-4" style={{ minHeight: 320 }}>
                          {/* Emblem icon + name */}
                          <div>
                            <img
                              src={faction.emblem}
                              alt={faction.name}
                              className="w-14 h-14 object-contain mb-3 drop-shadow-lg"
                            />
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
                  <img src={activeFaction.emblem} alt="" className="absolute right-0 top-0 bottom-0 h-full w-40 object-contain object-right opacity-[0.08] select-none pointer-events-none" />
                  <div className="relative z-10 flex items-center gap-4">
                    <img src={activeFaction.emblem} alt={activeFaction.name} className="w-12 h-12 object-contain drop-shadow-lg flex-shrink-0" />
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

          {/* ── STEP 3: Skill Forge (outside AnimatePresence for reliable render) */}
          {step === "forge" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col pb-16 px-6"
              style={{ minHeight: "calc(100vh - 80px)" }}
            >
                {/* Forge header */}
                <div className="text-center mb-8">
                  <h2 className="font-display text-4xl font-bold text-glow uppercase tracking-widest">
                    ⚒ Skill Forge
                  </h2>
                  <p className="text-white/40 mt-2 font-serif italic">
                    Verify your squad's loadout before entering the arena. Each slot is filled and locked.
                  </p>
                </div>

                {/* 3 hero columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
                  {selectedIds.map((charId, heroIdx) => {
                    const char = characters?.find(c => c.id === charId);
                    if (!char) return null;
                    const weaponType = weaponByCharId[charId];
                    const tree = weaponType ? WEAPON_SKILL_TREES[weaponType] : undefined;
                    const loadout = loadoutByCharId[charId] ?? {};

                    // Find a skill object by id within this tree
                    const findSkill = (skillId: string): Skill | undefined => {
                      if (!tree) return undefined;
                      for (const slotDef of tree.slots) {
                        const s = slotDef.skills.find(sk => sk.id === skillId);
                        if (s) return s;
                      }
                      return undefined;
                    };

                    return (
                      <motion.div
                        key={charId}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: heroIdx * 0.1 }}
                        className="flex flex-col rounded-sm border border-white/10 bg-[#09090f] overflow-hidden"
                      >
                        {/* Hero header strip */}
                        <div className="relative h-28 overflow-hidden bg-black/60 shrink-0">
                          <img
                            src={`${BASE}images/chars/${char.id}.png`}
                            alt={char.name}
                            className="w-full h-full object-cover object-top scale-110"
                            style={{ filter: "brightness(0.55)" }}
                            onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#09090f] to-transparent" />
                          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between z-10">
                            <div>
                              <div className="font-display font-bold text-white text-glow text-base uppercase leading-tight">
                                {char.name}
                              </div>
                              <div className="text-[10px] text-white/40">{char.race} {char.role}</div>
                            </div>
                            {tree && (
                              <div className="flex items-center gap-1.5 bg-black/60 border border-primary/30 rounded px-2 py-1">
                                <span className="text-base">{tree.icon}</span>
                                <span className="text-[11px] font-display font-bold text-primary/80">{tree.displayName}</span>
                              </div>
                            )}
                          </div>
                          {/* Hero index badge */}
                          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center text-primary font-display font-bold text-xs">
                            {heroIdx + 1}
                          </div>
                        </div>

                        {/* Skill slots */}
                        <div className="flex flex-col divide-y divide-white/5">
                          {([1, 2, 3, 4, 5] as SkillSlot[]).map(slotNum => {
                            const slotMeta = SLOT_LABELS[slotNum];
                            const skillId = loadout[slotNum];
                            const skill = skillId ? findSkill(skillId) : undefined;
                            const tier = skill ? (TIER_STYLES[skill.tier] ?? TIER_STYLES.T1) : null;

                            return (
                              <div
                                key={slotNum}
                                className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                              >
                                {/* Slot badge */}
                                <div
                                  className="w-9 h-9 shrink-0 rounded border flex flex-col items-center justify-center gap-0.5 mt-0.5"
                                  style={{
                                    borderColor: slotMeta.color + "55",
                                    background: slotMeta.color + "0e",
                                    backgroundImage: `url('${BASE}images/ui/HUD/Action Bar/Slots/ActionBar_MainSlot_Background.png')`,
                                    backgroundSize: "100% 100%",
                                  }}
                                >
                                  <span className="font-display font-black text-[10px] leading-none" style={{ color: slotMeta.color }}>{slotMeta.roman}</span>
                                  {skill && <span className="text-sm leading-none">{skill.icon}</span>}
                                </div>

                                {/* Skill info */}
                                {skill ? (
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                      <span className="font-display font-bold text-sm text-white leading-tight">{skill.name}</span>
                                      {tier && (
                                        <span className="text-[8px] font-bold px-1 py-0.5 rounded uppercase tracking-widest shrink-0"
                                          style={{ backgroundColor: tier.color + "22", color: tier.color, border: `1px solid ${tier.color}44` }}>
                                          {tier.label}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-white/45 italic leading-snug line-clamp-2 mb-1">{skill.description}</p>
                                    <div className="flex flex-wrap gap-1">
                                      {skill.stats.map((s, i) => (
                                        <span key={i} className="text-[8px] bg-white/6 border border-white/10 rounded px-1 py-0.5 text-white/55 font-mono">{s}</span>
                                      ))}
                                      <span className="text-[8px] text-white/25 font-mono flex items-center gap-0.5">
                                        <Target className="w-2 h-2" />{skill.range}
                                      </span>
                                      {skill.cooldown > 0 && skill.cooldown < 999 && (
                                        <span className="text-[8px] text-orange-400/60 font-mono flex items-center gap-0.5">
                                          <Clock className="w-2 h-2" />CD {skill.cooldown}
                                        </span>
                                      )}
                                      {skill.cooldown === 999 && (
                                        <span className="text-[8px] text-yellow-400/70 font-mono flex items-center gap-0.5">
                                          <Star className="w-2 h-2" />Once
                                        </span>
                                      )}
                                      {skill.aoe && <span className="text-[8px] text-yellow-300/60 font-mono flex items-center gap-0.5"><Zap className="w-2 h-2" />AoE</span>}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex-1 flex items-center h-9">
                                    <span className="text-[11px] text-white/20 italic">— no skill selected —</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Special ability footer */}
                        <div className="mt-auto px-4 py-3 border-t border-yellow-600/15 bg-yellow-950/10">
                          <div className="text-[8px] text-yellow-400/50 uppercase tracking-widest mb-0.5">Class Passive</div>
                          <div className="font-display font-bold text-xs text-yellow-300/70">{char.specialAbility}</div>
                          <div className="text-[9px] text-white/25 italic mt-0.5 line-clamp-2">{char.specialAbilityDescription}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Enter arena from forge */}
                <div className="flex flex-col items-center gap-3 mt-10">
                  <FantasyButton size="lg" onClick={handleStartBattle} className="px-16 gap-2">
                    <Sword className="w-5 h-5" />
                    Enter The Arena
                  </FantasyButton>
                  <p className="text-[10px] text-white/20 italic">Loadout is final once you enter the arena.</p>
                </div>
              </motion.div>
            )}
        </div>

        {/* ── Bottom bar: squad preview + go to forge ─────────────────────── */}
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
              onClick={() => setStep('forge')}
              disabled={selectedIds.length !== 3}
              className="w-full sm:w-auto px-12 shrink-0"
            >
              <Sword className="w-5 h-5 mr-2" />
              {selectedIds.length === 3 ? "Review at Skill Forge →" : `Select ${3 - selectedIds.length} more`}
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
