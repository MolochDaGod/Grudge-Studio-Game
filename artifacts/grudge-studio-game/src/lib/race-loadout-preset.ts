/**
 * Toon RTS race asset presets — mirrors grudge-game loadoutPreset with fixed URLs.
 *
 * Root cause fix: paths must resolve under the Vite base (/game/) or CDN.
 * Absolute `/assets/...` without the base prefix 404 on Vercel.
 */
import { assetUrl } from '@/lib/asset-config';
import type { RaceId } from '@/lib/toon-rts-registry';

export interface RaceAssetPreset {
  id: RaceId;
  name: string;
  abbr: string;
  color: string;
  modelUrl: string;
  textureUrl: string;
}

function raceAsset(raceFolder: string, modelFile: string, textureFile: string): {
  modelUrl: string;
  textureUrl: string;
} {
  return {
    modelUrl: assetUrl(`/assets/${raceFolder}/models/characters/${modelFile}`),
    textureUrl: assetUrl(`/assets/${raceFolder}/textures/${textureFile}`),
  };
}

export const RACE_ASSET_PRESETS: Record<RaceId, RaceAssetPreset> = {
  barbarians: {
    id: 'barbarians',
    name: 'Barbarians',
    abbr: 'BRB',
    color: '#c2410c',
    ...raceAsset('barbarians', 'BRB_Characters_customizable.FBX', 'BRB_StandardUnits_texture.webp'),
  },
  dwarves: {
    id: 'dwarves',
    name: 'Dwarves',
    abbr: 'DWF',
    color: '#b45309',
    ...raceAsset('dwarves', 'DWF_Characters_customizable.FBX', 'DWF_Standard_Units.webp'),
  },
  elves: {
    id: 'elves',
    name: 'High Elves',
    abbr: 'ELF',
    color: '#0891b2',
    ...raceAsset('elves', 'ELF_Characters_customizable.FBX', 'ELF_HighElves_Texture.webp'),
  },
  orcs: {
    id: 'orcs',
    name: 'Orcs',
    abbr: 'ORC',
    color: '#15803d',
    ...raceAsset('orcs', 'ORC_Characters_Customizable.FBX', 'ORC_StandardUnits.webp'),
  },
  undead: {
    id: 'undead',
    name: 'Undead',
    abbr: 'UD',
    color: '#7c3aed',
    ...raceAsset('undead', 'UD_Characters_customizable.FBX', 'UD_Standard_Units.webp'),
  },
  'western-kingdoms': {
    id: 'western-kingdoms',
    name: 'W. Kingdoms',
    abbr: 'WK',
    color: '#1d4ed8',
    ...raceAsset('western-kingdoms', 'WK_Characters_customizable.FBX', 'WK_Standard_Units.webp'),
  },
};

export const RACE_IDS = Object.keys(RACE_ASSET_PRESETS) as RaceId[];