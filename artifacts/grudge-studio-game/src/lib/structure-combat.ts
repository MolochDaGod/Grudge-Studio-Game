/**
 * Tactical structure combat — watchtower, signal brazier, elven spire.
 */
import type { BuildPlacement } from './lane-deploy';
import type { BuildCatalogEntry } from './build-catalog';
import { getBuildEntry } from './build-catalog';
import type { TacticalUnit } from '@/store/use-game-store';

export interface TacticalStructure {
  id: string;
  catalogId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  ownerIsPlayer: boolean;
}

export type TrapModelId = 'bear_trap' | 'spike_trap';

export interface TrapTile {
  id: string;
  x: number;
  y: number;
  ownerUnitId: string;
  damage: number;
  applyStatus?: string;
  statusDuration?: number;
  turnsLeft: number;
  trapModel?: TrapModelId;
}

export function tileDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function initStructuresFromBuilds(
  builds: BuildPlacement[],
  ownerIsPlayer = true,
): TacticalStructure[] {
  return builds
    .map((b) => {
      const entry = getBuildEntry(b.catalogId);
      if (!entry?.maxHp) return null;
      return {
        id: b.id,
        catalogId: b.catalogId,
        x: b.x,
        y: b.y,
        hp: entry.maxHp,
        maxHp: entry.maxHp,
        ownerIsPlayer,
      };
    })
    .filter((s): s is TacticalStructure => s !== null);
}

export function structuresOfType(
  structures: TacticalStructure[],
  catalogId: string,
): TacticalStructure[] {
  return structures.filter((s) => s.catalogId === catalogId && s.hp > 0);
}

export function findElfSpire(structures: TacticalStructure[]): TacticalStructure | undefined {
  return structuresOfType(structures, 'elf_tower')[0];
}

/** Watchtower fires when an enemy enters its attack radius during movement. */
export function watchtowersThreateningTile(
  structures: TacticalStructure[],
  catalog: BuildCatalogEntry[],
  tile: { x: number; y: number },
  enemyIsPlayer: boolean,
): TacticalStructure[] {
  return structures.filter((s) => {
    if (s.catalogId !== 'watchtower' || s.hp <= 0) return false;
    if (s.ownerIsPlayer === enemyIsPlayer) return false;
    const entry = catalog.find((c) => c.id === 'watchtower');
    const radius = entry?.attackRadius ?? 5;
    return tileDistance(s, tile) <= radius;
  });
}

export function applyStructureDamage(
  structures: TacticalStructure[],
  structureId: string,
  damage: number,
): TacticalStructure[] {
  return structures.map((s) => {
    if (s.id !== structureId) return s;
    return { ...s, hp: Math.max(0, s.hp - damage) };
  });
}

export function brazierHealAmount(maxHp: number, pct = 0.05): number {
  return Math.max(1, Math.floor(maxHp * pct));
}

export const RECALL_COOLDOWN_TURNS = 4;

export function structureFromPlacement(
  b: BuildPlacement,
  ownerIsPlayer = true,
): TacticalStructure | null {
  const entry = getBuildEntry(b.catalogId);
  if (!entry?.maxHp) return null;
  return {
    id: b.id,
    catalogId: b.catalogId,
    x: b.x,
    y: b.y,
    hp: entry.maxHp,
    maxHp: entry.maxHp,
    ownerIsPlayer,
  };
}

export function findTrapAt(
  traps: TrapTile[],
  tile: { x: number; y: number },
): TrapTile | undefined {
  return traps.find((t) => t.x === tile.x && t.y === tile.y);
}