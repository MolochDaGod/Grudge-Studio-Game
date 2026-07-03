/**
 * Toon RTS race asset presets — mirrors grudge-game loadoutPreset with fixed URLs.
 *
 * Root cause fix: paths must resolve under the Vite base (/game/) or CDN.
 * Absolute `/assets/...` without the base prefix 404 on Vercel.
 */
import { ASSET_CDN_BASE } from '@/lib/asset-config';
import type { RaceId } from '@/lib/toon-rts-registry';

export interface RaceAssetPreset {
  id: RaceId;
  name: string;
  abbr: string;
  color: string;
  modelUrl: string;
  textureUrl: string;
}

/** grudge6 race FBX on assets.grudge-studio.com CDN */
function grudge6RaceAsset(prefix: string, localFolder: string, _modelFile: string, textureFile: string): {
  modelUrl: string;
  textureUrl: string;
} {
  const cdnModel = `${ASSET_CDN_BASE}/models/grudge6/races/${prefix}_Characters.fbx`;
  const cdnTexture = `${ASSET_CDN_BASE}/assets/${localFolder}/textures/${textureFile}`;
  return {
    modelUrl: cdnModel,
    textureUrl: cdnTexture,
  };
}

export const RACE_ASSET_PRESETS: Record<RaceId, RaceAssetPreset> = {
  barbarians: {
    id: 'barbarians',
    name: 'Barbarians',
    abbr: 'BRB',
    color: '#c2410c',
    ...grudge6RaceAsset('BRB', 'barbarians', 'BRB_Characters_customizable.FBX', 'BRB_StandardUnits_texture.webp'),
  },
  dwarves: {
    id: 'dwarves',
    name: 'Dwarves',
    abbr: 'DWF',
    color: '#b45309',
    ...grudge6RaceAsset('DWF', 'dwarves', 'DWF_Characters_customizable.FBX', 'DWF_Standard_Units.webp'),
  },
  elves: {
    id: 'elves',
    name: 'High Elves',
    abbr: 'ELF',
    color: '#0891b2',
    ...grudge6RaceAsset('ELF', 'elves', 'ELF_Characters_customizable.FBX', 'ELF_HighElves_Texture.webp'),
  },
  orcs: {
    id: 'orcs',
    name: 'Orcs',
    abbr: 'ORC',
    color: '#15803d',
    ...grudge6RaceAsset('ORC', 'orcs', 'ORC_Characters_Customizable.FBX', 'ORC_StandardUnits.webp'),
  },
  undead: {
    id: 'undead',
    name: 'Undead',
    abbr: 'UD',
    color: '#7c3aed',
    ...grudge6RaceAsset('UD', 'undead', 'UD_Characters_customizable.FBX', 'UD_Standard_Units.webp'),
  },
  'western-kingdoms': {
    id: 'western-kingdoms',
    name: 'W. Kingdoms',
    abbr: 'WK',
    color: '#1d4ed8',
    ...grudge6RaceAsset('WK', 'western-kingdoms', 'WK_Characters_customizable.FBX', 'WK_Standard_Units.webp'),
  },
};

export const RACE_IDS = Object.keys(RACE_ASSET_PRESETS) as RaceId[];