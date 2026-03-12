import { create } from 'zustand';
import { Character } from '@workspace/api-client-react';

interface GameState {
  playerCharacter: Character | null;
  enemyCharacter: Character | null;
  lastResult: 'win' | 'loss' | 'fled' | null;
  score: number;
  
  setCharacters: (player: Character, enemy: Character) => void;
  setResult: (result: 'win' | 'loss' | 'fled', score: number) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  playerCharacter: null,
  enemyCharacter: null,
  lastResult: null,
  score: 0,
  
  setCharacters: (player, enemy) => set({ playerCharacter: player, enemyCharacter: enemy }),
  setResult: (result, score) => set({ lastResult: result, score }),
  reset: () => set({ playerCharacter: null, enemyCharacter: null, lastResult: null, score: 0 })
}));
