import React, { Suspense, useState, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Html } from '@react-three/drei';
import * as THREE from 'three';
import { TileGrid, tileToWorld } from './TileGrid';
import { CharacterModel, AnimState } from './CharacterModel';
import { ScenePropLayer, preloadLevelProps } from './ScenePropLayer';
import { CombatEffectsLayer, CombatEffectData } from './CombatEffects';
import { NatureDecor } from './NatureDecor';
import { TacticalUnit } from '@/store/use-game-store';
import { LevelDef } from '@/lib/levels';

export type CameraMode = 'tactical' | 'free' | 'third-person' | 'rts';

export type MapPing = {
  id: string;
  tx: number;
  ty: number;
  type: 'alert' | 'danger' | 'retreat';
  createdAt: number;
};

interface BattleSceneProps {
  units: TacticalUnit[];
  level: LevelDef;
  reachableTiles: Array<{x: number, y: number}>;
  attackableTiles: Array<{x: number, y: number}>;
  currentUnitId: string | null;
  actionMode: string;
  onTileClick: (x: number, y: number) => void;
  animStates: Record<string, AnimState>;
  combatEffects?: CombatEffectData[];
  cameraFocus?: [number, number, number] | null;
  cameraMode?: CameraMode;
  onUnitDoubleClick?: (unitId: string) => void;
  showUnitInfo?: boolean;
  mapPings?: MapPing[];
  onUnitRightClick?: (unitId: string, screenX: number, screenY: number) => void;
  onMapRightClick?: (tx: number, ty: number, screenX: number, screenY: number) => void;
}

// ── Quad-mode Camera Controller ──────────────────────────────────────────────
// tactical     → isometric-locked (Mario+Rabbids style), Q/E rotates 90°
// free         → normal OrbitControls (with optional smooth pan-to-focus)
// third-person → locks behind the active unit, follows turn changes
// rts          → locks high overhead, top-down strategy view
function CameraController({
  focus,
  mode,
  currentUnit,
  centerX,
  centerZ,
  tileSize,
  maxDist,
}: {
  focus: [number, number, number] | null | undefined;
  mode: CameraMode;
  currentUnit: TacticalUnit | null;
  centerX: number;
  centerZ: number;
  tileSize: number;
  maxDist: number;
}) {
  const { camera, controls, gl } = useThree() as any;

  const panTarget  = useRef(new THREE.Vector3());
  const isPanning  = useRef(false);
  const _camPos    = useRef(new THREE.Vector3());
  const _lookAt    = useRef(new THREE.Vector3());
  const zoomRef    = useRef(1.0);
  const modeRef    = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // ── Tactical camera state ─────────────────────────────────────────────────
  const TACTICAL_POLAR   = Math.PI * 0.30;            // ~54° from vertical — Mario-Rabbids angle
  const tacticalRadius   = useRef(Math.max(maxDist * 0.55, tileSize * 9));
  const tacticalAzimuth  = useRef(Math.PI * 0.25);    // start at 45° like MR
  const tacticalAzTarget = useRef(Math.PI * 0.25);
  const tacticalPan      = useRef(new THREE.Vector3(centerX, 0, centerZ));

  // Tactical: wheel zoom + Q/E + arrow pan + HUD button events
  useEffect(() => {
    if (mode !== 'tactical') return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      tacticalRadius.current = THREE.MathUtils.clamp(
        tacticalRadius.current * (1 + e.deltaY * 0.001),
        tileSize * 3, maxDist
      );
    };

    const onKey = (e: KeyboardEvent) => {
      if (modeRef.current !== 'tactical') return;
      if (e.key === 'q' || e.key === 'Q') { tacticalAzTarget.current -= Math.PI / 2; return; }
      if (e.key === 'e' || e.key === 'E') { tacticalAzTarget.current += Math.PI / 2; return; }
      const panStep = tileSize * 1.8;
      const sinA = Math.sin(tacticalAzimuth.current);
      const cosA = Math.cos(tacticalAzimuth.current);
      if (e.key === 'ArrowLeft')  { tacticalPan.current.x -= cosA * panStep; tacticalPan.current.z += sinA * panStep; }
      if (e.key === 'ArrowRight') { tacticalPan.current.x += cosA * panStep; tacticalPan.current.z -= sinA * panStep; }
      if (e.key === 'ArrowUp')    { tacticalPan.current.x -= sinA * panStep; tacticalPan.current.z -= cosA * panStep; }
      if (e.key === 'ArrowDown')  { tacticalPan.current.x += sinA * panStep; tacticalPan.current.z += cosA * panStep; }
    };

    const onRotateEvt = (e: Event) => {
      const dir = (e as CustomEvent).detail;
      if (dir === 'left')  tacticalAzTarget.current -= Math.PI / 2;
      if (dir === 'right') tacticalAzTarget.current += Math.PI / 2;
    };

    gl.domElement.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    document.addEventListener('camera-rotate', onRotateEvt);
    return () => {
      gl.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('camera-rotate', onRotateEvt);
    };
  }, [mode, tileSize, maxDist, gl.domElement]);

  // Mouse wheel zoom for RTS / third-person (unchanged)
  useEffect(() => {
    if (mode === 'tactical') return;
    const canvas = gl.domElement as HTMLCanvasElement;
    const onWheel = (e: WheelEvent) => {
      if (modeRef.current === 'free') return;
      e.preventDefault();
      zoomRef.current = Math.max(0.2, Math.min(2.8, zoomRef.current + e.deltaY * 0.0008));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [gl.domElement, mode]);

  // React to focus changes
  useEffect(() => {
    if (!focus) return;
    if (modeRef.current === 'tactical') {
      tacticalPan.current.set(focus[0], 0, focus[2]);
    } else {
      panTarget.current.set(focus[0], focus[1], focus[2]);
      isPanning.current = true;
    }
  }, [focus]);

  useFrame((_, delta) => {
    if (!controls) return;

    if (mode === 'tactical') {
      controls.enabled = false;

      // Smooth azimuth rotation
      const diff = tacticalAzTarget.current - tacticalAzimuth.current;
      tacticalAzimuth.current += diff * Math.min(1, delta * 5);

      const r    = tacticalRadius.current;
      const sinP = Math.sin(TACTICAL_POLAR);
      const cosP = Math.cos(TACTICAL_POLAR);
      const sinA = Math.sin(tacticalAzimuth.current);
      const cosA = Math.cos(tacticalAzimuth.current);
      const pt   = tacticalPan.current;

      _camPos.current.set(pt.x + r * sinP * sinA, pt.y + r * cosP, pt.z + r * sinP * cosA);
      _lookAt.current.copy(pt);

      camera.position.lerp(_camPos.current, Math.min(1, delta * 4));
      controls.target.lerp(_lookAt.current, Math.min(1, delta * 4));
      camera.lookAt(_lookAt.current);

    } else if (mode === 'free') {
      if (!controls.enabled) {
        controls.target.copy(camera.position.clone().add(
          new THREE.Vector3(0, 0, -5).applyQuaternion(camera.quaternion)
        ));
        controls.enabled = true;
      }
      if (isPanning.current) {
        const t = controls.target as THREE.Vector3;
        if (t.distanceTo(panTarget.current) < 0.08) { isPanning.current = false; return; }
        t.lerp(panTarget.current, Math.min(1, delta * 4.5));
        controls.update();
      }

    } else if (mode === 'rts') {
      controls.enabled = false;
      isPanning.current = false;
      const rtsY = maxDist * 0.85 * zoomRef.current;
      _camPos.current.set(centerX, rtsY, centerZ + tileSize * 1.5);
      _lookAt.current.set(centerX, 0, centerZ);
      camera.position.lerp(_camPos.current, Math.min(1, delta * 2.2));
      controls.target.lerp(_lookAt.current, Math.min(1, delta * 2.2));
      camera.lookAt(_lookAt.current);

    } else if (mode === 'third-person') {
      controls.enabled = false;
      isPanning.current = false;
      if (!currentUnit) return;
      const [wx, , wz] = tileToWorld(currentUnit.position.x, currentUnit.position.y, tileSize, 0);
      const angle = FACING_ANGLES[currentUnit.facing ?? 2];
      const followDist   = 6 * Math.max(0.3, zoomRef.current);
      const followHeight = 4 * Math.max(0.3, zoomRef.current);
      _camPos.current.set(wx - Math.sin(angle) * followDist, followHeight, wz - Math.cos(angle) * followDist);
      _lookAt.current.set(wx, 1, wz);
      camera.position.lerp(_camPos.current, Math.min(1, delta * 3.5));
      controls.target.lerp(_lookAt.current, Math.min(1, delta * 3.5));
      camera.lookAt(_lookAt.current);
    }
  });

  return null;
}

const FACING_ANGLES = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

// ── Unit team rings + floating health bars ────────────────────────────────────
function UnitMarkers({ units, tileSize }: { units: TacticalUnit[]; tileSize: number }) {
  return (
    <>
      {units.filter(u => u.hp > 0).map(unit => {
        const [wx, , wz] = tileToWorld(unit.position.x, unit.position.y, tileSize, 0);
        const hpPct = Math.max(0, (unit.hp / unit.maxHp) * 100);
        const ringColor = unit.isPlayerControlled ? '#4488ff' : '#ff4444';
        const barColor  = hpPct > 60 ? '#22cc55' : hpPct > 30 ? '#ffaa00' : '#ff3333';
        const borderColor = unit.isPlayerControlled ? '#4488ffaa' : '#ff4444aa';
        return (
          <group key={unit.id + '_marker'}>
            {/* Glowing team ring under feet */}
            <mesh position={[wx, 0.09, wz]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.52, 0.70, 36]} />
              <meshBasicMaterial color={ringColor} transparent opacity={0.82} depthWrite={false} />
            </mesh>
            {/* Floating health bar */}
            <Html position={[wx, 3.1, wz]} center distanceFactor={16} zIndexRange={[0, 10]}>
              <div style={{ width: 58, pointerEvents: 'none' }}>
                <div style={{
                  background: 'rgba(0,0,0,0.88)',
                  border: `1px solid ${borderColor}`,
                  borderRadius: 4,
                  padding: '3px 4px 2px',
                }}>
                  <div style={{ fontSize: 8, color: unit.isPlayerControlled ? '#88aaff' : '#ff8888', fontWeight: 700, fontFamily: 'monospace', marginBottom: 2, textAlign: 'center', letterSpacing: 0.5, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {unit.name.split(' ')[0]}
                  </div>
                  <div style={{ height: 5, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${hpPct}%`, background: barColor, transition: 'width 0.35s' }} />
                  </div>
                  <div style={{ fontSize: 8, textAlign: 'center', color: '#aaa', fontFamily: 'monospace', marginTop: 1, lineHeight: 1.1 }}>
                    {unit.hp}/{unit.maxHp}
                  </div>
                </div>
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}

// ── Map ping markers (alert / danger / retreat) ───────────────────────────────
function PingMarkers({ pings, tileSize }: { pings: MapPing[]; tileSize: number }) {
  const ringRefs = useRef<Record<string, THREE.Mesh | null>>({});

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    Object.entries(ringRefs.current).forEach(([, mesh]) => {
      if (!mesh) return;
      const s = 0.85 + 0.3 * Math.abs(Math.sin(t * 2.2));
      mesh.scale.set(s, s, s);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.45 + 0.35 * Math.abs(Math.sin(t * 2.2));
    });
  });

  return (
    <>
      {pings.map(ping => {
        const [wx, , wz] = tileToWorld(ping.tx, ping.ty, tileSize, 0);
        const color = ping.type === 'alert' ? '#ffcc00' : ping.type === 'danger' ? '#ff3333' : '#4488ff';
        const emoji = ping.type === 'alert' ? '⚠️' : ping.type === 'danger' ? '☠️' : '↩️';
        return (
          <group key={ping.id}>
            <mesh
              ref={el => { ringRefs.current[ping.id] = el; }}
              position={[wx, 0.18, wz]} rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[0.55, 0.78, 32]} />
              <meshBasicMaterial color={color} transparent opacity={0.65} depthWrite={false} />
            </mesh>
            <Html position={[wx, 2.0, wz]} center zIndexRange={[0, 5]}>
              <div style={{ fontSize: 22, pointerEvents: 'none', filter: 'drop-shadow(0 1px 5px #000)', lineHeight: 1 }}>
                {emoji}
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}

// ── Animated ocean plane ─────────────────────────────────────────────────────
function OceanPlane({ cx, cz }: { cx: number; cz: number }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(({ clock }) => {
    if (matRef.current) {
      const t = clock.getElapsedTime();
      matRef.current.emissiveIntensity = 0.06 + 0.04 * Math.sin(t * 0.7);
    }
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -1.5, cz]} receiveShadow>
      <planeGeometry args={[3000, 3000]} />
      <meshStandardMaterial
        ref={matRef}
        color="#0a5080"
        emissive="#1478a8"
        emissiveIntensity={0.07}
        roughness={0.18}
        metalness={0.35}
      />
    </mesh>
  );
}

// ── Island base + rocky border per theme ─────────────────────────────────────
type IslandTheme = 'ruins' | 'orc' | 'elven' | 'medieval';

const THEME_BORDER: Record<IslandTheme, { base: string; rock: string; lavaGlow?: string }> = {
  ruins:    { base: '#5a5040', rock: '#484038' },
  orc:      { base: '#3a2010', rock: '#1a0808', lavaGlow: '#ff3300' },
  elven:    { base: '#3a5028', rock: '#506840' },
  medieval: { base: '#5a5850', rock: '#484440' },
};

function IslandEnvironment({
  cx, cz, gridW, gridH, tileSize, theme,
}: {
  cx: number; cz: number; gridW: number; gridH: number; tileSize: number; theme: IslandTheme;
}) {
  const border = 32;
  const islandW = gridW * tileSize + border * 2;
  const islandH = gridH * tileSize + border * 2;
  const t = THEME_BORDER[theme] ?? THEME_BORDER.medieval;

  // Random rocks around the border
  const rocks = useMemo(() => {
    const rng = (seed: number) => { let x = Math.sin(seed) * 43758.5453; return x - Math.floor(x); };
    const items: Array<{ x: number; z: number; sy: number; r: number; rot: number }> = [];
    const margin = 4;
    const outerW = islandW / 2;
    const outerH = islandH / 2;
    const innerW = (gridW * tileSize) / 2 + margin;
    const innerH = (gridH * tileSize) / 2 + margin;
    for (let i = 0; i < 220; i++) {
      let px: number, pz: number;
      const edge = rng(i * 7.1) < 0.5;
      if (edge) {
        px = (rng(i * 3.1) * 2 - 1) * outerW;
        pz = (rng(i * 5.3) * 2 - 1) * outerH;
      } else {
        const side = Math.floor(rng(i * 13.7) * 4);
        if (side === 0) { px = (rng(i * 2.9) * 2 - 1) * outerW; pz = -(innerH + rng(i * 4.1) * (outerH - innerH)); }
        else if (side === 1) { px = (rng(i * 2.9) * 2 - 1) * outerW; pz = innerH + rng(i * 4.1) * (outerH - innerH); }
        else if (side === 2) { pz = (rng(i * 2.9) * 2 - 1) * outerH; px = -(innerW + rng(i * 4.1) * (outerW - innerW)); }
        else { pz = (rng(i * 2.9) * 2 - 1) * outerH; px = innerW + rng(i * 4.1) * (outerW - innerW); }
      }
      const inGrid = Math.abs(px) < innerW && Math.abs(pz) < innerH;
      if (inGrid) continue;
      items.push({
        x: cx + px, z: cz + pz,
        sy: 0.12 + rng(i * 11.3) * 0.55,
        r: 0.2 + rng(i * 6.7) * 0.45,
        rot: rng(i * 9.1) * Math.PI,
      });
    }
    return items;
  }, [cx, cz, gridW, gridH, tileSize]);

  // Lava crack refs for orc theme
  const lavaCrackRefs = useRef<THREE.Mesh[]>([]);
  useFrame(({ clock }) => {
    if (theme !== 'orc') return;
    const intensity = 0.4 + 0.3 * Math.sin(clock.getElapsedTime() * 1.8);
    lavaCrackRefs.current.forEach((m) => {
      if (m) (m.material as THREE.MeshBasicMaterial).opacity = intensity;
    });
  });

  // Lava crack positions (orc only)
  const lavaCracks = useMemo(() => {
    if (theme !== 'orc') return [];
    const rng = (s: number) => { const x = Math.sin(s) * 43758.5453; return x - Math.floor(x); };
    return Array.from({ length: 40 }, (_, i) => ({
      x: cx + (rng(i * 17.3) * 2 - 1) * (islandW / 2),
      z: cz + (rng(i * 23.1) * 2 - 1) * (islandH / 2),
      rot: rng(i * 7.9) * Math.PI,
      w: 0.15 + rng(i * 11.2) * 0.8,
      len: 0.8 + rng(i * 5.5) * 2.5,
    }));
  }, [theme, cx, cz, islandW, islandH]);

  return (
    <>
      {/* Island base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.08, cz]} receiveShadow>
        <planeGeometry args={[islandW, islandH]} />
        <meshStandardMaterial color={t.base} roughness={0.92} metalness={0} />
      </mesh>

      {/* Rocks scattered around the border */}
      {rocks.map((rock, i) => (
        <mesh key={i} position={[rock.x, rock.sy * 0.4 - 0.05, rock.z]} rotation={[0, rock.rot, 0]} castShadow>
          <dodecahedronGeometry args={[rock.r, 0]} />
          <meshStandardMaterial color={t.rock} roughness={0.9} metalness={0.05} />
        </mesh>
      ))}

      {/* Lava cracks (orc level only) */}
      {lavaCracks.map((lc, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) lavaCrackRefs.current[i] = el; }}
          position={[lc.x, -0.06, lc.z]}
          rotation={[-Math.PI / 2, 0, lc.rot]}
        >
          <planeGeometry args={[lc.w, lc.len]} />
          <meshBasicMaterial color="#ff3300" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Sandy shore fade ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.07, cz]} receiveShadow>
        <ringGeometry args={[Math.min(islandW, islandH) / 2 - 2, Math.min(islandW, islandH) / 2 + 4, 48]} />
        <meshStandardMaterial color="#8a7a60" roughness={0.95} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

// ── Sky configuration per theme ───────────────────────────────────────────────
function SceneSky({ theme, fogColor }: { theme: IslandTheme; fogColor: string }) {
  if (theme === 'orc') {
    return (
      <Sky
        sunPosition={[100, 3, 50]}
        turbidity={20}
        rayleigh={0.5}
        mieCoefficient={0.06}
        mieDirectionalG={0.85}
        inclination={0.49}
        azimuth={0.3}
      />
    );
  }
  const configs: Record<string, [number, number, number]> = {
    ruins:    [80, 6, 80],
    elven:    [120, 15, 60],
    medieval: [100, 12, 80],
  };
  const [sx, sy, sz] = configs[theme] ?? configs.medieval;
  return (
    <Sky
      sunPosition={[sx, sy, sz]}
      turbidity={theme === 'ruins' ? 14 : 7}
      rayleigh={theme === 'ruins' ? 0.9 : 1.8}
      mieCoefficient={0.005}
      mieDirectionalG={0.8}
    />
  );
}

// ── Main BattleScene ─────────────────────────────────────────────────────────
export function BattleScene({
  units, level, reachableTiles, attackableTiles,
  currentUnitId, actionMode, onTileClick, animStates,
  combatEffects = [], cameraFocus, cameraMode = 'free', onUnitDoubleClick,
  showUnitInfo = false, mapPings = [], onUnitRightClick, onMapRightClick,
}: BattleSceneProps) {
  const [hoveredTile, setHoveredTile] = useState<{x: number, y: number} | null>(null);
  const currentUnit = units.find(u => u.id === currentUnitId) ?? null;

  const { gridW, gridH, tileSize, fogColor, fogNear, fogFar, theme } = level;
  const centerX = (gridW * tileSize) / 2;
  const centerZ = (gridH * tileSize) / 2;

  const camDist  = Math.max(gridW, gridH) * tileSize * 0.55;
  const camHeight = camDist * 0.7;
  const maxDist   = camDist * 2.2;

  React.useMemo(() => preloadLevelProps(level.props), [level.id]);

  return (
    <Canvas
      style={{ width: '100%', height: '100%' }}
      camera={{ position: [centerX, camHeight, centerZ + camDist], fov: 50 }}
      shadows="percentage"
      gl={{ antialias: true, alpha: false, outputColorSpace: THREE.SRGBColorSpace }}
    >
      <color attach="background" args={[level.skyColor]} />
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />

      <SceneSky theme={theme as IslandTheme} fogColor={fogColor} />

      {/* Lighting */}
      <hemisphereLight args={[
        theme === 'orc' ? '#ff9040' : '#c8e0ff',
        theme === 'orc' ? '#3a1000' : '#6a5040',
        theme === 'orc' ? 1.0 : 1.4,
      ]} />
      <directionalLight
        position={[centerX + 40, 80, centerZ - 30]}
        intensity={theme === 'orc' ? 2.5 : 3.5}
        color={theme === 'orc' ? '#ff9040' : '#fff8e8'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-centerX - 20}
        shadow-camera-right={centerX + 20}
        shadow-camera-top={centerZ + 20}
        shadow-camera-bottom={-centerZ - 20}
        shadow-camera-far={400}
      />
      <directionalLight
        position={[centerX - 40, 40, centerZ + 40]}
        intensity={1.8}
        color={theme === 'orc' ? '#ff6020' : '#ffe8c0'}
      />
      <ambientLight intensity={theme === 'orc' ? 0.65 : 0.9} />
      <pointLight position={[10, 15, 10]}                    color="#ff7700" intensity={1.2} distance={tileSize * 20} />
      <pointLight position={[centerX * 2 - 10, 15, 10]}      color="#4488ff" intensity={1.0} distance={tileSize * 20} />
      <pointLight position={[centerX, 20, centerZ]}          color="#ffdd88" intensity={0.8} distance={tileSize * 25} />
      <pointLight position={[10, 15, centerZ * 2 - 10]}      color="#44ccaa" intensity={0.8} distance={tileSize * 20} />
      <pointLight position={[centerX * 2 - 10, 15, centerZ * 2 - 10]} color="#ff4422" intensity={0.8} distance={tileSize * 20} />

      <OrbitControls
        makeDefault
        target={[centerX, 0, centerZ]}
        enablePan
        panSpeed={2}
        minPolarAngle={cameraMode === 'rts' ? Math.PI / 16 : Math.PI / 8}
        maxPolarAngle={cameraMode === 'rts' ? Math.PI / 8 : Math.PI / 2.3}
        minDistance={tileSize * 3}
        maxDistance={maxDist}
      />
      <CameraController
        focus={cameraFocus}
        mode={cameraMode}
        currentUnit={currentUnit}
        centerX={centerX}
        centerZ={centerZ}
        tileSize={tileSize}
        maxDist={maxDist}
      />

      {/* Island + ocean */}
      <IslandEnvironment
        cx={centerX} cz={centerZ}
        gridW={gridW} gridH={gridH} tileSize={tileSize}
        theme={theme as IslandTheme}
      />
      <OceanPlane cx={centerX} cz={centerZ} />

      <Suspense fallback={null}>
        <group>
          <TileGrid
            level={level}
            reachableTiles={reachableTiles}
            attackableTiles={attackableTiles}
            onTileClick={onTileClick}
            hoveredTile={hoveredTile}
            setHoveredTile={setHoveredTile}
            onRightClick={onMapRightClick}
          />

          <ScenePropLayer props={level.props} />

          {/* Craftpix Stylized Nature — trees, rocks, bushes ringing the map border */}
          <NatureDecor gridW={gridW} gridH={gridH} tileSize={tileSize} />

          {units.map(unit => {
            const worldPos = tileToWorld(unit.position.x, unit.position.y, tileSize);
            const facingAngle = FACING_ANGLES[unit.facing ?? 2];
            return (
              <group
                key={unit.id}
                onDoubleClick={e => {
                  e.stopPropagation();
                  onUnitDoubleClick?.(unit.id);
                }}
                onContextMenu={e => {
                  e.stopPropagation();
                  onUnitRightClick?.(unit.id, e.nativeEvent?.clientX ?? 0, e.nativeEvent?.clientY ?? 0);
                }}
              >
                <CharacterModel
                  unit={unit}
                  position={worldPos}
                  facingAngle={facingAngle}
                  isSelected={currentUnitId === unit.id}
                  animState={animStates[unit.id] || 'idle'}
                />
              </group>
            );
          })}

          {showUnitInfo && <UnitMarkers units={units} tileSize={tileSize} />}
          {mapPings.length > 0 && <PingMarkers pings={mapPings} tileSize={tileSize} />}

          <CombatEffectsLayer effects={combatEffects} />
        </group>
      </Suspense>
    </Canvas>
  );
}
