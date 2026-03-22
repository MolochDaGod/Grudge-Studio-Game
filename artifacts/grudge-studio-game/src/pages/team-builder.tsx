import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuthStore } from '@/store/use-auth-store';
import { useGameStore } from '@/store/use-game-store';
import { createCrew, updateCrewMembers } from '@/lib/grudge-api';
import { FantasyButton } from '@/components/ui/fantasy-button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const BASE = import.meta.env.BASE_URL;
const MAX_TEAM = 5;
const MIN_TEAM = 3;

export default function TeamBuilder() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isGuest, crew, fetchCrew } = useAuthStore();
  const { allCharacters, setPlayerSquad } = useGameStore();

  const [teamName, setTeamName] = useState(crew?.name ?? '');
  const [selected, setSelected] = useState<string[]>(
    crew?.members.map(m => m.characterId) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync from crew when it loads
  useEffect(() => {
    if (crew) {
      setTeamName(crew.name);
      setSelected(crew.members.map(m => m.characterId));
    }
  }, [crew]);

  const toggleHero = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_TEAM) return prev;
      return [...prev, id];
    });
  };

  const handleSave = async () => {
    if (selected.length < MIN_TEAM) {
      setError(`Select at least ${MIN_TEAM} heroes`);
      return;
    }
    if (!teamName.trim()) {
      setError('Enter a team name');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (crew) {
        await updateCrewMembers(crew.id, selected.map(id => ({ characterId: id })));
      } else {
        await createCrew(teamName.trim(), selected);
      }
      await fetchCrew();
      // Also set the squad in game store for immediate play
      setPlayerSquad(selected);
      setLocation('/level-select');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePlayNow = () => {
    if (selected.length < MIN_TEAM) {
      setError(`Select at least ${MIN_TEAM} heroes`);
      return;
    }
    setPlayerSquad(selected);
    setLocation('/level-select');
  };

  // Group characters by faction
  const factions = ['Crusade', 'Fabled', 'Legion', 'Pirates'];
  const grouped = factions.map(f => ({
    faction: f,
    heroes: allCharacters.filter(c => c.faction === f),
  })).filter(g => g.heroes.length > 0);

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0a0a14]/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setLocation('/')} className="text-white/30 hover:text-white/60 text-sm">
              ← Back
            </button>
            <h1 className="font-display text-xl uppercase tracking-widest text-primary">
              Team Builder
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/40 font-mono">
              {selected.length}/{MAX_TEAM} heroes
            </span>
            {isAuthenticated && (
              <FantasyButton onClick={handleSave} disabled={saving} variant="primary" className="text-xs">
                {saving ? 'Saving...' : crew ? 'Update Team' : 'Save Team'}
              </FantasyButton>
            )}
            <FantasyButton onClick={handlePlayNow} variant="secondary" className="text-xs">
              Play Now →
            </FantasyButton>
          </div>
        </div>
      </div>

      {/* Team name input */}
      {isAuthenticated && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <input
            type="text"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            placeholder="Team name..."
            maxLength={30}
            className="bg-black/40 border border-white/15 rounded px-3 py-2 text-sm text-white/80 w-64 focus:border-primary/50 outline-none"
          />
          {isGuest && (
            <p className="text-[10px] text-amber-400/60 mt-1">
              Sign in to save your team for future sessions
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="max-w-6xl mx-auto px-4 pt-3">
          <div className="p-2 bg-red-950/40 border border-red-700/30 rounded text-red-400 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Selected squad strip */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 h-20">
          {Array.from({ length: MAX_TEAM }).map((_, i) => {
            const heroId = selected[i];
            const hero = heroId ? allCharacters.find(c => c.id === heroId) : null;
            return (
              <div
                key={i}
                className={cn(
                  "w-14 h-[72px] rounded border-2 overflow-hidden relative flex items-center justify-center transition-all",
                  hero ? "border-primary/60 bg-black/60" : "border-white/10 bg-black/20 border-dashed"
                )}
                onClick={() => hero && toggleHero(heroId!)}
                title={hero ? `${hero.name} — click to remove` : `Slot ${i + 1}`}
              >
                {hero ? (
                  <>
                    <img
                      src={`${BASE}images/chars/${hero.id}.png`}
                      alt={hero.name}
                      className="absolute inset-0 w-full h-full object-cover object-top"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[7px] text-center py-0.5 text-white/70 truncate px-0.5">
                      {hero.name.split(' ')[0]}
                    </div>
                  </>
                ) : (
                  <span className="text-white/15 text-lg">+</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hero roster by faction */}
      <div className="max-w-6xl mx-auto px-4 py-4 space-y-6">
        {grouped.map(({ faction, heroes }) => (
          <div key={faction}>
            <h3 className="font-display text-sm uppercase tracking-widest text-white/40 mb-3 border-b border-white/8 pb-1">
              {faction}
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {heroes.map(hero => {
                const isSelected = selected.includes(hero.id);
                return (
                  <motion.button
                    key={hero.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleHero(hero.id)}
                    className={cn(
                      "relative rounded border overflow-hidden h-24 transition-all",
                      isSelected
                        ? "border-primary shadow-[0_0_12px_rgba(212,160,23,0.5)] ring-1 ring-primary/40"
                        : "border-white/10 hover:border-white/25",
                      selected.length >= MAX_TEAM && !isSelected && "opacity-30 cursor-not-allowed"
                    )}
                    disabled={selected.length >= MAX_TEAM && !isSelected}
                  >
                    <img
                      src={`${BASE}images/chars/${hero.id}.png`}
                      alt={hero.name}
                      className="absolute inset-0 w-full h-full object-cover object-top"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 px-1 py-1">
                      <div className="text-[8px] text-white/70 truncate font-bold">{hero.name.split(' ')[0]}</div>
                      <div className="text-[7px] text-white/35">{hero.role}</div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-[8px] font-bold text-black">
                        {selected.indexOf(hero.id) + 1}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
