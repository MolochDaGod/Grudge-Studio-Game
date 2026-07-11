/**
 * Local battle GLBs — towers, traps, projectiles, shield VFX.
 */
import { assetUrl, cdnProxyUrl, ASSET_CDN_BASE } from './asset-config';

/** Large / CDN-only assets — always via R2 proxy (not bundled in git). */
function cdnBattleUrl(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined') return cdnProxyUrl(clean);
  return `${ASSET_CDN_BASE}${clean}`;
}
import type { TrapModelId } from './structure-combat';

export type { TrapModelId };

export const BATTLE_ASSETS = {
  archerTower: assetUrl('/models/battle/archer_tower.glb'),
  bearTrap: assetUrl('/models/battle/bear_trap.glb'),
  spikeTrap: assetUrl('/models/battle/spike_trap.glb'),
  shieldMagic: assetUrl('/models/battle/shield_magic.glb'),
  shieldRound: assetUrl('/models/battle/shield_round.glb'),
  iceShard: cdnBattleUrl('/models/battle/ice_shard.glb'),
} as const;

export function battleAssetUrl(id: keyof typeof BATTLE_ASSETS): string {
  return BATTLE_ASSETS[id];
}

export function trapModelForSkill(skillId: string): TrapModelId {
  if (skillId === 'cls_arcane_trap') return 'spike_trap';
  return 'bear_trap';
}

export function trapModelUrl(model: TrapModelId): string {
  return model === 'spike_trap' ? BATTLE_ASSETS.spikeTrap : BATTLE_ASSETS.bearTrap;
}

export function shieldAssetForRole(role: string): keyof typeof BATTLE_ASSETS {
  return role === 'Mage' ? 'shieldMagic' : 'shieldRound';
}

/** Preload all battle GLBs (call from battle loading screen). */
export const BATTLE_ASSET_URLS = Object.values(BATTLE_ASSETS);