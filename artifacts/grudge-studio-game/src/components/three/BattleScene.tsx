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
  animStates
}: BattleSceneProps) {
  const [hoveredTile, setHoveredTile] = useState<{x: number, y: number} | null>(null);

  const centerX = (GRID_W * TILE_SIZE) / 2;
  const centerZ = (GRID_H * TILE_SIZE) / 2;

  return (
    <Canvas
      style={{ width: '100%', height: '100%' }}
      camera={{ position: [centerX, 12, centerZ + 10], fov: 50 }}
      shadows
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={['#0a0a14']} />
      <fog attach="fog" args={['#0a0a14', 20, 40]} />
      <Stars radius={100} depth={50} count={3000} factor={4} />

      <ambientLight intensity={0.3} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize-width={2048} 
        shadow-mapSize-height={2048} 
      />
      
      {/* Atmosphere lights */}
      <pointLight position={[centerX, 5, 4]} color="#ff6600" intensity={0.8} distance={20} />
      <pointLight position={[0, 5, 0]} color="#4444ff" intensity={0.5} distance={20} />

      <OrbitControls 
        target={[centerX, 0, centerZ]}
        enablePan={false}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.5}
        minDistance={8}
        maxDistance={25}
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
          // Keep dead units visible but maybe faded (handled in CharacterModel)
          const elevation = getTileElevation(unit.position.x, unit.position.y);
          const worldPos = tileToWorld(unit.position.x, unit.position.y, elevation);
          
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
