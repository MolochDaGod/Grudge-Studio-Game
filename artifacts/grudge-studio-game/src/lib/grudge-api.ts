/**
 * Grudge Backend API Client — fleet SSOT
 *
 * Auth:   id.grudge-studio.com  (browser login; same-origin /api/auth/* proxy)
 * Game:   Railway Postgres via same-origin /api/*  → grudge-api-production
 * Data:   objectstore.grudge-studio.com
 * Assets: assets.grudge-studio.com
 *
 * Never use dead api.grudge-studio.com as character SSOT.
 */

// ── Fleet bases ──────────────────────────────────────────────────────────────

/** Public Grudge ID gateway (browser redirects only). */
export const GRUDGE_ID_URL =
  import.meta.env.VITE_AUTH_URL || "https://id.grudge-studio.com";

/**
 * Game API base. Prefer same-origin `/api` so Vercel rewrites hit Railway.
 * Override with full Railway origin for local dev without proxy:
 *   VITE_API_URL=https://grudge-api-production-0d46.up.railway.app/api
 */
export const GRUDGE_GAME_API = (
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? "/api" : "https://grudge-api-production-0d46.up.railway.app/api")
).replace(/\/$/, "");

/** @deprecated account.* is not a reliable host — account data is Railway /api/account */
export const GRUDGE_ACCOUNT_URL =
  import.meta.env.VITE_ACCOUNT_URL || GRUDGE_GAME_API;

const OBJECTSTORE_WORKER =
  import.meta.env.VITE_OBJECTSTORE_URL || "https://objectstore.grudge-studio.com";
const OBJECTSTORE_PAGES = "https://molochdagod.github.io/ObjectStore/api/v1";

const RAILWAY_DIRECT =
  import.meta.env.VITE_RAILWAY_API_URL ||
  "https://grudge-api-production-0d46.up.railway.app";

// ── Token keys (fleet-compatible) ────────────────────────────────────────────

export const FLEET_AUTH_TOKEN_KEYS = [
  "grudge_auth_token",
  "grudge_session_token",
  "grudge.token",
  "sso_token",
  "grudge_token",
] as const;

const TOKEN_KEY = "grudge_auth_token";

function readStoredToken(): string | null {
  try {
    for (const k of FLEET_AUTH_TOKEN_KEYS) {
      const v = localStorage.getItem(k);
      if (v) return v;
    }
  } catch {
    /* */
  }
  return null;
}

let _token: string | null = (() => {
  if (typeof window === "undefined") return null;
  return readStoredToken();
})();

export function getToken(): string | null {
  return _token;
}

export function setToken(token: string | null) {
  _token = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      // mirror for cross-app fleet readers
      localStorage.setItem("grudge_session_token", token);
      localStorage.setItem("sso_token", token);
    } else {
      for (const k of FLEET_AUTH_TOKEN_KEYS) localStorage.removeItem(k);
    }
  } catch {
    /* storage unavailable */
  }
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (_token) h["Authorization"] = `Bearer ${_token}`;
  return h;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body.slice(0, 400)}`);
  }
  // Some health endpoints return empty
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

// ── Auth result ──────────────────────────────────────────────────────────────

export interface AuthResult {
  token: string;
  grudge_id: string;
  wallet?: string;
  display_name?: string;
  roles?: string[];
  account_id?: string;
}

function normalizeAuthPayload(raw: Record<string, unknown>, fallbackToken?: string | null): AuthResult {
  const token = String(
    raw.token ?? raw.accessToken ?? raw.jwt ?? fallbackToken ?? _token ?? "",
  );
  const grudgeId = String(
    raw.grudge_id ?? raw.grudgeId ?? raw.userId ?? raw.id ?? raw.username ?? "unknown",
  );
  const display =
    raw.display_name ?? raw.displayName ?? raw.username ?? grudgeId;
  return {
    token,
    grudge_id: grudgeId,
    wallet: raw.wallet ? String(raw.wallet) : raw.walletAddress ? String(raw.walletAddress) : undefined,
    display_name: String(display),
    roles: Array.isArray(raw.roles) ? (raw.roles as string[]) : undefined,
    account_id: raw.accountId ? String(raw.accountId) : raw.account_id ? String(raw.account_id) : undefined,
  };
}

// ── Login URL builders (id.grudge-studio.com) ────────────────────────────────

/** Callback path under Vite base (`/game/auth/callback`). */
export function getAuthCallbackUrl(): string {
  const base = (import.meta.env.BASE_URL || "/game/").replace(/\/?$/, "/");
  const origin = typeof window !== "undefined" ? window.location.origin : "https://game.grudge-studio.com";
  return `${origin}${base}auth/callback`;
}

/** Canonical Grudge ID browser login. */
export function getGrudgeIdLoginUrl(redirectUri?: string): string {
  const rd = redirectUri ?? getAuthCallbackUrl();
  return `${GRUDGE_ID_URL.replace(/\/$/, "")}/login?redirect_uri=${encodeURIComponent(rd)}`;
}

/** @deprecated Discord direct OAuth — prefer getGrudgeIdLoginUrl (ID hub owns providers). */
export function getDiscordOAuthUrl(redirectUri?: string): string {
  // Route through Grudge ID so Discord lands on fleet JWT
  return getGrudgeIdLoginUrl(redirectUri);
}

/** Start browser SSO to id.grudge-studio.com */
export function redirectToGrudgeIdLogin(redirectUri?: string): void {
  window.location.href = getGrudgeIdLoginUrl(redirectUri);
}

// ── SSO token pickup ─────────────────────────────────────────────────────────

const RETURN_PARAMS = [
  "grudge_token",
  "sso_token",
  "token",
  "grudge_id",
  "grudgeId",
  "grudge_username",
  "username",
  "provider",
] as const;

/**
 * Consume ?grudge_token= / ?sso_token= / hash tokens from ID redirect.
 * Call as early as possible (App boot).
 */
export function consumeFleetSsoParams(): { token: string | null; grudgeId: string | null } {
  if (typeof window === "undefined") return { token: null, grudgeId: null };

  let token: string | null = null;
  let grudgeId: string | null = null;

  try {
    const params = new URLSearchParams(window.location.search);
    // also parse hash query (#grudge_token=...)
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hash.includes("=") ? hash : "");

    for (const key of ["grudge_token", "sso_token", "token"] as const) {
      const v = params.get(key) || hashParams.get(key);
      if (v) {
        token = v;
        break;
      }
    }
    grudgeId =
      params.get("grudge_id") ||
      params.get("grudgeId") ||
      hashParams.get("grudge_id") ||
      hashParams.get("grudgeId");

    if (token) {
      setToken(token);
      if (grudgeId) {
        try {
          localStorage.setItem("grudge_id", grudgeId);
          localStorage.setItem("grudge_username", grudgeId);
        } catch {
          /* */
        }
      }
      // strip sensitive params from URL
      for (const k of RETURN_PARAMS) {
        params.delete(k);
        hashParams.delete(k);
      }
      const qs = params.toString();
      const h = hashParams.toString();
      const clean =
        window.location.pathname +
        (qs ? `?${qs}` : "") +
        (h ? `#${h}` : "");
      window.history.replaceState(null, "", clean);
    }
  } catch {
    /* */
  }

  return { token, grudgeId };
}

/** Optional bridge: exchange launch token for Railway JWT if needed. */
export async function bridgeLaunchToken(launchToken: string): Promise<AuthResult | null> {
  const paths = [
    `${GRUDGE_GAME_API}/auth/grudge-bridge`,
    `${GRUDGE_GAME_API}/auth/session/exchange`,
    `${RAILWAY_DIRECT}/api/auth/grudge-bridge`,
  ];
  for (const path of paths) {
    try {
      const res = await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: launchToken, audience: window.location.origin }),
      });
      if (!res.ok) continue;
      const raw = (await res.json()) as Record<string, unknown>;
      const result = normalizeAuthPayload(raw, launchToken);
      if (result.token) setToken(result.token);
      return result;
    } catch {
      /* try next */
    }
  }
  // Fall back to treating launch token as JWT
  setToken(launchToken);
  return verifyToken();
}

// ── Auth API ─────────────────────────────────────────────────────────────────

/** Wallet login (Solana/Web3Auth) via Railway */
export async function loginWithWallet(idToken: string, wallet: string): Promise<AuthResult> {
  const result = await apiFetch<Record<string, unknown>>(`${GRUDGE_GAME_API}/auth/wallet`, {
    method: "POST",
    body: JSON.stringify({ idToken, wallet }),
  });
  const auth = normalizeAuthPayload(result);
  setToken(auth.token);
  return auth;
}

/** @deprecated Prefer redirectToGrudgeIdLogin — ID hub owns Discord OAuth. */
export async function loginWithDiscordCode(code: string): Promise<AuthResult> {
  const result = await apiFetch<Record<string, unknown>>(`${GRUDGE_GAME_API}/auth/discord`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  const auth = normalizeAuthPayload(result);
  setToken(auth.token);
  return auth;
}

/** Guest session on Railway */
export async function loginAsGuestBackend(): Promise<AuthResult> {
  const result = await apiFetch<Record<string, unknown>>(`${GRUDGE_GAME_API}/auth/guest`, {
    method: "POST",
  });
  const auth = normalizeAuthPayload(result);
  if (auth.token) setToken(auth.token);
  return auth;
}

/** Puter bridge → Railway JWT */
export async function loginWithPuterBridge(puterSession: string): Promise<AuthResult> {
  const paths = [
    `${GRUDGE_GAME_API}/auth/puter-sso`,
    `${GRUDGE_GAME_API}/auth/puter`,
  ];
  let lastErr: unknown;
  for (const path of paths) {
    try {
      const result = await apiFetch<Record<string, unknown>>(path, {
        method: "POST",
        body: JSON.stringify({
          session: puterSession,
          puterToken: puterSession,
          provider: "puter",
        }),
      });
      const auth = normalizeAuthPayload(result);
      if (auth.token) setToken(auth.token);
      return auth;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Puter auth failed");
}

/** Verify current JWT against Railway */
export async function verifyToken(): Promise<AuthResult | null> {
  if (!_token) _token = readStoredToken();
  if (!_token) return null;

  // Prefer /auth/me (401 if bad); /auth/verify returns {valid:false}
  try {
    const me = await apiFetch<Record<string, unknown>>(`${GRUDGE_GAME_API}/auth/me`);
    const auth = normalizeAuthPayload(me, _token);
    if (auth.token) setToken(auth.token);
    if (auth.grudge_id) {
      try {
        localStorage.setItem("grudge_id", auth.grudge_id);
      } catch {
        /* */
      }
    }
    return auth;
  } catch {
    /* try verify */
  }

  try {
    const v = await apiFetch<Record<string, unknown>>(`${GRUDGE_GAME_API}/auth/verify`, {
      method: "GET",
    });
    if (v.valid === false || v.success === false) {
      // still may have user payload
    }
    if (v.user || v.grudgeId || v.grudge_id) {
      const auth = normalizeAuthPayload(
        (v.user as Record<string, unknown>) || v,
        _token,
      );
      return auth;
    }
    // Token present but verify opaque — keep session optimistically if token looks like JWT
    if (_token.split(".").length === 3) {
      const gid = (() => {
        try {
          return localStorage.getItem("grudge_id");
        } catch {
          return null;
        }
      })();
      return {
        token: _token,
        grudge_id: gid || "session",
        display_name: gid || "Grudge Player",
      };
    }
  } catch {
    /* */
  }

  setToken(null);
  return null;
}

/** Current identity profile (Railway) */
export async function getIdentityProfile(): Promise<{
  grudge_id: string;
  display_name: string;
  roles: string[];
} | null> {
  try {
    const me = await apiFetch<Record<string, unknown>>(`${GRUDGE_GAME_API}/auth/me`);
    const auth = normalizeAuthPayload(me, _token);
    return {
      grudge_id: auth.grudge_id,
      display_name: auth.display_name || auth.grudge_id,
      roles: auth.roles || [],
    };
  } catch {
    return null;
  }
}

/** Account bag / profile (Railway) */
export async function getAccountInfo(): Promise<Record<string, unknown> | null> {
  try {
    return await apiFetch(`${GRUDGE_GAME_API}/account`);
  } catch {
    return null;
  }
}

export function logout() {
  setToken(null);
  try {
    localStorage.removeItem("grudge_id");
    localStorage.removeItem("grudge_username");
  } catch {
    /* */
  }
}

// ── Characters ───────────────────────────────────────────────────────────────

export interface GrudgeCharacter {
  id: string | number;
  grudge_id: string;
  name: string;
  race: string;
  class: string;
  level: number;
  gold: number;
  stats: Record<string, number>;
}

function normalizeCharacter(
  raw: Record<string, unknown>,
  grudgeId?: string | null,
): GrudgeCharacter {
  const stats = (raw.stats ?? raw.attributes ?? {}) as Record<string, number>;
  return {
    id: (raw.id ?? raw.character_id ?? "") as string | number,
    grudge_id: String(raw.grudge_id ?? raw.grudgeId ?? grudgeId ?? ""),
    name: String(raw.name ?? "Unknown"),
    race: String(raw.race ?? raw.raceId ?? raw.race_id ?? "human"),
    class: String(raw.class ?? raw.classId ?? raw.class_id ?? "warrior"),
    level: Number(raw.level ?? 1),
    gold: Number(raw.gold ?? 0),
    stats,
  };
}

export async function getMyCharacters(): Promise<GrudgeCharacter[]> {
  const profile = await getIdentityProfile().catch(() => null);
  const data = await apiFetch<unknown>(`${GRUDGE_GAME_API}/characters`);
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { characters?: unknown[] })?.characters)
      ? (data as { characters: unknown[] }).characters
      : [];
  return rows.map((row) =>
    normalizeCharacter(row as Record<string, unknown>, profile?.grudge_id),
  );
}

export async function createCharacter(
  name: string,
  race: string,
  charClass: string,
): Promise<GrudgeCharacter> {
  const raw = await apiFetch<Record<string, unknown>>(`${GRUDGE_GAME_API}/characters`, {
    method: "POST",
    body: JSON.stringify({
      name,
      race,
      class: charClass,
      raceId: race,
      classId: charClass,
      race_id: race,
      class_id: charClass,
    }),
  });
  return normalizeCharacter(raw);
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
    method: "POST",
    body: JSON.stringify({ name, members: memberIds }),
  });
}

export async function updateCrewMembers(
  crewId: number,
  members: GrudgeCrew["members"],
): Promise<GrudgeCrew> {
  return apiFetch(`${GRUDGE_GAME_API}/crews/${crewId}`, {
    method: "PATCH",
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
  outcome: "win" | "loss";
  combat_data: Record<string, unknown>;
}): Promise<CombatResult> {
  return apiFetch(`${GRUDGE_GAME_API}/combat/log`, {
    method: "POST",
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

export async function saveMapEdits(
  levelId: string,
  data: Record<string, unknown>,
): Promise<MapSave> {
  return apiFetch(`${GRUDGE_GAME_API}/maps/save`, {
    method: "POST",
    body: JSON.stringify({ levelId, data }),
  });
}

export async function loadMapEdits(levelId: string): Promise<MapSave | null> {
  try {
    return await apiFetch(`${GRUDGE_GAME_API}/maps/${levelId}`);
  } catch {
    return null;
  }
}

// ── Profile / Skill loadouts ─────────────────────────────────────────────────

export async function saveSkillLoadout(
  characterId: string,
  loadout: Record<number, string>,
): Promise<void> {
  await apiFetch(`${GRUDGE_GAME_API}/profile/skill-loadout`, {
    method: "POST",
    body: JSON.stringify({ characterId, loadout }),
  });
}

export async function getSkillLoadout(
  characterId: string,
): Promise<Record<number, string> | null> {
  try {
    return await apiFetch(
      `${GRUDGE_GAME_API}/profile/skill-loadout?characterId=${characterId}`,
    );
  } catch {
    return null;
  }
}

// ── ObjectStore Game Data ────────────────────────────────────────────────────

const _osCache = new Map<string, { data: unknown; at: number }>();
const _OS_TTL = 10 * 60 * 1000;

async function fetchObjectStore<T>(workerPath: string, pagesFile: string): Promise<T | null> {
  const cached = _osCache.get(workerPath);
  if (cached && Date.now() - cached.at < _OS_TTL) return cached.data as T;

  try {
    const res = await fetch(`${OBJECTSTORE_WORKER}${workerPath}`);
    if (res.ok) {
      const data = (await res.json()) as T;
      _osCache.set(workerPath, { data, at: Date.now() });
      return data;
    }
  } catch {
    /* fall through */
  }

  if (pagesFile) {
    try {
      const res = await fetch(`${OBJECTSTORE_PAGES}/${pagesFile}`);
      if (res.ok) {
        const data = (await res.json()) as T;
        _osCache.set(workerPath, { data, at: Date.now() });
        return data;
      }
    } catch {
      /* */
    }
  }

  return (cached?.data as T) ?? null;
}

export function fetchWeaponSkills() {
  return fetchObjectStore<Record<string, unknown>>("/v1/weapon-skills", "weaponSkills.json");
}
export function fetchWeaponSkillTree(weaponType: string) {
  return fetchObjectStore<Record<string, unknown>>(
    `/v1/weapon-skills/${weaponType}`,
    "weaponSkills.json",
  );
}
export function fetchClassWeapons(className: string) {
  return fetchObjectStore<Record<string, unknown>>(
    `/v1/weapon-skills/class/${className}`,
    "weaponSkills.json",
  );
}
export function fetchGameData(collection: string) {
  return fetchObjectStore<Record<string, unknown>>(
    `/v1/game-data/${collection}`,
    `${collection}.json`,
  );
}
export function fetchEnemies() {
  return fetchGameData("enemies");
}
export function fetchClasses() {
  return fetchGameData("classes");
}
export function fetchRaces() {
  return fetchGameData("races");
}
export function fetchGameDataCollections() {
  return fetchObjectStore<{
    count: number;
    collections: Array<{ name: string; url: string }>;
  }>("/v1/game-data", "");
}

export async function prefetchGameData(): Promise<void> {
  await Promise.allSettled([
    fetchWeaponSkills(),
    fetchGameData("weapons"),
    fetchGameData("classes"),
    fetchGameData("races"),
    fetchGameData("enemies"),
  ]);
  console.log("[ObjectStore] Game data prefetched");
}

export interface BeastFormDef {
  id: string;
  label: string;
  unlockLevel: number;
  modelGlb: string;
  configKey: string;
  statBonuses: Record<string, number>;
  weaponTree: string;
}
export async function fetchBeastForms(): Promise<Record<string, BeastFormDef> | null> {
  const data = await fetchObjectStore<{ forms: Record<string, BeastFormDef> }>(
    "/v1/beast-forms",
    "beastForms.json",
  );
  return data?.forms ?? null;
}

const OPENSEA_API = "https://api.opensea.io/api/v2";
export interface OpenSeaNFT {
  identifier: string;
  collection: string;
  name: string;
  description: string;
  image_url: string;
  opensea_url: string;
  metadata_url: string;
  token_standard: string;
}
export async function fetchOpenSeaNFTs(
  walletAddress: string,
  chain = "solana",
): Promise<OpenSeaNFT[]> {
  try {
    const res = await fetch(
      `${OPENSEA_API}/chain/${chain}/account/${walletAddress}/nfts?limit=50`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { nfts: OpenSeaNFT[] };
    return data.nfts ?? [];
  } catch {
    return [];
  }
}
export async function refreshOpenSeaMetadata(
  chain: string,
  contract: string,
  tokenId: string,
): Promise<boolean> {
  try {
    const res = await fetch(
      `${OPENSEA_API}/chain/${chain}/contract/${contract}/nfts/${tokenId}/refresh`,
      { method: "POST" },
    );
    return res.ok;
  } catch {
    return false;
  }
}
export async function fetchOpenSeaCollection(
  slug: string,
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${OPENSEA_API}/collections/${slug}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Health check against Railway (via proxy) */
export async function probeGameApi(): Promise<{ ok: boolean; body?: unknown }> {
  try {
    const res = await fetch(`${GRUDGE_GAME_API}/health`, { credentials: "include" });
    if (!res.ok) return { ok: false };
    return { ok: true, body: await res.json() };
  } catch {
    return { ok: false };
  }
}
