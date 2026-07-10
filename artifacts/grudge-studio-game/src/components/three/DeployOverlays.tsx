import React from 'react';
import * as THREE from 'three';
import { tileToWorld } from './TileGrid';
import type { BuildPlacement } from '@/lib/lane-deploy';
import type { BuildCatalogEntry } from '@/lib/build-catalog';
import { buildModelUrl } from '@/lib/build-catalog';
import type { TacticalStructure } from '@/lib/structure-combat';
import { useGLTF } from '@react-three/drei';

export interface DeployOverlayTile {
  x: number;
  y: number;
  color: string;
  kind: 'deploy' | 'path';
}

function BuildProp({ entry, x, y, tileSize }: { entry: BuildCatalogEntry; x: number; y: number; tileSize: number }) {
  const url = buildModelUrl(entry);
  const { scene } = useGLTF(url);
  const [wx, , wz] = tileToWorld(x, y, tileSize, 0);
  const clone = scene.clone();
  return (
    <primitive
      object={clone}
      position={[wx, 0, wz]}
      scale={entry.scale}
      rotation={[0, 0, 0]}
    />
  );
}

export function DeployOverlays({
  tiles,
  tileSize,
}: {
  tiles: DeployOverlayTile[];
  tileSize: number;
}) {
  return (
    <group>
      {tiles.map((t, i) => {
        const [wx, , wz] = tileToWorld(t.x, t.y, tileSize, 0.06);
        const isPath = t.kind === 'path';
        return (
          <mesh
            key={`${t.x}-${t.y}-${t.kind}-${i}`}
            position={[wx, 0.06, wz]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={isPath ? [0.35, 0.48, 16] : [0.42, 0.55, 16]} />
            <meshBasicMaterial
              color={t.color}
              transparent
              opacity={isPath ? 0.35 : 0.55}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function BuildPlacementLayer({
  placements,
  catalog,
  tileSize,
}: {
  placements: BuildPlacement[];
  catalog: BuildCatalogEntry[];
  tileSize: number;
}) {
  return (
    <group>
      {placements.map((p) => {
        const entry = catalog.find((c) => c.id === p.catalogId);
        if (!entry) return null;
        return (
          <BuildProp key={p.id} entry={entry} x={p.x} y={p.y} tileSize={tileSize} />
        );
      })}
    </group>
  );
}

/** HP bars + watchtower threat radius for live tactical structures. */
export function StructureCombatOverlay({
  structures,
  catalog,
  tileSize,
}: {
  structures: TacticalStructure[];
  catalog: BuildCatalogEntry[];
  tileSize: number;
}) {
  return (
    <group>
      {structures.map((s) => {
        if (s.hp <= 0) return null;
        const [wx, , wz] = tileToWorld(s.x, s.y, tileSize, 0.08);
        const hpPct = s.hp / s.maxHp;
        const hpColor = hpPct > 0.5 ? '#44cc66' : hpPct > 0.25 ? '#ccaa22' : '#cc3333';
        const entry = catalog.find((c) => c.id === s.catalogId);
        const isWatchtower = s.catalogId === 'watchtower';
        const radius = entry?.attackRadius ?? 5;
        const ringOuter = tileSize * radius;
        const ringInner = ringOuter - tileSize * 0.35;

        return (
          <group key={`struct-${s.id}`}>
            <mesh position={[wx, 0.12, wz]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.55, 0.72, 24]} />
              <meshBasicMaterial color="#111820" transparent opacity={0.7} depthWrite={false} />
            </mesh>
            <mesh position={[wx, 0.13, wz]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.55, 0.55 + 0.17 * hpPct, 24]} />
              <meshBasicMaterial color={hpColor} transparent opacity={0.9} depthWrite={false} />
            </mesh>
            {isWatchtower && (
              <mesh position={[wx, 0.05, wz]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[ringInner, ringOuter, 48]} />
                <meshBasicMaterial color="#cc6622" transparent opacity={0.12} depthWrite={false} />
              </mesh>
            )}
            {s.catalogId === 'brazier' && (
              <mesh position={[wx, 0.9, wz]}>
                <sphereGeometry args={[0.18, 8, 8]} />
                <meshBasicMaterial color="#ff6622" transparent opacity={0.35} depthWrite={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

export function BackTowerMarker({
  x,
  y,
  tileSize,
  label,
}: {
  x: number;
  y: number;
  tileSize: number;
  label: string;
}) {
  const [wx, , wz] = tileToWorld(x, y, tileSize, 0.1);
  return (
    <group position={[wx, 0, wz]}>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.5, 0.65, 2.4, 8]} />
        <meshStandardMaterial color="#4a5568" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.6, 0]}>
        <coneGeometry args={[0.75, 1.2, 8]} />
        <meshStandardMaterial color="#d4a017" emissive="#886600" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.0, 1.35, 32]} />
        <meshBasicMaterial color="#d4a017" transparent opacity={0.45} depthWrite={false} />
      </mesh>
    </group>
  );
}