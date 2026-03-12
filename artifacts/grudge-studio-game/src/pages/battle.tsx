import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useGameStore } from "@/store/use-game-store";
import { HealthBar } from "@/components/ui/health-bar";
import { FantasyButton } from "@/components/ui/fantasy-button";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Sword, Zap, HeartPulse, Skull } from "lucide-react";
import { cn } from "@/lib/utils";

// Types for combat state
type Turn = 'player' | 'enemy';
interface LogEntry { id: number; text: string; type: 'damage' | 'heal' | 'buff' | 'debuff' | 'info'; }
interface CombatStats {
  hp: number;
  maxHp: number;
  attackMod: number; // Multiplier
  defenseMod: number; // Multiplier
  cooldown: number;
  skipNext: boolean;
}

export default function Battle() {
  const [, setLocation] = useLocation();
  const { playerCharacter, enemyCharacter, setResult } = useGameStore();

  // Route protection
  useEffect(() => {
    if (!playerCharacter || !enemyCharacter) {
      setLocation("/select");
    }
  }, [playerCharacter, enemyCharacter, setLocation]);

  if (!playerCharacter || !enemyCharacter) return null;

  // Combat State
  const [turn, setTurn] = useState<Turn>(playerCharacter.speed >= enemyCharacter.speed ? 'player' : 'enemy');
  const [round, setRound] = useState(1);
  const [logs, setLogs] = useState<LogEntry[]>([{ id: 0, text: `Battle Begins! ${playerCharacter.name} vs ${enemyCharacter.name}`, type: 'info' }]);
  const logCounter = useRef(1);
  const logEndRef = useRef<HTMLDivElement>(null);
  
  // Visual Effects State
  const [playerShake, setPlayerShake] = useState(false);
  const [enemyShake, setEnemyShake] = useState(false);

  const [pStats, setPStats] = useState<CombatStats>({
    hp: playerCharacter.hp, maxHp: playerCharacter.hp,
    attackMod: 1, defenseMod: 1, cooldown: 0, skipNext: false
  });

  const [eStats, setEStats] = useState<CombatStats>({
    hp: enemyCharacter.hp, maxHp: enemyCharacter.hp,
    attackMod: 1, defenseMod: 1, cooldown: 0, skipNext: false
  });

  const addLog = (text: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { id: logCounter.current++, text, type }]);
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const triggerHitEffect = (target: Turn) => {
    if (target === 'player') { setPlayerShake(true); setTimeout(() => setPlayerShake(false), 400); }
    else { setEnemyShake(true); setTimeout(() => setEnemyShake(false), 400); }
  };

  const calculateDamage = (attacker: typeof playerCharacter, defStats: CombatStats, attStats: CombatStats, isCrit: boolean = false, ignoreDef: boolean = false) => {
    const baseAtk = attacker.attack * attStats.attackMod;
    const effDef = ignoreDef ? 0 : (defStats.defenseMod * (turn === 'player' ? enemyCharacter.defense : playerCharacter.defense) / 2);
    let damage = Math.max(1, baseAtk - effDef);
    damage = damage * (Math.random() * 0.4 + 0.8); // 80% to 120% variance
    if (isCrit) damage *= 1.5;
    return Math.floor(damage);
  };

  const endBattle = (winner: Turn) => {
    // Calculate score: base + hp remaining bonus + round speed bonus
    const hpBonus = winner === 'player' ? Math.floor((pStats.hp / pStats.maxHp) * 500) : 0;
    const speedBonus = winner === 'player' ? Math.max(0, 1000 - (round * 50)) : 0;
    const score = winner === 'player' ? 1000 + hpBonus + speedBonus : 100;
    
    setResult(winner === 'player' ? 'win' : 'loss', score);
    setTimeout(() => setLocation("/result"), 2000);
  };

  const executeTurn = (action: 'attack' | 'special', actor: Turn) => {
    const isPlayer = actor === 'player';
    const attackerChar = isPlayer ? playerCharacter : enemyCharacter;
    const defenderChar = isPlayer ? enemyCharacter : playerCharacter;
    
    let aStats = isPlayer ? pStats : eStats;
    let dStats = isPlayer ? eStats : pStats;
    const setAStats = isPlayer ? setPStats : setEStats;
    const setDStats = isPlayer ? setEStats : setPStats;

    // Check skip
    if (aStats.skipNext) {
      addLog(`${attackerChar.name} is confused/stunned and skips their turn!`, 'debuff');
      setAStats({ ...aStats, skipNext: false });
      proceedToNextTurn(actor);
      return;
    }

    if (action === 'attack') {
      const damage = calculateDamage(attackerChar, dStats, aStats);
      dStats.hp -= damage;
      triggerHitEffect(isPlayer ? 'enemy' : 'player');
      addLog(`${attackerChar.name} attacks for ${damage} damage!`, 'damage');
    } else {
      // SPECIAL ABILITY LOGIC (Hardcoded based on lore instructions)
      addLog(`${attackerChar.name} uses ${attackerChar.specialAbility}!`, 'info');
      aStats.cooldown = 3;

      const ability = attackerChar.specialAbility;
      let damage = 0;

      switch(ability) {
        case "Frost Rage":
          damage = calculateDamage(attackerChar, dStats, aStats);
          if (dStats.hp < dStats.maxHp * 0.3) { damage *= 2; addLog("Frost Rage executes with lethal cold!", 'damage'); }
          dStats.hp -= damage;
          break;
        case "Lava Touch":
          damage = calculateDamage(attackerChar, dStats, aStats) * 0.8;
          dStats.hp -= damage;
          dStats.defenseMod *= 0.8;
          addLog(`Melted armor! Defense reduced. Took ${Math.floor(damage)} damage.`, 'debuff');
          break;
        case "Eldritch Corruption":
          dStats.attackMod *= 0.9; dStats.defenseMod *= 0.9;
          addLog("Cursed! Attack and Defense reduced by 10%.", 'debuff');
          break;
        case "Voice Mimic":
        case "Shield Bash":
          damage = calculateDamage(attackerChar, dStats, aStats) * 0.5;
          dStats.hp -= damage;
          dStats.skipNext = true;
          addLog(`Dealt ${Math.floor(damage)} damage and stunned the target!`, 'debuff');
          break;
        case "Trophy Collector":
        case "Battle Cry":
          aStats.attackMod *= 1.3;
          addLog("Attack power surged!", 'buff');
          break;
        case "Precision Shot":
          damage = calculateDamage(attackerChar, dStats, aStats, true, true); // Crit + Ignore Def
          dStats.hp -= damage;
          addLog(`A perfect strike ignores armor for ${Math.floor(damage)} damage!`, 'damage');
          break;
        case "Berserker Rage":
          if (aStats.hp < aStats.maxHp * 0.5) {
            damage = calculateDamage(attackerChar, dStats, { ...aStats, attackMod: aStats.attackMod * 2 });
            addLog(`Enraged strike deals ${Math.floor(damage)} damage!`, 'damage');
          } else {
            damage = calculateDamage(attackerChar, dStats, aStats);
            addLog(`Standard strike (not angry enough) deals ${Math.floor(damage)} damage.`, 'damage');
          }
          dStats.hp -= damage;
          break;
        case "Death's Embrace":
          damage = calculateDamage(attackerChar, dStats, aStats);
          dStats.hp -= damage;
          const heal = Math.floor(damage * 0.5);
          aStats.hp = Math.min(aStats.maxHp, aStats.hp + heal);
          addLog(`Drained ${Math.floor(damage)} life and healed for ${heal}!`, 'heal');
          break;
        case "Iron Fortress":
          aStats.defenseMod *= 1.5;
          addLog("Defense drastically increased!", 'buff');
          break;
        default:
          damage = calculateDamage(attackerChar, dStats, aStats) * 1.2;
          dStats.hp -= damage;
          addLog(`Powerful strike deals ${Math.floor(damage)} damage!`, 'damage');
      }
      
      if (damage > 0) triggerHitEffect(isPlayer ? 'enemy' : 'player');
    }

    // Apply states
    setAStats({ ...aStats });
    setDStats({ ...dStats });

    // Check win condition immediately after state mutation variables (before react render)
    if (dStats.hp <= 0) {
      addLog(`${defenderChar.name} has fallen!`, 'info');
      setDStats({ ...dStats, hp: 0 }); // clamp visually
      endBattle(actor);
      return;
    }

    proceedToNextTurn(actor);
  };

  const proceedToNextTurn = (currentActor: Turn) => {
    setTimeout(() => {
      if (currentActor === 'player') {
        setTurn('enemy');
      } else {
        setTurn('player');
        setRound(r => r + 1);
        setPStats(s => ({ ...s, cooldown: Math.max(0, s.cooldown - 1) }));
        setEStats(s => ({ ...s, cooldown: Math.max(0, s.cooldown - 1) }));
      }
    }, 1000);
  };

  // Enemy AI
  useEffect(() => {
    if (turn === 'enemy' && eStats.hp > 0 && pStats.hp > 0) {
      const timer = setTimeout(() => {
        // Simple AI: use special if available, else attack
        if (eStats.cooldown === 0 && !eStats.skipNext) {
          executeTurn('special', 'enemy');
        } else {
          executeTurn('attack', 'enemy');
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, eStats.hp, pStats.hp]);

  const handleFlee = () => {
    setResult('fled', 0);
    setLocation("/result");
  };

  return (
    <div className="min-h-screen relative flex flex-col bg-background overflow-hidden">
      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-30 mix-blend-luminosity"
        style={{ backgroundImage: `url('${import.meta.env.BASE_URL}images/battle-bg.png')` }}
      />
      <div className={cn("absolute inset-0 z-0 transition-opacity duration-1000", pStats.hp < pStats.maxHp * 0.3 ? "opacity-100 animate-pulse-red" : "opacity-0")} />

      {/* Header */}
      <header className="relative z-10 p-4 border-b border-white/10 bg-black/60 backdrop-blur-sm flex justify-between items-center">
        <div>
          <h2 className="font-display text-primary font-bold">Round {round}</h2>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{turn === 'player' ? "Your Turn" : "Enemy Turn"}</p>
        </div>
        <FantasyButton variant="ghost" size="sm" onClick={handleFlee}>Flee Battle</FantasyButton>
      </header>

      {/* Combat Arena */}
      <main className="relative z-10 flex-grow flex flex-col lg:flex-row items-center justify-between p-4 md:p-12 gap-8">
        
        {/* Player Side */}
        <motion.div 
          className={cn("w-full lg:w-1/3 flex flex-col gap-4", playerShake && "animate-shake")}
          animate={{ x: turn === 'player' ? 10 : 0, scale: turn === 'player' ? 1.05 : 1 }}
        >
          <HealthBar current={pStats.hp} max={pStats.maxHp} label={playerCharacter.name} />
          
          <div className="relative aspect-[3/4] bg-card/80 border-2 border-primary/50 rounded-sm overflow-hidden shadow-2xl flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
            <Shield className="w-32 h-32 opacity-20 absolute" />
            <div className="z-20 text-center">
              <h3 className="font-display text-2xl text-glow">{playerCharacter.name}</h3>
              <p className="text-primary text-sm uppercase font-bold tracking-widest mt-2">{playerCharacter.race}</p>
            </div>
            {/* Status indicators */}
            <div className="absolute top-2 right-2 flex gap-1 z-30">
              {pStats.attackMod > 1 && <span className="bg-green-500 text-black text-[10px] px-1 rounded font-bold">ATK+</span>}
              {pStats.defenseMod > 1 && <span className="bg-blue-500 text-black text-[10px] px-1 rounded font-bold">DEF+</span>}
              {pStats.defenseMod < 1 && <span className="bg-red-500 text-white text-[10px] px-1 rounded font-bold">DEF-</span>}
              {pStats.skipNext && <span className="bg-purple-500 text-white text-[10px] px-1 rounded font-bold">STUN</span>}
            </div>
          </div>
        </motion.div>

        {/* VS Center */}
        <div className="w-full lg:w-1/3 flex flex-col items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-black border-4 border-border flex items-center justify-center shadow-[0_0_30px_rgba(218,165,32,0.2)]">
            <Sword className="w-10 h-10 text-primary rotate-45" />
          </div>
        </div>

        {/* Enemy Side */}
        <motion.div 
          className={cn("w-full lg:w-1/3 flex flex-col gap-4", enemyShake && "animate-shake")}
          animate={{ x: turn === 'enemy' ? -10 : 0, scale: turn === 'enemy' ? 1.05 : 1 }}
        >
          <HealthBar current={eStats.hp} max={eStats.maxHp} label={enemyCharacter.name} isEnemy />
          
          <div className="relative aspect-[3/4] bg-card/80 border-2 border-destructive/50 rounded-sm overflow-hidden shadow-[0_0_20px_rgba(200,0,0,0.2)] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
            <Skull className="w-32 h-32 opacity-20 absolute text-destructive" />
            <div className="z-20 text-center">
              <h3 className="font-display text-2xl text-glow-red">{enemyCharacter.name}</h3>
              <p className="text-destructive text-sm uppercase font-bold tracking-widest mt-2">{enemyCharacter.race}</p>
            </div>
             {/* Status indicators */}
             <div className="absolute top-2 left-2 flex gap-1 z-30">
              {eStats.attackMod > 1 && <span className="bg-green-500 text-black text-[10px] px-1 rounded font-bold">ATK+</span>}
              {eStats.defenseMod > 1 && <span className="bg-blue-500 text-black text-[10px] px-1 rounded font-bold">DEF+</span>}
              {eStats.defenseMod < 1 && <span className="bg-red-500 text-white text-[10px] px-1 rounded font-bold">DEF-</span>}
              {eStats.skipNext && <span className="bg-purple-500 text-white text-[10px] px-1 rounded font-bold">STUN</span>}
            </div>
          </div>
        </motion.div>
      </main>

      {/* Controls & Log */}
      <footer className="relative z-10 h-64 bg-black/80 border-t border-border flex flex-col lg:flex-row">
        
        {/* Combat Log */}
        <div className="flex-1 border-r border-white/5 p-4 overflow-y-auto font-mono text-sm custom-scrollbar">
          <AnimatePresence initial={false}>
            {logs.map((log) => (
              <motion.div 
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "mb-2 pb-1 border-b border-white/5",
                  log.type === 'damage' ? 'text-orange-400' :
                  log.type === 'heal' ? 'text-green-400' :
                  log.type === 'buff' ? 'text-blue-400' :
                  log.type === 'debuff' ? 'text-purple-400' :
                  'text-muted-foreground'
                )}
              >
                {log.text}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={logEndRef} />
        </div>

        {/* Action Panel */}
        <div className="w-full lg:w-96 p-6 flex flex-col justify-center gap-4 bg-gradient-to-t from-transparent to-white/[0.02]">
          <FantasyButton 
            onClick={() => executeTurn('attack', 'player')} 
            disabled={turn !== 'player' || pStats.hp <= 0}
            className="w-full justify-between"
          >
            <span>Standard Attack</span>
            <Sword className="w-4 h-4 opacity-50" />
          </FantasyButton>
          
          <div className="relative group">
            <FantasyButton 
              variant="secondary"
              onClick={() => executeTurn('special', 'player')} 
              disabled={turn !== 'player' || pStats.cooldown > 0 || pStats.hp <= 0}
              className="w-full justify-between"
            >
              <span>{playerCharacter.specialAbility}</span>
              {pStats.cooldown > 0 ? (
                <span className="text-xs text-muted-foreground">CD: {pStats.cooldown}</span>
              ) : (
                <Zap className="w-4 h-4 text-accent" />
              )}
            </FantasyButton>
            {/* Tooltip hint for ability */}
            <div className="absolute bottom-full left-0 w-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-popover border border-border p-2 text-xs text-center rounded shadow-xl z-50">
              {playerCharacter.specialAbilityDescription}
            </div>
          </div>
        </div>

      </footer>
    </div>
  );
}
