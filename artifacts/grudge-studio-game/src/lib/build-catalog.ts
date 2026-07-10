/**
 * RTS build catalog — structures placeable in deploy / command-post build mode.
 */
import { mapModelUrl } from './asset-config';

export interface BuildCatalogEntry {
  id: string;
  label: string;
  description: string;
  theme: string;
  modelFile: string;
  scale: number;
  blocksMovement?: boolean;
  /** Max placements per battle (0 = unlimited) */
  maxPerBattle: number;
  /** Structure HP (0 = indestructible decorative) */
  maxHp?: number;
  /** Auto-attack radius in tiles (watchtower) */
  attackRadius?: number;
  /** Damage per watchtower shot */
  attackDamage?: number;
}

export const BUILD_CATALOG: BuildCatalogEntry[] = [
  {
    id: 'watchtower',
    label: 'Watchtower',
    description: 'Auto-fires at enemies within 5 tiles. Barracks them on hit.',
    theme: 'medieval',
    modelFile: 'tower_01',
    scale: 0.013,
    blocksMovement: true,
    maxPerBattle: 2,
    maxHp: 75,
    attackRadius: 5,
    attackDamage: 14,
  },
  {
    id: 'barricade',
    label: 'Barricade',
    description: 'Half-cover wall segment',
    theme: 'medieval',
    modelFile: 'wall_1_full',
    scale: 0.010,
    blocksMovement: true,
    maxPerBattle: 4,
    maxHp: 50,
  },
  {
    id: 'brazier',
    label: 'Signal Brazier',
    description: 'Heals all units 5% HP at end of each turn',
    theme: 'orc',
    modelFile: 'brazier_01',
    scale: 0.008,
    maxPerBattle: 3,
    maxHp: 40,
  },
  {
    id: 'elf_tower',
    label: 'Elven Spire',
    description: 'Recall friendly units here (4-turn cooldown)',
    theme: 'elven',
    modelFile: 'tower_1',
    scale: 0.011,
    blocksMovement: true,
    maxPerBattle: 1,
    maxHp: 90,
  },
];

export function buildModelUrl(entry: BuildCatalogEntry): string {
  return mapModelUrl(entry.theme, entry.modelFile);
}

export function getBuildEntry(id: string): BuildCatalogEntry | undefined {
  return BUILD_CATALOG.find((e) => e.id === id);
}