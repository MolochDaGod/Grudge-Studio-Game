/**
 * Asset & CDN Configuration — Grudge Studio Game
 *
 * Two resolution modes:
 *   - CDN (assets.grudge-studio.com R2) — production, fast global edge cache
 *   - Local (import.meta.env.BASE_URL) — dev server, offline fallback
 *
 * All asset references should go through these helpers so we can swap
 * between local dev and CDN production with a single env-var flip.
 */

// ── Base URLs ────────────────────────────────────────────────────────────────

/** R2 CDN for all binary assets (GLBs, textures, images, audio) */
export const ASSET_CDN_BASE: string =
  import.meta.env.VITE_ASSET_CDN_URL ?? 'https://assets.grudge-studio.com';

/** Local Vite dev-server base */
export const LOCAL_BASE: string = import.meta.env.BASE_URL;

/** Cloudflare Pages — JSON game data only (weapons, armor, classes) */
export const OBJECT_STORE_API: string =
  import.meta.env.VITE_OBJECT_STORE_URL ??
  'https://grudge-objectstore.pages.dev/api/v1';

/**
 * When true, all asset helpers resolve to CDN instead of local paths.
 * Disabled by default until CORS is configured on R2 (assets.grudge-studio.com).
 * Enable by setting VITE_USE_CDN=true in your .env or Vercel env vars.
 */
export const USE_CDN: boolean =
  import.meta.env.VITE_USE_CDN === 'true';

// ── Path Helpers ─────────────────────────────────────────────────────────────

function clean(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Resolve to CDN (prod) or local (dev).
 * @example assetUrl('/models/characters/orc.glb')
 */
export function assetUrl(path: string): string {
  return USE_CDN
    ? `${ASSET_CDN_BASE}${clean(path)}`
    : `${LOCAL_BASE}${path.replace(/^\//, '')}`;
}

/** Always resolve to local BASE_URL (e.g. for bundled public/ files) */
export function localUrl(path: string): string {
  return `${LOCAL_BASE}${path.replace(/^\//, '')}`;
}

/** Shorthand for character model GLBs */
export function characterModelUrl(id: string): string {
  return assetUrl(`/models/characters/${id}.glb`);
}

/** Shorthand for weapon model GLBs */
export function weaponModelUrl(id: string): string {
  return assetUrl(`/models/weapons/${id}.glb`);
}

/** Shorthand for map prop GLBs */
export function mapModelUrl(theme: string, file: string): string {
  return assetUrl(`/models/maps/${theme}/${file}.glb`);
}

/** Shorthand for texture images (PNGs under models/) */
export function textureAssetUrl(path: string): string {
  return assetUrl(`/${path}`);
}

/** Shorthand for UI images */
export function uiImageUrl(path: string): string {
  return localUrl(`images/ui/${path}`);
}

/** Shorthand for character portrait images */
export function portraitUrl(characterId: string): string {
  return localUrl(`images/chars/${characterId}.png`);
}

/**
 * ObjectStore JSON API URL.
 * @example apiUrl('/weapons.json')
 */
export function apiUrl(endpoint: string): string {
  return `${OBJECT_STORE_API}${clean(endpoint)}`;
}
