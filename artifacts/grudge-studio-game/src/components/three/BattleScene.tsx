import React, { Suspense, useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { TileGrid, tileToWorld } from './TileGrid';
import { CharacterModel, AnimState } from './CharacterModel';
import { tickSequences } from '@/lib/animation-events';
import { ScenePropLayer, preloadLevelProps } from './ScenePropLayer';
import { CombatEffectsLayer, CombatEffectData } from './CombatEffects';
import { NatureDecor } from './NatureDecor';
import { SceneErrorBoundary } from './ErrorBoundary';
import { PhysicsProvider } from './PhysicsProvider';
import { PhysicsCharacter } from './PhysicsCharacter';
import { StylizedWater } from './StylizedWater';
import { SlashTrailLayer, pickSlashForWeapon, type ActiveSlash } from './SlashTrail';
import { RAPIER_TERRAIN } from '@/lib/physics/collision-groups';
import { TacticalUnit } from '@/store/use-game-store';
import { LevelDef } from '@/lib/levels';
import {
  generateThemeGroundTexture,
  generateThemeGroundNormal,
  diamondSquareHeightmap,
  applyHeightmapToPlane,
  type GroundTheme,
} from '@/lib/procedural-textures';

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
// ── Animation sequence ticker — drives combat event timing from useFrame ──────
function SequenceTicker() {
  useFrame(() => tickSequences());
  return null;
}

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
  // Outer group exists purely for raycast/event bubbling — it stays at origin.
  // Live world position is owned by `worldPosRef` and consumed by
  // PhysicsCharacter, because Rapier RigidBodies do NOT inherit parent
  // group transforms (so animating outerRef.position would never reach
  // the visible model).
  const outerRef = useRef<THREE.Group>(null);
  const worldPosRef = useRef<THREE.Vector3>(
    new THREE.Vector3(...tileToWorld(unit.position.x, unit.position.y, tileSize)),
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

  // Re-seat the unit when its tile position changes via store (teleport,
  // respawn, level reset, etc.) and no walk/dash is in flight.
  useEffect(() => {
    if (wsRef.current?.active || dashRef.current) return;
    const [wx, wy, wz] = tileToWorld(unit.position.x, unit.position.y, tileSize);
    worldPosRef.current.set(wx, wy, wz);
  }, [unit.position.x, unit.position.y, tileSize]);

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
      if (wsRef.current?.active) return; // don't dash while walking
      const home = worldPosRef.current.clone();
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
    // Snap live world pos to walk starting tile immediately (before first frame renders)
    worldPosRef.current.set(sx, sy, sz);
    setFacingAngle(calcWalkFacingAngle(walkPath[0], walkPath[1]));
  }, [walkPath, tileSize]);

  useFrame((_, delta) => {
    // ── Melee dash takes priority over idle; never fires during a walk ──────────
    const dash = dashRef.current;
    if (dash && !wsRef.current?.active) {
      const elapsed = performance.now() - dash.startTime;
      const totalMs = dash.forwardMs + dash.holdMs + dash.returnMs;
      if (elapsed >= totalMs) {
        worldPosRef.current.copy(dash.from);
        dashRef.current = null;
      } else if (elapsed < dash.forwardMs) {
        // Rush forward with ease-in-out
        const t = elapsed / dash.forwardMs;
        const eased = t * t * (3 - 2 * t);
        _dashPos.current.lerpVectors(dash.from, dash.to, eased);
        worldPosRef.current.copy(_dashPos.current);
      } else if (elapsed < dash.forwardMs + dash.holdMs) {
        // Hold at impact point
        worldPosRef.current.copy(dash.to);
      } else {
        // Spring back with ease-out cubic
        const t = (elapsed - dash.forwardMs - dash.holdMs) / dash.returnMs;
        const eased = 1 - Math.pow(1 - Math.min(1, t), 3);
        _dashPos.current.lerpVectors(dash.to, dash.from, eased);
        worldPosRef.current.copy(_dashPos.current);
      }
      return; // skip walk logic entirely during dash
    }

    const ws = wsRef.current;
    if (!ws || !ws.active) return;

    const spd = animStateRef.current === 'run' ? RUN_SPEED
      : animStateRef.current === 'sneak' ? SNEAK_SPEED
        : WALK_SPEED;
    ws.stepT += delta * spd;

    if (ws.stepT >= 1) {
      ws.stepT -= 1;
      // Land exactly on current target tile
      worldPosRef.current.copy(ws.toVec);
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
      worldPosRef.current.copy(_walkPos.current);
    }
  });

  return (
    <group
      ref= { outerRef }
      onClick={e => { e.stopPropagation(); onClick?.(unit.id); }}
      onDoubleClick={e => { e.stopPropagation(); onDoubleClick?.(unit.id); }}
      onContextMenu={e => {
        e.stopPropagation();
        onRightClick?.(unit.id, e.nativeEvent?.clientX ?? 0, e.nativeEvent?.clientY ?? 0);
      }}
      onPointerEnter={e => { e.stopPropagation(); onHover?.(unit.id); }}
      onPointerLeave={e => { e.stopPropagation(); onUnhover?.(unit.id); }}
    >
      <SceneErrorBoundary
        fallback={
          <CharacterModel
            unit={unit}
            position={[0, 0, 0]}
            facingAngle={facingAngle}
            isSelected={currentUnitId === unit.id}
            animState={animState}
            activeForm={unit.activeForm}
          />
        }
      >
        <PhysicsCharacter
          characterId={unit.characterId}
          isPlayer={unit.isPlayerControlled}
          unitId={unit.id}
          position={[0, 0, 0]}
worldPosRef = { worldPosRef }
        >
          <CharacterModel
            unit={unit}
            position={[0, 0, 0]}
            facingAngle={facingAngle}
            isSelected={currentUnitId === unit.id}
            animState={animState}
            activeForm={unit.activeForm}
          />
        </PhysicsCharacter>
      </SceneErrorBoundary>

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

// ── Per-theme stylized water presets ────────────────────────────────────
const WATER_BY_THEME: Record<GroundTheme, {
  deep: string; shallow: string; foam: string; waveAmp: number;
}> = {
  ruins:    { deep: '#0a3046', shallow: '#3088aa', foam: '#e0f0ff', waveAmp: 0.08 },
  orc:      { deep: '#2a0810', shallow: '#aa3020', foam: '#ffdab0', waveAmp: 0.14 }, // lava-ish
  elven:    { deep: '#0a3828', shallow: '#30b080', foam: '#e0ffe8', waveAmp: 0.07 },
  medieval: { deep: '#083042', shallow: '#2888b4', foam: '#e8f4ff', waveAmp: 0.09 },
};

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

  // Stylized procedural albedo + normal map, generated once per theme.
  const groundAlbedo = useMemo(
    () => generateThemeGroundTexture(theme as GroundTheme, 512, 12345 + theme.charCodeAt(0)),
    [theme],
  );
  const groundNormal = useMemo(
    () => generateThemeGroundNormal(512, 12345 + theme.charCodeAt(0), 2.5),
    [theme],
  );
  // Higher tiling for big planes so the texture reads as detail, not a mural.
  useMemo(() => {
    const tiling = Math.max(6, Math.round(Math.max(islandW, islandH) / 12));
    groundAlbedo.repeat.set(tiling, tiling);
    groundNormal.repeat.set(tiling, tiling);
  }, [groundAlbedo, groundNormal, islandW, islandH]);

  // Diamond-Square heightmap on the island plane — subtle rolling terrain
  // around the perimeter, completely flat under the tactical grid.
  const islandGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(islandW, islandH, 128, 128);
    const { data, size: hsize } = diamondSquareHeightmap(7, 0.65, 31337 + theme.charCodeAt(0));
    applyHeightmapToPlane(
      geo, data, hsize,
      theme === 'orc' ? 0.9 : 1.4,           // maxHeight
      gridW * tileSize + 2,                  // playable width (leave 1 tile margin)
      gridH * tileSize + 2,                  // playable height
    );
    return geo;
  }, [islandW, islandH, gridW, gridH, tileSize, theme]);

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
      {/* Island base — stylized textured plane with Diamond-Square heightmap
          (flat under the tactical grid, rolling around the perimeter). */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[cx, -0.08, cz]}
        geometry={islandGeometry}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial
          map={groundAlbedo}
          normalMap={groundNormal}
          normalScale={new THREE.Vector2(0.8, 0.8)}
          color={t.base}
          roughness={0.95}
          metalness={0}
        />
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
  const [slashes, setSlashes] = useState<ActiveSlash[]>([]);
  const currentUnit = units.find(u => u.id === currentUnitId) ?? null;

  // Listen for `slash-spawn` events (fired from combat.tsx when an attack lands).
  // Payload: { attackerId, targetX?, targetY?, weaponType? }.
  // We translate the tile coords into world space and push a SlashTrail onto
  // the scene for its self-expiring cycle.
  useEffect(() => {
    const onSpawn = (e: Event) => {
      const d = (e as CustomEvent).detail as {
        attackerId?: string;
        x?: number; y?: number;
        weaponType?: string;
        effect?: string;
        tint?: string;
        scale?: number;
      } | undefined;
      if (!d) return;
      const attacker = units.find(u => u.id === d.attackerId);
      if (!attacker) return;
      // Default to a point between attacker and target tile centres.
      const [ax, , az] = tileToWorld(attacker.position.x, attacker.position.y, level.tileSize);
      const [tx, , tz] = d.x != null && d.y != null
        ? tileToWorld(d.x, d.y, level.tileSize)
        : [ax, 0, az];
      const wx = (ax + tx) / 2;
      const wz = (az + tz) / 2;
      const wy = 1.2;   // mid-body height
      setSlashes(prev => [
        ...prev,
        {
          id:        `slash_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          effect:    d.effect ?? pickSlashForWeapon(d.weaponType ?? attacker.weaponType),
          position:  [wx, wy, wz],
          rotation:  (Math.random() - 0.5) * 1.2,
          scale:     d.scale ?? 2.2,
          tint:      d.tint ?? '#ffffff',
          spawnedAt: performance.now(),
        },
      ]);
    };
    window.addEventListener('slash-spawn', onSpawn);
    return () => window.removeEventListener('slash-spawn', onSpawn);
  }, [units, level.tileSize]);

  const handleSlashExpire = useCallback(
    (id: string) => setSlashes(prev => prev.filter(s => s.id !== id)),
    [],
  );

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

      <PhysicsProvider gravity={[0, -9.81, 0]}>

      {/* Ground collider — invisible Rapier rigid body for physics raycasts */}
      <RigidBody type="fixed" colliders={false} collisionGroups={RAPIER_TERRAIN}>
        <CuboidCollider
          args={[gridW * tileSize, 0.1, gridH * tileSize]}
          position={[centerX, -0.1, centerZ]}
        />
      </RigidBody>

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

        <SequenceTicker />
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

      {/* Island + stylized water */}
      <IslandEnvironment
        cx={centerX} cz={centerZ}
        gridW={gridW} gridH={gridH} tileSize={tileSize}
        theme={theme as IslandTheme}
      />
      {(() => {
        const w = WATER_BY_THEME[theme as GroundTheme] ?? WATER_BY_THEME.medieval;
        return (
          <StylizedWater
            position={[centerX, -1.5, centerZ]}
            colorDeep={w.deep}
            colorShallow={w.shallow}
            colorFoam={w.foam}
            waveAmp={w.waveAmp}
          />
        );
      })()}

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

          {/* Weapon slash-trail sprites — fired by 'slash-spawn' CustomEvents. */}
          <SlashTrailLayer slashes={slashes} onExpire={handleSlashExpire} />

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

      </PhysicsProvider>

      {/* Post-processing: Bloom makes emissive materials & combat effects glow */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.4} intensity={0.4} mipmapBlur />
        <Vignette offset={0.3} darkness={0.55} />
      </EffectComposer>
    </Canvas>
    </SceneErrorBoundary>
  );
}
