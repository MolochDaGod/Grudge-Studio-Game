import React, { useMemo } from 'react';
import * as THREE from 'three';

export const GRID_W = 16;
export const GRID_H = 12;
export const TILE_SIZE = 1.5;
export const TILE_HEIGHT = 0.2;

const ELEVATION_MAP: Record<string, number> = {
  // Central plateau
  '7,5': 0.5, '8,5': 0.5, '7,6': 0.5, '8,6': 0.5,
  '6,5': 0.3, '9,5': 0.3, '7,4': 0.3, '8,7': 0.3,
  // Left flank hills
  '2,2': 0.3, '3,2': 0.3, '2,3': 0.3,
  '1,8': 0.3, '2,8': 0.3, '1,9': 0.3,
  '0,0': 0.5, '0,11': 0.5,
  // Right flank hills
  '13,2': 0.3, '14,2': 0.3, '13,3': 0.3,
  '12,8': 0.3, '13,8': 0.3, '13,9': 0.3,
  '15,0': 0.5, '15,11': 0.5,
  // Mid terrain
  '5,5': 0.3, '5,6': 0.3, '4,10': 0.3,
  '10,5': 0.3, '10,6': 0.3, '11,1': 0.3,
  // Low bumps
  '3,6': 0.15, '7,3': 0.15, '9,9': 0.15, '12,6': 0.15,
  '6,10': 0.15, '10,2': 0.15,
};

export function getTileElevation(x: number, y: number): number {
  return ELEVATION_MAP[`${x},${y}`] || 0;
}

export function tileToWorld(x: number, y: number, elevation: number = 0): [number, number, number] {
  return [
    x * TILE_SIZE + TILE_SIZE / 2,
    elevation + TILE_HEIGHT / 2,
    y * TILE_SIZE + TILE_SIZE / 2
  ];
}

interface TileGridProps {
  reachableTiles: Array<{x: number, y: number}>;
  attackableTiles: Array<{x: number, y: number}>;
  onTileClick: (x: number, y: number) => void;
  hoveredTile: {x: number, y: number} | null;
  setHoveredTile: (tile: {x: number, y: number} | null) => void;
}

export function TileGrid({ reachableTiles, attackableTiles, onTileClick, hoveredTile, setHoveredTile }: TileGridProps) {
  const tiles = useMemo(() => {
    const arr = [];
    for (let x = 0; x < GRID_W; x++) {
      for (let y = 0; y < GRID_H; y++) {
        arr.push({ x, y });
      }
    }
    return arr;
  }, []);

  return (
    <group>
      {tiles.map(({ x, y }) => {
        const isDark = (x + y) % 2 === 0;
        const elevation = getTileElevation(x, y);
        const [wx, wy, wz] = tileToWorld(x, y, elevation);

        const isReachable = reachableTiles.some(t => t.x === x && t.y === y);
        const isAttackable = attackableTiles.some(t => t.x === x && t.y === y);
        const isHovered = hoveredTile?.x === x && hoveredTile?.y === y;

        let emissiveColor = new THREE.Color(0x000000);
        let emissiveIntensity = 0;

        if (isAttackable) {
          emissiveColor.setHex(0xff0000);
          emissiveIntensity = 0.5;
        } else if (isReachable) {
          emissiveColor.setHex(0x0088ff);
          emissiveIntensity = 0.5;
        } else if (isHovered) {
          emissiveColor.setHex(0xaaaa00);
          emissiveIntensity = 0.3;
        }

        const baseColor = isDark ? '#2a2a35' : '#3a3a45';

        return (
          <mesh
            key={`${x},${y}`}
            position={[wx, elevation / 2, wz]}
            onClick={(e) => { e.stopPropagation(); onTileClick(x, y); }}
            onPointerOver={(e) => { e.stopPropagation(); setHoveredTile({x, y}); }}
            onPointerOut={(e) => { e.stopPropagation(); setHoveredTile(null); }}
            receiveShadow
            castShadow
          >
            <boxGeometry args={[TILE_SIZE * 0.95, TILE_HEIGHT + elevation, TILE_SIZE * 0.95]} />
            <meshStandardMaterial
              color={baseColor}
              roughness={0.8}
              metalness={0.2}
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
            />
            {(isReachable || isAttackable) && (
              <mesh
                position={[0, (TILE_HEIGHT + elevation) / 2 + 0.01, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <planeGeometry args={[TILE_SIZE * 0.8, TILE_SIZE * 0.8]} />
                <meshBasicMaterial
                  color={isAttackable ? '#ff4444' : '#4488ff'}
                  transparent
                  opacity={0.3}
                  depthWrite={false}
                />
              </mesh>
            )}
          </mesh>
        );
      })}

      <mesh
        position={[(GRID_W * TILE_SIZE) / 2, -0.1, (GRID_H * TILE_SIZE) / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[GRID_W * TILE_SIZE + 4, GRID_H * TILE_SIZE + 4]} />
        <meshStandardMaterial color="#111116" roughness={1} />
      </mesh>
    </group>
  );
}
