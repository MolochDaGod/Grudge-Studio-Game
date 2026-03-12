import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useGameStore, TacticalUnit } from "@/store/use-game-store";
import { FantasyButton } from "@/components/ui/fantasy-button";
import { HealthBar } from "@/components/ui/health-bar";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Sword, Zap, Skull, Move, FastForward, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

const GRID_W = 8;
const GRID_H = 6;

export default function Battle() {
  const [, setLocation] = useLocation();
  const { 
    units, updateUnit, currentUnitId, setCurrentUnitId, 
    turnOrder, setTurnOrder, actionMode, setActionMode,
    reachableTiles, setReachableTiles, attackableTiles, setAttackableTiles,
    combatLog, addLog, setResult, phase
  } = useGameStore();

  const [hoveredTile, setHoveredTile] = useState<{x: number, y: number} | null>(null);

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
    setCurrentUnitId(null);
    setActionMode('idle');
    setReachableTiles([]);
    setAttackableTiles([]);
  }, [currentUnitId, units, updateUnit, setCurrentUnitId, setActionMode, setReachableTiles, setAttackableTiles]);

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
      }
    } else if (actionMode === 'attack' && !unit.hasActed) {
      const isAttackable = attackableTiles.some(t => t.x === x && t.y === y);
      if (isAttackable) {
        const target = getUnitAt(x, y);
        if (target && target.hp > 0 && target.isPlayerControlled !== unit.isPlayerControlled) {
          executeAttack(unit, target);
        }
      }
    } else if (actionMode === 'ability' && !unit.hasActed) {
       const isAttackable = attackableTiles.some(t => t.x === x && t.y === y);
       if (isAttackable || (x === unit.position.x && y === unit.position.y)) {
         const target = getUnitAt(x, y) || unit;
         executeAbility(unit, target);
       }
    }
  };

  const executeAttack = (attacker: TacticalUnit, target: TacticalUnit) => {
    const isCrit = Math.random() < 0.1;
    const damage = calculateDamage(attacker, target, isCrit);
    
    updateUnit(target.id, { hp: Math.max(0, target.hp - damage) });
    updateUnit(attacker.id, { hasActed: true });
    setActionMode('idle');
    setAttackableTiles([]);
    
    addLog(`${attacker.name} attacks ${target.name} for ${damage} damage!${isCrit ? ' (CRITICAL)' : ''}`, 'damage');
    if (target.hp - damage <= 0) {
      addLog(`${target.name} is defeated!`, 'debuff');
    }
    
    setTimeout(() => {
      const u = useGameStore.getState().units.find(u => u.id === attacker.id);
      if (u?.hasMoved && u?.hasActed) endTurn();
    }, 500);
  };

  const executeAbility = (attacker: TacticalUnit, target: TacticalUnit) => {
    const ability = attacker.specialAbility;
    let damage = 0;
    
    updateUnit(attacker.id, { hasActed: true, specialAbilityCooldown: 3 });
    setActionMode('idle');
    setAttackableTiles([]);

    if (ability.includes("Heal") || ability === "Death's Embrace") {
       const heal = Math.floor(attacker.attack * 1.5);
       updateUnit(attacker.id, { hp: Math.min(attacker.maxHp, attacker.hp + heal) });
       addLog(`${attacker.name} uses ${ability} and heals for ${heal}!`, 'heal');
    } else {
       damage = calculateDamage(attacker, target) + Math.floor(attacker.attack * 0.5);
       updateUnit(target.id, { hp: Math.max(0, target.hp - damage) });
       addLog(`${attacker.name} uses ${ability} on ${target.name} for ${damage} damage!`, 'damage');
       if (target.hp - damage <= 0) addLog(`${target.name} is defeated!`, 'debuff');
    }

    setTimeout(() => {
      const u = useGameStore.getState().units.find(u => u.id === attacker.id);
      if (u?.hasMoved && u?.hasActed) endTurn();
    }, 500);
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
    }, 800);

    return () => clearTimeout(aiTimer);
  }, [currentUnitId, units, endTurn, updateUnit, addLog]);

  const activeUnit = currentUnitId ? units.find(u => u.id === currentUnitId) : null;
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [combatLog]);

  if (phase !== 'battle') return null;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 mix-blend-luminosity"
        style={{ backgroundImage: `url('${import.meta.env.BASE_URL}images/battle-bg.png')` }}
      />
      
      {/* Left Area: The Grid */}
      <div className="relative z-10 flex-grow flex flex-col items-center justify-center p-4 min-h-[60vh] overflow-x-auto">
        <div className="mb-4 text-center">
          <h2 className="font-display text-2xl text-primary text-glow uppercase tracking-widest">Tactical Arena</h2>
          <p className="text-sm text-muted-foreground">Destroy the enemy forces to claim victory</p>
        </div>

        {/* The Grid Board */}
        <div 
          className="relative bg-black/60 p-4 rounded-xl border border-border shadow-2xl backdrop-blur-md"
          style={{
             display: 'grid',
             gridTemplateColumns: `repeat(${GRID_W}, 72px)`,
             gridTemplateRows: `repeat(${GRID_H}, 72px)`,
             gap: '2px',
          }}
        >
          {Array.from({ length: GRID_W * GRID_H }).map((_, i) => {
            const x = i % GRID_W;
            const y = Math.floor(i / GRID_W);
            const isDark = (x + y) % 2 === 0;
            
            const isReachable = reachableTiles.some(t => t.x === x && t.y === y);
            const isAttackable = attackableTiles.some(t => t.x === x && t.y === y);
            const unitOnTile = getUnitAt(x, y);

            return (
              <div 
                key={i}
                onMouseEnter={() => setHoveredTile({x, y})}
                onMouseLeave={() => setHoveredTile(null)}
                onClick={() => handleTileClick(x, y)}
                className={cn(
                  "relative w-[72px] h-[72px] flex items-center justify-center transition-colors cursor-pointer border",
                  isDark ? "bg-[#1a1a2e] border-[#16213e]" : "bg-[#16213e] border-[#1a1a2e]",
                  isReachable && "after:absolute after:inset-0 after:bg-blue-500/30 after:border-2 after:border-blue-400 after:animate-pulse z-10",
                  isAttackable && "after:absolute after:inset-0 after:bg-red-500/40 after:border-2 after:border-red-500 after:animate-pulse z-10",
                  hoveredTile?.x === x && hoveredTile?.y === y && !isReachable && !isAttackable && "after:absolute after:inset-0 after:bg-white/10 z-20"
                )}
              >
                {/* Unit Token */}
                <AnimatePresence>
                  {unitOnTile && unitOnTile.hp > 0 && (
                    <motion.div
                      layoutId={unitOnTile.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-xl shadow-[0_4px_10px_rgba(0,0,0,0.5)] border-2 z-30 transition-transform",
                        unitOnTile.isPlayerControlled ? "bg-primary text-black border-yellow-300" : "bg-destructive text-white border-red-300",
                        currentUnitId === unitOnTile.id && "ring-4 ring-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.8)] z-40"
                      )}
                    >
                      {unitOnTile.name.charAt(0)}
                      {/* Mini HP bar */}
                      <div className="absolute -bottom-2 w-10 h-1 bg-black rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full", unitOnTile.isPlayerControlled ? "bg-green-500" : "bg-red-500")}
                          style={{ width: `${(unitOnTile.hp / unitOnTile.maxHp) * 100}%` }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Area: Sidebar */}
      <div className="relative z-10 w-full md:w-[400px] border-l border-border bg-black/80 backdrop-blur-xl flex flex-col h-[40vh] md:h-screen shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
        
        {/* Turn Order */}
        <div className="p-4 border-b border-white/10">
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
                      "flex-shrink-0 w-10 h-10 rounded border flex items-center justify-center font-display text-sm",
                      u.isPlayerControlled ? "bg-primary/20 border-primary text-primary" : "bg-destructive/20 border-destructive text-destructive",
                      currentUnitId === u.id && "ring-2 ring-white bg-opacity-50"
                    )}
                  >
                    {u.name.charAt(0)}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Current Unit Info */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
          {activeUnit ? (
            <div className="animate-in fade-in">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className={cn("font-display text-2xl font-bold", activeUnit.isPlayerControlled ? "text-primary text-glow" : "text-destructive text-glow-red")}>
                    {activeUnit.name}
                  </h2>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">{activeUnit.role}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-bold">CT: <span className={activeUnit.ct >= 100 ? "text-green-400" : "text-white"}>{Math.min(100, activeUnit.ct)}</span></div>
                </div>
              </div>
              
              <HealthBar current={activeUnit.hp} max={activeUnit.maxHp} />
              
              <div className="grid grid-cols-4 gap-2 mt-4 text-xs font-mono text-center">
                <div className="bg-black/50 p-1 rounded border border-white/5">
                  <span className="text-muted-foreground block">ATK</span>{activeUnit.attack}
                </div>
                <div className="bg-black/50 p-1 rounded border border-white/5">
                  <span className="text-muted-foreground block">DEF</span>{activeUnit.defense}
                </div>
                <div className="bg-black/50 p-1 rounded border border-white/5">
                  <span className="text-muted-foreground block">MOV</span>{activeUnit.move}
                </div>
                <div className="bg-black/50 p-1 rounded border border-white/5">
                  <span className="text-muted-foreground block">RNG</span>{activeUnit.range}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground italic">
              Calculating turns...
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-b border-white/10 grid grid-cols-2 gap-2">
          {activeUnit?.isPlayerControlled && activeUnit.id === currentUnitId ? (
            <>
              <FantasyButton 
                onClick={() => {
                  setActionMode(actionMode === 'move' ? 'idle' : 'move');
                  setAttackableTiles([]);
                  if (actionMode !== 'move') setReachableTiles(getReachableTiles(activeUnit.position, activeUnit.move));
                  else setReachableTiles([]);
                }}
                disabled={activeUnit.hasMoved}
                variant={actionMode === 'move' ? 'default' : 'secondary'}
                className="w-full text-xs"
              >
                <Move className="w-3 h-3 mr-2" /> {activeUnit.hasMoved ? 'Moved' : 'Move'}
              </FantasyButton>
              
              <FantasyButton 
                onClick={() => {
                  setActionMode(actionMode === 'attack' ? 'idle' : 'attack');
                  setReachableTiles([]);
                  if (actionMode !== 'attack') setAttackableTiles(getAttackableTiles(activeUnit.position, activeUnit.range));
                  else setAttackableTiles([]);
                }}
                disabled={activeUnit.hasActed}
                variant={actionMode === 'attack' ? 'default' : 'secondary'}
                className="w-full text-xs"
              >
                <Sword className="w-3 h-3 mr-2" /> {activeUnit.hasActed ? 'Attacked' : 'Attack'}
              </FantasyButton>

              <FantasyButton 
                onClick={() => {
                  setActionMode(actionMode === 'ability' ? 'idle' : 'ability');
                  setReachableTiles([]);
                  if (actionMode !== 'ability') setAttackableTiles(getAttackableTiles(activeUnit.position, activeUnit.range + 1));
                  else setAttackableTiles([]);
                }}
                disabled={activeUnit.hasActed || activeUnit.specialAbilityCooldown > 0}
                variant={actionMode === 'ability' ? 'default' : 'secondary'}
                className="w-full text-xs col-span-2 relative group"
              >
                <Zap className="w-3 h-3 mr-2 text-accent" /> 
                {activeUnit.specialAbilityCooldown > 0 ? `Ability (CD: ${activeUnit.specialAbilityCooldown})` : activeUnit.specialAbility}
              </FantasyButton>

              <FantasyButton 
                onClick={endTurn}
                variant="ghost"
                className="w-full text-xs col-span-2 border border-white/10"
              >
                End Turn / Wait
              </FantasyButton>
            </>
          ) : (
            <div className="col-span-2 py-4 text-center text-muted-foreground animate-pulse flex items-center justify-center gap-2">
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
