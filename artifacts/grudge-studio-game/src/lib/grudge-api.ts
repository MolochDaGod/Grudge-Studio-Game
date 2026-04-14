/**
 * Grudge Backend API Client
 * Connects to the live Grudge Studio backend services:
 *   - id.grudge-studio.com       (auth / identity)
 *   - api.grudge-studio.com      (game API)
 *   - account.grudge-studio.com  (profiles / social)
 *   - objectstore.grudge-studio.com (game data / weapon skills / assets)
 * All URLs configurable via VITE_ env vars (see .env.example).
 */

const GRUDGE_ID_URL      = import.meta.env.VITE_AUTH_URL        || 'https://id.grudge-studio.com';
const GRUDGE_GAME_API    = import.meta.env.VITE_API_URL         || 'https://api.grudge-studio.com';
const GRUDGE_ACCOUNT_URL = import.meta.env.VITE_ACCOUNT_URL     || 'https://account.grudge-studio.com';
const OBJECTSTORE_WORKER = import.meta.env.VITE_OBJECTSTORE_URL || 'https://objectstore.grudge-studio.com';
const OBJECTSTORE_PAGES  = 'https://molochdagod.github.io/ObjectStore/api/v1';

// ── Token management (persisted to localStorage for session survival) ────────

const TOKEN_KEY = 'grudge_auth_token';

let _token: string | null = (() => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
})();

export function getToken(): string | null { return _token; }
export function setToken(token: string | null) {
  _token = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage unavailable */ }
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_token) h['Authorization'] = `Bearer ${_token}`;
  return h;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthResult {
  token: string;
  grudge_id: string;
  wallet?: string;
  display_name?: string;
  roles?: string[];
}

/** Discord OAuth — redirect browser to this URL, callback returns JWT */
export function getDiscordOAuthUrl(redirectUri?: string): string {
  const rd = redirectUri ?? window.location.origin + '/login';
  return `${GRUDGE_ID_URL}/auth/discord?return=${encodeURIComponent(rd)}`;
}

/** Wallet login (Solana/Web3Auth) */
export async function loginWithWallet(idToken: string, wallet: string): Promise<AuthResult> {
  const result = await apiFetch<AuthResult>(`${GRUDGE_ID_URL}/auth/wallet`, {
    method: 'POST',
    body: JSON.stringify({ idToken, wallet }),
  });
  setToken(result.token);
  return result;
}

/** Discord code exchange */
export async function loginWithDiscordCode(code: string): Promise<AuthResult> {
  const result = await apiFetch<AuthResult>(`${GRUDGE_ID_URL}/auth/discord`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  setToken(result.token);
  return result;
}

/** Guest login — creates an anonymous session */
export async function loginAsGuestBackend(): Promise<AuthResult> {
  const result = await apiFetch<AuthResult>(`${GRUDGE_ID_URL}/auth/guest`, {
    method: 'POST',
  });
  setToken(result.token);
  return result;
}

/** Puter bridge auth */
export async function loginWithPuterBridge(puterSession: string): Promise<AuthResult> {
  const result = await apiFetch<AuthResult>(`${GRUDGE_ID_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ provider: 'puter', session: puterSession }),
  });
  setToken(result.token);
  return result;
}

/** Verify current JWT */
export async function verifyToken(): Promise<AuthResult | null> {
  if (!_token) return null;
  try {
    return await apiFetch<AuthResult>(`${GRUDGE_ID_URL}/auth/verify`, {
      method: 'POST',
    });
  } catch {
    setToken(null);
    return null;
  }
}

/** Get current identity profile */
export async function getIdentityProfile(): Promise<{ grudge_id: string; display_name: string; roles: string[] } | null> {
  try {
    return await apiFetch(`${GRUDGE_ID_URL}/identity/me`);
  } catch {
    return null;
  }
}

export function logout() {
  setToken(null);
}

// ── Characters ───────────────────────────────────────────────────────────────

export interface GrudgeCharacter {
  id: number;
  grudge_id: string;
  name: string;
  race: string;
  class: string;
  level: number;
  gold: number;
  stats: Record<string, number>;
}

export async function getMyCharacters(): Promise<GrudgeCharacter[]> {
  return apiFetch(`${GRUDGE_GAME_API}/characters`);
}

export async function createCharacter(name: string, race: string, charClass: string): Promise<GrudgeCharacter> {
  return apiFetch(`${GRUDGE_GAME_API}/characters`, {
    method: 'POST',
    body: JSON.stringify({ name, race, class: charClass }),
  });
}

// ── Teams / Crews ────────────────────────────────────────────────────────────

export interface GrudgeCrew {
  id: number;
  name: string;
  members: Array<{
    characterId: string;
    equippedSkills?: Record<number, string>;
    position?: { x: number; y: number };
  }>;
  created_at: string;
}

export async function getMyCrew(): Promise<GrudgeCrew | null> {
  try {
    return await apiFetch(`${GRUDGE_GAME_API}/crews`);
  } catch {
    return null;
  }
}

export async function createCrew(name: string, memberIds: string[]): Promise<GrudgeCrew> {
  return apiFetch(`${GRUDGE_GAME_API}/crews/create`, {
    method: 'POST',
    body: JSON.stringify({ name, members: memberIds }),
  });
}

export async function updateCrewMembers(
  crewId: number,
  members: GrudgeCrew['members'],
): Promise<GrudgeCrew> {
  return apiFetch(`${GRUDGE_GAME_API}/crews/${crewId}`, {
    method: 'PATCH',
    body: JSON.stringify({ members }),
  });
}

// ── Combat / Leaderboard ─────────────────────────────────────────────────────

export interface CombatResult {
  id: number;
  winner_id: string;
  outcome: string;
}

export async function submitCombatLog(data: {
  attacker_id: string;
  defender_id: string;
  outcome: 'win' | 'loss';
  combat_data: Record<string, unknown>;
}): Promise<CombatResult> {
  return apiFetch(`${GRUDGE_GAME_API}/combat/log`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface LeaderboardEntry {
  grudge_id: string;
  name: string;
  kills: number;
  deaths: number;
  elo?: number;
}

export async function getLeaderboard(limit = 25): Promise<LeaderboardEntry[]> {
  return apiFetch(`${GRUDGE_GAME_API}/combat/leaderboard?limit=${limit}`);
}

// ── Economy ──────────────────────────────────────────────────────────────────

export async function getBalance(charId: string): Promise<{ gold: number }> {
  return apiFetch(`${GRUDGE_GAME_API}/economy/balance?char_id=${charId}`);
}

// ── Map saves ────────────────────────────────────────────────────────────────

export interface MapSave {
  levelId: string;
  data: Record<string, unknown>;
  updatedAt: string;
}

export async function saveMapEdits(levelId: string, data: Record<string, unknown>): Promise<MapSave> {
  return apiFetch(`${GRUDGE_ACCOUNT_URL}/maps/save`, {
    method: 'POST',
    body: JSON.stringify({ levelId, data }),
  });
}

export async function loadMapEdits(levelId: string): Promise<MapSave | null> {
  try {
    return await apiFetch(`${GRUDGE_ACCOUNT_URL}/maps/${levelId}`);
  } catch {
    return null;
  }
}

// ── Profile / Skill loadouts ─────────────────────────────────────────────────

export async function saveSkillLoadout(
  characterId: string,
  loadout: Record<number, string>,
): Promise<void> {
  await apiFetch(`${GRUDGE_ACCOUNT_URL}/profile/skill-loadout`, {
    method: 'POST',
    body: JSON.stringify({ characterId, loadout }),
  });
}

export async function getSkillLoadout(
  characterId: string,
): Promise<Record<number, string> | null> {
  try {
    return await apiFetch(`${GRUDGE_ACCOUNT_URL}/profile/skill-loadout?characterId=${characterId}`);
  } catch {
    return null;
  }
}

// ── ObjectStore Game Data ────────────────────────────────────────────────────
// Fetches canonical game data from the ObjectStore Worker (production API)
// with GitHub Pages fallback for static JSON.

const _osCache = new Map<string, { data: unknown; at: number }>();
const _OS_TTL = 10 * 60 * 1000; // 10 min

async function fetchObjectStore<T>(workerPath: string, pagesFile: string): Promise<T | null> {
  const cached = _osCache.get(workerPath);
  if (cached && Date.now() - cached.at < _OS_TTL) return cached.data as T;

  // Try Worker first (fast, has filtering + caching)
  try {
    const res = await fetch(`${OBJECTSTORE_WORKER}${workerPath}`);
    if (res.ok) {
      const data = await res.json() as T;
      _osCache.set(workerPath, { data, at: Date.now() });
      return data;
    }
  } catch { /* fall through */ }

  // Fallback to GitHub Pages
  try {
    const res = await fetch(`${OBJECTSTORE_PAGES}/${pagesFile}`);
    if (res.ok) {
      const data = await res.json() as T;
      _osCache.set(workerPath, { data, at: Date.now() });
      return data;
    }
  } catch { /* fall through */ }

  return (cached?.data as T) ?? null;
}

/** Fetch all weapon skills (17 types, 207 skills with cast times, projectiles, physics) */
export function fetchWeaponSkills() {
  return fetchObjectStore<Record<string, unknown>>('/v1/weapon-skills', 'weaponSkills.json');
}

/** Fetch weapon skill tree for a specific weapon type */
export function fetchWeaponSkillTree(weaponType: string) {
  return fetchObjectStore<Record<string, unknown>>(`/v1/weapon-skills/${weaponType}`, 'weaponSkills.json');
}

/** Fetch weapon types available for a class */
export function fetchClassWeapons(className: string) {
  return fetchObjectStore<Record<string, unknown>>(`/v1/weapon-skills/class/${className}`, 'weaponSkills.json');
}

/** Fetch any game data collection (weapons, armor, enemies, etc.) */
export function fetchGameData(collection: string) {
  return fetchObjectStore<Record<string, unknown>>(`/v1/game-data/${collection}`, `${collection}.json`);
}

/** Fetch enemies data */
export function fetchEnemies() {
  return fetchGameData('enemies');
}

/** Fetch classes data */
export function fetchClasses() {
  return fetchGameData('classes');
}

/** Fetch races data */
export function fetchRaces() {
  return fetchGameData('races');
}

/** List all available game data collections */
export function fetchGameDataCollections() {
  return fetchObjectStore<{ count: number; collections: Array<{ name: string; url: string }> }>('/v1/game-data', '');
}

/** Prefetch core game data into cache */
export async function prefetchGameData(): Promise<void> {
  await Promise.allSettled([
    fetchWeaponSkills(),
    fetchGameData('weapons'),
    fetchGameData('classes'),
    fetchGameData('races'),
    fetchGameData('enemies'),
  ]);
  console.log('[ObjectStore] Game data prefetched');
}
