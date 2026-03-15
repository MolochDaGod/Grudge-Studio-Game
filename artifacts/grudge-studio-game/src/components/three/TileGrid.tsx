import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { LevelDef } from '@/lib/levels';

export { GRID_W, GRID_H, TILE_SIZE } from './TileGrid.constants';

// Re-export convenience helpers
export function getTileElevation(_x: number, _y: number): number { return 0; }

export function tileToWorld(x: number, y: number, tileSize: number, elevation = 0): [number, number, number] {
  return [x * tileSize + tileSize / 2, elevation, y * tileSize + tileSize / 2];
}

interface TileGridProps {
  level: LevelDef;
  reachableTiles: Array<{ x: number; y: number }>;
  attackableTiles: Array<{ x: number; y: number }>;
  onTileClick: (x: number, y: number) => void;
  hoveredTile: { x: number; y: number } | null;
  setHoveredTile: (t: { x: number; y: number } | null) => void;
  onRightClick?: (x: number, y: number, screenX: number, screenY: number) => void;
}

const TILE_H = 0.18;
const OBSTACLE_H_DEFAULT = TILE_H * 3;

// Color palette
const COLOR_DARK    = new THREE.Color(0x2a2a35);
const COLOR_LIGHT   = new THREE.Color(0x3a3a45);
const COLOR_BLOCKED = new THREE.Color(0x1a1218);

export function TileGrid({ level, reachableTiles, attackableTiles, onTileClick, hoveredTile, setHoveredTile, onRightClick }: TileGridProps) {
  const { gridW, gridH, tileSize, obstacleTiles, groundColor, groundColor2 } = level;
  const instRef = useRef<THREE.InstancedMesh>(null!);
  const totalTiles = gridW * gridH;

  // Build instanced mesh once per level
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const colorDark  = useMemo(() => new THREE.Color(groundColor),  [groundColor]);
  const colorLight = useMemo(() => new THREE.Color(groundColor2), [groundColor2]);
  const colorBlock = useMemo(() => COLOR_BLOCKED.clone(), []);

  // Initialize instance matrices and colors
  useEffect(() => {
    const mesh = instRef.current;
    if (!mesh) return;
    const obsH = level.wallHeight ?? OBSTACLE_H_DEFAULT;
    let idx = 0;
    for (let x = 0; x < gridW; x++) {
      for (let y = 0; y < gridH; y++) {
        const isObs = obstacleTiles.has(`${x},${y}`);
        const h = isObs ? obsH : TILE_H;
        dummy.position.set(x * tileSize + tileSize / 2, h / 2, y * tileSize + tileSize / 2);
        dummy.scale.set(tileSize * 0.96, h, tileSize * 0.96);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
        const col = isObs ? colorBlock : ((x + y) % 2 === 0 ? colorDark : colorLight);
        mesh.setColorAt(idx, col);
        idx++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [gridW, gridH, tileSize, obstacleTiles, colorDark, colorLight, colorBlock, dummy, level.wallHeight]);

  // Highlight tile overlays (only highlighted tiles rendered separately for clarity)
  const highlightedTiles = useMemo(() => {
    const all: Array<{ x: number; y: number; type: 'reach' | 'attack' | 'hover' }> = [];
    for (const t of reachableTiles) all.push({ ...t, type: 'reach' });
    for (const t of attackableTiles) all.push({ ...t, type: 'attack' });
    if (hoveredTile) all.push({ ...hoveredTile, type: 'hover' });
    return all;
  }, [reachableTiles, attackableTiles, hoveredTile]);

  // Invisible click catcher plane
  const worldW = gridW * tileSize;
  const worldH = gridH * tileSize;

  const handleClick = (e: any) => {
    e.stopPropagation();
    const p = e.point;
    const x = Math.floor(p.x / tileSize);
    const y = Math.floor(p.z / tileSize);
    if (x >= 0 && x < gridW && y >= 0 && y < gridH) onTileClick(x, y);
  };

  const handleRightClick = (e: any) => {
    e.stopPropagation();
    const p = e.point;
    const x = Math.floor(p.x / tileSize);
    const y = Math.floor(p.z / tileSize);
    if (x >= 0 && x < gridW && y >= 0 && y < gridH) {
      onRightClick?.(x, y, e.nativeEvent?.clientX ?? 0, e.nativeEvent?.clientY ?? 0);
    }
  };
  const handleMove = (e: any) => {
    e.stopPropagation();
    const p = e.point;
    const x = Math.floor(p.x / tileSize);
    const y = Math.floor(p.z / tileSize);
    if (x >= 0 && x < gridW && y >= 0 && y < gridH) {
      setHoveredTile({ x, y });
    } else {
      setHoveredTile(null);
    }
  };

  return (
    <group>
      {/* Instanced tiles */}
      <instancedMesh ref={instRef} args={[undefined, undefined, totalTiles]} receiveShadow castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.85} metalness={0.1} />
      </instancedMesh>

      {/* Ground plane */}
      <mesh position={[worldW / 2, -0.08, worldH / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[worldW + 8, worldH + 8]} />
        <meshStandardMaterial color={groundColor} roughness={1} />
      </mesh>

      {/* Invisible event catcher */}
      <mesh position={[worldW / 2, 0.15, worldH / 2]} rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleClick} onPointerMove={handleMove} onPointerOut={() => setHoveredTile(null)}
        onContextMenu={handleRightClick}>
        <planeGeometry args={[worldW, worldH]} />
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Highlight overlays */}
      {highlightedTiles.map(({ x, y, type }, i) => {
        const [wx, , wz] = tileToWorld(x, y, tileSize);
        const color = type === 'attack' ? '#ff3333' : type === 'hover' ? '#ffffaa' : '#3388ff';
        const opacity = type === 'hover' ? 0.45 : 0.38;
        return (
          <mesh key={`hl_${i}`} position={[wx, 0.22, wz]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[tileSize * 0.82, tileSize * 0.82]} />
            <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}
