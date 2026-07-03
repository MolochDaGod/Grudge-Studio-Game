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
}

export const BUILD_CATALOG: BuildCatalogEntry[] = [
  {
    id: 'watchtower',
    label: 'Watchtower',
    description: 'Vision and cover at lane mouth',
    theme: 'medieval',
    modelFile: 'tower_01',
    scale: 0.018,
    blocksMovement: true,
    maxPerBattle: 2,
  },
  {
    id: 'barricade',
    label: 'Barricade',
    description: 'Half-cover wall segment',
    theme: 'medieval',
    modelFile: 'wall_1_full',
    scale: 0.014,
    blocksMovement: true,
    maxPerBattle: 4,
  },
  {
    id: 'brazier',
    label: 'Signal Brazier',
    description: 'Marks rally point on march path',
    theme: 'orc',
    modelFile: 'brazier_01',
    scale: 0.012,
    maxPerBattle: 3,
  },
  {
    id: 'elf_tower',
    label: 'Elven Spire',
    description: 'Back-line mage focus tower',
    theme: 'elven',
    modelFile: 'tower_1',
    scale: 0.016,
    blocksMovement: true,
    maxPerBattle: 1,
  },
];

export function buildModelUrl(entry: BuildCatalogEntry): string {
  return mapModelUrl(entry.theme, entry.modelFile);
}

export function getBuildEntry(id: string): BuildCatalogEntry | undefined {
  return BUILD_CATALOG.find((e) => e.id === id);
}