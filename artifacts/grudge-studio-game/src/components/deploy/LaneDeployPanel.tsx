import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  type DeployPlan,
  type LaneDefinition,
  type LaneId,
  type GridPos,
} from '@/lib/lane-deploy';
import { BUILD_CATALOG, type BuildCatalogEntry } from '@/lib/build-catalog';
import { CHARACTERS } from '@/lib/characters';
import { WEAPON_SKILL_TREES, TIER_STYLES } from '@/lib/weapon-skills';
import { Hammer, Map, Swords, X } from 'lucide-react';

export type DeployPanelMode = 'deploy' | 'build';

interface LaneDeployPanelProps {
  mode: DeployPanelMode;
  onModeChange: (mode: DeployPanelMode) => void;
  lanes: LaneDefinition[];
  plan: DeployPlan;
  onPlanChange: (plan: DeployPlan) => void;
  selectedHeroId: string | null;
  onSelectHero: (id: string | null) => void;
  selectedBuildId: string | null;
  onSelectBuild: (id: string | null) => void;
  onStartBattle?: () => void;
  onClose?: () => void;
  readOnly?: boolean;
  title?: string;
}

function heroLabel(id: string) {
  return CHARACTERS.find((c) => c.id === id)?.name ?? id;
}

export function LaneDeployPanel({
  mode,
  onModeChange,
  lanes,
  plan,
  onPlanChange,
  selectedHeroId,
  onSelectHero,
  selectedBuildId,
  onSelectBuild,
  onStartBattle,
  onClose,
  readOnly = false,
  title = 'RTS Deploy',
}: LaneDeployPanelProps) {
  const assignmentsByLane = useMemo(() => {
    const map: Record<LaneId, typeof plan.assignments> = { top: [], mid: [], bot: [] };
    for (const a of plan.assignments) map[a.laneId].push(a);
    return map;
  }, [plan.assignments]);

  const updateAssignment = (characterId: string, patch: Partial<DeployPlan['assignments'][0]>) => {
    onPlanChange({
      ...plan,
      assignments: plan.assignments.map((a) =>
        a.characterId === characterId ? { ...a, ...patch } : a,
      ),
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0e14]/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40">
        <div>
          <h2 className="font-display text-sm uppercase tracking-[0.2em] text-amber-300">{title}</h2>
          <p className="text-[10px] text-white/45 mt-0.5">Grudge6 heroes · T0 weapon skills · lane paths</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-white/10 text-white/50">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex gap-1 p-2 border-b border-white/5">
        <button
          type="button"
          onClick={() => onModeChange('deploy')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs font-bold uppercase tracking-wider',
            mode === 'deploy' ? 'bg-violet-900/60 text-violet-200 border border-violet-500/40' : 'text-white/40 hover:text-white/70',
          )}
        >
          <Map className="w-3.5 h-3.5" /> Deploy
        </button>
        <button
          type="button"
          onClick={() => onModeChange('build')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs font-bold uppercase tracking-wider',
            mode === 'build' ? 'bg-amber-900/60 text-amber-200 border border-amber-500/40' : 'text-white/40 hover:text-white/70',
          )}
        >
          <Hammer className="w-3.5 h-3.5" /> Build
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {mode === 'deploy' && (
          <>
            <p className="text-[11px] text-white/50 leading-relaxed">
              Assign each hero to a lane. Click a deploy tile on the map, then set how far they march before combat.
            </p>
            {lanes.map((lane) => (
              <div key={lane.id} className="rounded-lg border border-white/10 overflow-hidden">
                <div
                  className="px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                  style={{ backgroundColor: `${lane.color}22`, color: lane.color }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lane.color }} />
                  {lane.label}
                </div>
                <div className="p-2 space-y-2 bg-black/30">
                  {(assignmentsByLane[lane.id] ?? []).map((a) => (
                    <div
                      key={a.characterId}
                      className={cn(
                        'rounded border p-2 cursor-pointer transition-colors',
                        selectedHeroId === a.characterId
                          ? 'border-primary bg-primary/10'
                          : 'border-white/10 hover:border-white/25',
                      )}
                      onClick={() => onSelectHero(a.characterId)}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-semibold text-white">{heroLabel(a.characterId)}</span>
                        <span className="text-[9px] text-white/40 font-mono">
                          ({a.spawn.x},{a.spawn.y})
                        </span>
                      </div>
                      {!readOnly && (
                        <div className="mt-2 flex items-center gap-2">
                          <label className="text-[10px] text-white/50">March</label>
                          <input
                            type="range"
                            min={0}
                            max={Math.max(0, lane.marchPath.length - 1)}
                            value={a.pathStopIndex}
                            onChange={(e) =>
                              updateAssignment(a.characterId, { pathStopIndex: Number(e.target.value) })
                            }
                            className="flex-1 h-1 accent-violet-400"
                          />
                          <span className="text-[10px] text-violet-300 w-6 text-right">{a.pathStopIndex}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {assignmentsByLane[lane.id]?.length === 0 && (
                    <p className="text-[10px] text-white/30 italic px-1">No heroes in this lane</p>
                  )}
                </div>
              </div>
            ))}

            <div className="rounded-lg border border-white/10 p-2 bg-black/20">
              <div className="flex items-center gap-2 text-xs text-white/60 mb-2">
                <Swords className="w-3.5 h-3.5 text-slate-300" />
                T0 basics (auto-equipped)
              </div>
              <div className="flex flex-wrap gap-1">
                {plan.assignments.map((a) => {
                  const char = CHARACTERS.find((c) => c.id === a.characterId);
                  const wt = char?.role === 'Ranger' ? 'bow' : char?.role === 'Mage' ? 'fire_staff' : 'sword';
                  const tree = WEAPON_SKILL_TREES[wt];
                  const t0 = tree?.slots.find((s) => s.slot === 1)?.skills.find((sk) => sk.tier === 'T0');
                  if (!t0) return null;
                  const style = TIER_STYLES.T0;
                  return (
                    <span
                      key={a.characterId}
                      className="text-[9px] px-1.5 py-0.5 rounded border"
                      style={{ color: style.color, backgroundColor: style.bg, borderColor: `${style.color}44` }}
                      title={t0.description}
                    >
                      {heroLabel(a.characterId)}: {t0.name}
                    </span>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {mode === 'build' && (
          <>
            <p className="text-[11px] text-white/50">
              Select a structure, then click a valid tile on the battlefield to place it.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {BUILD_CATALOG.map((entry) => {
                const placed = plan.builds.filter((b) => b.catalogId === entry.id).length;
                const atMax = entry.maxPerBattle > 0 && placed >= entry.maxPerBattle;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    disabled={readOnly || atMax}
                    onClick={() => onSelectBuild(selectedBuildId === entry.id ? null : entry.id)}
                    className={cn(
                      'text-left rounded-lg border p-2.5 transition-colors',
                      selectedBuildId === entry.id
                        ? 'border-amber-400 bg-amber-950/40'
                        : 'border-white/10 hover:border-white/25',
                      atMax && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    <div className="text-sm font-semibold text-white">{entry.label}</div>
                    <div className="text-[10px] text-white/45 mt-0.5">{entry.description}</div>
                    <div className="text-[9px] text-amber-400/80 mt-1 font-mono">
                      {placed}/{entry.maxPerBattle || '∞'} placed
                    </div>
                  </button>
                );
              })}
            </div>
            {plan.builds.length > 0 && (
              <div className="text-[10px] text-white/40">
                {plan.builds.length} structure{plan.builds.length !== 1 ? 's' : ''} on field
              </div>
            )}
          </>
        )}
      </div>

      {onStartBattle && !readOnly && (
        <div className="p-3 border-t border-white/10 bg-black/50">
          <button
            type="button"
            onClick={onStartBattle}
            className="w-full py-3 rounded-lg font-display text-sm uppercase tracking-widest bg-gradient-to-r from-violet-700 to-amber-700 hover:from-violet-600 hover:to-amber-600 text-white shadow-lg"
          >
            Begin Assault
          </button>
        </div>
      )}
    </div>
  );
}

export function placeBuildAtTile(
  plan: DeployPlan,
  catalog: BuildCatalogEntry,
  tile: GridPos,
): DeployPlan | null {
  const count = plan.builds.filter((b) => b.catalogId === catalog.id).length;
  if (catalog.maxPerBattle > 0 && count >= catalog.maxPerBattle) return null;
  return {
    ...plan,
    builds: [
      ...plan.builds,
      { id: `build_${Date.now()}`, catalogId: catalog.id, x: tile.x, y: tile.y },
    ],
  };
}