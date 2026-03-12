import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useGameStore, TacticalUnit } from "@/store/use-game-store";
import { FantasyButton } from "@/components/ui/fantasy-button";
import { HealthBar } from "@/components/ui/health-bar";
import { motion, AnimatePresence } from "framer-motion";
import { Skull, Move, FastForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { BattleScene } from "@/components/three/BattleScene";
import { AnimState } from "@/components/three/CharacterModel";
import { CHARACTER_LORE } from "@/lib/lore";
import {
  getSkillById, getDefaultSkillLoadout, SLOT_LABELS, TIER_STYLES,
  SkillSlot, Skill
} from "@/lib/weapon-skills";

const GRID_W = 8;
const GRID_H = 6;

export default function Battle() {
  const [, setLocation] = useLocation();
  const { 
    units, updateUnit, currentUnitId, setCurrentUnitId, 
    turnOrder, setTurnOrder, actionMode, setActionMode,
    reachableTiles, setReachableTiles, attackableTiles, setAttackableTiles,
    combatLog, addLog, setResult, phase,
    equippedSkills, skillCooldowns, usedUltimates,
    setSkillCooldown, tickSkillCooldowns, markUltimateUsed,
  } = useGameStore();

  const [animStates, setAnimStates] = useState<Record<string, AnimState>>({});

  // Route protection
  useEffect(() => {
    if (phase !== 'battle' || units.length === 0) {
      setLocation("/select");
    }
  }, [phase, units, setLocation]);

  const grid = useMemo(() => {
    const g = Array(GRID_W).fill(null).map(() => Array(GRID_H).fill(null));
    units.forEach(u => {
      if (u.hp > 0) {
        g[u.position.x][u.position.y] = u.id;
      }
    });
    return g;
  }, [units]);

  const getUnitAt = (x: number, y: number) => {
    const id = grid[x]?.[y];
    return id ? units.find(u => u.id === id) : null;
  };

  const getReachableTiles = (start: {x: number, y: number}, maxMove: number) => {
    const queue = [{...start, dist: 0}];
    const visited = new Set([`${start.x},${start.y}`]);
    const reachable = [];

    while (queue.length > 0) {
      const {x, y, dist} = queue.shift()!;
      reachable.push({x, y});

      if (dist < maxMove) {
        const neighbors = [[0,1], [1,0], [0,-1], [-1,0]];
        for (const [dx, dy] of neighbors) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
            if (!visited.has(`${nx},${ny}`)) {
               const isOccupied = grid[nx]?.[ny] != null;
               if (!isOccupied || (nx === start.x && ny === start.y)) {
                 visited.add(`${nx},${ny}`);
                 queue.push({x: nx, y: ny, dist: dist + 1});
               }
            }
          }
        }
      }
    }
    return reachable;
  };

  const getAttackableTiles = (start: {x: number, y: number}, range: number) => {
    const tiles = [];
    for (let x = 0; x < GRID_W; x++) {
      for (let y = 0; y < GRID_H; y++) {
        const dist = Math.abs(start.x - x) + Math.abs(start.y - y);
        if (dist <= range && dist > 0) {
          tiles.push({x, y});
        }
      }
    }
    return tiles;
  };

  const calculateDamage = (attacker: TacticalUnit, defender: TacticalUnit, isCrit: boolean = false) => {
    let damage = Math.max(1, attacker.attack - defender.defense + Math.floor(Math.random() * 6) - 2);
    if (isCrit) damage *= 2;
    return damage;
  };

  const tickCT = useCallback(() => {
    const aliveUnits = units.filter(u => u.hp > 0);
    
    // Check win condition
    const playerAlive = aliveUnits.some(u => u.isPlayerControlled);
    const enemyAlive = aliveUnits.some(u => !u.isPlayerControlled);

    if (!playerAlive || !enemyAlive) {
      let score = 0;
      let playerUsed = units.find(u => u.isPlayerControlled)?.name || 'Unknown';
      if (playerAlive) {
        const hpBonus = aliveUnits.filter(u => u.isPlayerControlled).reduce((acc, u) => acc + (u.hp / u.maxHp) * 500, 0);
        score = 1000 + Math.floor(hpBonus);
        setResult('win', score, playerUsed);
      } else {
        score = 100;
        setResult('loss', score, playerUsed);
      }
      setTimeout(() => setLocation("/result"), 1500);
      return;
    }

    let nextUnit = null;
    let newUnits = [...units];

    // Find unit with >= 100 CT
    nextUnit = aliveUnits.find(u => u.ct >= 100);

    if (!nextUnit) {
      // Advance time until someone hits 100
      let maxTicks = 100;
      while (!nextUnit && maxTicks > 0) {
        newUnits = newUnits.map(u => {
          if (u.hp <= 0) return u;
          return { ...u, ct: u.ct + Math.max(1, Math.floor(u.speed / 10)) };
        });
        nextUnit = newUnits.find(u => u.hp > 0 && u.ct >= 100);
        maxTicks--;
      }
    }

    // Sort to predict turn order
    const predicted = [...newUnits.filter(u => u.hp > 0)].sort((a, b) => b.ct - a.ct);
    setTurnOrder(predicted.map(u => u.id));
    
    // Assign turn
    if (nextUnit && nextUnit.id !== currentUnitId) {
      updateUnit(nextUnit.id, { hasMoved: false, hasActed: false });
      setCurrentUnitId(nextUnit.id);
      setActionMode('idle');
      addLog(`It is ${nextUnit.name}'s turn.`, 'info');
    }
  }, [units, currentUnitId, updateUnit, setCurrentUnitId, setTurnOrder, setActionMode, setResult, addLog, setLocation]);

  useEffect(() => {
    if (phase === 'battle' && currentUnitId === null) {
      tickCT();
    }
  }, [phase, currentUnitId, tickCT]);

  const endTurn = useCallback(() => {
    if (!currentUnitId) return;
    const unit = units.find(u => u.id === currentUnitId);
    if (!unit) return;
    
    updateUnit(unit.id, { 
      ct: 0, 
      hasMoved: true, 
      hasActed: true,
      specialAbilityCooldown: Math.max(0, unit.specialAbilityCooldown - 1)
    });
    tickSkillCooldowns(unit.id);
    setCurrentUnitId(null);
    setActionMode('idle');
    setReachableTiles([]);
    setAttackableTiles([]);
  }, [currentUnitId, units, updateUnit, setCurrentUnitId, setActionMode, setReachableTiles, setAttackableTiles, tickSkillCooldowns]);

  // Actions
  const handleTileClick = (x: number, y: number) => {
    if (!currentUnitId) return;
    const unit = units.find(u => u.id === currentUnitId);
    if (!unit || !unit.isPlayerControlled) return;

    if (actionMode === 'move' && !unit.hasMoved) {
      const isReachable = reachableTiles.some(t => t.x === x && t.y === y);
      if (isReachable) {
        updateUnit(unit.id, { position: { x, y }, hasMoved: true });
        setActionMode('idle');
        setReachableTiles([]);
        addLog(`${unit.name} moves to [${x}, ${y}].`);
        setAnimStates(prev => ({...prev, [unit.id]: 'moving'}));
        setTimeout(() => setAnimStates(prev => ({...prev, [unit.id]: 'idle'})), 500);
      }
    } else if (actionMode.startsWith('skill_') && !unit.hasActed) {
      const slotNum = parseInt(actionMode.split('_')[1]) as SkillSlot;
      const loadout = equippedSkills[unit.id] || getDefaultSkillLoadout(unit.characterId);
      const skillId = loadout[slotNum];
      if (!skillId) return;
      const skill = getSkillById(skillId);
      if (!skill) return;

      const isAttackable = attackableTiles.some(t => t.x === x && t.y === y);
      if (!isAttackable) return;

      const target = getUnitAt(x, y);
      if (target && target.hp > 0 && target.isPlayerControlled !== unit.isPlayerControlled) {
        executeSkill(unit, skill, target);
      }
    }
  };

  const executeSkill = (attacker: TacticalUnit, skill: Skill, target: TacticalUnit) => {
    const isCrit = Math.random() < 0.12;
    const penFactor = 1 + (skill.armorPen || 0) / 100;
    const baseDmg = skill.dmgMultiplier !== undefined
      ? Math.max(1, Math.floor((attacker.attack * skill.dmgMultiplier - target.defense * (1 / penFactor)) + Math.floor(Math.random() * 6) - 2))
      : 0;
    const finalDmg = isCrit ? Math.floor(baseDmg * 1.8) : baseDmg;

    updateUnit(attacker.id, { hasActed: true });
    setActionMode('idle');
    setAttackableTiles([]);

    // Track cooldown
    if (skill.cooldown > 0 && skill.cooldown !== 999) {
      setSkillCooldown(attacker.id, skill.id, skill.cooldown);
    }
    if (skill.cooldown === 999) {
      markUltimateUsed(attacker.id);
      setSkillCooldown(attacker.id, skill.id, 999);
    }

    // Animations
    setAnimStates(prev => ({...prev, [attacker.id]: 'attacking'}));
    setTimeout(() => setAnimStates(prev => ({...prev, [attacker.id]: 'idle'})), 600);

    if (finalDmg > 0) {
      updateUnit(target.id, { hp: Math.max(0, target.hp - finalDmg) });
      const suffix = isCrit ? ' (CRITICAL!)' : '';
      const aoeNote = skill.aoe ? ' [AoE]' : '';
      addLog(`${attacker.name} uses ${skill.name}${aoeNote} on ${target.name} for ${finalDmg} dmg!${suffix}`, 'damage');

      setAnimStates(prev => ({...prev, [target.id]: 'hurt'}));
      setTimeout(() => setAnimStates(prev => ({...prev, [target.id]: 'idle'})), 400);

      if (target.hp - finalDmg <= 0) {
        addLog(`${target.name} is defeated!`, 'debuff');
        setAnimStates(prev => ({...prev, [target.id]: 'dead'}));
      }
    }

    setTimeout(() => {
      const u = useGameStore.getState().units.find(u => u.id === attacker.id);
      if (u?.hasMoved && u?.hasActed) endTurn();
    }, 600);
  };

  const executeAttack = (attacker: TacticalUnit, target: TacticalUnit) => {
    const isCrit = Math.random() < 0.1;
    const damage = calculateDamage(attacker, target, isCrit);
    
    updateUnit(target.id, { hp: Math.max(0, target.hp - damage) });
    updateUnit(attacker.id, { hasActed: true });
    setActionMode('idle');
    setAttackableTiles([]);
    addLog(`${attacker.name} attacks ${target.name} for ${damage} damage!${isCrit ? ' (CRITICAL)' : ''}`, 'damage');
    
    setAnimStates(prev => ({...prev, [attacker.id]: 'attacking'}));
    setTimeout(() => setAnimStates(prev => ({...prev, [attacker.id]: 'idle'})), 600);
    setAnimStates(prev => ({...prev, [target.id]: 'hurt'}));
    setTimeout(() => setAnimStates(prev => ({...prev, [target.id]: 'idle'})), 400);

    if (target.hp - damage <= 0) {
      addLog(`${target.name} is defeated!`, 'debuff');
      setAnimStates(prev => ({...prev, [target.id]: 'dead'}));
    }
    
    setTimeout(() => {
      const u = useGameStore.getState().units.find(u => u.id === attacker.id);
      if (u?.hasMoved && u?.hasActed) endTurn();
    }, 600);
  };

  const executeAbility = (attacker: TacticalUnit, target: TacticalUnit) => {
    const ability = attacker.specialAbility;
    let damage = 0;
    updateUnit(attacker.id, { hasActed: true, specialAbilityCooldown: 3 });
    setActionMode('idle');
    setAttackableTiles([]);
    setAnimStates(prev => ({...prev, [attacker.id]: 'attacking'}));
    setTimeout(() => setAnimStates(prev => ({...prev, [attacker.id]: 'idle'})), 600);

    if (ability.includes("Heal") || ability === "Death's Embrace") {
       const heal = Math.floor(attacker.attack * 1.5);
       updateUnit(attacker.id, { hp: Math.min(attacker.maxHp, attacker.hp + heal) });
       addLog(`${attacker.name} uses ${ability} and heals for ${heal}!`, 'heal');
    } else {
       damage = calculateDamage(attacker, target) + Math.floor(attacker.attack * 0.5);
       updateUnit(target.id, { hp: Math.max(0, target.hp - damage) });
       addLog(`${attacker.name} uses ${ability} on ${target.name} for ${damage} damage!`, 'damage');
       setAnimStates(prev => ({...prev, [target.id]: 'hurt'}));
       setTimeout(() => setAnimStates(prev => ({...prev, [target.id]: 'idle'})), 400);
       if (target.hp - damage <= 0) {
         addLog(`${target.name} is defeated!`, 'debuff');
         setAnimStates(prev => ({...prev, [target.id]: 'dead'}));
       }
    }
    setTimeout(() => {
      const u = useGameStore.getState().units.find(u => u.id === attacker.id);
      if (u?.hasMoved && u?.hasActed) endTurn();
    }, 600);
  };

  // AI Logic
  useEffect(() => {
    const unit = units.find(u => u.id === currentUnitId);
    if (!unit || unit.isPlayerControlled || unit.hp <= 0) return;

    // Enemy Turn processing
    const aiTimer = setTimeout(() => {
      if (!unit.hasMoved) {
        // Find closest player unit
        const players = units.filter(u => u.isPlayerControlled && u.hp > 0);
        if (players.length > 0) {
          const target = players.sort((a, b) => {
            const distA = Math.abs(a.position.x - unit.position.x) + Math.abs(a.position.y - unit.position.y);
            const distB = Math.abs(b.position.x - unit.position.x) + Math.abs(b.position.y - unit.position.y);
            return distA - distB;
          })[0];

          const reach = getReachableTiles(unit.position, unit.move);
          const bestMove = reach.sort((a, b) => {
            const distA = Math.abs(a.x - target.position.x) + Math.abs(a.y - target.position.y);
            const distB = Math.abs(b.x - target.position.x) + Math.abs(b.y - target.position.y);
            return distA - distB;
          })[0];

          if (bestMove) {
            updateUnit(unit.id, { position: bestMove, hasMoved: true });
            addLog(`${unit.name} moves.`);
            setAnimStates(prev => ({...prev, [unit.id]: 'moving'}));
            setTimeout(() => setAnimStates(prev => ({...prev, [unit.id]: 'idle'})), 500);
          } else {
            updateUnit(unit.id, { hasMoved: true });
          }
        }
      } else if (!unit.hasActed) {
        // Find targets in range
        const currentPos = useGameStore.getState().units.find(u => u.id === currentUnitId)?.position || unit.position;
        const targets = units.filter(u => u.isPlayerControlled && u.hp > 0 && 
          (Math.abs(u.position.x - currentPos.x) + Math.abs(u.position.y - currentPos.y)) <= unit.range);
        
        if (targets.length > 0) {
           const target = targets[0];
           if (unit.specialAbilityCooldown === 0) {
              executeAbility(unit, target);
           } else {
              executeAttack(unit, target);
           }
        } else {
           updateUnit(unit.id, { hasActed: true });
        }
      } else {
        endTurn();
      }
    }, 1200); // Slower AI to allow animations to be seen

    return () => clearTimeout(aiTimer);
  }, [currentUnitId, units, endTurn, updateUnit, addLog]);

  const activeUnit = currentUnitId ? units.find(u => u.id === currentUnitId) : null;
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [combatLog]);

  if (phase !== 'battle') return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans">
      
      {/* 3D Canvas Area */}
      <div className="flex-1 relative min-h-0 flex flex-col">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 pointer-events-none text-center">
          <h2 className="font-display text-3xl text-primary text-glow uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Tactical Arena</h2>
          <p className="text-sm text-white font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Destroy the enemy forces to claim victory</p>
        </div>

        <BattleScene 
          units={units}
          reachableTiles={reachableTiles}
          attackableTiles={attackableTiles}
          currentUnitId={currentUnitId}
          actionMode={actionMode}
          onTileClick={handleTileClick}
          animStates={animStates}
        />
      </div>

      {/* Right Area: Sidebar */}
      <div className="relative z-10 w-full md:w-[320px] lg:w-[380px] border-l border-border bg-black/90 flex flex-col h-screen shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
        
        {/* Turn Order */}
        <div className="p-4 border-b border-white/10 shrink-0">
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-bold flex items-center gap-2">
            <FastForward className="w-3 h-3" /> Turn Order
          </h3>
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
            <AnimatePresence>
              {turnOrder.map((id, index) => {
                const u = units.find(u => u.id === id);
                if (!u) return null;
                return (
                  <motion.div 
                    key={u.id + index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex-shrink-0 w-12 h-12 rounded border overflow-hidden relative",
                      u.isPlayerControlled ? "border-primary" : "border-destructive",
                      currentUnitId === u.id && "ring-2 ring-white scale-110 z-10"
                    )}
                  >
                    <img 
                      src={`${import.meta.env.BASE_URL}images/chars/${u.characterId}.png`} 
                      alt={u.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMyMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgYWxpZ25tZW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiNmZmYiPj88L3RleHQ+PC9zdmc+';
                      }}
                    />
                    {/* HP fraction overlay */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black">
                      <div 
                        className={cn("h-full", u.isPlayerControlled ? "bg-green-500" : "bg-red-500")}
                        style={{ width: `${(u.hp / u.maxHp) * 100}%` }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Current Unit Info */}
        <div className="p-4 border-b border-white/10 shrink-0 bg-gradient-to-b from-white/5 to-transparent relative overflow-hidden">
          {activeUnit ? (
            <div className="animate-in fade-in relative z-10">
              <div className="flex gap-4 mb-3">
                <div className="w-20 h-20 rounded border border-white/20 overflow-hidden shrink-0 bg-black/50">
                  <img 
                    src={`${import.meta.env.BASE_URL}images/chars/${activeUnit.characterId}.png`} 
                    alt={activeUnit.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMyMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgYWxpZ25tZW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiNmZmYiPj88L3RleHQ+PC9zdmc+';
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h2 className={cn("font-display text-lg font-bold leading-tight uppercase", activeUnit.isPlayerControlled ? "text-primary text-glow" : "text-destructive text-glow-red")}>
                    {activeUnit.name}
                  </h2>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">{activeUnit.role}</p>
                  <div className="text-xs font-mono font-bold mt-1">CT: <span className={activeUnit.ct >= 100 ? "text-green-400" : "text-white"}>{Math.min(100, activeUnit.ct)}</span></div>
                </div>
              </div>
              
              <HealthBar current={activeUnit.hp} max={activeUnit.maxHp} />
              
              <div className="grid grid-cols-4 gap-2 mt-3 text-xs font-mono text-center">
                <div className="bg-black/50 p-1 rounded border border-white/5">
                  <span className="text-muted-foreground block text-[10px]">ATK</span>{activeUnit.attack}
                </div>
                <div className="bg-black/50 p-1 rounded border border-white/5">
                  <span className="text-muted-foreground block text-[10px]">DEF</span>{activeUnit.defense}
                </div>
                <div className="bg-black/50 p-1 rounded border border-white/5">
                  <span className="text-muted-foreground block text-[10px]">MOV</span>{activeUnit.move}
                </div>
                <div className="bg-black/50 p-1 rounded border border-white/5">
                  <span className="text-muted-foreground block text-[10px]">RNG</span>{activeUnit.range}
                </div>
              </div>

              {CHARACTER_LORE[activeUnit.characterId] && (
                 <div className="mt-3 text-[10px] text-muted-foreground italic border-l-2 border-primary/30 pl-2 line-clamp-2">
                    {CHARACTER_LORE[activeUnit.characterId].quote}
                 </div>
              )}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground italic">
              Calculating turns...
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="p-3 border-b border-white/10 shrink-0">
          {activeUnit?.isPlayerControlled && activeUnit.id === currentUnitId ? (
            <>
              {/* Move Button */}
              <div className="mb-2">
                <FantasyButton 
                  onClick={() => {
                    const isMove = actionMode === 'move';
                    setActionMode(isMove ? 'idle' : 'move');
                    setAttackableTiles([]);
                    setReachableTiles(isMove ? [] : getReachableTiles(activeUnit.position, activeUnit.move));
                  }}
                  disabled={activeUnit.hasMoved}
                  variant={actionMode === 'move' ? 'default' : 'secondary'}
                  className="w-full text-xs h-8"
                >
                  <Move className="w-3 h-3 mr-2" />
                  {activeUnit.hasMoved ? 'Moved' : 'Move'}
                </FantasyButton>
              </div>

              {/* 5-Slot Skill Action Bar */}
              <div className="flex gap-1 mb-2">
                {([1, 2, 3, 4, 5] as SkillSlot[]).map(slot => {
                  const slotKey = `skill_${slot}` as const;
                  const loadout = equippedSkills[activeUnit.id] || getDefaultSkillLoadout(activeUnit.characterId);
                  const skillId = loadout[slot];
                  const skill = skillId ? getSkillById(skillId) : undefined;
                  const cdMap = skillCooldowns[activeUnit.id] || {};
                  const cd = skillId ? (cdMap[skillId] || 0) : 0;
                  const isUltimateUsed = skillId ? (cdMap[skillId] === 999) : false;
                  const isOnCooldown = cd > 0;
                  const isActive = actionMode === slotKey;
                  const slotStyle = SLOT_LABELS[slot];
                  const isDisabled = activeUnit.hasActed || isOnCooldown || isUltimateUsed;

                  return (
                    <button
                      key={slot}
                      disabled={isDisabled}
                      onClick={() => {
                        if (isDisabled) return;
                        if (isActive) {
                          setActionMode('idle');
                          setAttackableTiles([]);
                        } else {
                          setActionMode(slotKey);
                          setReachableTiles([]);
                          setAttackableTiles(getAttackableTiles(activeUnit.position, skill?.range ?? activeUnit.range));
                        }
                      }}
                      title={skill ? `${skill.name}\n${skill.description}\n${skill.stats.join(' · ')}` : `Slot ${slot}`}
                      className={cn(
                        "relative flex-1 flex flex-col items-center justify-center rounded border transition-all duration-150 py-1.5 px-1",
                        "min-h-[56px] overflow-hidden",
                        isActive
                          ? "border-primary bg-primary/20 shadow-[0_0_8px_rgba(212,160,23,0.4)]"
                          : isDisabled
                            ? "border-white/5 bg-black/30 opacity-50 cursor-not-allowed"
                            : "border-white/15 bg-black/40 hover:border-white/30 hover:bg-white/5 cursor-pointer"
                      )}
                    >
                      {/* Slot Roman numeral */}
                      <div
                        className="absolute top-0.5 left-1 text-[8px] font-display font-bold"
                        style={{ color: slotStyle.color }}
                      >
                        {slotStyle.roman}
                      </div>

                      {/* Skill icon + name */}
                      {skill ? (
                        <>
                          <div className="text-lg leading-none mt-1">{skill.icon}</div>
                          <div className="text-[8px] text-center leading-tight text-white/70 mt-0.5 px-0.5 truncate w-full text-center">
                            {skill.name}
                          </div>
                          {isOnCooldown && !isUltimateUsed && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-bold text-orange-400">
                              {cd}
                            </div>
                          )}
                          {isUltimateUsed && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-[9px] text-muted-foreground">
                              Used
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-white/20 text-xs font-display mt-1">{slotStyle.roman}</div>
                      )}

                      {/* Hotkey number */}
                      <div className="absolute bottom-0.5 right-1 text-[8px] text-white/25 font-mono">{slot}</div>
                    </button>
                  );
                })}
              </div>

              {/* End Turn */}
              <FantasyButton 
                onClick={endTurn}
                variant="ghost"
                className="w-full text-xs h-8 border border-white/10"
              >
                End Turn / Wait
              </FantasyButton>
            </>
          ) : (
            <div className="py-4 text-center text-muted-foreground animate-pulse flex items-center justify-center gap-2">
              <Skull className="w-4 h-4" /> Enemy is thinking...
            </div>
          )}
        </div>

        {/* Combat Log */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-black/40 font-mono text-xs">
          <AnimatePresence initial={false}>
            {combatLog.map((log) => (
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

      </div>
    </div>
  );
}
