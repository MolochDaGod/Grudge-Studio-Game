import React, { Suspense, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, TransformControls, useGLTF, useTexture } from '@react-three/drei';
import { useRoute, useLocation } from 'wouter';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import { LEVELS } from '@/lib/levels';
import {
  useEditorStore,
  TERRAIN_COLORS,
  TERRAIN_LABELS,
  TerrainType,
  EditorProp,
  HEIGHT_STEP,
  MAX_HEIGHT,
} from '@/lib/map-editor-store';
import {
  ASSET_CATALOG,
  ASSET_BY_PACK,
  PACK_LABELS,
  AssetPack,
} from '@/lib/asset-catalog';
import { FantasyButton } from '@/components/ui/fantasy-button';
import { ArrowLeft, Save, Trash2, Move, RotateCcw, Maximize2, Grid3x3, Paintbrush, MousePointer, Eraser, Layers, Mountain, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const BASE = import.meta.env.BASE_URL;

function getPackAtlas(url: string): string | null {
  if (url.includes('/maps/medieval/')) return `${BASE}models/maps/medieval/atlas.png`;
  if (url.includes('/maps/elven/'))    return `${BASE}models/maps/elven/atlas.png`;
  if (url.includes('/maps/orc/'))      return `${BASE}models/maps/orc/atlas.png`;
  if (url.includes('/maps/ruins/'))    return `${BASE}models/maps/ruins/atlas.png`;
  return null;
}

// ─── Prop mesh with optional texture atlas ──────────────────────────────────
function PropMeshAtlas({ url, scale, atlasUrl }: { url: string; scale: number; atlasUrl: string }) {
  const { scene: raw } = useGLTF(url);
  const atlas = useTexture(atlasUrl);
  atlas.flipY = false;
  atlas.colorSpace = THREE.SRGBColorSpace;
  const cloned = useMemo(() => {
    const c = SkeletonUtils.clone(raw);
    c.traverse(o => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.material = new THREE.MeshStandardMaterial({ map: atlas, color: 0xffffff, roughness: 0.78, metalness: 0.08 });
      }
    });
    return c;
  }, [raw, atlas]);
  return <primitive object={cloned} scale={[scale, scale, scale]} />;
}

function PropMeshFlat({ url, scale }: { url: string; scale: number }) {
  const { scene: raw } = useGLTF(url);
  const cloned = useMemo(() => {
    const c = SkeletonUtils.clone(raw);
    c.traverse(o => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.material = new THREE.MeshStandardMaterial({ color: 0xa0a096, roughness: 0.78, metalness: 0.08 });
      }
    });
    return c;
  }, [raw]);
  return <primitive object={cloned} scale={[scale, scale, scale]} />;
}

function EditorPropMesh({ url, scale }: { url: string; scale: number }) {
  const atlasUrl = getPackAtlas(url);
  if (atlasUrl) return <PropMeshAtlas url={url} scale={scale} atlasUrl={atlasUrl} />;
  return <PropMeshFlat url={url} scale={scale} />;
}

// ─── Selected prop with gizmo ───────────────────────────────────────────────
function SelectedPropGizmo({ prop, orbitDisable }: { prop: EditorProp; orbitDisable: (v: boolean) => void }) {
  const groupRef = useRef<THREE.Group>(null!);
  const { transformMode, snapEnabled, tileSize, updatePropTransform } = useEditorStore();

  const snap   = snapEnabled ? tileSize : null;
  const rotSnap = snapEnabled ? Math.PI / 4 : null;
  const sclSnap = snapEnabled ? 0.25 : null;

  return (
    <>
      <group
        ref={groupRef}
        position={[prop.x, prop.y, prop.z]}
        rotation={[0, prop.rotY, 0]}
        scale={[prop.scale, prop.scale, prop.scale]}
      >
        <Suspense fallback={null}>
          <EditorPropMesh url={prop.modelUrl} scale={1} />
        </Suspense>
        {/* yellow wireframe selection box */}
        <mesh>
          <boxGeometry args={[2.2, 4, 2.2]} />
          <meshBasicMaterial color="#ffe040" wireframe transparent opacity={0.7} />
        </mesh>
      </group>
      <TransformControls
        object={groupRef}
        mode={transformMode}
        translationSnap={snap}
        rotationSnap={rotSnap}
        scaleSnap={sclSnap}
        onMouseDown={() => orbitDisable(false)}
        onMouseUp={() => orbitDisable(true)}
        onObjectChange={() => {
          const g = groupRef.current;
          if (!g) return;
          updatePropTransform(prop.id, {
            x: g.position.x, y: g.position.y, z: g.position.z,
            rotY: g.rotation.y, scale: g.scale.x,
          });
        }}
      />
    </>
  );
}

// ─── Non-selected placed props ───────────────────────────────────────────────
function StaticProp({ prop }: { prop: EditorProp }) {
  const { mode, selectProp } = useEditorStore();
  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    if (mode === 'select') selectProp(prop.id);
    else if (mode === 'erase') useEditorStore.getState().deleteProp(prop.id);
  }, [mode, prop.id, selectProp]);

  return (
    <group position={[prop.x, prop.y, prop.z]} rotation={[0, prop.rotY, 0]} onClick={handleClick}>
      <Suspense fallback={null}>
        <EditorPropMesh url={prop.modelUrl} scale={prop.scale} />
      </Suspense>
    </group>
  );
}

// ─── Terrain tile grid ───────────────────────────────────────────────────────
const TILE_BASE_H = 0.14;
const DARK  = new THREE.Color(0x2a2a35);
const LIGHT = new THREE.Color(0x3a3a45);

function EditorTileGrid() {
  const { gridW, gridH, tileSize, terrain, heights } = useEditorStore();
  const instRef = useRef<THREE.InstancedMesh>(null!);
  const dummy   = useMemo(() => new THREE.Object3D(), []);
  const total   = gridW * gridH;

  useEffect(() => {
    const mesh = instRef.current;
    if (!mesh) return;
    let idx = 0;
    for (let x = 0; x < gridW; x++) {
      for (let z = 0; z < gridH; z++) {
        const lvl    = heights[`${x},${z}`] ?? 0;
        const tileH  = TILE_BASE_H + lvl * HEIGHT_STEP;
        const centerY = tileH / 2;
        dummy.position.set(x * tileSize + tileSize / 2, centerY, z * tileSize + tileSize / 2);
        dummy.scale.set(tileSize * 0.97, tileH, tileSize * 0.97);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);

        const t = terrain[`${x},${z}`];
        const baseCol = t
          ? new THREE.Color(TERRAIN_COLORS[t])
          : (x + z) % 2 === 0 ? DARK.clone() : LIGHT.clone();
        // Darken sides slightly based on height for a subtle elevation cue
        const brightened = baseCol.clone().multiplyScalar(lvl > 0 ? 1 + lvl * 0.03 : 1);
        mesh.setColorAt(idx, brightened);
        idx++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [gridW, gridH, tileSize, terrain, heights, dummy]);

  return (
    <instancedMesh ref={instRef} args={[undefined, undefined, total]} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial vertexColors roughness={0.85} metalness={0.05} />
    </instancedMesh>
  );
}

// ─── Terrain painting + prop placement plane ─────────────────────────────────
function ClickPlane() {
  const {
    gridW, gridH, tileSize, mode, selectedAsset, selectedTerrain,
    addProp, setTerrain, selectProp, adjustHeight, heightBrush, heights,
  } = useEditorStore();
  const w = gridW * tileSize;
  const h = gridH * tileSize;
  const [hoverTile, setHoverTile] = useState<[number, number] | null>(null);

  const tileOf = (point: THREE.Vector3): [number, number] => {
    const tx = Math.floor(point.x / tileSize);
    const tz = Math.floor(point.z / tileSize);
    return [
      Math.max(0, Math.min(gridW - 1, tx)),
      Math.max(0, Math.min(gridH - 1, tz)),
    ];
  };

  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    const pt: THREE.Vector3 = e.point;
    if (mode === 'place' && selectedAsset) {
      addProp(pt.x, pt.z);
    } else if (mode === 'terrain') {
      const [tx, tz] = tileOf(pt);
      setTerrain(tx, tz, selectedTerrain);
    } else if (mode === 'height') {
      const [tx, tz] = tileOf(pt);
      adjustHeight(tx, tz);
    } else if (mode === 'select') {
      selectProp(null);
    }
  }, [mode, selectedAsset, selectedTerrain, addProp, setTerrain, selectProp, adjustHeight, tileSize]);

  const handleMove = useCallback((e: any) => {
    const pt: THREE.Vector3 = e.point;
    setHoverTile(tileOf(pt));
  }, [tileSize]);

  // Hover highlight elevation – sit on top of actual tile top surface
  const hoverY = hoverTile
    ? (heights[`${hoverTile[0]},${hoverTile[1]}`] ?? 0) * HEIGHT_STEP + TILE_BASE_H + 0.01
    : 0;

  const hoverColor =
    mode === 'erase'  ? '#ff4444' :
    mode === 'place'  ? '#44ffaa' :
    mode === 'height' ? (heightBrush === 1 ? '#ffe066' : '#66aaff') :
    TERRAIN_COLORS[selectedTerrain];

  return (
    <>
      <mesh
        position={[w / 2, 0, h / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleClick}
        onPointerMove={handleMove}
        onPointerLeave={() => setHoverTile(null)}
      >
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Hover tile highlight */}
      {hoverTile && (mode === 'place' || mode === 'terrain' || mode === 'erase' || mode === 'height') && (
        <mesh
          position={[hoverTile[0] * tileSize + tileSize / 2, hoverY, hoverTile[1] * tileSize + tileSize / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[tileSize * 0.95, tileSize * 0.95]} />
          <meshBasicMaterial
            color={hoverColor}
            transparent
            opacity={0.45}
            depthWrite={false}
          />
        </mesh>
      )}
    </>
  );
}

// ─── Grid lines overlay ──────────────────────────────────────────────────────
function GridLines() {
  const { gridW, gridH, tileSize } = useEditorStore();
  const lines = useMemo(() => {
    const pts: number[] = [];
    for (let x = 0; x <= gridW; x++) {
      pts.push(x * tileSize, 0.03, 0);
      pts.push(x * tileSize, 0.03, gridH * tileSize);
    }
    for (let z = 0; z <= gridH; z++) {
      pts.push(0, 0.03, z * tileSize);
      pts.push(gridW * tileSize, 0.03, z * tileSize);
    }
    return new Float32Array(pts);
  }, [gridW, gridH, tileSize]);

  if (gridW * gridH > 4000) return null;

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[lines, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#555566" transparent opacity={0.3} />
    </lineSegments>
  );
}

// ─── The full 3D editor scene ─────────────────────────────────────────────────
function EditorScene() {
  const { props, selectedPropId } = useEditorStore();
  const orbitRef = useRef<any>(null);
  const orbitEnabled = useCallback((v: boolean) => {
    if (orbitRef.current) orbitRef.current.enabled = v;
  }, []);

  const selectedProp = useMemo(() => props.find(p => p.id === selectedPropId) ?? null, [props, selectedPropId]);
  const nonSelectedProps = useMemo(() => props.filter(p => p.id !== selectedPropId), [props, selectedPropId]);

  const { gridW, gridH, tileSize } = useEditorStore.getState();
  const cx = (gridW * tileSize) / 2;
  const cz = (gridH * tileSize) / 2;

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[cx + 30, 50, cz + 20]}
        intensity={1.0}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      <OrbitControls
        ref={orbitRef}
        target={[cx, 0, cz]}
        minDistance={10}
        maxDistance={200}
        maxPolarAngle={Math.PI / 2.1}
      />

      <EditorTileGrid />
      <GridLines />
      <ClickPlane />

      {/* Static (non-selected) props */}
      {nonSelectedProps.map(p => (
        <StaticProp key={p.id} prop={p} />
      ))}

      {/* Selected prop with transform gizmo */}
      {selectedProp && (
        <SelectedPropGizmo key={selectedProp.id} prop={selectedProp} orbitDisable={orbitEnabled} />
      )}
    </>
  );
}

// ─── Asset palette sidebar ────────────────────────────────────────────────────
function AssetPalette({ defaultPack }: { defaultPack: AssetPack }) {
  const [activePack, setActivePack] = useState<AssetPack>(defaultPack);
  const { selectedAsset, setSelectedAsset, setMode, mode } = useEditorStore();
  const assets = ASSET_BY_PACK[activePack];

  const handleSelect = (url: string) => {
    setSelectedAsset(url);
    setMode('place');
  };

  return (
    <div className="flex flex-col h-full bg-black/60 border-r border-white/10">
      {/* Pack tabs */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-white/10">
        {(Object.keys(PACK_LABELS) as AssetPack[]).map(pack => (
          <button
            key={pack}
            className={cn(
              'text-xs px-2 py-1 rounded font-bold transition-colors',
              activePack === pack
                ? 'bg-primary text-primary-foreground'
                : 'bg-white/10 text-white/70 hover:bg-white/20',
            )}
            onClick={() => setActivePack(pack)}
          >
            {PACK_LABELS[pack]}
          </button>
        ))}
      </div>

      {/* Asset list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {assets.map(asset => (
          <button
            key={asset.id}
            className={cn(
              'w-full text-left text-xs px-3 py-2 rounded transition-colors',
              selectedAsset === asset.url && mode === 'place'
                ? 'bg-primary/30 border border-primary text-white'
                : 'bg-white/5 hover:bg-white/15 text-white/80 border border-transparent',
            )}
            onClick={() => handleSelect(asset.url)}
          >
            <span className="text-white/40 mr-2">{asset.category.slice(0,3).toUpperCase()}</span>
            {asset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Properties panel ─────────────────────────────────────────────────────────
function PropertiesPanel() {
  const { props, selectedPropId, updatePropTransform, deleteProp } = useEditorStore();
  const prop = props.find(p => p.id === selectedPropId);

  if (!prop) {
    return (
      <div className="p-3 text-white/40 text-xs italic text-center">
        Click a prop to select it
      </div>
    );
  }

  const set = (key: keyof EditorProp, raw: string) => {
    const v = parseFloat(raw);
    if (isNaN(v)) return;
    updatePropTransform(prop.id, {
      x: prop.x, y: prop.y, z: prop.z, rotY: prop.rotY, scale: prop.scale,
      [key]: v,
    });
  };

  const label = ASSET_CATALOG.find(a => a.url === prop.modelUrl)?.label ?? prop.modelUrl.split('/').pop();

  return (
    <div className="p-3 space-y-2 text-xs">
      <div className="text-white/50 truncate font-bold text-[10px] uppercase tracking-wider border-b border-white/10 pb-1">
        {label}
      </div>
      {([
        ['X', 'x'],['Y', 'y'],['Z', 'z'],
        ['Rot Y°', 'rotY'],['Scale', 'scale'],
      ] as const).map(([lbl, key]) => (
        <div key={key} className="flex items-center gap-2">
          <span className="w-12 text-white/50 shrink-0">{lbl}</span>
          <input
            type="number"
            step={key === 'rotY' ? 0.1 : key === 'scale' ? 0.05 : 0.5}
            value={key === 'rotY' ? +(prop.rotY * 180 / Math.PI).toFixed(1) : +(prop[key as 'x']).toFixed(2)}
            onChange={e => {
              const v = key === 'rotY'
                ? parseFloat(e.target.value) * Math.PI / 180
                : parseFloat(e.target.value);
              if (!isNaN(v)) updatePropTransform(prop.id, {
                x: prop.x, y: prop.y, z: prop.z, rotY: prop.rotY, scale: prop.scale,
                [key]: v,
              });
            }}
            className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs w-full"
          />
        </div>
      ))}
      <button
        className="w-full mt-2 py-1.5 bg-red-900/60 hover:bg-red-700/80 border border-red-600/50 rounded text-red-300 text-xs flex items-center justify-center gap-1"
        onClick={() => deleteProp(prop.id)}
      >
        <Trash2 className="w-3 h-3" /> Delete Prop
      </button>
    </div>
  );
}

// ─── Main map editor page ─────────────────────────────────────────────────────
export default function MapEditor() {
  const [, params]    = useRoute('/map-editor/:levelId');
  const [, setLocation] = useLocation();
  const levelId = params?.levelId ?? 'ruins';

  const {
    initEditor, setMode, setTransformMode, toggleSnap, saveMap,
    mode, transformMode, snapEnabled, isDirty, selectedPropId,
    deleteProp, clearEdits,
    selectedTerrain, setSelectedTerrain,
    heightBrush, setHeightBrush,
  } = useEditorStore();

  const level = useMemo(() => LEVELS.find(l => l.id === levelId) ?? LEVELS[0], [levelId]);

  useEffect(() => {
    const initialProps = level.props.map(p => ({
      id:       '',
      modelUrl: p.modelUrl,
      x:        p.x,
      y:        0,
      z:        p.z,
      rotY:     p.rotY,
      scale:    p.scale,
    }));
    initEditor(level.id, level.gridW, level.gridH, level.tileSize ?? 1, initialProps);
  }, [level]);

  const defaultPack = (level.theme === 'ruins' ? 'ruins' : level.theme) as AssetPack;

  const handleSave = () => {
    saveMap();
  };

  const handleClear = () => {
    if (confirm('Reset all edits and restore original map layout?')) {
      clearEdits(levelId);
      const initialProps = level.props.map(p => ({
        id: '', modelUrl: p.modelUrl, x: p.x, y: 0, z: p.z, rotY: p.rotY, scale: p.scale,
      }));
      initEditor(level.id, level.gridW, level.gridH, level.tileSize ?? 1, initialProps);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">

      {/* ── TOP TOOLBAR ─────────────────────────────────────────────────── */}
      <div className="h-12 flex items-center gap-2 px-3 bg-black/80 border-b border-white/10 shrink-0 z-10">
        <button
          className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          onClick={() => setLocation('/level-select')}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <span className="text-primary font-display font-bold text-sm uppercase tracking-wider mr-2">
          {level.name}
        </span>

        <div className="w-px h-6 bg-white/20 mx-1" />

        {/* Mode buttons */}
        {([
          ['select',  'Select',  <MousePointer className="w-3.5 h-3.5" />],
          ['place',   'Place',   <Layers className="w-3.5 h-3.5" />],
          ['terrain', 'Terrain', <Paintbrush className="w-3.5 h-3.5" />],
          ['height',  'Height',  <Mountain className="w-3.5 h-3.5" />],
          ['erase',   'Erase',   <Eraser className="w-3.5 h-3.5" />],
        ] as const).map(([m, label, icon]) => (
          <button
            key={m}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors',
              mode === m
                ? 'bg-primary text-primary-foreground'
                : 'bg-white/10 text-white/70 hover:bg-white/20',
            )}
            onClick={() => setMode(m)}
          >
            {icon}{label}
          </button>
        ))}

        {/* Transform mode (only relevant in select mode) */}
        {mode === 'select' && selectedPropId && (
          <>
            <div className="w-px h-6 bg-white/20 mx-1" />
            {([
              ['translate', 'Move',   <Move      className="w-3.5 h-3.5" />],
              ['rotate',    'Rotate', <RotateCcw className="w-3.5 h-3.5" />],
              ['scale',     'Scale',  <Maximize2 className="w-3.5 h-3.5" />],
            ] as const).map(([m, label, icon]) => (
              <button
                key={m}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors',
                  transformMode === m
                    ? 'bg-amber-700 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20',
                )}
                onClick={() => setTransformMode(m)}
              >
                {icon}{label}
              </button>
            ))}
            <button
              className="text-xs px-2 py-1 rounded bg-red-900/60 hover:bg-red-700/80 text-red-300 border border-red-600/30"
              onClick={() => selectedPropId && deleteProp(selectedPropId)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {/* Terrain swatches (only in terrain mode) */}
        {mode === 'terrain' && (
          <>
            <div className="w-px h-6 bg-white/20 mx-1" />
            {(Object.entries(TERRAIN_LABELS) as [TerrainType, string][]).map(([t, label]) => (
              <button
                key={t}
                title={label}
                className={cn(
                  'w-7 h-7 rounded border-2 transition-all',
                  selectedTerrain === t ? 'border-white scale-110' : 'border-transparent opacity-70',
                )}
                style={{ background: TERRAIN_COLORS[t] }}
                onClick={() => setSelectedTerrain(t)}
              />
            ))}
          </>
        )}

        {/* Height raise/lower controls */}
        {mode === 'height' && (
          <>
            <div className="w-px h-6 bg-white/20 mx-1" />
            <span className="text-xs text-white/50">Brush:</span>
            <button
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors',
                heightBrush === 1 ? 'bg-amber-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20',
              )}
              onClick={() => setHeightBrush(1)}
            >
              <ChevronUp className="w-3.5 h-3.5" /> Raise
            </button>
            <button
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors',
                heightBrush === -1 ? 'bg-sky-700 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20',
              )}
              onClick={() => setHeightBrush(-1)}
            >
              <ChevronDown className="w-3.5 h-3.5" /> Lower
            </button>
            <span className="text-xs text-white/40 ml-1">
              max {MAX_HEIGHT} levels · {HEIGHT_STEP}u/step
            </span>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Snap toggle */}
          <button
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors',
              snapEnabled
                ? 'bg-emerald-800 text-emerald-200'
                : 'bg-white/10 text-white/50',
            )}
            onClick={toggleSnap}
          >
            <Grid3x3 className="w-3.5 h-3.5" />
            Snap
          </button>

          {/* Reset */}
          <button
            className="px-2.5 py-1 rounded text-xs bg-white/10 hover:bg-white/20 text-white/70"
            onClick={handleClear}
          >
            Reset
          </button>

          {/* Save */}
          <button
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors',
              isDirty
                ? 'bg-primary hover:bg-primary/80 text-primary-foreground'
                : 'bg-white/10 text-white/40',
            )}
            onClick={handleSave}
            disabled={!isDirty}
          >
            <Save className="w-3.5 h-3.5" />
            {isDirty ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>

      {/* ── BODY ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar — Asset Palette */}
        <div className="w-52 shrink-0 flex flex-col overflow-hidden">
          <AssetPalette defaultPack={defaultPack} />
        </div>

        {/* Centre — 3D Canvas */}
        <div className="flex-1 relative">
          <Canvas
            camera={{
              position: [
                (level.gridW * (level.tileSize ?? 1)) / 2,
                Math.min(level.gridW, level.gridH) * 0.6,
                (level.gridH * (level.tileSize ?? 1)) * 0.95,
              ],
              fov: 50,
              near: 0.1,
              far: 2000,
            }}
            shadows
            gl={{ antialias: true }}
          >
            <Suspense fallback={null}>
              <EditorScene />
            </Suspense>
          </Canvas>

          {/* Mode hint overlay */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="bg-black/60 text-white/60 text-xs px-3 py-1.5 rounded-full">
              {mode === 'select'  && 'Click a prop to select  •  Drag gizmo to transform'}
              {mode === 'place'   && 'Click a tile to place selected asset'}
              {mode === 'terrain' && 'Click tiles to paint terrain'}
              {mode === 'erase'   && 'Click a prop to remove it'}
            </div>
          </div>
        </div>

        {/* Right sidebar — Properties */}
        <div className="w-44 shrink-0 bg-black/60 border-l border-white/10 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-widest font-bold text-white/40 px-3 py-2 border-b border-white/10">
            Properties
          </div>
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
}
