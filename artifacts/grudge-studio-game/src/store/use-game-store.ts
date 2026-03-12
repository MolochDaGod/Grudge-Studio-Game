import { create } from 'zustand';
import { Character } from '@workspace/api-client-react';

export interface TacticalUnit {
  id: string;
  characterId: string;
  name: string;
  race: string;
  role: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  move: number;
  range: number;
  position: { x: number; y: number };
  isPlayerControlled: boolean;
  specialAbility: string;
  specialAbilityDescription: string;
  specialAbilityCooldown: number;
  ct: number;
  faction: string;
  rarity: string;
  statusEffects: string[];
  hasMoved: boolean;
  hasActed: boolean;
}

export interface GameState {
  phase: 'home' | 'squad-select' | 'battle' | 'result';
  allCharacters: Character[];
  playerSquad: string[]; // selected character IDs
  grid: (TacticalUnit | null)[][];
  units: TacticalUnit[];
  turnOrder: string[]; // unit IDs in turn order
  currentUnitId: string | null;
  selectedTile: { x: number; y: number } | null;
  actionMode: 'idle' | 'move' | 'attack' | 'ability';
  reachableTiles: { x: number; y: number }[];
  attackableTiles: { x: number; y: number }[];
  combatLog: { id: number, text: string, type: 'damage' | 'heal' | 'buff' | 'debuff' | 'info' }[];
  battleResult: 'win' | 'loss' | 'fled' | null;
  score: number;
  totalWins: number;
  totalLosses: number;
  characterUsed: string;

  setPhase: (phase: GameState['phase']) => void;
  setAllCharacters: (characters: Character[]) => void;
  setPlayerSquad: (squadIds: string[]) => void;
  initBattle: (units: TacticalUnit[]) => void;
  setUnits: (units: TacticalUnit[]) => void;
  updateUnit: (id: string, updates: Partial<TacticalUnit>) => void;
  setCurrentUnitId: (id: string | null) => void;
  setTurnOrder: (order: string[]) => void;
  setSelectedTile: (tile: { x: number; y: number } | null) => void;
  setActionMode: (mode: GameState['actionMode']) => void;
  setReachableTiles: (tiles: { x: number; y: number }[]) => void;
  setAttackableTiles: (tiles: { x: number; y: number }[]) => void;
  addLog: (text: string, type?: 'damage' | 'heal' | 'buff' | 'debuff' | 'info') => void;
  setResult: (result: 'win' | 'loss' | 'fled', score: number, characterUsed: string) => void;
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
    attackableTiles: []
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
  
  addLog: (text, type = 'info') => set((state) => ({ 
    combatLog: [...state.combatLog, { id: logCounter++, text, type }]
  })),
  
  setResult: (result, score, characterUsed) => set({ battleResult: result, score, characterUsed, phase: 'result' }),
  
  reset: () => set({ 
    playerSquad: [], 
    units: [], 
    battleResult: null, 
    score: 0, 
    characterUsed: '',
    phase: 'squad-select',
    combatLog: []
  })
}));
