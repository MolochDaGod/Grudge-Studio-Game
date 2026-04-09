import React, { Suspense, useState, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { TileGrid, tileToWorld } from './TileGrid';
import { CharacterModel, AnimState } from './CharacterModel';
import { ScenePropLayer, preloadLevelProps } from './ScenePropLayer';
import { CombatEffectsLayer, CombatEffectData } from './CombatEffects';
import { NatureDecor } from './NatureDecor';
import { SceneErrorBoundary } from './ErrorBoundary';
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

export type GridPos = { x: number; y: number };

interface BattleSceneProps {
  units: TacticalUnit[];
  level: LevelDef;
  reachableTiles: Array<{x: number, y: number}>;
  attackableTiles: Array<{x: number, y: number}>;
  /** Color hint for attackable zone overlay: red=enemy, purple=mobility, green=friendly */
  attackableColor?: string;
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
  onUnitClick?: (unitId: string) => void;
  onUnitHover?: (unitId: string) => void;
  onUnitUnhover?: (unitId: string) => void;
  onMapRightClick?: (tx: number, ty: number, screenX: number, screenY: number) => void;
  /** ID of the unit currently being hovered for attack targeting */
  targetedUnitId?: string | null;
  walkPaths?: Record<string, GridPos[]>;
  onWalkComplete?: (unitId: string) => void;
  onWalkStep?: (unitId: string, tile: GridPos) => void;
}

// ── Camera Shaker ─────────────────────────────────────────────────────────────
// Listens for 'camera-shake' CustomEvents dispatched from battle logic.
// Event detail: { intensity?: number; duration?: number }
function CameraShaker() {
  const { camera } = useThree();
  const shakeRef = useRef<{ intensity: number; duration: number; elapsed: number } | null>(null);
  const originRef = useRef(new THREE.Vector3());

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail ?? {};
      shakeRef.current = {
        intensity: detail.intensity ?? 0.18,
        duration: detail.duration ?? 320,
        elapsed: 0,
      };
      originRef.current.copy(camera.position);
    };
    window.addEventListener('camera-shake', handler);
    return () => window.removeEventListener('camera-shake', handler);
  }, [camera]);

  useFrame((_, delta) => {
    const s = shakeRef.current;
    if (!s) return;
    s.elapsed += delta * 1000;
    if (s.elapsed >= s.duration) {
      camera.position.copy(originRef.current);
      shakeRef.current = null;
      return;
    }
    const progress = s.elapsed / s.duration;
    const decay = 1 - progress;
    const amp = s.intensity * decay;
    camera.position.set(
      originRef.current.x + (Math.random() * 2 - 1) * amp,
      originRef.current.y + (Math.random() * 2 - 1) * amp * 0.5,
      originRef.current.z + (Math.random() * 2 - 1) * amp,
    );
  });

  return null;
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
  const modeRef       = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  const currentUnitRef = useRef(currentUnit);
  useEffect(() => { currentUnitRef.current = currentUnit; }, [currentUnit]);

  // ── Tactical camera state ─────────────────────────────────────────────────
  const TACTICAL_POLAR   = Math.PI * 0.30;            // ~54° from vertical — Mario-Rabbids angle
  const tacticalRadius   = useRef(Math.max(maxDist * 0.55, tileSize * 9));
  const tacticalAzimuth  = useRef(Math.PI * 0.25);    // start at 45° like MR
  const tacticalAzTarget = useRef(Math.PI * 0.25);
  const tacticalPan      = useRef(new THREE.Vector3(centerX, 0, centerZ));
  // Track which WASD keys are held for continuous smooth panning
  const heldKeys = useRef<Set<string>>(new Set());

  // Tactical: scroll zoom · Z/X 45° rotate · WASD pan (held) · C center · HUD events · RMB drag rotate
  useEffect(() => {
    if (mode !== 'tactical') return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      tacticalRadius.current = THREE.MathUtils.clamp(
        tacticalRadius.current * (1 + e.deltaY * 0.001),
        tileSize * 3, maxDist
      );
    };

    // RMB drag to orbit azimuth
    let rmbActive = false;
    let rmbStartX = 0;
    let rmbStartAz = 0;
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 2) return;
      rmbActive = true;
      rmbStartX = e.clientX;
      rmbStartAz = tacticalAzTarget.current;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!rmbActive) return;
      const dx = e.clientX - rmbStartX;
      tacticalAzTarget.current = rmbStartAz + dx * 0.008;
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 2) rmbActive = false;
      rmbActive = false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (modeRef.current !== 'tactical') return;
      // Skip if focus is in a text input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // Q/E or Z/X: 45° rotation around the centre pivot (no distance change)
      if (e.key === 'q' || e.key === 'Q' || e.key === 'z' || e.key === 'Z') { tacticalAzTarget.current -= Math.PI / 4; return; }
      if (e.key === 'e' || e.key === 'E' || e.key === 'x' || e.key === 'X') { tacticalAzTarget.current += Math.PI / 4; return; }
      // C: re-center on active unit
      if (e.key === 'c' || e.key === 'C') {
        const cu = currentUnitRef.current;
        if (cu) {
          const [wx, , wz] = tileToWorld(cu.position.x, cu.position.y, tileSize, 0);
          tacticalPan.current.set(wx, 0, wz);
        }
        return;
      }
      // WASD: hold to pan continuously (handled in useFrame)
      const lower = e.key.toLowerCase();
      if (['w','a','s','d'].includes(lower)) heldKeys.current.add(lower);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeys.current.delete(e.key.toLowerCase());
    };

    const onRotateEvt = (e: Event) => {
      const data = (e as CustomEvent).detail;
      const dir    = typeof data === 'string' ? data : data?.dir;
      const amount = (typeof data === 'object' && data?.amount != null) ? data.amount : Math.PI / 4;
      if (dir === 'left')  tacticalAzTarget.current -= amount;
      if (dir === 'right') tacticalAzTarget.current += amount;
    };

    gl.domElement.addEventListener('wheel', onWheel, { passive: false });
    gl.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    document.addEventListener('camera-rotate', onRotateEvt);
    return () => {
      gl.domElement.removeEventListener('wheel', onWheel);
      gl.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('camera-rotate', onRotateEvt);
      heldKeys.current.clear();
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

      // Continuous WASD pan — smooth camera-relative movement while keys held
      const panSpeed = tileSize * 9; // world units per second
      const held = heldKeys.current;
      if (held.has('a')) { tacticalPan.current.x -= cosA * panSpeed * delta; tacticalPan.current.z += sinA * panSpeed * delta; }
      if (held.has('d')) { tacticalPan.current.x += cosA * panSpeed * delta; tacticalPan.current.z -= sinA * panSpeed * delta; }
      if (held.has('w')) { tacticalPan.current.x -= sinA * panSpeed * delta; tacticalPan.current.z -= cosA * panSpeed * delta; }
      if (held.has('s')) { tacticalPan.current.x += sinA * panSpeed * delta; tacticalPan.current.z += cosA * panSpeed * delta; }

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

// ── Walk speed (tiles per second) ─────────────────────────────────────────────
const WALK_SPEED = 3.5;
const SNEAK_SPEED = 1.8;   // slow, cautious
const RUN_SPEED = 6.5;   // fast sprint
// ── Footstep Y-bob amplitude (tiles) ──────────────────────────────────────────
const WALK_BOB = 0.08;
const RUN_BOB = 0.14;
const SNEAK_BOB = 0.04;

function calcWalkFacingAngle(from: GridPos, to: GridPos): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const f = (Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)) as 0|1|2|3;
  return FACING_ANGLES[f];
}

// ── Per-unit walk animator ─────────────────────────────────────────────────────
// Wraps CharacterModel with imperative walk animation via useFrame.
// The outer <group> position is driven frame-by-frame along the walkPath;
// CharacterModel lives at [0,0,0] relative to that group and handles
// animation states + facing lerp internally.
interface WalkingUnitProps {
  unit: TacticalUnit;
  tileSize: number;
  walkPath?: GridPos[];
  onWalkComplete?: (unitId: string) => void;
  onWalkStep?: (unitId: string, tile: GridPos) => void;
  currentUnitId: string | null;
  animState: AnimState;
  onDoubleClick?: (unitId: string) => void;
  onRightClick?: (unitId: string, x: number, y: number) => void;
  onClick?: (unitId: string) => void;
  onHover?: (unitId: string) => void;
  onUnhover?: (unitId: string) => void;
}

function WalkingUnit({
  unit, tileSize, walkPath, onWalkComplete, onWalkStep,
  currentUnitId, animState, onDoubleClick, onRightClick, onClick,
  onHover, onUnhover,
}: WalkingUnitProps) {
  const outerRef = useRef<THREE.Group>(null);

  // Stable initial world pos – only used on mount; all subsequent
  // position changes are done imperatively to avoid R3F prop overrides.
  const initWorldPos = useRef(
    tileToWorld(unit.position.x, unit.position.y, tileSize) as [number, number, number]
  );

  type WS = {
    path: GridPos[];
    stepIdx: number;
    stepT: number;
    fromVec: THREE.Vector3;
    toVec: THREE.Vector3;
    active: boolean;
  };
  const wsRef = useRef<WS | null>(null);

  // ── Melee dash state ─────────────────────────────────────────────────────────
  type DashState = {
    from: THREE.Vector3;    // home tile world pos
    to: THREE.Vector3;      // 80% of the way to target tile
    startTime: number;      // performance.now() when dash started
    forwardMs: number;      // ms to reach impact point
    holdMs: number;         // ms to linger at impact
    returnMs: number;       // ms to return home
  };
  const dashRef = useRef<DashState | null>(null);
  const _dashPos = useRef(new THREE.Vector3());

  // Stable ref to animState so useFrame (closure) always reads the latest value
  const animStateRef = useRef(animState);
  useEffect(() => { animStateRef.current = animState; }, [animState]);

  // Reusable temp vector for bob calculation (avoids per-frame allocation)
  const _walkPos = useRef(new THREE.Vector3());

  const [facingAngle, setFacingAngle] = useState(FACING_ANGLES[unit.facing ?? 2]);

  // Sync facing from store when idle (not walking)
  useEffect(() => {
    if (wsRef.current?.active) return;
    setFacingAngle(FACING_ANGLES[unit.facing ?? 2]);
  }, [unit.facing]);

  // ── Listen for melee dash events from battle.tsx ────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const evt = e as CustomEvent<{
        unitId: string;
        targetX: number;
        targetZ: number;
        forwardMs: number;
        holdMs: number;
        returnMs: number;
      }>;
      if (evt.detail.unitId !== unit.id) return;
      if (!outerRef.current) return;
      if (wsRef.current?.active) return; // don't dash while walking
      const home = outerRef.current.position.clone();
      const toDir = new THREE.Vector3(
        evt.detail.targetX - home.x,
        0,
        evt.detail.targetZ - home.z,
      );
      const dist = toDir.length();
      const dashTarget = home.clone().addScaledVector(toDir.normalize(), dist * 0.82);
      dashRef.current = {
        from: home.clone(),
        to: dashTarget,
        startTime: performance.now(),
        forwardMs: evt.detail.forwardMs,
        holdMs: evt.detail.holdMs,
        returnMs: evt.detail.returnMs,
      };
    };
    window.addEventListener('unit-dash', handler);
    return () => window.removeEventListener('unit-dash', handler);
  }, [unit.id]);

  // Start / cancel walk when walkPath prop changes
  useEffect(() => {
    if (!walkPath || walkPath.length < 2) {
      if (wsRef.current) wsRef.current.active = false;
      return;
    }
    const [sx, sy, sz] = tileToWorld(walkPath[0].x, walkPath[0].y, tileSize);
    const [tx, ty, tz] = tileToWorld(walkPath[1].x, walkPath[1].y, tileSize);
    wsRef.current = {
      path: walkPath,
      stepIdx: 0,
      stepT: 0,
      fromVec: new THREE.Vector3(sx, sy, sz),
      toVec: new THREE.Vector3(tx, ty, tz),
      active: true,
    };
    // Snap group to walk starting tile immediately (before first frame renders)
    if (outerRef.current) outerRef.current.position.set(sx, sy, sz);
    setFacingAngle(calcWalkFacingAngle(walkPath[0], walkPath[1]));
  }, [walkPath, tileSize]);

  useFrame((_, delta) => {
    // ── Melee dash takes priority over idle; never fires during a walk ──────────
    const dash = dashRef.current;
    if (dash && outerRef.current && !wsRef.current?.active) {
      const elapsed = performance.now() - dash.startTime;
      const totalMs = dash.forwardMs + dash.holdMs + dash.returnMs;
      if (elapsed >= totalMs) {
        outerRef.current.position.copy(dash.from);
        dashRef.current = null;
      } else if (elapsed < dash.forwardMs) {
        // Rush forward with ease-in-out
        const t = elapsed / dash.forwardMs;
        const eased = t * t * (3 - 2 * t);
        _dashPos.current.lerpVectors(dash.from, dash.to, eased);
        outerRef.current.position.copy(_dashPos.current);
      } else if (elapsed < dash.forwardMs + dash.holdMs) {
        // Hold at impact point
        outerRef.current.position.copy(dash.to);
      } else {
        // Spring back with ease-out cubic
        const t = (elapsed - dash.forwardMs - dash.holdMs) / dash.returnMs;
        const eased = 1 - Math.pow(1 - Math.min(1, t), 3);
        _dashPos.current.lerpVectors(dash.to, dash.from, eased);
        outerRef.current.position.copy(_dashPos.current);
      }
      return; // skip walk logic entirely during dash
    }

    const ws = wsRef.current;
    if (!ws || !ws.active || !outerRef.current) return;

    const spd = animStateRef.current === 'run' ? RUN_SPEED
      : animStateRef.current === 'sneak' ? SNEAK_SPEED
        : WALK_SPEED;
    ws.stepT += delta * spd;

    if (ws.stepT >= 1) {
      ws.stepT -= 1;
      // Land exactly on current target tile
      outerRef.current.position.copy(ws.toVec);
      ws.stepIdx++;

      // Fire tile-entry event (traps, abilities)
      const arrivedTile = ws.path[ws.stepIdx];
      if (arrivedTile) onWalkStep?.(unit.id, arrivedTile);

      if (ws.stepIdx >= ws.path.length - 1) {
        ws.active = false;
        onWalkComplete?.(unit.id);
        return;
      }

      // Advance to next step
      ws.fromVec.copy(ws.toVec);
      const next = ws.path[ws.stepIdx + 1];
      const [nx, ny, nz] = tileToWorld(next.x, next.y, tileSize);
      ws.toVec.set(nx, ny, nz);

      // Update character facing to match movement direction
      setFacingAngle(calcWalkFacingAngle(arrivedTile, next));
    } else {
      // Sub-tile lerp + footstep Y-bob (half-sine arch peaks at mid-step)
      _walkPos.current.lerpVectors(ws.fromVec, ws.toVec, ws.stepT);
      const bob = animStateRef.current === 'run' ? RUN_BOB
        : animStateRef.current === 'sneak' ? SNEAK_BOB
          : WALK_BOB;
      _walkPos.current.y += Math.abs(Math.sin(ws.stepT * Math.PI)) * bob;
      outerRef.current.position.copy(_walkPos.current);
    }
  });

  return (
    <group
      ref={outerRef}
      position={initWorldPos.current}
      onClick={e => { e.stopPropagation(); onClick?.(unit.id); }}
      onDoubleClick={e => { e.stopPropagation(); onDoubleClick?.(unit.id); }}
      onContextMenu={e => {
        e.stopPropagation();
        onRightClick?.(unit.id, e.nativeEvent?.clientX ?? 0, e.nativeEvent?.clientY ?? 0);
      }}
      onPointerEnter={e => { e.stopPropagation(); onHover?.(unit.id); }}
      onPointerLeave={e => { e.stopPropagation(); onUnhover?.(unit.id); }}
    >
      <CharacterModel
        unit={unit}
        position={[0, 0, 0]}
        facingAngle={facingAngle}
        isSelected={currentUnitId === unit.id}
        animState={animState}
      />

  { animState === 'hide' && (
    <mesh position={ [0, 0.06, 0] } rotation = { [-Math.PI / 2, 0, 0]} >
      <ringGeometry args={ [0.92, 1.26, 48] } />
        < meshBasicMaterial color = "#6600cc" transparent opacity = { 0.62} depthWrite = { false} />
          </mesh>
      )}
    </group>
  );
}

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
            {/* Glowing team ring around character base */}
            <mesh position={[wx, 0.09, wz]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.88, 1.18, 48]} />
              <meshBasicMaterial color={ringColor} transparent opacity={0.82} depthWrite={false} />
            </mesh>
            {/* Floating health bar */}
            <Html position={[wx, 4.8, wz]} center distanceFactor={16} zIndexRange={[0, 10]}>
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
  units, level, reachableTiles, attackableTiles, attackableColor,
  currentUnitId, actionMode, onTileClick, animStates,
  combatEffects = [], cameraFocus, cameraMode = 'free', onUnitDoubleClick,
  showUnitInfo = false, mapPings = [], onUnitRightClick, onUnitClick,
  onUnitHover, onUnitUnhover, onMapRightClick,
  walkPaths = {}, onWalkComplete, onWalkStep,
  targetedUnitId,
}: BattleSceneProps) {
  const [hoveredTile, setHoveredTile] = useState<{x: number, y: number} | null>(null);
  const [showSkeletonDebug, setShowSkeletonDebug] = useState(false);
  const currentUnit = units.find(u => u.id === currentUnitId) ?? null;

  // Shift+B toggles skeleton debug overlay
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'B' && e.shiftKey) {
        setShowSkeletonDebug(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { gridW, gridH, tileSize, fogColor, fogNear, fogFar, theme } = level;
  const centerX = (gridW * tileSize) / 2;
  const centerZ = (gridH * tileSize) / 2;

  const camDist  = Math.max(gridW, gridH) * tileSize * 0.55;
  const camHeight = camDist * 0.7;
  const maxDist   = camDist * 2.2;

  React.useMemo(() => preloadLevelProps(level.props), [level.id]);

  return (
    <SceneErrorBoundary>
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

        <CameraShaker />
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

      <Suspense fallback={
        <mesh position={[centerX, 0.5, centerZ]}>
          <boxGeometry args={[2, 1, 2]} />
          <meshBasicMaterial color="#4488ff" wireframe />
        </mesh>
      }>
        <group>
          <TileGrid
            level={level}
            reachableTiles={reachableTiles}
            attackableTiles={attackableTiles}
            attackableColor={attackableColor}
            onTileClick={onTileClick}
            hoveredTile={hoveredTile}
            setHoveredTile={setHoveredTile}
            onRightClick={onMapRightClick}
          />

          <ScenePropLayer props={level.props} />

          {/* Craftpix Stylized Nature — trees, rocks, bushes ringing the map border */}
          <NatureDecor gridW={gridW} gridH={gridH} tileSize={tileSize} />

          {units.map(unit => {
            // Compute targeting data: when a unit is being targeted, show reticle;
            // when the active unit is attacking, provide target pos for look-at
            const isThisTargeted = targetedUnitId === unit.id;
            const activeUnit = currentUnitId ? units.find(u => u.id === currentUnitId) : null;
            const targetUnit = targetedUnitId ? units.find(u => u.id === targetedUnitId) : null;
            // If this is the active (attacking) unit and there's a hovered target, give it target pos
            let targetWorldPosForLookAt: [number, number, number] | undefined;
            if (unit.id === currentUnitId && targetUnit && targetUnit.hp > 0) {
              targetWorldPosForLookAt = tileToWorld(targetUnit.position.x, targetUnit.position.y, tileSize, 0.9);
            }
            // Augment unit with targeting data (read by CharacterModel)
            const augUnit = {
              ...unit,
              _targetWorldPos: targetWorldPosForLookAt ?? null,
              _isTargeted: isThisTargeted,
            };
            return (
              <WalkingUnit
                key={unit.id}
                unit={augUnit as any}
                tileSize={tileSize}
                walkPath={walkPaths[unit.id]}
                onWalkComplete={onWalkComplete}
                onWalkStep={onWalkStep}
                currentUnitId={currentUnitId}
                animState={animStates[unit.id] || 'idle'}
                onDoubleClick={onUnitDoubleClick}
                onRightClick={onUnitRightClick}
                onClick={onUnitClick}
                onHover={onUnitHover}
                onUnhover={onUnitUnhover}
              />
            );
          })}

          {showUnitInfo && <UnitMarkers units={units} tileSize={tileSize} />}
          {mapPings.length > 0 && <PingMarkers pings={mapPings} tileSize={tileSize} />}

          <CombatEffectsLayer effects={combatEffects} />
        </group>
      </Suspense>

      {/* Post-processing: Bloom makes emissive materials & combat effects glow */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.4} intensity={0.4} mipmapBlur />
        <Vignette offset={0.3} darkness={0.55} />
      </EffectComposer>
    </Canvas>
    </SceneErrorBoundary>
  );
}
