import { useEffect, useMemo, useState } from 'react';
import { BattleScene } from '@/components/three/BattleScene';
import { AnimState } from '@/components/three/CharacterModel';
import { useGameStore } from '@/store/use-game-store';
import { CHARACTERS } from '@/lib/characters';
import { heroToTacticalUnit } from '@/lib/grudge-bridge';
import { getLevelWithEdits } from '@/lib/levels';

/** Demo gameboard — one hero per race on the training arena grid. */
export default function WorldBoardScene() {
  const initBattle = useGameStore((s) => s.initBattle);
  const units = useGameStore((s) => s.units);
  const [ready, setReady] = useState(false);

  const level = useMemo(() => getLevelWithEdits('ruins'), []);

  const demoUnits = useMemo(() => {
    const picks = [
      'human_warrior',
      'barbarian_warrior',
      'elf_warrior',
      'dwarf_warrior',
      'orc_warrior',
      'undead_warrior',
    ];
    return picks.map((id, i) => {
      const hero = CHARACTERS.find((c) => c.id === id);
      if (!hero) return null;
      const col = i % 3;
      const row = Math.floor(i / 3);
      return heroToTacticalUnit(
        hero,
        0,
        { x: level.playerSpawn.xMin + col * 2, y: level.playerSpawn.yMin + row * 2 },
      );
    }).filter(Boolean);
  }, [level]);

  useEffect(() => {
    if (demoUnits.length === 0) return;
    initBattle(demoUnits as NonNullable<(typeof demoUnits)[number]>[]);
    setReady(true);
  }, [demoUnits, initBattle]);

  const animStates = useMemo(() => {
    const states: Record<string, AnimState> = {};
    for (const u of units) states[u.id] = 'idle';
    return states;
  }, [units]);

  if (!ready || units.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-white/60 text-sm">
        Loading gameboard…
      </div>
    );
  }

  return (
    <BattleScene
      units={units}
      level={level}
      reachableTiles={[]}
      attackableTiles={[]}
      currentUnitId={null}
      actionMode="idle"
      onTileClick={() => {}}
      animStates={animStates}
      showUnitInfo
      cameraMode="tactical"
    />
  );
}