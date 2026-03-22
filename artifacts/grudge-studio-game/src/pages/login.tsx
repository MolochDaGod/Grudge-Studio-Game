import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuthStore } from '@/store/use-auth-store';
import { getDiscordOAuthUrl } from '@/lib/grudge-api';
import { FantasyButton } from '@/components/ui/fantasy-button';

const BASE = import.meta.env.BASE_URL;

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isGuest, isLoading, loginDiscord, playAsGuest } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  // If already authenticated or guest, go to home
  useEffect(() => {
    if (isAuthenticated || isGuest) setLocation('/');
  }, [isAuthenticated, isGuest, setLocation]);

  // Handle Discord OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      loginDiscord(code).catch((e) => setError(e.message));
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loginDiscord]);

  const handleDiscord = () => {
    window.location.href = getDiscordOAuthUrl();
  };

  return (
    <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a18] via-[#0d0d1a] to-[#080810]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(212,160,23,0.08),transparent_60%)]" />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-md w-full">
        {/* Logo area */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
            <span className="text-4xl">⚔️</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white uppercase tracking-[0.2em]">
            Grudge Studio
          </h1>
          <p className="text-white/30 text-sm tracking-wider uppercase">Realm of Grudges</p>
        </div>

        {/* Login card */}
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
            {/* Discord */}
            <button
              onClick={handleDiscord}
              disabled={isLoading}
              className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-lg bg-[#5865F2]/20 border border-[#5865F2]/40 text-[#8b9dff] hover:bg-[#5865F2]/30 transition-all font-bold text-sm uppercase tracking-wider disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
              {isLoading ? 'Connecting...' : 'Sign in with Discord'}
            </button>

            {/* Wallet (placeholder — requires Web3Auth setup) */}
            <button
              disabled
              className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-lg bg-[#9945FF]/10 border border-[#9945FF]/30 text-[#9945FF]/60 font-bold text-sm uppercase tracking-wider opacity-50 cursor-not-allowed"
              title="Requires Web3Auth configuration"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>
              Wallet (Coming Soon)
            </button>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] text-white/20 uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Guest mode */}
            <FantasyButton
              onClick={playAsGuest}
              variant="ghost"
              className="w-full border border-white/10 text-white/50"
            >
              Play as Guest
            </FantasyButton>
            <p className="text-[10px] text-white/20 text-center">
              Guest players cannot save teams or appear on leaderboards
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[10px] text-white/15 tracking-wider">
          Created by Racalvin The Pirate King
        </p>
      </div>
    </div>
  );
}
