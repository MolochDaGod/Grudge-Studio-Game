/** Game API schemas for Realm of Grudges */

export interface Character {
  id: string;
  name: string;
  race: string;
  role: string;
  lore: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  specialAbility: string;
  specialAbilityDescription: string;
  weakness?: string;
  faction: string;
  rarity: string;
}

export interface LeaderboardEntry {
  id: number;
  playerName: string;
  score: number;
  wins: number;
  losses: number;
  characterUsed: string;
  createdAt: string;
}

export interface SubmitScoreBody {
  playerName: string;
  score: number;
  wins: number;
  losses: number;
  characterUsed: string;
}