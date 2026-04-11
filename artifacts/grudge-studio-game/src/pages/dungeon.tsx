import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { fetchPlayerRoster } from '@/lib/grudge-bridge';
import { getDungeonList, type DungeonDefinition, canEnterDungeon } from '@/lib/dungeon-definitions';
import { ENCOUNTERS, buildEncounterUnits } from '@/lib/dungeon-encounters';
import { LEVELS } from '@/lib/levels';
import { useGameStore, TacticalUnit } from '@/store/use-game-store';

type Phase = 'loading' | 'dungeon-select' | 'squad-select' | 'floor-battle' | 'floor-result' | 'dungeon-complete';

export default function DungeonPage() {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<Phase>('loading');
  const [roster, setRoster] = useState<TacticalUnit[]>([]);
  const [selectedDungeon, setSelectedDungeon] = useState<DungeonDefinition | null>(null);
  const [selectedSquadIds, setSelectedSquadIds] = useState<Set<string>>(new Set());
  const [currentFloor, setCurrentFloor] = useState(0);
  const [floorResults, setFloorResults] = useState<Array<'win' | 'loss'>>([]);
  const [error, setError] = useState<string | null>(null);

  const dungeons = useMemo(() => getDungeonList(), []);
  const initBattle = useGameStore(s => s.initBattle);

  // Fetch player roster on mount
  useEffect(() => {
    fetchPlayerRoster()
      .then(units => {
        setRoster(units);
        setPhase('dungeon-select');
      })
      .catch(err => {
        setError(`Failed to load characters: ${err.message}`);
        setPhase('dungeon-select');
      });
  }, []);

  // Toggle squad member selection
  const toggleSquadMember = (unitId: string) => {
    setSelectedSquadIds(prev => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else if (next.size < 4) next.add(unitId);
      return next;
    });
  };

  // Start the dungeon — build first floor encounter and launch battle
  const startDungeon = () => {
    if (!selectedDungeon || selectedSquadIds.size === 0) return;
    setCurrentFloor(0);
    setFloorResults([]);
    launchFloor(selectedDungeon, 0);
  };

  // Launch a specific floor battle
  const launchFloor = (dungeon: DungeonDefinition, floorIdx: number) => {
    const floor = dungeon.floors[floorIdx];
    if (!floor) return;

    const level = (LEVELS as any)[floor.levelId];
    if (!level) {
      setError(`Level "${floor.levelId}" not found`);
      return;
    }

    // Build player units with proper positions
    const playerUnits: TacticalUnit[] = Array.from(selectedSquadIds).map((id, i) => {
      const unit = roster.find(u => u.id === id);
      if (!unit) return null;
      return {
        ...unit,
        position: {
          x: level.playerSpawn.xMin + Math.floor(i / 2),
          y: level.playerSpawn.yMin + (i % 2) * 2 + 1,
        },
        hp: unit.maxHp, // Full heal on floor start
        mana: unit.maxMana,
        stamina: unit.maxStamina,
        hasMoved: false,
        hasActed: false,
        statusEffects: [],
        statusDurations: {},
        statusImmunities: {},
        ct: 0,
      };
    }).filter(Boolean) as TacticalUnit[];

    // Build PvE enemy units from encounter definitions
    const enemyUnits: TacticalUnit[] = [];
    for (const encId of floor.encounterIds) {
      const encounter = ENCOUNTERS[encId];
      if (!encounter) continue;
      const units = buildEncounterUnits(encounter, floor.tier, level.enemySpawn);
      enemyUnits.push(...units);
    }

    const allUnits = [...playerUnits, ...enemyUnits];
    initBattle(allUnits);
    setPhase('floor-battle');

    // Navigate to the battle page with dungeon context
    navigate(`/battle?dungeon=${dungeon.id}&floor=${floorIdx + 1}`);
  };

  // Estimate player level from roster
  const playerLevel = useMemo(() => {
    if (roster.length === 0) return 1;
    return Math.max(...roster.map(u => Math.floor((u.maxHp - 100) / 15) || 1));
  }, [roster]);

  // ── Render ──────────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⚔️</div>
          <p className="text-gray-400 text-lg">Loading your characters from grudgewarlords.com...</p>
        </div>
      </div>
    );
  }

  if (phase === 'squad-select' && selectedDungeon) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => { setPhase('dungeon-select'); setSelectedDungeon(null); }} className="text-gray-400 hover:text-white mb-4 flex items-center gap-2">
            ← Back to Dungeons
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">{selectedDungeon.icon} {selectedDungeon.name}</h1>
          <p className="text-gray-400 mb-6">{selectedDungeon.lore}</p>
          <div className="flex gap-4 mb-4 text-sm">
            <span className="px-3 py-1 bg-yellow-900/50 text-yellow-400 rounded">Tier {selectedDungeon.recommendedTier}</span>
            <span className="px-3 py-1 bg-blue-900/50 text-blue-400 rounded">{selectedDungeon.floors.length} Floors</span>
            <span className="px-3 py-1 bg-green-900/50 text-green-400 rounded">{selectedDungeon.totalXP} XP</span>
            <span className="px-3 py-1 bg-amber-900/50 text-amber-400 rounded">{selectedDungeon.goldReward} Gold</span>
          </div>

          <h2 className="text-xl font-bold text-white mb-4">Select Your Squad (up to 4)</h2>
          {error && <p className="text-red-400 mb-4">{error}</p>}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {roster.map(unit => {
              const selected = selectedSquadIds.has(unit.id);
              return (
                <button
                  key={unit.id}
                  onClick={() => toggleSquadMember(unit.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selected
                      ? 'border-yellow-500 bg-yellow-900/30'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                  }`}
                >
                  <div className="font-bold text-white text-sm truncate">{unit.name}</div>
                  <div className="text-gray-400 text-xs">{unit.race} {unit.role}</div>
                  <div className="mt-2 flex gap-2 text-xs">
                    <span className="text-red-400">HP {unit.maxHp}</span>
                    <span className="text-orange-400">ATK {unit.attack}</span>
                    <span className="text-blue-400">DEF {unit.defense}</span>
                  </div>
                  {selected && <div className="text-yellow-400 text-xs mt-1 font-bold">✓ SELECTED</div>}
                </button>
              );
            })}
          </div>

          {roster.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              No characters found. Create characters at{' '}
              <a href="https://grudgewarlords.com" className="text-blue-400 underline" target="_blank" rel="noopener">
                grudgewarlords.com
              </a>
            </p>
          )}

          <button
            onClick={startDungeon}
            disabled={selectedSquadIds.size === 0}
            className="w-full py-3 bg-red-700 hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg transition-colors text-lg"
          >
            ⚔️ Enter {selectedDungeon.name} ({selectedSquadIds.size}/4 heroes)
          </button>
        </div>
      </div>
    );
  }

  // Dungeon selection
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">⚔️ Dungeons</h1>
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white">
            ← Home
          </button>
        </div>

        {error && <p className="text-red-400 mb-4">{error}</p>}

        <p className="text-gray-400 mb-6">
          Choose a dungeon to conquer. Your characters from{' '}
          <span className="text-blue-400">grudgewarlords.com</span> will fight PvE encounters
          using their real stats, attributes, and weapon skills.
        </p>

        <div className="grid gap-4">
          {dungeons.map(dungeon => {
            const canEnter = canEnterDungeon(dungeon, playerLevel);
            return (
              <button
                key={dungeon.id}
                onClick={() => { setSelectedDungeon(dungeon); setPhase('squad-select'); setSelectedSquadIds(new Set()); }}
                disabled={!canEnter}
                className={`p-5 rounded-lg border text-left transition-all ${
                  canEnter
                    ? 'border-gray-700 bg-gray-800/60 hover:border-yellow-600 hover:bg-gray-800'
                    : 'border-gray-800 bg-gray-900/40 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {dungeon.icon} {dungeon.name}
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">{dungeon.lore.slice(0, 120)}...</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="text-yellow-400 font-bold">Tier {dungeon.recommendedTier}</div>
                    <div className="text-gray-500 text-xs">Lvl {dungeon.minLevel}+</div>
                  </div>
                </div>
                <div className="flex gap-3 mt-3 text-xs">
                  <span className="px-2 py-1 bg-gray-700/50 text-gray-300 rounded">{dungeon.faction}</span>
                  <span className="px-2 py-1 bg-gray-700/50 text-gray-300 rounded">{dungeon.floors.length} Floors</span>
                  <span className="px-2 py-1 bg-green-900/40 text-green-400 rounded">{dungeon.totalXP} XP</span>
                  <span className="px-2 py-1 bg-amber-900/40 text-amber-400 rounded">{dungeon.goldReward} Gold</span>
                  {!canEnter && <span className="px-2 py-1 bg-red-900/40 text-red-400 rounded">Level {dungeon.minLevel} required</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
