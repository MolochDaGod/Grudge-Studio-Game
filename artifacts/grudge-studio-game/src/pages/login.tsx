import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/store/use-auth-store";
import {
  redirectToGrudgeIdLogin,
  loginAsGuestBackend,
  getAuthCallbackUrl,
  getGrudgeIdLoginUrl,
} from "@/lib/grudge-api";
import { FantasyButton } from "@/components/ui/fantasy-button";

/** Check if running inside Puter environment */
function isPuterAvailable(): boolean {
  return typeof (window as any).puter !== "undefined";
}

export default function Login() {
  const [, setLocation] = useLocation();
  const {
    isAuthenticated,
    isGuest,
    isLoading,
    loginPuter,
    playAsGuest,
    restoreSession,
  } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [puterAvailable] = useState(isPuterAvailable);

  // If already authenticated or guest, go to home
  useEffect(() => {
    if (isAuthenticated || isGuest) setLocation("/");
  }, [isAuthenticated, isGuest, setLocation]);

  // Auto-login via Puter if already signed in (optional secondary path)
  useEffect(() => {
    if (!puterAvailable) return;
    const puter = (window as any).puter;
    if (puter?.auth?.isSignedIn?.()) {
      const session = puter.auth.getToken?.() ?? "";
      if (session) {
        loginPuter(session).catch(() => {
          /* Puter auth failed — user can use Grudge ID */
        });
      }
    }
  }, [puterAvailable, loginPuter]);

  /** Primary: fleet SSO → id.grudge-studio.com */
  const handleGrudgeId = () => {
    try {
      redirectToGrudgeIdLogin(getAuthCallbackUrl());
    } catch (e: any) {
      setError(e?.message || "Could not start Grudge ID login");
    }
  };

  const handlePuterLogin = async () => {
    try {
      const puter = (window as any).puter;
      if (!puter) {
        // No Puter — fall through to Grudge ID
        handleGrudgeId();
        return;
      }
      await puter.auth.signIn();
      const session = puter.auth.getToken?.() ?? "";
      if (session) {
        await loginPuter(session);
      }
    } catch (e: any) {
      setError(e.message || "Puter login failed — try Grudge ID");
    }
  };

  const handleGrudgeGuest = async () => {
    try {
      await loginAsGuestBackend();
      await restoreSession();
      // If JWT guest worked, restoreSession sets authenticated;
      // otherwise fall back to local guest
      const { isAuthenticated: ok } = useAuthStore.getState();
      if (!ok) playAsGuest();
    } catch {
      playAsGuest();
    }
  };

  return (
    <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a18] via-[#0d0d1a] to-[#080810]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(212,160,23,0.08),transparent_60%)]" />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-md w-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
            <span className="text-4xl">⚔️</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white uppercase tracking-[0.2em]">
            Grudge Studio
          </h1>
          <p className="text-white/30 text-sm tracking-wider uppercase">Grudge Tactics</p>
        </div>

        <div className="w-full bg-[#0d0d18]/80 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
          <h2 className="font-display text-lg text-white/80 uppercase tracking-wider text-center mb-6">
            Sign In
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-950/50 border border-red-700/40 rounded text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {/* Primary fleet SSO */}
            <button
              onClick={handleGrudgeId}
              disabled={isLoading}
              className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-lg bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25 transition-all font-bold text-sm uppercase tracking-wider disabled:opacity-50"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              {isLoading ? "Connecting..." : "Sign in with Grudge ID"}
            </button>
            <p className="text-[10px] text-white/25 text-center -mt-1 mb-1">
              Uses{" "}
              <a
                href={getGrudgeIdLoginUrl()}
                className="text-primary/70 underline"
                onClick={(e) => {
                  e.preventDefault();
                  handleGrudgeId();
                }}
              >
                id.grudge-studio.com
              </a>{" "}
              — same account as Warlords, Crafting, and Character Studio
            </p>

            {/* Optional Puter */}
            {puterAvailable && (
              <button
                onClick={handlePuterLogin}
                disabled={isLoading}
                className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-lg bg-[#5865F2]/15 border border-[#5865F2]/30 text-[#8b9dff] hover:bg-[#5865F2]/25 transition-all font-bold text-sm uppercase tracking-wider disabled:opacity-50"
              >
                Sign in with Puter
              </button>
            )}

            <button
              disabled
              className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-lg bg-[#9945FF]/10 border border-[#9945FF]/30 text-[#9945FF]/60 font-bold text-sm uppercase tracking-wider opacity-50 cursor-not-allowed"
              title="Wallet via Grudge ID hub"
            >
              Wallet (via Grudge ID)
            </button>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] text-white/20 uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <FantasyButton
              onClick={handleGrudgeGuest}
              variant="ghost"
              className="w-full border border-white/10 text-white/50"
            >
              Play as Guest
            </FantasyButton>
            <p className="text-[10px] text-white/20 text-center">
              Guest progress is local — Grudge ID saves characters & account bag on Railway
            </p>
          </div>
        </div>

        <p className="text-[10px] text-white/15 tracking-wider">
          Created by Racalvin The Pirate King
        </p>
      </div>
    </div>
  );
}
