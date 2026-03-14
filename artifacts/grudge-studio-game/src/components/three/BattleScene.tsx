import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Sky, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { TileGrid, tileToWorld } from './TileGrid';
import { CharacterModel, AnimState } from './CharacterModel';
import { ScenePropLayer, preloadLevelProps } from './ScenePropLayer';
import { TacticalUnit } from '@/store/use-game-store';
import { LevelDef } from '@/lib/levels';

interface BattleSceneProps {
  units: TacticalUnit[];
  level: LevelDef;
  reachableTiles: Array<{x: number, y: number}>;
  attackableTiles: Array<{x: number, y: number}>;
  currentUnitId: string | null;
  actionMode: string;
  onTileClick: (x: number, y: number) => void;
  animStates: Record<string, AnimState>;
}

const FACING_ANGLES = [0, Math.PI / 2, Math.PI, -Math.PI / 2]; // N, E, S, W

export function BattleScene({
  units, level, reachableTiles, attackableTiles,
  currentUnitId, actionMode, onTileClick, animStates,
}: BattleSceneProps) {
  const [hoveredTile, setHoveredTile] = useState<{x: number, y: number} | null>(null);

  const { gridW, gridH, tileSize, skyColor, fogColor, fogNear, fogFar } = level;
  const centerX = (gridW * tileSize) / 2;
  const centerZ = (gridH * tileSize) / 2;

  // Camera distance scales with grid size
  const camDist = Math.max(gridW, gridH) * tileSize * 0.55;
  const camHeight = camDist * 0.7;
  const maxDist = camDist * 2.2;

  // Preload this level's props on first render
  React.useMemo(() => preloadLevelProps(level.props), [level.id]);

  return (
    <Canvas
      style={{ width: '100%', height: '100%' }}
      camera={{ position: [centerX, camHeight, centerZ + camDist], fov: 50 }}
      shadows
      gl={{ antialias: true, alpha: false, outputColorSpace: THREE.SRGBColorSpace }}
    >
      <color attach="background" args={[skyColor]} />
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />

      {/* Sky dome for outdoor feel */}
      <Stars radius={200} depth={80} count={3000} factor={3} />

      {/* ===== LIGHTING — MUCH BRIGHTER ===== */}
      {/* Hemisphere: sky above, ground below */}
      <hemisphereLight
        args={['#c8e0ff', '#6a5040', 1.4]}
      />

      {/* Strong sun */}
      <directionalLight
        position={[centerX + 40, 80, centerZ - 30]}
        intensity={3.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-centerX - 20}
        shadow-camera-right={centerX + 20}
        shadow-camera-top={centerZ + 20}
        shadow-camera-bottom={-centerZ - 20}
        shadow-camera-far={400}
      />

      {/* Fill light from opposite side */}
      <directionalLight
        position={[centerX - 40, 40, centerZ + 40]}
        intensity={1.8}
        color="#ffe8c0"
      />

      {/* Ambient fill */}
      <ambientLight intensity={0.9} />

      {/* Accent point lights at corners */}
      <pointLight position={[10,    15, 10]}           color="#ff7700" intensity={1.2} distance={tileSize * 20} />
      <pointLight position={[centerX * 2 - 10, 15, 10]} color="#4488ff" intensity={1.0} distance={tileSize * 20} />
      <pointLight position={[centerX, 20, centerZ]}    color="#ffdd88" intensity={0.8} distance={tileSize * 25} />
      <pointLight position={[10, 15, centerZ * 2 - 10]} color="#44ccaa" intensity={0.8} distance={tileSize * 20} />
      <pointLight position={[centerX * 2 - 10, 15, centerZ * 2 - 10]} color="#ff4422" intensity={0.8} distance={tileSize * 20} />

      <OrbitControls
        target={[centerX, 0, centerZ]}
        enablePan
        panSpeed={2}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 2.3}
        minDistance={tileSize * 5}
        maxDistance={maxDist}
      />

      <Suspense fallback={null}>
        <group>
          <TileGrid
            level={level}
            reachableTiles={reachableTiles}
            attackableTiles={attackableTiles}
            onTileClick={onTileClick}
            hoveredTile={hoveredTile}
            setHoveredTile={setHoveredTile}
          />

          <ScenePropLayer props={level.props} />

          {units.map(unit => {
            const worldPos = tileToWorld(unit.position.x, unit.position.y, tileSize);
            const facingAngle = FACING_ANGLES[unit.facing ?? 2];

            return (
              <CharacterModel
                key={unit.id}
                unit={unit}
                position={worldPos}
                facingAngle={facingAngle}
                isSelected={currentUnitId === unit.id}
                animState={animStates[unit.id] || 'idle'}
              />
            );
          })}
        </group>
      </Suspense>
    </Canvas>
  );
}
