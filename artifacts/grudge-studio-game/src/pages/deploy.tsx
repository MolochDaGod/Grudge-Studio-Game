import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useGameStore } from '@/store/use-game-store';
import { getLevelWithEdits } from '@/lib/levels';
import {
  getLanesForLevel,
  defaultDeployPlan,
  applyDeployPlanToPositions,
  type DeployPlan,
  type LaneId,
  type GridPos,
} from '@/lib/lane-deploy';
import { buildBattleRoster, defaultLoadoutForWeapon } from '@/lib/battle-setup';
import { BUILD_CATALOG, getBuildEntry } from '@/lib/build-catalog';
import { LaneDeployPanel, placeBuildAtTile, type DeployPanelMode } from '@/components/deploy/LaneDeployPanel';
import { BattleScene } from '@/components/three/BattleScene';
import { ArrowLeft } from 'lucide-react';
import type { AnimState } from '@/lib/character-model-map';
import type { TacticalUnit } from '@/store/use-game-store';

export default function DeployPage() {
  const [, setLocation] = useLocation();
  const {
    pendingSquad,
    currentLevelId,
    deployPlan,
    setDeployPlan,
    setDraftUnits,
    draftUnits,
    initBattle,
    setPlayerSquad,
    setEquippedSkills,
  } = useGameStore();

  const level = useMemo(() => getLevelWithEdits(currentLevelId), [currentLevelId]);
  const lanes = useMemo(() => getLanesForLevel(level), [level]);

  const [panelMode, setPanelMode] = useState<DeployPanelMode>('deploy');
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);
  const [plan, setPlan] = useState<DeployPlan>(() =>
    deployPlan ?? defaultDeployPlan(level, pendingSquad?.selectedIds ?? []),
  );

  useEffect(() => {
    if (!pendingSquad) {
      setLocation('/select');
      return;
    }
    if (!deployPlan) {
      const initial = defaultDeployPlan(level, pendingSquad.selectedIds);
      setPlan(initial);
      setDeployPlan(initial);
    }
  }, [pendingSquad, deployPlan, level, setDeployPlan, setLocation]);

  const previewUnits = useMemo((): TacticalUnit[] => {
    if (!pendingSquad) return [];
    const { playerUnits, enemyUnits } = buildBattleRoster(level, {
      ...pendingSquad,
      deployPlan: plan,
    });
    return [...playerUnits, ...enemyUnits];
  }, [pendingSquad, level, plan]);

  useEffect(() => {
    setDraftUnits(previewUnits);
  }, [previewUnits, setDraftUnits]);

  const animStates = useMemo(() => {
    const m: Record<string, AnimState> = {};
    for (const u of previewUnits) m[u.id] = 'idle';
    return m;
  }, [previewUnits]);

  const handlePlanChange = useCallback(
    (next: DeployPlan) => {
      setPlan(next);
      setDeployPlan(next);
    },
    [setDeployPlan],
  );

  const handleTileClick = useCallback(
    (x: number, y: number) => {
      if (panelMode === 'build' && selectedBuildId) {
        const entry = getBuildEntry(selectedBuildId);
        if (!entry) return;
        const next = placeBuildAtTile(plan, entry, { x, y });
        if (next) handlePlanChange(next);
        return;
      }

      if (panelMode !== 'deploy' || !selectedHeroId) return;
      const laneForTile = lanes.find(
        (l) => l.deploySlots.some((t) => t.x === x && t.y === y),
      );
      if (!laneForTile) return;

      handlePlanChange({
        ...plan,
        assignments: plan.assignments.map((a) =>
          a.characterId === selectedHeroId
            ? { ...a, laneId: laneForTile.id as LaneId, spawn: { x, y } }
            : a,
        ),
      });
    },
    [panelMode, selectedBuildId, selectedHeroId, lanes, plan, handlePlanChange],
  );

  const handleStartBattle = useCallback(() => {
    if (!pendingSquad) return;
    setDeployPlan(plan);
    const { playerUnits, enemyUnits } = buildBattleRoster(level, {
      ...pendingSquad,
      deployPlan: plan,
    });

    const positions = applyDeployPlanToPositions(plan, level);
    const adjustedPlayers = playerUnits.map((u) => ({
      ...u,
      position: positions[u.characterId] ?? u.position,
    }));

    setPlayerSquad(pendingSquad.selectedIds);
    initBattle([...adjustedPlayers, ...enemyUnits]);

    const { loadoutByCharId } = pendingSquad;
    adjustedPlayers.forEach((unit, i) => {
      const charId = pendingSquad.selectedIds[i];
      const chosen = loadoutByCharId[charId];
      if (chosen) {
        setEquippedSkills(unit.id, chosen);
      } else {
        const loadout = unit.weaponType ? defaultLoadoutForWeapon(unit.weaponType) : null;
        if (loadout) setEquippedSkills(unit.id, loadout);
      }
    });
    enemyUnits.forEach((unit) => {
      const loadout = unit.weaponType ? defaultLoadoutForWeapon(unit.weaponType) : null;
      if (loadout) setEquippedSkills(unit.id, loadout);
    });

    setDraftUnits(null);
    setLocation('/battle');
  }, [
    pendingSquad,
    plan,
    level,
    setDeployPlan,
    setPlayerSquad,
    initBattle,
    setEquippedSkills,
    setDraftUnits,
    setLocation,
  ]);

  if (!pendingSquad) return null;

  const laneOverlayTiles: Array<{ x: number; y: number; color: string; kind: 'deploy' | 'path' }> = [];
  for (const lane of lanes) {
    for (const t of lane.deploySlots) {
      laneOverlayTiles.push({ ...t, color: lane.color, kind: 'deploy' });
    }
    for (const t of lane.marchPath) {
      laneOverlayTiles.push({ ...t, color: lane.color, kind: 'path' });
    }
  }

  return (
    <div className="relative h-screen overflow-hidden bg-black">
      <div className="absolute inset-0">
        <BattleScene
          units={previewUnits}
          level={level}
          reachableTiles={laneOverlayTiles.filter((t) => t.kind === 'deploy').map((t) => ({ x: t.x, y: t.y }))}
          attackableTiles={[]}
          attackableColor="#a78bfa"
          currentUnitId={null}
          actionMode="deploy"
          onTileClick={handleTileClick}
          animStates={animStates}
          cameraMode="rts"
          deployOverlays={laneOverlayTiles}
          buildPlacements={plan.builds}
          buildCatalog={BUILD_CATALOG}
          showBackTower
        />
      </div>

      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-4 py-3 bg-black/70 border-b border-white/10">
        <button
          type="button"
          onClick={() => setLocation('/level-select')}
          className="flex items-center gap-1 text-xs text-white/50 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Maps
        </button>
        <div>
          <h1 className="font-display text-lg uppercase tracking-widest text-violet-300">Lane Deployment</h1>
          <p className="text-[10px] text-white/40">{level.name} — assign lanes & march paths before combat</p>
        </div>
      </div>

      <div className="absolute top-16 right-4 bottom-4 z-20 w-[min(100%,320px)]">
        <LaneDeployPanel
          mode={panelMode}
          onModeChange={setPanelMode}
          lanes={lanes}
          plan={plan}
          onPlanChange={handlePlanChange}
          selectedHeroId={selectedHeroId}
          onSelectHero={setSelectedHeroId}
          selectedBuildId={selectedBuildId}
          onSelectBuild={setSelectedBuildId}
          onStartBattle={handleStartBattle}
        />
      </div>

      <div className="absolute bottom-4 left-4 z-20 text-[10px] text-white/35 max-w-xs leading-relaxed">
        RTS view · Click hero in panel, then deploy tile on map · Build mode: pick structure, click tile ·
        Grudge6 prefab heroes with T0 basics equipped
      </div>
    </div>
  );
}