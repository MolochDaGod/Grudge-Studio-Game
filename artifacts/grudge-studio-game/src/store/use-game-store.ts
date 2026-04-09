import { create } from 'zustand';
import { Character } from '@workspace/api-client-react';
import { SkillSlot } from '@/lib/weapon-skills';

export interface TacticalUnit {
  id: string;
  characterId: string;
  name: string;
  race: string;
  role: string;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  attack: number;
  defense: number;
  speed: number;
  move: number;
  range: number;
  /** Equipped weapon type (e.g. 'sword', 'bow', 'greataxe'). Drives 3D model + animation selection. */
  weaponType: string;
  position: { x: number; y: number };
  /** 0=N, 1=E, 2=S, 3=W */
  facing: 0 | 1 | 2 | 3;
  isPlayerControlled: boolean;
  specialAbility: string;
  specialAbilityDescription: string;
  specialAbilityCooldown: number;
  /** Charge time 0–100; hits 100 → unit's turn */
  ct: number;
  faction: string;
  rarity: string;
  statusEffects: string[];
  statusDurations: Record<string, number>;
  /** Turns of immunity remaining per status type (prevents infinite stun-lock) */
  statusImmunities: Record<string, number>;
  hasMoved: boolean;
  hasActed: boolean;
}

export type ActionMode = 'idle' | 'move' | 'skill_1' | 'skill_2' | 'skill_3' | 'skill_4' | 'skill_5';

export interface GameState {
  phase: 'home' | 'squad-select' | 'battle' | 'result';
  allCharacters: Character[];
  playerSquad: string[];
  grid: (TacticalUnit | null)[][];
  units: TacticalUnit[];
  turnOrder: string[];
  currentUnitId: string | null;
  selectedTile: { x: number; y: number } | null;
  actionMode: ActionMode;
  reachableTiles: { x: number; y: number }[];
  attackableTiles: { x: number; y: number }[];
  combatLog: { id: number, text: string, type: 'damage' | 'heal' | 'buff' | 'debuff' | 'info' }[];
  battleResult: 'win' | 'loss' | 'fled' | null;
  score: number;
  totalWins: number;
  totalLosses: number;
  characterUsed: string;
  equippedSkills: Record<string, Record<SkillSlot, string>>;
  skillCooldowns: Record<string, Record<string, number>>;
  usedUltimates: Record<string, boolean>;
  currentLevelId: string;

  setPhase: (phase: GameState['phase']) => void;
  setAllCharacters: (characters: Character[]) => void;
  setPlayerSquad: (squadIds: string[]) => void;
  initBattle: (units: TacticalUnit[]) => void;
  setUnits: (units: TacticalUnit[]) => void;
  updateUnit: (id: string, updates: Partial<TacticalUnit>) => void;
  setCurrentUnitId: (id: string | null) => void;
  setTurnOrder: (order: string[]) => void;
  setSelectedTile: (tile: { x: number; y: number } | null) => void;
  setActionMode: (mode: ActionMode) => void;
  setReachableTiles: (tiles: { x: number; y: number }[]) => void;
  setAttackableTiles: (tiles: { x: number; y: number }[]) => void;
  addLog: (text: string, type?: 'damage' | 'heal' | 'buff' | 'debuff' | 'info') => void;
  setResult: (result: 'win' | 'loss' | 'fled', score: number, characterUsed: string) => void;
  setEquippedSkills: (unitId: string, loadout: Record<SkillSlot, string>) => void;
  setSkillCooldown: (unitId: string, skillId: string, turns: number) => void;
  tickSkillCooldowns: (unitId: string) => void;
  markUltimateUsed: (unitId: string) => void;
  applyStatus: (unitId: string, effect: string, duration: number) => void;
  tickStatusEffects: (unitId: string) => void;
  setCurrentLevelId: (id: string) => void;
  rotateFacing: (unitId: string, direction: 'cw' | 'ccw') => void;
  reset: () => void;
}

let logCounter = 0;

export const useGameStore = create<GameState>((set) => ({
  phase: 'home',
  allCharacters: [],
  playerSquad: [],
  grid: Array(8).fill(null).map(() => Array(6).fill(null)),
  units: [],
  turnOrder: [],
  currentUnitId: null,
  selectedTile: null,
  actionMode: 'idle',
  reachableTiles: [],
  attackableTiles: [],
  combatLog: [],
  battleResult: null,
  score: 0,
  totalWins: 0,
  totalLosses: 0,
  characterUsed: '',
  equippedSkills: {},
  skillCooldowns: {},
  usedUltimates: {},
  currentLevelId: 'ruins',

  setPhase: (phase) => set({ phase }),
  setAllCharacters: (characters) => set({ allCharacters: characters }),
  setPlayerSquad: (squadIds) => set({ playerSquad: squadIds }),
  
  initBattle: (units) => set({ 
    units, 
    phase: 'battle',
    combatLog: [{ id: logCounter++, text: 'Battle Begins!', type: 'info' }],
    battleResult: null,
    score: 0,
    currentUnitId: null,
    actionMode: 'idle',
    selectedTile: null,
    reachableTiles: [],
    attackableTiles: [],
    skillCooldowns: {},
    usedUltimates: {},
  }),

  setUnits: (units) => set({ units }),
  
  updateUnit: (id, updates) => set((state) => ({
    units: state.units.map(u => u.id === id ? { ...u, ...updates } : u)
  })),

  setCurrentUnitId: (id) => set({ currentUnitId: id }),
  setTurnOrder: (order) => set({ turnOrder: order }),
  setSelectedTile: (tile) => set({ selectedTile: tile }),
  setActionMode: (mode) => set({ actionMode: mode }),
  setReachableTiles: (tiles) => set({ reachableTiles: tiles }),
  setAttackableTiles: (tiles) => set({ attackableTiles: tiles }),
  
  addLog: (text, type = 'info') => set((state) => {
    const next = [...state.combatLog, { id: logCounter++, text, type }];
    return { combatLog: next.length > 50 ? next.slice(-50) : next };
  }),
  
  setResult: (result, score, characterUsed) => set({ battleResult: result, score, characterUsed, phase: 'result' }),

  setEquippedSkills: (unitId, loadout) => set((state) => ({
    equippedSkills: { ...state.equippedSkills, [unitId]: loadout }
  })),

  setSkillCooldown: (unitId, skillId, turns) => set((state) => ({
    skillCooldowns: {
      ...state.skillCooldowns,
      [unitId]: { ...(state.skillCooldowns[unitId] || {}), [skillId]: turns }
    }
  })),

  tickSkillCooldowns: (unitId) => set((state) => {
    const current = state.skillCooldowns[unitId] || {};
    const ticked: Record<string, number> = {};
    for (const [skillId, cd] of Object.entries(current)) {
      if (cd > 0) ticked[skillId] = cd - 1;
    }
    return { skillCooldowns: { ...state.skillCooldowns, [unitId]: ticked } };
  }),

  markUltimateUsed: (unitId) => set((state) => ({
    usedUltimates: { ...state.usedUltimates, [unitId]: true }
  })),

  applyStatus: (unitId, effect, duration) => set((state) => {
    const unit = state.units.find(u => u.id === unitId);
    if (!unit) return state;
    // Respect immunity — skip if unit has remaining immunity turns for this status
    const immune = (unit.statusImmunities ?? {})[effect];
    if (immune && immune > 0) return state;
    const newDurs = { ...unit.statusDurations, [effect]: duration };
    const effects = Array.from(new Set([...unit.statusEffects, effect]));
    return { units: state.units.map(u => u.id === unitId ? { ...u, statusEffects: effects, statusDurations: newDurs } : u) };
  }),

  tickStatusEffects: (unitId) => set((state) => {
    const unit = state.units.find(u => u.id === unitId);
    if (!unit) return state;
    const newDurs: Record<string, number> = {};
    const active: string[] = [];
    const newImmunities = { ...(unit.statusImmunities ?? {}) };
    for (const [effect, dur] of Object.entries(unit.statusDurations)) {
      if (dur > 1) { newDurs[effect] = dur - 1; active.push(effect); }
      else { newImmunities[effect] = 1; } // Grant 1-turn immunity on expiry
    }
    // Tick down existing immunities
    for (const key of Object.keys(newImmunities)) {
      if (!Object.prototype.hasOwnProperty.call(unit.statusDurations, key)) {
        newImmunities[key] = Math.max(0, (newImmunities[key] ?? 0) - 1);
      }
    }
    return { units: state.units.map(u => u.id === unitId ? { ...u, statusEffects: active, statusDurations: newDurs, statusImmunities: newImmunities } : u) };
  }),

  setCurrentLevelId: (id) => set({ currentLevelId: id }),

  rotateFacing: (unitId, direction) => set((state) => ({
    units: state.units.map(u => {
      if (u.id !== unitId) return u;
      const newFacing = ((u.facing + (direction === 'cw' ? 1 : 3)) % 4) as 0 | 1 | 2 | 3;
      return { ...u, facing: newFacing };
    })
  })),

  reset: () => set({ 
    playerSquad: [], 
    units: [], 
    battleResult: null, 
    score: 0, 
    characterUsed: '',
    phase: 'squad-select',
    combatLog: [],
    equippedSkills: {},
    skillCooldowns: {},
    usedUltimates: {},
  })
}));
