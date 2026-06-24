import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { launchTriadSkirmish } from '@/lib/triad-launch';
import { buildGrudgeTriadParty } from '@/lib/grudge-triad-party';
import { FantasyButton } from '@/components/ui/fantasy-button';
import { Swords, Users, Shield } from 'lucide-react';

export default function GrudgeTriadPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [heroName, setHeroName] = useState('Warlord');
  const [squadNames, setSquadNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    buildGrudgeTriadParty()
      .then((party) => {
        setHeroName(party.heroName);
        setSquadNames(party.playerUnits.map((u) => u.name));
        setStatus('ready');
      })
      .catch((e) => {
        setError(e?.message ?? 'Failed to load squad');
        setStatus('error');
      });
  }, []);

  const handleLaunch = async () => {
    setLaunching(true);
    setError(null);
    try {
      await launchTriadSkirmish('ruins');
      setLocation('/battle');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to start battle');
      setLaunching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06060c] text-white flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-xl border border-amber-700/40 bg-[#0c0c14]/90 p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <Swords className="w-8 h-8 text-amber-400" />
          <h1 className="font-display text-2xl uppercase tracking-widest text-amber-300">
            Grudge Triad
          </h1>
        </div>
        <p className="text-sm text-white/50 mb-6">
          3v3 tactical warlords — your Grudge hero leads two race champions from the dash roster.
        </p>

        {status === 'loading' && (
          <div className="text-center py-8 text-white/40 animate-pulse">Assembling your warband…</div>
        )}

        {status === 'ready' && (
          <>
            <div className="rounded-lg border border-white/10 bg-black/40 p-4 mb-6 space-y-2">
              <div className="flex items-center gap-2 text-amber-200 text-sm font-bold">
                <Shield className="w-4 h-4" />
                Commander: {heroName}
              </div>
              <div className="flex items-center gap-2 text-white/60 text-xs">
                <Users className="w-3.5 h-3.5" />
                Squad: {squadNames.join(' · ')}
              </div>
            </div>
            <FantasyButton
              onClick={handleLaunch}
              disabled={launching}
              className="w-full"
              variant="primary"
            >
              {launching ? 'Deploying…' : 'Enter 3v3 Tactical Battle'}
            </FantasyButton>
            <button
              type="button"
              onClick={() => setLocation('/select')}
              className="mt-4 w-full text-xs text-white/30 hover:text-white/60"
            >
              Manual squad selection →
            </button>
          </>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-400 text-center">{error}</p>
        )}

        <button
          type="button"
          onClick={() => setLocation('/')}
          className="mt-6 w-full text-xs text-white/25 hover:text-white/50"
        >
          ← Back to hub
        </button>
      </div>
    </div>
  );
}