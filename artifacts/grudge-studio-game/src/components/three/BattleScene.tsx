import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { TileGrid, getTileElevation, tileToWorld, GRID_W, GRID_H, TILE_SIZE } from './TileGrid';
import { CharacterModel, AnimState } from './CharacterModel';
import { TacticalUnit } from '@/store/use-game-store';

interface BattleSceneProps {
  units: TacticalUnit[];
  reachableTiles: Array<{x: number, y: number}>;
  attackableTiles: Array<{x: number, y: number}>;
  currentUnitId: string | null;
  actionMode: string;
  onTileClick: (x: number, y: number) => void;
  animStates: Record<string, AnimState>;
}

export function BattleScene({
  units,
  reachableTiles,
  attackableTiles,
  currentUnitId,
  actionMode,
  onTileClick,
  animStates,
}: BattleSceneProps) {
  const [hoveredTile, setHoveredTile] = useState<{x: number, y: number} | null>(null);

  const centerX = (GRID_W * TILE_SIZE) / 2;   // 16 * 1.5 / 2 = 12
  const centerZ = (GRID_H * TILE_SIZE) / 2;   // 12 * 1.5 / 2 = 9

  return (
    <Canvas
      style={{ width: '100%', height: '100%' }}
      camera={{ position: [centerX, 30, centerZ + 24], fov: 48 }}
      shadows
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={['#080810']} />
      <fog attach="fog" args={['#080810', 35, 90]} />
      <Stars radius={120} depth={60} count={4000} factor={4} />

      <ambientLight intensity={0.28} />
      <directionalLight
        position={[centerX + 8, 28, centerZ - 4]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* Atmosphere point lights spread across the larger board */}
      <pointLight position={[4,  6, 4]}          color="#ff5500" intensity={0.9} distance={18} />
      <pointLight position={[20, 6, 4]}          color="#4444ff" intensity={0.6} distance={18} />
      <pointLight position={[centerX, 8, centerZ]} color="#cc6600" intensity={0.5} distance={22} />
      <pointLight position={[4,  6, 16]}         color="#2244cc" intensity={0.5} distance={18} />
      <pointLight position={[20, 6, 16]}         color="#ff3300" intensity={0.6} distance={18} />

      <OrbitControls
        target={[centerX, 0, centerZ]}
        enablePan={false}
        minPolarAngle={Math.PI / 7}
        maxPolarAngle={Math.PI / 2.4}
        minDistance={14}
        maxDistance={55}
      />

      <group position={[0, 0, 0]}>
        <TileGrid
          reachableTiles={reachableTiles}
          attackableTiles={attackableTiles}
          onTileClick={onTileClick}
          hoveredTile={hoveredTile}
          setHoveredTile={setHoveredTile}
        />

        {units.map(unit => {
          const elevation = getTileElevation(unit.position.x, unit.position.y);
          const worldPos  = tileToWorld(unit.position.x, unit.position.y, elevation);

          return (
            <CharacterModel
              key={unit.id}
              unit={unit}
              position={worldPos}
              isSelected={currentUnitId === unit.id}
              animState={animStates[unit.id] || 'idle'}
            />
          );
        })}
      </group>
    </Canvas>
  );
}
