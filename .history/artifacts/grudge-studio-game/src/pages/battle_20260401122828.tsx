import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useGameStore, TacticalUnit } from "@/store/use-game-store";
import { FantasyButton } from "@/components/ui/fantasy-button";
import { HealthBar, StatBar, ActionBar } from "@/components/ui/health-bar";
import { motion, AnimatePresence } from "framer-motion";
import { Skull, Move, FastForward, RotateCcw, RotateCw, Zap, Target, Clock, Star, Eye, Layers, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { BattleScene, CameraMode, MapPing } from "@/components/three/BattleScene";
import { AnimState } from "@/components/three/CharacterModel";
import { CombatEffectData, EffectType } from "@/components/three/CombatEffects";
import { tileToWorld } from "@/components/three/TileGrid";
import { CHARACTER_LORE } from "@/lib/lore";
import { Minimap } from "@/components/ui/Minimap";
import { BattleLoadingScreen } from "@/components/ui/battle-loading-screen";
import { SkillTooltip } from "@/components/ui/skill-tooltip";
import {
  getSkillById, getDefaultSkillLoadout, SLOT_LABELS, TIER_STYLES,
  SkillSlot, Skill, CHARACTER_WEAPON_MAP,
} from "@/lib/weapon-skills";
import { getLevelWithEdits, LevelDef, hasLineOfSight } from "@/lib/levels";
import {
  calcFacing, facingDefenseMultiplier, isFrontAttack,
  calculateDamage, getEffectColor, getEffectType,
  getSkillAnimState, getAtkDuration, bfsPath,
} from "@/lib/combat-engine";

const BASE = import.meta.env.BASE_URL;
const UI = (path: string) => `${BASE}images/ui/${path}`;

export default function Battle() {
  const [, setLocation] = useLocation();
  const { 
    units, updateUnit, currentUnitId, setCurrentUnitId, 
    turnOrder, setTurnOrder, actionMode, setActionMode,
    reachableTiles, setReachableTiles, attackableTiles, setAttackableTiles,
    combatLog, addLog, setResult, phase,
    equippedSkills, skillCooldowns, usedUltimates,
    setSkillCooldown, tickSkillCooldowns, markUltimateUsed,
    applyStatus, tickStatusEffects,
    currentLevelId, rotateFacing,
  } = useGameStore();

  const level: LevelDef = getLevelWithEdits(currentLevelId);
  const GRID_W = level.gridW;
  const GRID_H = level.gridH;

  const [showLoading, setShowLoading] = useState(true);
  const handleLoadDone = useCallback(() => setShowLoading(false), []);

  const [animStates, setAnimStates] = useState<Record<string, AnimState>>({});
  const [walkPaths, setWalkPaths] = useState<Record<string, { x: number; y: number }[]>>({});
  // Guard: prevent more than one endTurn per turn (stale closures in animation timers)
  const endTurnFiredRef = useRef(false);
  const [combatEffects, setCombatEffects] = useState<CombatEffectData[]>([]);
  const [hoveredSlot, setHoveredSlot] = useState<SkillSlot | null>(null);
  const [cameraFocus, setCameraFocus] = useState<[number, number, number] | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('tactical');
  const [showUnitInfo, setShowUnitInfo] = useState(false);
  const [mapPings, setMapPings] = useState<MapPing[]>([]);
  // Unit selected by LMB click for inspection — shown in bottom HUD
  const [inspectedUnitId, setInspectedUnitId] = useState<string | null>(null);
  // Unit currently hovered in 3D scene (for attack preview tooltip)
  const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);
  // After finishing a walk without acting yet, pulse skill buttons
  const [postMoveGlow, setPostMoveGlow] = useState(false);

  type CtxMenu =
    | { kind: 'portrait' | 'unit'; unit: TacticalUnit; x: number; y: number }
    | { kind: 'map'; tx: number; ty: number; x: number; y: number };
  const [contextMenu, setContextMenu] = useState<CtxMenu | null>(null);

  const CAMERA_META: Record<CameraMode, { label: string; icon: JSX.Element; next: CameraMode }> = {
    'tactical':     { label: 'Tactical', icon: <Layers className="w-3.5 h-3.5" />, next: 'third-person' },
    'free':         { label: 'Free',     icon: <Eye className="w-3.5 h-3.5" />,    next: 'tactical' },
    'third-person': { label: '3rd',      icon: <User className="w-3.5 h-3.5" />,   next: 'rts' },
    'rts':          { label: 'RTS',      icon: <Layers className="w-3.5 h-3.5" />, next: 'tactical' },
  };

  const handleUnitDoubleClick = (unitId: string) => {
    const u = units.find(x => x.id === unitId);
    if (!u) return;
    const [wx, , wz] = tileToWorld(u.position.x, u.position.y, level.tileSize, 0.5);
    setCameraFocus([wx, 0, wz]);
    setCameraMode('third-person');
  };

  // Block browser's native right-click menu over the whole battle page
  useEffect(() => {
    const block = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', block);
    return () => document.removeEventListener('contextmenu', block);
  }, []);

  // Hotkeys:
  //  U       → toggle unit info rings
  //  M       → toggle move mode
  //  1-4     → activate skill slot (like clicking the skill buttons)
  //  Escape  → cancel current action mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'u' || e.key === 'U') {
        setShowUnitInfo(v => !v);
        return;
      }

      if (e.key === 'Escape') {
        setActionMode('idle');
        setAttackableTiles([]);
        setReachableTiles([]);
        return;
      }

      const unit = units.find(u => u.id === currentUnitId);
      if (!unit || !unit.isPlayerControlled) return;

      if (e.key === 'm' || e.key === 'M') {
        if (unit.hasMoved || walkPaths[unit.id]) return;
        const isMove = actionMode === 'move';
        setActionMode(isMove ? 'idle' : 'move');
        setAttackableTiles([]);
        setReachableTiles(isMove ? [] : getReachableTiles(unit.position, unit.move));
        return;
      }

      // 1-4: activate the matching skill slot
      if (['1','2','3','4'].includes(e.key) && !unit.hasActed && !walkPaths[unit.id]) {
        const slotIdx = (parseInt(e.key) - 1) as SkillSlot;
        const slotKey = `skill_${slotIdx}` as const;
        const loadout = equippedSkills[unit.id] || getDefaultSkillLoadout(unit.characterId);
        const skillId = loadout[slotIdx];
        if (!skillId) return;
        const skill = getSkillById(skillId);
        if (!skill) return;
        const isActive = actionMode === slotKey;
        if (isActive) {
          setActionMode('idle');
          setAttackableTiles([]);
        } else {
          setActionMode(slotKey);
          setReachableTiles([]);
          setAttackableTiles(getAttackableTiles(unit.position, skill.range ?? unit.range, skill));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentUnitId, units, actionMode, walkPaths, equippedSkills]);

  // Close context menu when clicking anywhere else
  useEffect(() => {
    if (!contextMenu) return;
    const close = (e: MouseEvent) => {
      if (e.button === 0) setContextMenu(null);
    };
    window.addEventListener('mousedown', close, { capture: true });
    return () => window.removeEventListener('mousedown', close, { capture: true });
  }, [contextMenu]);

  // Add a temporary ping marker to the map
  const addPing = (tx: number, ty: number, type: MapPing['type']) => {
    const id = `ping_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const ping: MapPing = { id, tx, ty, type, createdAt: Date.now() };
    setMapPings(prev => [...prev.slice(-12), ping]);
    setTimeout(() => setMapPings(prev => prev.filter(p => p.id !== id)), 8000);
  };

  // Right-click on a unit in 3D — show unit context menu
  const handleUnitRightClick = (unitId: string, screenX: number, screenY: number) => {
    const u = units.find(x => x.id === unitId);
    if (!u || u.hp <= 0) return;
    setContextMenu({ kind: 'unit', unit: u, x: screenX, y: screenY });
  };

  // Right-click on the map — show ping placement menu
  const handleMapRightClick = (tx: number, ty: number, screenX: number, screenY: number) => {
    setContextMenu({ kind: 'map', tx, ty, x: screenX, y: screenY });
  };

  // Right-click on a portrait in the top turn strip
  const handlePortraitRightClick = (e: React.MouseEvent, unit: TacticalUnit) => {
    e.preventDefault();
    setContextMenu({ kind: 'portrait', unit, x: e.clientX, y: e.clientY });
  };

  // Left-click any unit in the 3D scene → inspect it in the bottom HUD
  const handleUnitClick = (unitId: string) => {
    setInspectedUnitId(prev => prev === unitId ? null : unitId);
  };

  // Expire old effects every 250ms
  useEffect(() => {
    const iv = setInterval(() => {
      const now = performance.now();
      setCombatEffects(prev => prev.filter(e => now - e.createdAt < e.duration + 400));
    }, 250);
    return () => clearInterval(iv);
  }, []);

  const spawnEffect = useCallback((
    type: EffectType,
    from: [number, number, number],
    to: [number, number, number],
    color: string,
    duration = 700,
  ) => {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setCombatEffects(prev => [...prev, { id, type, from, to, color, createdAt: performance.now(), duration }]);
  }, []);

  // Route protection
  useEffect(() => {
    if (phase !== 'battle' || units.length === 0) {
      setLocation("/select");
    }
  }, [phase, units, setLocation]);

  // Idle2/emote cycling — randomly fire idle2 or emote for resting units every 6-12s
  useEffect(() => {
    const intervals: ReturnType<typeof setInterval>[] = [];
    units.forEach((unit) => {
      if (unit.hp <= 0) return;
      const delay = 6000 + Math.random() * 6000;
      const iv = setInterval(() => {
        setAnimStates((prev) => {
          const cur = prev[unit.id] ?? 'idle';
          if (cur !== 'idle') return prev;
          const variant: AnimState = Math.random() < 0.5 ? 'idle2' : 'emote';
          return { ...prev, [unit.id]: variant };
        });
        setTimeout(() => {
          setAnimStates((prev) => {
            const cur = prev[unit.id] ?? 'idle';
            if (cur === 'idle2' || cur === 'emote') {
              return { ...prev, [unit.id]: 'idle' };
            }
            return prev;
          });
        }, 2800);
      }, delay);
      intervals.push(iv);
    });
    return () => intervals.forEach(clearInterval);
  }, [units.map((u) => u.id).join(','), units.filter(u => u.hp > 0).length]);

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

  // ── Attack Preview ───────────────────────────────────────────────────────────
  // Computed when hovering an enemy unit while a skill or attack action is active.
  const attackPreview = useMemo(() => {
    if (!hoveredUnitId || !currentUnitId) return null;
    const attacker = units.find(u => u.id === currentUnitId);
    const target = units.find(u => u.id === hoveredUnitId);
    if (!attacker || !target) return null;
    if (attacker.isPlayerControlled === target.isPlayerControlled) return null;
    if (!['attack', 'skill1', 'skill2', 'skill3', 'skill4', 'skill5'].includes(actionMode)) return null;

    const isSkillMode = actionMode.startsWith('skill');
    const front = isFrontAttack(attacker, target);
    const facingMult = facingDefenseMultiplier(attacker, target);
    const effectiveDef = facingMult > 1 ? Math.floor(target.defense * 0.5) : target.defense;
    const critChance = front ? 0.10 : 0.35;

    if (isSkillMode) {
      const slotNum = parseInt(actionMode.replace('skill', '')) as 1 | 2 | 3 | 4 | 5;
      const loadout = equippedSkills[attacker.id] || getDefaultSkillLoadout(attacker.characterId);
      const skillId = loadout[slotNum];
      const skill = skillId ? getSkillById(skillId) : null;
      if (!skill || skill.dmgMultiplier === undefined) return null;
      const penFactor = 1 + (skill.armorPen || 0) / 100;
      const base = Math.max(1, Math.floor(attacker.attack * skill.dmgMultiplier - effectiveDef * (1 / penFactor)));
      const lo = Math.max(1, base - 2);
      const hi = base + 3;
      const critHi = Math.floor(hi * 1.8);
      return { lo, hi, critHi, critChance, isLethal: hi >= target.hp, isCritLethal: critHi >= target.hp, front, skill };
    }

    // Basic attack
    const base = Math.max(1, Math.floor(attacker.attack * 1.0 - effectiveDef));
    const lo = Math.max(1, base - 2);
    const hi = base + 3;
    const critHi = Math.floor(hi * 1.75);
    return { lo, hi, critHi, critChance, isLethal: hi >= target.hp, isCritLethal: critHi >= target.hp, front, skill: null };
  }, [hoveredUnitId, currentUnitId, units, actionMode, equippedSkills]);

  const getReachableTiles = (start: {x: number, y: number}, maxMove: number) => {
    const queue = [{...start, dist: 0}];
    const visited = new Set([`${start.x},${start.y}`]);
    const reachable: {x: number; y: number}[] = [];

    while (queue.length > 0) {
      const {x, y, dist} = queue.shift()!;
      reachable.push({x, y});

      if (dist < maxMove) {
        const neighbors = [[0,1], [1,0], [0,-1], [-1,0]];
        for (const [dx, dy] of neighbors) {
          const nx = x + dx;
          const ny = y + dy;
          const key = `${nx},${ny}`;
          if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
            if (!visited.has(key) && !level.obstacleTiles.has(key)) {
               const isOccupied = grid[nx]?.[ny] != null;
               if (!isOccupied || (nx === start.x && ny === start.y)) {
                 visited.add(key);
                 queue.push({x: nx, y: ny, dist: dist + 1});
               }
            }
          }
        }
      }
    }
    return reachable;
  };

  const getAttackableTiles = (start: {x: number, y: number}, range: number, skill?: Skill) => {
    const attackType = skill?.attackType ?? 'normal';
    const effectiveRange = attackType === 'dash'
      ? range + (skill?.dashBonus ?? 0)
      : range;
    const tiles: {x: number; y: number}[] = [];
    for (let x = 0; x < GRID_W; x++) {
      for (let y = 0; y < GRID_H; y++) {
        const dist = Math.abs(start.x - x) + Math.abs(start.y - y);
        if (dist <= effectiveRange && dist > 0) {
          // jump: ignores line-of-sight (leaps over walls)
          // dash: also ignores LOS (charges through)
          // normal: requires clear LOS
          const passesLos = attackType !== 'normal'
            ? true
            : hasLineOfSight(start, {x, y}, level.visionBlockers);
          if (passesLos) tiles.push({x, y});
        }
      }
    }
    return tiles;
  };

  // facingDefenseMultiplier, calculateDamage, isFrontAttack now imported from combat-engine

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

    // Find unit with >= 100 CT already
    nextUnit = aliveUnits.find(u => u.ct >= 100);

    if (!nextUnit) {
      // Advance time until someone hits 100, then persist all CT gains
      let maxTicks = 200;
      while (!nextUnit && maxTicks > 0) {
        newUnits = newUnits.map(u => {
          if (u.hp <= 0) return u;
          return { ...u, ct: u.ct + Math.max(1, Math.floor(u.speed / 10)) };
        });
        nextUnit = newUnits.find(u => u.hp > 0 && u.ct >= 100);
        maxTicks--;
      }
      // Commit every unit's accumulated CT so progress carries across turns
      newUnits.forEach(u => { if (u.hp > 0) updateUnit(u.id, { ct: u.ct }); });
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

  // Reset the guard every time the active unit changes
  useEffect(() => { endTurnFiredRef.current = false; }, [currentUnitId]);

  const endTurn = useCallback(() => {
    if (!currentUnitId) return;
    if (endTurnFiredRef.current) return; // Prevent double endTurn from stale closures
    endTurnFiredRef.current = true;
    const unit = units.find(u => u.id === currentUnitId);
    if (!unit) return;
    
    updateUnit(unit.id, { 
      ct: 0, 
      hasMoved: true, 
      hasActed: true,
      specialAbilityCooldown: Math.max(0, unit.specialAbilityCooldown - 1)
    });
    tickSkillCooldowns(unit.id);
    tickStatusEffects(unit.id);

    // Poison tick: -8% max HP damage per turn
    if (unit.statusEffects.includes('poisoned') && unit.hp > 0) {
      const poisonDmg = Math.max(1, Math.floor(unit.maxHp * 0.08));
      updateUnit(unit.id, { hp: Math.max(1, unit.hp - poisonDmg) });
      addLog(`${unit.name} takes ${poisonDmg} poison damage!`, 'debuff');
    }

    setCurrentUnitId(null);
    setActionMode('idle');
    setReachableTiles([]);
    setAttackableTiles([]);
  }, [currentUnitId, units, updateUnit, setCurrentUnitId, setActionMode, setReachableTiles, setAttackableTiles, tickSkillCooldowns, tickStatusEffects, addLog]);

  // Actions
  const handleTileClick = (x: number, y: number) => {
    if (!currentUnitId) return;
    const unit = units.find(u => u.id === currentUnitId);
    if (!unit || !unit.isPlayerControlled) return;

    if (actionMode === 'move' && !unit.hasMoved) {
      const isReachable = reachableTiles.some(t => t.x === x && t.y === y);
      if (isReachable) {
        const startPos = { x: unit.position.x, y: unit.position.y };
        const endPos   = { x, y };
        const facing   = calcFacing(startPos, endPos);
        // Build occupied set (all alive units except this one)
        const occupied = new Set<string>();
        units.forEach(u => { if (u.hp > 0 && u.id !== unit.id) occupied.add(`${u.position.x},${u.position.y}`); });
        const path = bfsPath(startPos, endPos, GRID_W, GRID_H, occupied, level.obstacleTiles);
        // Update game state immediately; animation handled by WalkingUnit
        updateUnit(unit.id, { position: endPos, hasMoved: true, facing });
        setWalkPaths(prev => ({ ...prev, [unit.id]: path }));
        setActionMode('idle');
        setReachableTiles([]);
        addLog(`${unit.name} marches to [${x}, ${y}].`);
        setAnimStates(prev => ({ ...prev, [unit.id]: 'walk' }));
        // animState reset to 'idle' happens in onWalkComplete
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

  // Called by BattleScene when a unit finishes its walk animation
  const onWalkComplete = (unitId: string) => {
    setWalkPaths(prev => {
      const next = { ...prev };
      delete next[unitId];
      return next;
    });
    setAnimStates(prev => ({ ...prev, [unitId]: 'idle' }));
    // Pulse skill buttons if the active player unit still hasn't attacked
    const u = useGameStore.getState().units.find(u => u.id === unitId);
    if (u?.isPlayerControlled && !u.hasActed && unitId === currentUnitId) {
      setPostMoveGlow(true);
      setTimeout(() => setPostMoveGlow(false), 2200);
    }
  };

  // Called by BattleScene as a unit enters each tile during its walk
  // Hook point for traps, zone abilities, and movement-triggered effects
  const onWalkStep = (unitId: string, tile: { x: number; y: number }) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;
    // Future: check level.traps for this tile and apply effects
    // Example stub: addLog(`${unit.name} steps on [${tile.x},${tile.y}].`);
    void tile;
  };

  const executeSkill = (attacker: TacticalUnit, skill: Skill, target: TacticalUnit) => {
    const _front = isFrontAttack(attacker, target);
    const critChance = _front ? 0.10 : 0.35;
    const isCrit = Math.random() < critChance;
    const penFactor = 1 + (skill.armorPen || 0) / 100;
    const baseDmg = skill.dmgMultiplier !== undefined
      ? Math.max(1, Math.floor((attacker.attack * skill.dmgMultiplier - target.defense * (1 / penFactor)) + Math.floor(Math.random() * 6) - 2))
      : 0;
    const finalDmg = isCrit ? Math.floor(baseDmg * 1.8) : baseDmg;
    const newHp    = target.hp - finalDmg;

    // Immediate game-state changes
    updateUnit(attacker.id, { hasActed: true, facing: calcFacing(attacker.position, target.position) });
    setActionMode('idle');
    setAttackableTiles([]);

    // Cooldown tracking
    if (skill.cooldown > 0 && skill.cooldown !== 999) setSkillCooldown(attacker.id, skill.id, skill.cooldown);
    if (skill.cooldown === 999) { markUltimateUsed(attacker.id); setSkillCooldown(attacker.id, skill.id, 999); }

    // Damage / status resolve immediately (game logic) — visuals follow at hitMs
    if (finalDmg > 0) {
      updateUnit(target.id, { hp: Math.max(0, newHp) });
      const suffix  = isCrit ? ' (CRITICAL!)' : '';
      const aoeNote = skill.aoe ? ' [AoE]' : '';
      addLog(`${attacker.name} uses ${skill.name}${aoeNote} on ${target.name} for ${finalDmg} dmg!${suffix}`, 'damage');
      if (newHp <= 0) addLog(`${target.name} is defeated!`, 'debuff');
    }
    if (skill.applyStatus && skill.statusDuration) {
      applyStatus(target.id, skill.applyStatus, skill.statusDuration);
      addLog(`${target.name} is ${skill.applyStatus}! (${skill.statusDuration} turns)`, 'debuff');
    }

    // Start attack animation
    const atkAnim   = getSkillAnimState(skill);
    const atkDurMs  = getAtkDuration(skill);
    const hitMs     = Math.floor(atkDurMs * 0.38);
    const travelDur = skill.tags.includes('ultimate') ? 900 : 650;
    const fromPos   = tileToWorld(attacker.position.x, attacker.position.y, level.tileSize, 0.9);
    const toPos     = tileToWorld(target.position.x, target.position.y, level.tileSize, 0.9);
    const weaponType  = CHARACTER_WEAPON_MAP[attacker.characterId];
    const effectType  = getEffectType(skill, weaponType);
    const effectColor = getEffectColor(skill);

    setAnimStates(prev => ({ ...prev, [attacker.id]: atkAnim }));

    // ── Cast-start FX (t = 0) ─────────────────────────────────────────────────
    const isMagicSkill = (
      effectType === 'fire_projectile' ||
      effectType === 'ice_projectile' ||
      effectType === 'dark_projectile' ||
      effectType === 'magic_beam' ||
      effectType === 'ultimate_nova'
    );
    if (isMagicSkill) {
      // Spinning rune circle at caster's feet for the whole wind-up
      spawnEffect('magic_circle', fromPos, fromPos, effectColor, hitMs + 250);
      // Energy orb builds in caster's hands then bursts as projectile launches
      spawnEffect('energy_charge', fromPos, fromPos, effectColor, hitMs + 80);
    }

    // Melee skill: dash toward target just like a basic attack
    if (effectType === 'physical_slash') {
      window.dispatchEvent(new CustomEvent('unit-dash', {
        detail: {
          unitId: attacker.id,
          targetX: toPos[0],
          targetZ: toPos[2],
          forwardMs: hitMs,
          holdMs: 130,
          returnMs: Math.max(200, atkDurMs - hitMs - 130),
        },
      }));
    }

    // At impact point: spawn effects + trigger target reaction
    setTimeout(() => {
      spawnEffect(effectType, fromPos, toPos, effectColor, travelDur);
      if (skill.aoe) spawnEffect('aoe_ring', fromPos, toPos, effectColor, 900);
      if (finalDmg > 0 && effectType !== 'impact_flash' && effectType !== 'heal_burst') {
        setTimeout(() => spawnEffect('impact_flash', fromPos, toPos, effectColor, 380), Math.min(300, Math.floor(travelDur * 0.5)));
      }
      // Element-specific explosion on impact
      if (finalDmg > 0) {
        const impactDelay = Math.min(350, Math.floor(travelDur * 0.6));
        if (effectType === 'fire_projectile') {
          setTimeout(() => spawnEffect('fire_explosion', fromPos, toPos, '#ff6600', 900), impactDelay);
        } else if (effectType === 'ice_projectile') {
          setTimeout(() => spawnEffect('ice_shatter', fromPos, toPos, '#88ddff', 950), impactDelay);
        } else if (effectType === 'dark_projectile') {
          setTimeout(() => spawnEffect('dark_void', fromPos, toPos, '#9900ff', 1000), impactDelay);
        } else if (effectType === 'magic_beam' || skill.tags.includes('lightning')) {
          setTimeout(() => spawnEffect('lightning_arc', fromPos, toPos, '#ccddff', 700), impactDelay);
        }
      }
      // Crit burst on skill crits
      if (isCrit && finalDmg > 0) {
        setTimeout(() => spawnEffect('crit_burst', fromPos, toPos, '#ffd700', 750), 180);
      }
      // Camera shake on crit or powerful skills
      if (finalDmg > 0 && (isCrit || skill.tags.includes('ultimate') || skill.dmgMultiplier && skill.dmgMultiplier >= 1.6)) {
        window.dispatchEvent(new CustomEvent('camera-shake', {
          detail: {
            intensity: skill.tags.includes('ultimate') ? 0.35 : isCrit ? 0.26 : 0.18,
            duration: skill.tags.includes('ultimate') ? 500 : isCrit ? 380 : 280,
          },
        }));
      }
      // Target visual reaction
      if (finalDmg > 0 || (skill.applyStatus && skill.statusDuration)) {
        if (newHp <= 0) {
          setAnimStates(prev => ({ ...prev, [target.id]: 'dead' }));
        } else {
          setAnimStates(prev => ({ ...prev, [target.id]: skill.applyStatus ? skill.applyStatus as AnimState : 'hurt' }));
          setTimeout(() => setAnimStates(prev => ({ ...prev, [target.id]: 'idle' })), 650);
        }
      }
    }, hitMs);

    // Attacker returns to idle then check endTurn
    setTimeout(() => {
      setAnimStates(prev => ({ ...prev, [attacker.id]: 'idle' }));
      setTimeout(() => {
        const u = useGameStore.getState().units.find(u => u.id === attacker.id);
        if (u?.hasMoved && u?.hasActed) endTurn();
      }, 150);
    }, atkDurMs);
  };

  const executeAttack = (attacker: TacticalUnit, target: TacticalUnit) => {
    // ── Phase 3B: Counter-attack / Block system ──────────────────────────
    const front = isFrontAttack(attacker, target);
    const rear  = !front;
    // Front attacks: 25% chance to block (reduce damage by 50%)
    const blocked = front && Math.random() < 0.25;
    // Rear attacks: +25% crit chance stacked on base 10%
    const critChance = rear ? 0.35 : 0.1;
    const isCrit  = Math.random() < critChance;
    let damage  = calculateDamage(attacker, target, isCrit);
    if (blocked) damage = Math.max(1, Math.floor(damage * 0.5));
    const newHp   = target.hp - damage;

    // Immediate: game state + logs
    updateUnit(attacker.id, { hasActed: true, facing: calcFacing(attacker.position, target.position) });
    updateUnit(target.id, { hp: Math.max(0, newHp) });
    setActionMode('idle');
    setAttackableTiles([]);
    const blockSuffix = blocked ? ' [BLOCKED!]' : '';
    addLog(`${attacker.name} attacks ${target.name} for ${damage} damage!${isCrit ? ' (CRITICAL)' : ''}${blockSuffix}${rear ? ' (backstab)' : ''}`, 'damage');
    if (newHp <= 0) addLog(`${target.name} is defeated!`, 'debuff');

    // Animation timing
    const atkDurMs   = 1050;
    const hitMs      = Math.floor(atkDurMs * 0.38);
    const fromPos    = tileToWorld(attacker.position.x, attacker.position.y, level.tileSize, 0.9);
    const toPos      = tileToWorld(target.position.x, target.position.y, level.tileSize, 0.9);
    const wt         = CHARACTER_WEAPON_MAP[attacker.characterId];
    const slashColor = isCrit ? '#ffd700' : '#ffa040';

    setAnimStates(prev => ({ ...prev, [attacker.id]: 'attack1' }));

    // Melee dash: lunge toward target, hold at impact, spring back
    if (wt !== 'bow') {
      window.dispatchEvent(new CustomEvent('unit-dash', {
        detail: {
          unitId: attacker.id,
          targetX: toPos[0],
          targetZ: toPos[2],
          forwardMs: hitMs,
          holdMs: 130,
          returnMs: Math.max(200, atkDurMs - hitMs - 130),
        },
      }));
    }

    setTimeout(() => {
      spawnEffect(wt === 'bow' ? 'arrow' : 'physical_slash', fromPos, toPos, slashColor, 420);
      setTimeout(() => spawnEffect('impact_flash', fromPos, toPos, slashColor, 350), 250);
      // Crit extras: burst flash + ground slam
      if (isCrit) {
        setTimeout(() => spawnEffect('crit_burst', fromPos, toPos, '#ffd700', 700), 200);
        setTimeout(() => spawnEffect('ground_slam', fromPos, toPos, slashColor, 800), 280);
      }
      // Camera shake on crit or high damage
      if (isCrit || damage >= activeUnit!.attack * 1.4) {
        window.dispatchEvent(new CustomEvent('camera-shake', {
          detail: { intensity: isCrit ? 0.28 : 0.16, duration: isCrit ? 380 : 260 },
        }));
      }
      // Target reaction
      if (newHp <= 0) {
        setAnimStates(prev => ({ ...prev, [target.id]: 'dead' }));
      } else if (blocked) {
        // Show block animation briefly
        setAnimStates(prev => ({ ...prev, [target.id]: 'block' }));
        setTimeout(() => setAnimStates(prev => ({ ...prev, [target.id]: 'idle' })), 800);
      } else {
        setAnimStates(prev => ({ ...prev, [target.id]: 'hurt' }));
        setTimeout(() => setAnimStates(prev => ({ ...prev, [target.id]: 'idle' })), 650);
      }
    }, hitMs);

    setTimeout(() => {
      setAnimStates(prev => ({ ...prev, [attacker.id]: 'idle' }));
      setTimeout(() => {
        const u = useGameStore.getState().units.find(u => u.id === attacker.id);
        if (u?.hasMoved && u?.hasActed) endTurn();
      }, 150);
    }, atkDurMs);
  };

  const executeAbility = (attacker: TacticalUnit, target: TacticalUnit) => {
    const ability   = attacker.specialAbility;
    const atkDurMs  = 1350;
    const hitMs     = Math.floor(atkDurMs * 0.38);
    const isHeal    = ability.includes('Heal') || ability === "Death's Embrace";

    // Immediate game state
    updateUnit(attacker.id, { hasActed: true, specialAbilityCooldown: 3, facing: isHeal ? attacker.facing : calcFacing(attacker.position, target.position) });
    setActionMode('idle');
    setAttackableTiles([]);

    let damage = 0;
    if (isHeal) {
      const heal = Math.floor(attacker.attack * 1.5);
      updateUnit(attacker.id, { hp: Math.min(attacker.maxHp, attacker.hp + heal) });
      addLog(`${attacker.name} uses ${ability} and heals for ${heal}!`, 'heal');
    } else {
      damage = calculateDamage(attacker, target) + Math.floor(attacker.attack * 0.5);
      const newHp = target.hp - damage;
      updateUnit(target.id, { hp: Math.max(0, newHp) });
      addLog(`${attacker.name} uses ${ability} on ${target.name} for ${damage} damage!`, 'damage');
      if (newHp <= 0) addLog(`${target.name} is defeated!`, 'debuff');

      setTimeout(() => {
        const fromPos    = tileToWorld(attacker.position.x, attacker.position.y, level.tileSize, 0.9);
        const toPos      = tileToWorld(target.position.x, target.position.y, level.tileSize, 0.9);
        spawnEffect('magic_beam', fromPos, toPos, '#ffcc00', 700);
        setTimeout(() => spawnEffect('impact_flash', fromPos, toPos, '#ffcc00', 380), 350);
        if (newHp <= 0) {
          setAnimStates(prev => ({ ...prev, [target.id]: 'dead' }));
        } else {
          setAnimStates(prev => ({ ...prev, [target.id]: 'hurt' }));
          setTimeout(() => setAnimStates(prev => ({ ...prev, [target.id]: 'idle' })), 650);
        }
      }, hitMs);
    }

    setAnimStates(prev => ({ ...prev, [attacker.id]: 'special2' }));
    setTimeout(() => {
      setAnimStates(prev => ({ ...prev, [attacker.id]: 'idle' }));
      setTimeout(() => {
        const u = useGameStore.getState().units.find(u => u.id === attacker.id);
        if (u?.hasMoved && u?.hasActed) endTurn();
      }, 150);
    }, atkDurMs);
  };

  // ── AI Logic ────────────────────────────────────────────────────────────────
  // Fires when the active unit changes, when units change (hasMoved/hasActed),
  // or when walkPaths clears (walk animation completed).
  // EVERY code path calls endTurn() explicitly — never relies on the "else" fallback.
  // The endTurnFiredRef guard prevents double-endTurn from stale animation closures.
  useEffect(() => {
    const unit = units.find(u => u.id === currentUnitId);
    if (!unit || unit.isPlayerControlled || unit.hp <= 0) return;

    // Still walking — wait for onWalkComplete to clear walkPaths before acting
    if (walkPaths[unit.id]) return;

    // Delay: give the player time to see the AI "thinking" before its first action,
    // or a short pause after the walk animation finishes before attacking.
    const delay = unit.hasMoved ? 420 : 1300;

    const aiTimer = setTimeout(() => {
      // ── STUNNED: lose entire turn ────────────────────────────────────────
      if (unit.statusEffects.includes('stunned')) {
        addLog(`${unit.name} is STUNNED and loses their turn!`, 'debuff');
        updateUnit(unit.id, { hasMoved: true, hasActed: true });
        endTurn();
        return;
      }

      // ── MOVE PHASE ───────────────────────────────────────────────────────
      if (!unit.hasMoved) {
        const players = units.filter(u => u.isPlayerControlled && u.hp > 0);
        if (players.length === 0) { endTurn(); return; }

        const isRanged = unit.range >= 2;

        // Pick best target to move toward.
        // Priority: (1) a player within attack range after move → pick lowest HP
        //           (2) otherwise, pick closest player (also prefer lowest HP as tiebreak)
        const effectiveMove = unit.statusEffects.includes('frozen') ? 1 : unit.move;
        const reach = getReachableTiles(unit.position, effectiveMove);

        // Check which players we could actually reach and attack from a reachable tile
        const attackable = players.filter(p => reach.some(tile => {
          const d = Math.abs(tile.x - p.position.x) + Math.abs(tile.y - p.position.y);
          return d <= unit.range;
        }));

        // Sort candidates: attackable ones first (lowest HP), then non-attackable by distance
        const sortedTargets = [...players].sort((a, b) => {
          const aAttackable = attackable.includes(a);
          const bAttackable = attackable.includes(b);
          if (aAttackable !== bAttackable) return aAttackable ? -1 : 1;
          // Among attackable: lowest HP first (finishing blow priority)
          if (aAttackable && bAttackable) return a.hp - b.hp;
          // Among non-attackable: closest first
          const dA = Math.abs(a.position.x - unit.position.x) + Math.abs(a.position.y - unit.position.y);
          const dB = Math.abs(b.position.x - unit.position.x) + Math.abs(b.position.y - unit.position.y);
          return dA - dB;
        });
        const target = sortedTargets[0];

        // Score each reachable tile for tactical value
        const bestMove = reach.sort((a, b) => {
          const distA = Math.abs(a.x - target.position.x) + Math.abs(a.y - target.position.y);
          const distB = Math.abs(b.x - target.position.x) + Math.abs(b.y - target.position.y);

          if (isRanged) {
            // Ranged units: prefer tiles where we can attack (dist <= range) but NOT adjacent
            // Ideal: stay at exactly unit.range away; avoid dist <= 1 (melee danger)
            const idealA = distA <= unit.range && distA >= 2 ? 0 : distA <= 1 ? 2 : 1;
            const idealB = distB <= unit.range && distB >= 2 ? 0 : distB <= 1 ? 2 : 1;
            if (idealA !== idealB) return idealA - idealB;
            // Secondary: prefer tiles closer to exactly unit.range (but stay back)
            const preferA = Math.abs(distA - unit.range);
            const preferB = Math.abs(distB - unit.range);
            return preferA - preferB;
          } else {
            // Melee units: get as close as possible, prefer adjacent (dist === 1)
            if (distA !== distB) return distA - distB;
            // Tiebreak: prefer tiles to the rear of the target's facing (flanking bonus)
            const tf = target.facing ?? 2;
            const isRearA = (tf === 0 && a.y > target.position.y) || (tf === 1 && a.x < target.position.x) ||
                            (tf === 2 && a.y < target.position.y) || (tf === 3 && a.x > target.position.x);
            const isRearB = (tf === 0 && b.y > target.position.y) || (tf === 1 && b.x < target.position.x) ||
                            (tf === 2 && b.y < target.position.y) || (tf === 3 && b.x > target.position.x);
            return (isRearB ? 0 : 1) - (isRearA ? 0 : 1);
          }
        })[0];

        if (bestMove) {
          const startPos = { x: unit.position.x, y: unit.position.y };
          const facing = calcFacing(startPos, bestMove);
          const occupied = new Set<string>();
          units.forEach(u => { if (u.hp > 0 && u.id !== unit.id) occupied.add(`${u.position.x},${u.position.y}`); });
          const path = bfsPath(startPos, bestMove, GRID_W, GRID_H, occupied, level.obstacleTiles);
          updateUnit(unit.id, { position: bestMove, hasMoved: true, facing });
          const moveDesc = isRanged ? `${unit.name} takes position.` : `${unit.name} advances.`;
          addLog(moveDesc);
          setAnimStates(prev => ({ ...prev, [unit.id]: 'walk' }));
          setWalkPaths(prev => ({ ...prev, [unit.id]: path }));
          // Attack fires when onWalkComplete clears walkPaths → effect re-runs
        } else {
          // Nowhere to move — skip move, go straight to attack phase
          updateUnit(unit.id, { hasMoved: true });
          // Effect re-runs due to units change → attack phase next
        }
        return;
      }

      // ── ATTACK PHASE (AI Skill System) ────────────────────────────────────
      if (!unit.hasActed) {
        // Frozen: skip attack, end turn
        if (unit.statusEffects.includes('frozen')) {
          addLog(`${unit.name} is FROZEN and cannot attack!`, 'debuff');
          updateUnit(unit.id, { hasActed: true });
          endTurn();
          return;
        }

        const currentPos = useGameStore.getState().units.find(u => u.id === unit.id)?.position ?? unit.position;
        const inRange = units.filter(u =>
          u.isPlayerControlled && u.hp > 0 &&
          Math.abs(u.position.x - currentPos.x) + Math.abs(u.position.y - currentPos.y) <= unit.range
        );

        if (inRange.length > 0) {
          const target = [...inRange].sort((a, b) => a.hp - b.hp)[0];

          // ── AI Skill Scoring: pick the best skill to use ──────────────
          const loadout = equippedSkills[unit.id] || getDefaultSkillLoadout(unit.characterId);
          const cdMap = skillCooldowns[unit.id] || {};
          const unitHpPct = unit.hp / unit.maxHp;
          const targetHpPct = target.hp / target.maxHp;

          let bestSkill: Skill | null = null;
          let bestScore = -1;

          for (const slot of [1, 2, 3, 4, 5] as const) {
            const skillId = loadout[slot];
            if (!skillId) continue;
            const cd = cdMap[skillId] || 0;
            if (cd > 0) continue; // on cooldown
            const skill = getSkillById(skillId);
            if (!skill) continue;
            // Check range
            const dist = Math.abs(currentPos.x - target.position.x) + Math.abs(currentPos.y - target.position.y);
            const effectiveRange = skill.attackType === 'dash' ? (skill.range + (skill.dashBonus ?? 0)) : skill.range;
            if (dist > effectiveRange) continue;

            let score = 10; // base
            // Damage multiplier score
            if (skill.dmgMultiplier) score += skill.dmgMultiplier * 20;
            // AoE bonus when 2+ enemies clustered
            if (skill.aoe) {
              const clustered = inRange.length;
              score += clustered >= 2 ? 25 : 5;
            }
            // Status effect bonus vs high-threat targets
            if (skill.applyStatus === 'stunned') score += 18;
            if (skill.applyStatus === 'frozen')  score += 15;
            if (skill.applyStatus === 'poisoned') score += 10;
            // Ultimate: use when target is low or many enemies in range
            if (skill.tags.includes('ultimate')) {
              if (targetHpPct < 0.3 || inRange.length >= 3) score += 40;
              else score -= 30; // save it
            }
            // Heal: prioritize when self HP is low
            if (skill.tags.includes('heal')) {
              if (unitHpPct < 0.4) score += 35;
              else score -= 20; // don't waste heals at full HP
            }
            // Armor pen bonus vs high-defense targets
            if (skill.armorPen && target.defense > 15) score += skill.armorPen * 0.3;

            if (score > bestScore) { bestScore = score; bestSkill = skill; }
          }

          // Use the best skill if it beats a basic attack (score > 15)
          if (bestSkill && bestScore > 15) {
            executeSkill(unit, bestSkill, target);
          } else {
            // Fallback: special ability or basic attack
            const useAbility = unit.specialAbilityCooldown === 0 && targetHpPct < 0.7;
            if (useAbility) {
              executeAbility(unit, target);
            } else {
              executeAttack(unit, target);
            }
          }
        } else {
          addLog(`${unit.name} has no targets in range.`);
          updateUnit(unit.id, { hasActed: true });
          setTimeout(() => endTurn(), 600);
        }
        return;
      }

      // Both hasMoved and hasActed already true — shouldn't normally reach here,
      // but if it does (e.g. stunned unit that already had a turn), just end turn.
      endTurn();
    }, delay);

    return () => clearTimeout(aiTimer);
  }, [currentUnitId, units, walkPaths, endTurn, updateUnit, addLog]);

  // Player stunned: auto-skip their turn after brief delay
  useEffect(() => {
    const unit = units.find(u => u.id === currentUnitId);
    if (!unit || !unit.isPlayerControlled || unit.hp <= 0) return;
    if (!unit.statusEffects.includes('stunned')) return;
    const t = setTimeout(() => {
      addLog(`${unit.name} is STUNNED and loses their turn!`, 'debuff');
      endTurn();
    }, 1800);
    return () => clearTimeout(t);
  }, [currentUnitId, units, endTurn, addLog]);

  const activeUnit = currentUnitId ? units.find(u => u.id === currentUnitId) : null;
  // The unit shown in the bottom HUD — clicked unit takes priority over the active turn unit
  const inspectedUnit = (inspectedUnitId ? units.find(u => u.id === inspectedUnitId && u.hp > 0) : null) ?? activeUnit;
  const isInspecting = inspectedUnit && inspectedUnit.id !== currentUnitId;

  // ── Auto-focus camera on unit whose turn it is ───────────────────────────
  useEffect(() => {
    if (!currentUnitId) return;
    const unit = units.find(u => u.id === currentUnitId);
    if (!unit || unit.hp <= 0) return;
    const [wx, , wz] = tileToWorld(unit.position.x, unit.position.y, level.tileSize, 0.5);
    setCameraFocus([wx, 0, wz]);
  }, [currentUnitId]); // eslint-disable-line react-hooks/exhaustive-deps

  const tileSize = level.tileSize;

  if (phase !== 'battle') return null;

  return (
    <div className="relative h-screen overflow-hidden bg-black select-none">

      {/* ── LOADING SCREEN (overlays everything while GLBs stream in) ───── */}
      {showLoading && (
        <BattleLoadingScreen levelName={level.name} onDone={handleLoadDone} />
      )}

      {/* ── TOP TURN ORDER STRIP ─────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-30 h-[52px] bg-[#0a0a10]/96 backdrop-blur-sm border-b border-white/10 flex items-center px-3 gap-3">
        {/* Game label */}
        <div className="shrink-0 font-display text-[9px] uppercase tracking-[0.2em] text-white/20 whitespace-nowrap">
          Realm of Grudges
        </div>
        <div className="shrink-0 w-px h-5 bg-white/10" />

        {/* Scrollable turn-order thumbnails */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex items-center gap-1.5 h-[40px]">
            <AnimatePresence>
              {turnOrder.map((id, index) => {
                const u = units.find(u => u.id === id);
                if (!u) return null;
                const isActive = currentUnitId === u.id;
                return (
                  <motion.button
                    key={u.id + index}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    title={`${u.name} — CT ${Math.round(Math.min(100, u.ct))}% · SPD ${u.speed} (click to focus, right-click for options)`}
                    onClick={() => {
                      const [wx, , wz] = tileToWorld(u.position.x, u.position.y, tileSize, 0.5);
                      setCameraFocus([wx, 0, wz]);
                    }}
                    onContextMenu={(e) => handlePortraitRightClick(e, u)}
                    className={cn(
                      "flex-shrink-0 w-9 h-[38px] rounded border overflow-hidden relative flex flex-col",
                      "hover:scale-110 hover:z-10 transition-transform duration-100 cursor-pointer",
                      u.isPlayerControlled ? "border-primary/50" : "border-destructive/50",
                      isActive && "ring-2 ring-white scale-110 z-10"
                    )}
                  >
                    {/* CT bar top */}
                    <div className="h-1 bg-black/80 shrink-0 relative">
                      <div
                        className={cn("h-full transition-all", Math.min(100, u.ct) >= 100 ? "bg-yellow-400" : u.isPlayerControlled ? "bg-primary" : "bg-destructive")}
                        style={{ width: `${Math.min(100, u.ct)}%` }}
                      />
                    </div>
                    {/* Portrait */}
                    <div className="flex-1 relative bg-black/60">
                      <img
                        src={`${BASE}images/chars/${u.characterId}.png`}
                        alt={u.name}
                        className="absolute inset-0 w-full h-full object-cover object-top"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }}
                      />
                      {/* Dark overlay for HP depletion */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50" style={{ height: `${100 - (u.hp / u.maxHp) * 100}%` }} />
                      {/* Active arrow */}
                      {isActive && <div className="absolute top-0.5 right-0.5 text-[7px] text-yellow-300 font-bold leading-none">▶</div>}
                    </div>
                    {/* HP bar bottom */}
                    <div className="h-1 bg-black/80 shrink-0 relative">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${(u.hp / u.maxHp) * 100}%` }}
                      />
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: turn status chip */}
        {activeUnit && (
          <div className={cn(
            "shrink-0 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 border",
            activeUnit.isPlayerControlled
              ? "text-emerald-400 border-emerald-700/40 bg-emerald-950/60"
              : "text-red-400 border-red-800/40 bg-red-950/60"
          )}>
            {activeUnit.isPlayerControlled
              ? <><Move className="w-3 h-3" />Your Turn</>
              : <><Skull className="w-3 h-3" />Enemy</>
            }
          </div>
        )}

        {/* Camera mode toggle + tactical rotation buttons */}
        <div className="shrink-0 flex items-center gap-1">
          {cameraMode === 'tactical' && (
            <>
              <button
                onClick={() => document.dispatchEvent(new CustomEvent('camera-rotate', { detail: { dir: 'left', amount: Math.PI / 4 } }))}
                className="flex items-center justify-center w-7 h-7 rounded border border-amber-600/50 bg-amber-950/50 text-amber-300 hover:bg-amber-900/60 transition-all text-sm font-bold"
                title="Rotate left 45° (Z)"
              >⟲</button>
              <button
                onClick={() => document.dispatchEvent(new CustomEvent('camera-rotate', { detail: { dir: 'right', amount: Math.PI / 4 } }))}
                className="flex items-center justify-center w-7 h-7 rounded border border-amber-600/50 bg-amber-950/50 text-amber-300 hover:bg-amber-900/60 transition-all text-sm font-bold"
                title="Rotate right 45° (X)"
              >⟳</button>
            </>
          )}
          <button
            onClick={() => setCameraMode(m => CAMERA_META[m].next)}
            className={cn(
              "flex items-center gap-1.5 rounded border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-all",
              cameraMode === 'tactical'
                ? "border-amber-600/60 bg-amber-950/60 text-amber-300 shadow-[0_0_8px_rgba(217,119,6,0.3)]"
                : cameraMode === 'third-person'
                ? "border-cyan-600/60 bg-cyan-950/60 text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.3)]"
                : cameraMode === 'rts'
                ? "border-violet-600/60 bg-violet-950/60 text-violet-300 shadow-[0_0_8px_rgba(167,139,250,0.3)]"
                : "border-white/15 bg-white/5 text-white/45 hover:text-white/70 hover:border-white/30"
            )}
            title={`Camera: ${cameraMode} — click to cycle`}
          >
            {CAMERA_META[cameraMode].icon}
            {CAMERA_META[cameraMode].label}
          </button>
        </div>

        {/* Far right: retreat */}
        <button
          onClick={() => setLocation('/')}
          className="shrink-0 text-[9px] text-white/20 hover:text-white/50 transition-colors uppercase tracking-wider"
        >
          ← Flee
        </button>
      </div>

      {/* ── 3D SCENE: fills viewport minus top/bottom bars ─────────────────── */}
      <div className="absolute inset-0" style={{ top: 52, bottom: 130 }}>
        <BattleScene
          units={units}
          level={level}
          reachableTiles={reachableTiles}
          attackableTiles={attackableTiles}
          currentUnitId={currentUnitId}
          actionMode={actionMode}
          onTileClick={handleTileClick}
          animStates={animStates}
          combatEffects={combatEffects}
          cameraFocus={cameraFocus}
          cameraMode={cameraMode}
          onUnitDoubleClick={handleUnitDoubleClick}
          showUnitInfo={showUnitInfo}
          mapPings={mapPings}
          onUnitRightClick={handleUnitRightClick}
          onUnitClick={handleUnitClick}
onUnitHover = { setHoveredUnitId }
onUnitUnhover = {() => setHoveredUnitId(null)}
          onMapRightClick={handleMapRightClick}
          walkPaths={walkPaths}
          onWalkComplete={onWalkComplete}
          onWalkStep={onWalkStep}
        />
      </div>

      {/* ── FLOATING COMBAT LOG (bottom-right, above minimap) ─────────────── */}
      <div
        className="absolute right-3 z-20 flex flex-col-reverse gap-0.5 pointer-events-none"
        style={{ bottom: 300, width: 220 }}
      >
        <AnimatePresence initial={false}>
          {[...combatLog].reverse().slice(0, 8).map(log => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 0.85, x: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                "text-[10px] font-mono px-2 py-0.5 rounded-sm bg-black/70 backdrop-blur-sm border border-white/5 leading-snug",
                log.type === 'damage' ? 'text-orange-400' :
                log.type === 'heal'   ? 'text-green-400'  :
                log.type === 'buff'   ? 'text-blue-400'   :
                log.type === 'debuff' ? 'text-purple-400' :
                'text-white/35'
              )}
            >
              {log.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── HOTKEY BUTTONS (bottom-left) ───────────────────────────────────── */}
      <div className="absolute left-3 z-20 flex flex-col gap-1.5" style={{ bottom: 138 }}>
        <button
          onClick={() => setShowUnitInfo(v => !v)}
          className={cn(
            "flex items-center gap-1.5 text-[10px] font-mono px-2 py-1.5 rounded border transition-all",
            showUnitInfo
              ? "bg-blue-950/90 border-blue-500/60 text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
              : "bg-black/60 border-white/10 text-white/35 hover:text-white/65 hover:border-white/25"
          )}
          title="Toggle unit circles & health bars (U)"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <circle cx="12" cy="8" r="4"/><ellipse cx="12" cy="17" rx="7" ry="4"/>
          </svg>
          Units [U]
        </button>
      </div>

      {/* ── MINIMAP ────────────────────────────────────────────────────────── */}
      <div className="absolute right-3 z-20" style={{ bottom: 138 }}>
        <Minimap
          units={units}
          gridW={GRID_W}
          gridH={GRID_H}
          tileSize={tileSize}
          currentUnitId={currentUnitId}
          onFocusTile={(wx, wz) => setCameraFocus([wx, 0, wz])}
        />
      </div>

{/* ── ATTACK PREVIEW TOOLTIP ─────────────────────────────────────────── */ }
<AnimatePresence>
  { attackPreview && (
    <motion.div
            key="attack-preview"
initial = {{ opacity: 0, y: 8 }}
animate = {{ opacity: 1, y: 0 }}
exit = {{ opacity: 0, y: 8 }}
className = "absolute z-40 pointer-events-none"
style = {{ bottom: 142, left: '50%', transform: 'translateX(-50%)' }}
          >
  <div className="flex items-center gap-3 rounded-xl border border-orange-500/40 bg-[#0d0810]/90 px-4 py-2.5 shadow-[0_4px_28px_rgba(200,80,0,0.35)] backdrop-blur-md" >
    {/* Position badge */ }
    < div className = {
      cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border",
        attackPreview.front
          ? "border-blue-500/50 bg-blue-950/60 text-blue-300"
          : "border-amber-500/50 bg-amber-950/60 text-amber-300"
              )
    } >
      { attackPreview.front ? '⬡ Front' : '⬡ Rear' }
      </div>
{/* Damage range */ }
<div className="flex flex-col items-center" >
  <div className="text-[9px] text-white/30 uppercase tracking-widest" > Damage </div>
    < div className = "text-base font-bold font-display text-orange-300 leading-none" >
      { attackPreview.lo }–{ attackPreview.hi }
</div>
  </div>
{/* Crit */ }
<div className="flex flex-col items-center border-l border-white/10 pl-3" >
  <div className="text-[9px] text-white/30 uppercase tracking-widest" > Crit({ Math.round(attackPreview.critChance * 100) } %) </div>
    < div className = "text-base font-bold font-display text-yellow-300 leading-none" >
                  ↑{ attackPreview.critHi }
</div>
  </div>
{/* Lethal indicator */ }
{
  (attackPreview.isLethal || attackPreview.isCritLethal) && (
    <div className={
    cn(
      "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border animate-pulse",
      attackPreview.isLethal
        ? "border-red-500/70 bg-red-950/70 text-red-300"
        : "border-yellow-500/60 bg-yellow-950/60 text-yellow-300"
    )
  }>
    { attackPreview.isLethal ? '☠ Lethal' : '☠ Crit-Kill' }
    </div>
              )
}
</div>
  </motion.div>
        )}
</AnimatePresence>

      {/* ── ENEMY TURN BANNER ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeUnit && !activeUnit.isPlayerControlled && (
          <motion.div
            key="enemy-banner"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="absolute z-40 pointer-events-none"
            style={{ top: 60, left: '50%', transform: 'translateX(-50%)' }}
          >
            <div className="bg-red-950/90 border border-red-700/50 rounded-full px-4 py-1.5 flex items-center gap-2 text-sm font-bold text-red-300 shadow-[0_4px_24px_rgba(180,20,20,0.5)] backdrop-blur-sm">
              <Skull className="w-3.5 h-3.5 animate-pulse" />
              {activeUnit.name} is acting…
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BOTTOM HUD ─────────────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-30 h-[130px] bg-[#070710]/97 backdrop-blur-sm border-t border-white/10 flex items-stretch">

        {/* LEFT column: portrait + stats (shows clicked/inspected unit, defaults to active unit) */}
        <div className="flex items-center gap-2.5 px-3 border-r border-white/8 shrink-0" style={{ width: 310 }}>
          {inspectedUnit ? (
            <>
              {/* Portrait with "inspecting" overlay when showing a non-active unit */}
              <div
                className={`relative h-[104px] w-[60px] shrink-0 rounded overflow-hidden border cursor-pointer ${
                  isInspecting ? 'border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'border-white/15'
                }`}
                onClick={() => setInspectedUnitId(null)}
                title={isInspecting ? 'Click to return to active unit' : ''}
              >
                <img
                  src={`${BASE}images/chars/${inspectedUnit.characterId}.png`}
                  alt={inspectedUnit.name}
                  className="absolute inset-0 w-full h-full object-cover object-top"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }}
                />
                <div
                  className="absolute inset-0"
                  style={{ background: inspectedUnit.isPlayerControlled ? 'rgba(0,30,0,0.3)' : 'rgba(30,0,0,0.3)' }}
                />
                {isInspecting && (
                  <div className="absolute bottom-0 left-0 right-0 bg-amber-600/80 text-[7px] text-white text-center py-0.5 font-bold uppercase tracking-wider">
                    Inspect
                  </div>
                )}
              </div>

              {/* Stat column */}
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-display text-sm font-bold text-white truncate">{inspectedUnit.name}</span>
                  {inspectedUnit.isPlayerControlled
                    ? <span className="text-[8px] shrink-0 px-1 py-0.5 rounded-full bg-emerald-900/60 text-emerald-400 border border-emerald-700/30">Ally</span>
                    : <span className="text-[8px] shrink-0 px-1 py-0.5 rounded-full bg-red-900/60 text-red-400 border border-red-700/30">Enemy</span>
                  }
                </div>

                <HealthBar current={inspectedUnit.hp} max={inspectedUnit.maxHp} label="HP" />
                <StatBar current={inspectedUnit.mana ?? 0} max={inspectedUnit.maxMana ?? 1} label="MP" fillClass="bg-blue-500" borderClass="border-blue-900/50" />
                <StatBar current={inspectedUnit.stamina ?? 0} max={inspectedUnit.maxStamina ?? 1} label="ST" fillClass="bg-orange-500" borderClass="border-orange-900/50" />
                <ActionBar ct={inspectedUnit.ct} speed={inspectedUnit.speed} isActive={inspectedUnit.id === currentUnitId} />

                <div className="flex items-center gap-2 text-[9px] font-mono text-white/35">
                  <span>ATK {inspectedUnit.attack}</span>
                  <span>DEF {inspectedUnit.defense}</span>
                  <span>MOV {inspectedUnit.move}</span>
                  <span>SPD {inspectedUnit.speed}</span>
                  {inspectedUnit.id === currentUnitId && inspectedUnit.isPlayerControlled && (
                    <span className="ml-1 flex items-center gap-1">
                      <button onClick={() => rotateFacing(inspectedUnit.id, 'ccw')} className="hover:text-white transition-colors" title="Rotate CCW">
                        <RotateCcw className="w-2.5 h-2.5" />
                      </button>
                      <span className="text-white/60 font-bold w-3 text-center">{['N','E','S','W'][inspectedUnit.facing ?? 2]}</span>
                      <button onClick={() => rotateFacing(inspectedUnit.id, 'cw')} className="hover:text-white transition-colors" title="Rotate CW">
                        <RotateCw className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 text-center text-white/20 text-xs italic">Awaiting turn…</div>
          )}
        </div>

        {/* CENTER: 5 skill slots */}
        <div className="flex-1 flex items-center justify-center px-4 gap-2.5 border-r border-white/8">
          {activeUnit?.isPlayerControlled && activeUnit.id === currentUnitId ? (
            ([1, 2, 3, 4, 5] as SkillSlot[]).map(slot => {
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
              const tierStyle = skill ? (TIER_STYLES[skill.tier] ?? TIER_STYLES.T1) : null;
              return (
                <div key={slot} className="relative">
                  {hoveredSlot === slot && skill && tierStyle && (
                    <SkillTooltip skill={skill} tierLabel={tierStyle.label} tierColor={tierStyle.color} />
                  )}
                  <button
                    disabled={isDisabled}
                    onMouseEnter={() => setHoveredSlot(slot)}
                    onMouseLeave={() => setHoveredSlot(null)}
                    onClick={() => {
                      if (isDisabled) return;
                      if (isActive) {
                        setActionMode('idle');
                        setAttackableTiles([]);
                      } else {
                        setActionMode(slotKey);
                        setReachableTiles([]);
                        setAttackableTiles(getAttackableTiles(activeUnit.position, skill?.range ?? activeUnit.range, skill ?? undefined));
                      }
                    }}
                    className={cn(
                      "relative flex flex-col items-center justify-center rounded border transition-all duration-150",
                      "w-[80px] h-[96px] overflow-hidden",
                      isActive
                        ? "border-primary shadow-[0_0_16px_rgba(212,160,23,0.65)]"
                        : isDisabled
                          ? "border-white/5 opacity-35 cursor-not-allowed"
                          : postMoveGlow && !isDisabled
                      ? "border-emerald-400/80 shadow-[0_0_18px_rgba(52,211,153,0.7)] animate-pulse cursor-pointer"
                      : "border-white/15 hover:border-primary/50 cursor-pointer hover:shadow-[0_0_10px_rgba(212,160,23,0.35)]"
                    )}
                    style={{
                      backgroundImage: `url('${UI("HUD/Action Bar/Slots/ActionBar_MainSlot_Background.png")}')`,
                      backgroundSize: "100% 100%",
                      backgroundRepeat: "no-repeat",
                      filter: isActive
                        ? "brightness(1.35) sepia(0.5) hue-rotate(-10deg)"
                        : isDisabled
                        ? "brightness(0.45) saturate(0.2)"
                        : "brightness(0.88)",
                    }}
                  >
                    <div className="absolute top-1 left-1.5 text-[9px] font-display font-bold" style={{ color: slotStyle.color }}>
                      {slotStyle.roman}
                    </div>
                    {skill ? (
                      <>
                        <div className="text-[26px] leading-none mt-2">{skill.icon}</div>
                        <div className="text-[9px] text-center leading-tight text-white/65 mt-1 px-1 truncate w-full">{skill.name}</div>
                        {isOnCooldown && !isUltimateUsed && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/72 text-base font-bold text-orange-400">{cd}</div>
                        )}
                        {isUltimateUsed && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-[9px] text-white/25">Used</div>
                        )}
                      </>
                    ) : (
                      <div className="text-white/12 text-xl font-display">{slotStyle.roman}</div>
                    )}
                    <div className="absolute bottom-1 right-1.5 text-[8px] text-white/18 font-mono">{slot}</div>
                  </button>
                </div>
              );
            })
          ) : (
            <div className="flex items-center gap-2 text-white/25 animate-pulse">
              <Skull className="w-4 h-4 text-red-700/60" />
              <span className="text-xs font-display uppercase tracking-widest">Enemy taking turn…</span>
            </div>
          )}
        </div>

        {/* RIGHT: Move + End Turn */}
        <div className="flex flex-col items-stretch justify-center gap-2 px-3 shrink-0" style={{ width: 126 }}>
          {activeUnit?.isPlayerControlled && activeUnit.id === currentUnitId ? (
            <>
              <FantasyButton
                onClick={() => {
                  const isMove = actionMode === 'move';
                  setActionMode(isMove ? 'idle' : 'move');
                  setAttackableTiles([]);
                  setReachableTiles(isMove ? [] : getReachableTiles(activeUnit.position, activeUnit.move));
                }}
                disabled={activeUnit.hasMoved || !!walkPaths[activeUnit.id]}
                variant={actionMode === 'move' ? 'primary' : 'secondary'}
                className="w-full text-xs h-9"
              >
                <Move className="w-3 h-3 mr-1.5" />
                {walkPaths[activeUnit.id] ? 'Walking…' : activeUnit.hasMoved ? 'Moved' : 'Move'}
              </FantasyButton>
              <FantasyButton
                onClick={endTurn}
                disabled={!!walkPaths[activeUnit.id]}
                variant="ghost"
                className="w-full text-xs h-9 border border-white/10"
              >
                {walkPaths[activeUnit.id] ? 'Walking…' : 'End Turn'}
              </FantasyButton>
            </>
          ) : (
            <button
              onClick={() => setLocation('/')}
              className="text-[10px] text-white/20 hover:text-white/45 transition-colors underline text-center"
            >
              ← Retreat
            </button>
          )}
        </div>

      </div>

      {/* ── CONTEXT MENU OVERLAY ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            key="ctx"
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.93 }}
            transition={{ duration: 0.1 }}
            className="fixed z-[100] select-none"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 260),
              top: contextMenu.kind === 'unit' && !(contextMenu as any).unit?.isPlayerControlled
                ? Math.min(contextMenu.y, window.innerHeight - 320)
                : contextMenu.kind === 'unit' || contextMenu.kind === 'portrait'
                  ? Math.max(contextMenu.y - 300, 56)
                  : Math.min(contextMenu.y, window.innerHeight - 150),
            }}
            onMouseDown={e => e.stopPropagation()}
          >
            {/* ─ UNIT context (portrait or 3D right-click) ─ */}
            {(contextMenu.kind === 'unit' || contextMenu.kind === 'portrait') && (() => {
              const u = (contextMenu as Extract<typeof contextMenu, { unit: TacticalUnit }>).unit;
              const isAlly = u.isPlayerControlled;
              const loadout = equippedSkills[u.id] || getDefaultSkillLoadout(u.characterId);
              const skills = ([1,2,3,4,5] as const)
                .map(s => loadout[s]).filter(Boolean)
                .map(id => getSkillById(id!)).filter(Boolean);
              return (
                <div className={cn(
                  "w-56 rounded-lg border overflow-hidden shadow-2xl backdrop-blur-md",
                  isAlly ? "bg-[#040c18]/96 border-blue-600/35" : "bg-[#140606]/96 border-red-700/35"
                )}>
                  {/* Header */}
                  <div className={cn("flex items-center gap-2 px-3 py-2 border-b", isAlly ? "border-blue-800/30 bg-blue-950/40" : "border-red-900/30 bg-red-950/40")}>
                    <div className="relative w-8 h-10 shrink-0 rounded overflow-hidden border border-white/10">
                      <img src={`${BASE}images/chars/${u.characterId}.png`} alt={u.name} className="absolute inset-0 w-full h-full object-cover object-top" onError={e => { (e.currentTarget as HTMLImageElement).style.opacity='0'; }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-[11px] font-bold text-white truncate">{u.name}</div>
                      <div className={cn("text-[9px] font-mono", isAlly ? "text-blue-400" : "text-red-400")}>
                        {isAlly ? "Ally" : "Enemy"} · HP {u.hp}/{u.maxHp}
                      </div>
                    </div>
                    <button onClick={() => setContextMenu(null)} className="text-white/25 hover:text-white/60 text-xs leading-none px-1">✕</button>
                  </div>
                  {/* HP + stats */}
                  <div className="px-3 pt-2 pb-1">
                    <div className="flex items-center gap-1.5 text-[9px] text-white/40 mb-2">
                      <span className="w-4">HP</span>
                      <div className="flex-1 h-2 bg-black/60 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", (u.hp/u.maxHp)>0.6?"bg-green-500":(u.hp/u.maxHp)>0.3?"bg-yellow-500":"bg-red-500")} style={{width:`${(u.hp/u.maxHp)*100}%`}} />
                      </div>
                      <span>{u.hp}/{u.maxHp}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 mb-2">
                      {([['ATK',u.attack],['DEF',u.defense],['MOV',u.move],['SPD',u.speed]] as [string,number][]).map(([k,v]) => (
                        <div key={k} className="text-center text-[8px] font-mono">
                          <div className="text-white/20">{k}</div>
                          <div className="text-white/60 font-bold">{v}</div>
                        </div>
                      ))}
                    </div>
                    {/* Skills list */}
                    {skills.length > 0 && (
                      <>
                        <div className="text-[8px] text-white/25 uppercase tracking-widest mb-1">Skills</div>
                        <div className="flex flex-col gap-0.5 mb-1">
                          {skills.slice(0,5).map(sk => sk && (
                            <div key={sk.id} className="flex items-center gap-1.5 text-[9px] py-0.5 border-b border-white/4">
                              <span className="text-sm leading-none">{sk.icon}</span>
                              <span className="text-white/55 flex-1 truncate">{sk.name}</span>
                              <span className="text-white/25 text-[8px] shrink-0">Rng {sk.range}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Action buttons */}
                  <div className="border-t border-white/8 flex flex-col">
                    <button className="px-3 py-1.5 text-[10px] text-left text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                      onClick={() => { const [wx,,wz]=tileToWorld(u.position.x,u.position.y,tileSize,0.5); setCameraFocus([wx,0,wz]); setContextMenu(null); }}>
                      📸 Focus Camera
                    </button>
                    <button className="px-3 py-1.5 text-[10px] text-left text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                      onClick={() => { const [wx,,wz]=tileToWorld(u.position.x,u.position.y,tileSize,0.5); setCameraFocus([wx,0,wz]); setCameraMode('third-person'); setContextMenu(null); }}>
                      👁 Third-Person View
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ─ MAP right-click: ping options ─ */}
            {contextMenu.kind === 'map' && (
              <div className="w-44 rounded-lg border border-white/10 overflow-hidden shadow-2xl bg-[#080810]/96 backdrop-blur-md">
                <div className="px-3 py-2 text-[9px] text-white/30 uppercase tracking-widest border-b border-white/8">
                  Place Marker
                </div>
                {([
                  { type: 'alert' as const, emoji: '⚠️', label: 'Alert — Caution', color: 'text-yellow-400' },
                  { type: 'danger' as const, emoji: '☠️', label: 'Danger — Enemy Here', color: 'text-red-400' },
                  { type: 'retreat' as const, emoji: '↩️', label: 'Retreat — Fall Back', color: 'text-blue-400' },
                ]).map(opt => (
                  <button key={opt.type}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-left hover:bg-white/5 transition-colors"
                    onClick={() => {
                      addPing((contextMenu as Extract<typeof contextMenu,{kind:'map'}>).tx, (contextMenu as Extract<typeof contextMenu,{kind:'map'}>).ty, opt.type);
                      setContextMenu(null);
                    }}>
                    <span className="text-base">{opt.emoji}</span>
                    <span className={opt.color}>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

