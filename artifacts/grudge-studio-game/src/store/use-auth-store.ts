import { create } from 'zustand';
import {
  AuthResult, verifyToken, loginWithDiscordCode,
  loginWithWallet, loginWithPuterBridge, logout as apiLogout,
  setToken, GrudgeCharacter, getMyCharacters, GrudgeCrew, getMyCrew,
} from '@/lib/grudge-api';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  grudgeId: string | null;
  token: string | null;
  wallet: string | null;
  displayName: string | null;
  roles: string[];
  /** Characters fetched from the Grudge backend */
  backendCharacters: GrudgeCharacter[];
  /** Current saved crew/team */
  crew: GrudgeCrew | null;
  /** Guest mode: can play but can't save teams or submit to leaderboard */
  isGuest: boolean;

  // Actions
  loginDiscord: (code: string) => Promise<void>;
  loginWallet: (idToken: string, wallet: string) => Promise<void>;
  loginPuter: (session: string) => Promise<void>;
  playAsGuest: () => void;
  restoreSession: () => Promise<void>;
  fetchCharacters: () => Promise<void>;
  fetchCrew: () => Promise<void>;
  logout: () => void;
}

function applyAuth(result: AuthResult): Partial<AuthState> {
  return {
    isAuthenticated: true,
    isLoading: false,
    grudgeId: result.grudge_id,
    token: result.token,
    wallet: result.wallet ?? null,
    displayName: result.display_name ?? result.grudge_id.slice(0, 8),
    roles: result.roles ?? [],
    isGuest: false,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: false,
  grudgeId: null,
  token: null,
  wallet: null,
  displayName: null,
  roles: [],
  backendCharacters: [],
  crew: null,
  isGuest: false,

  loginDiscord: async (code) => {
    set({ isLoading: true });
    try {
      const result = await loginWithDiscordCode(code);
      set(applyAuth(result));
      get().fetchCharacters();
      get().fetchCrew();
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  loginWallet: async (idToken, wallet) => {
    set({ isLoading: true });
    try {
      const result = await loginWithWallet(idToken, wallet);
      set(applyAuth(result));
      get().fetchCharacters();
      get().fetchCrew();
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  loginPuter: async (session) => {
    set({ isLoading: true });
    try {
      const result = await loginWithPuterBridge(session);
      set(applyAuth(result));
      get().fetchCharacters();
      get().fetchCrew();
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  playAsGuest: () => {
    set({
      isAuthenticated: false,
      isGuest: true,
      isLoading: false,
      grudgeId: null,
      token: null,
      wallet: null,
      displayName: 'Guest',
      roles: [],
      backendCharacters: [],
      crew: null,
    });
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const result = await verifyToken();
      if (result) {
        set(applyAuth(result));
        get().fetchCharacters();
        get().fetchCrew();
      } else {
        set({ isLoading: false });
      }
    } catch {
      // Network error or backend offline — don't leave user stuck on spinner
      set({ isLoading: false });
    }
  },

  fetchCharacters: async () => {
    try {
      const chars = await getMyCharacters();
      set({ backendCharacters: chars });
    } catch { /* offline or no chars yet */ }
  },

  fetchCrew: async () => {
    try {
      const crew = await getMyCrew();
      set({ crew });
    } catch { /* no crew yet */ }
  },

  logout: () => {
    apiLogout();
    set({
      isAuthenticated: false,
      isLoading: false,
      grudgeId: null,
      token: null,
      wallet: null,
      displayName: null,
      roles: [],
      backendCharacters: [],
      crew: null,
      isGuest: false,
    });
  },
}));
