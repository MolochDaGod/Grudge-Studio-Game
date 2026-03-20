import { useState, useEffect, useRef, useMemo, Suspense, useCallback, Component, ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture, useGLTF, useAnimations, Grid, Stars } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import { useLocation } from 'wouter';
import { useGetCharacters } from '@workspace/api-client-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Save, RotateCcw, Play, Pause, ChevronDown, ChevronRight,
  Palette, Package, Sword, Check, Sparkles, Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HERO_WEAPON_OPTIONS } from '@/lib/hero-weapons';
import { WEAPON_SKILL_TREES } from '@/lib/weapon-skills';

const BASE = import.meta.env.BASE_URL;

// ── Types ─────────────────────────────────────────────────────────────────────
interface HeroEdit {
  scale: number;
  colorTint: string;
  emissiveColor: string;
  emissiveIntensity: number;
  effectType: 'none' | 'fire' | 'magic' | 'storm' | 'lightning';
  effectIntensity: number;
  linkedModelId: string | null;
  baseModelId: string | null;
  playingAnimation: string | null;
  animSpeed: number;
  equippedWeapon: string | null;
  accessories: string[];
  notes: string;
}

interface ModelMeta {
  id: string;
  name: string;
  outputFile: string;
  status: 'ready' | 'converting' | 'error';
}

const DEFAULT_EDIT: HeroEdit = {
  scale: 1.0, colorTint: '#ffffff', emissiveColor: '#000000',
  emissiveIntensity: 0, effectType: 'none', effectIntensity: 0.6,
  linkedModelId: null, baseModelId: null, playingAnimation: null, animSpeed: 1.0,
  equippedWeapon: null, accessories: [], notes: '',
};

// In-game GLB models available in /public/models/characters/
const IN_GAME_MODELS = [
  { id: 'human',       label: 'Human'       },
  { id: 'elf',         label: 'Elf'         },
  { id: 'dwarf',       label: 'Dwarf'       },
  { id: 'orc',         label: 'Orc'         },
  { id: 'barbarian',   label: 'Barbarian'   },
  { id: 'undead',      label: 'Undead'      },
  { id: 'mage',        label: 'Mage'        },
  { id: 'rogue',       label: 'Rogue'       },
  { id: 'rogue_rpg',   label: 'Rogue RPG'   },
  { id: 'warrior_rpg', label: 'Warrior RPG' },
  { id: 'ranger_rpg',  label: 'Ranger RPG'  },
  { id: 'wizard_rpg',  label: 'Wizard RPG'  },
  { id: 'cleric_rpg',  label: 'Cleric RPG'  },
  { id: 'monk_rpg',    label: 'Monk RPG'    },
];

// All animations available in the in-game character GLBs
const IN_GAME_ANIMS = ['Idle','Walk','Run','SwordSlash','Punch','Roll','Jump','Shoot_OneHanded','RecieveHit','Death','Defeat','Victory','SitDown','StandUp','PickUp','Walk_Carry','Run_Carry'];

// ── Static data ───────────────────────────────────────────────────────────────
const FACTION_GROUPS: Record<string, string[]> = {
  Crusade: ['human_warrior','human_worg','human_mage','human_ranger','barbarian_warrior','barbarian_worg','barbarian_mage','barbarian_ranger'],
  Fabled:  ['dwarf_warrior','dwarf_worg','dwarf_mage','dwarf_ranger','elf_warrior','elf_worg','elf_mage','elf_ranger'],
  Legion:  ['orc_warrior','orc_worg','orc_mage','orc_ranger','undead_warrior','undead_worg','undead_mage','undead_ranger'],
  Pirates: ['pirate_king','sky_captain','faith_barrier'],
};

const FACTION_COLOR: Record<string, string> = {
  Crusade: 'text-blue-400', Fabled: 'text-purple-400',
  Legion: 'text-red-400', Pirates: 'text-amber-400',
};

const EFFECT_COLORS: Record<string, string> = {
  none: '#888888', fire: '#ff5500', magic: '#8844ff', storm: '#44aaff', lightning: '#ffee44',
};

const ACCESSORY_DEFS = [
  { id: 'halo',       label: '◯ Halo',       color: '#ffd700' },
  { id: 'wings',      label: '🪶 Wings',      color: '#eeeeee' },
  { id: 'crown',      label: '♕ Crown',      color: '#ffd700' },
  { id: 'fire_aura',  label: '🔥 Fire Aura',  color: '#ff4400' },
  { id: 'storm_ring', label: '◈ Storm Ring',  color: '#44aaff' },
  { id: 'skull',      label: '💀 Skull',      color: '#cccccc' },
  { id: 'star_badge', label: '★ Star Badge',  color: '#ffcc00' },
  { id: 'dark_cloak', label: '🌑 Dark Cloak', color: '#330066' },
];

// ── WebGL error boundary ──────────────────────────────────────────────────────
class WebGLErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  constructor(props: { children: ReactNode }) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/30">
          <span className="text-4xl">🖥️</span>
          <p className="text-sm font-bold text-white/40">3D viewport unavailable</p>
          <p className="text-[10px] text-white/20">WebGL not supported in this environment.<br />Use the 2D Preview and controls on the right.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── 3D Components ─────────────────────────────────────────────────────────────
function HeroPortraitPlane({ heroId, edit }: { heroId: string; edit: HeroEdit }) {
  const url = `${BASE}images/chars/${heroId}.png`;
  const texture = useTexture(url);
  const mat = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => {
    if (!mat.current) return;
    mat.current.color.set(edit.colorTint);
    mat.current.emissive.set(edit.emissiveColor);
    mat.current.emissiveIntensity = edit.emissiveIntensity;
    mat.current.needsUpdate = true;
  }, [edit.colorTint, edit.emissiveColor, edit.emissiveIntensity]);

  const h = 4 * edit.scale;
  const w = h * 0.75;

  return (
    <mesh position={[0, h / 2, 0]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial
        ref={mat}
        map={texture}
        transparent
        alphaTest={0.05}
        side={THREE.DoubleSide}
        color={edit.colorTint}
        emissive={new THREE.Color(edit.emissiveColor)}
        emissiveIntensity={edit.emissiveIntensity}
      />
    </mesh>
  );
}

function ParticleEffect({ type, intensity, scale }: { type: string; intensity: number; scale: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 120;
  const h = 4 * scale;

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.5 + Math.random() * 1.5;
      pos[i*3]   = Math.cos(angle) * r;
      pos[i*3+1] = Math.random() * h;
      pos[i*3+2] = Math.sin(angle) * r;
      vel[i*3]   = (Math.random() - 0.5) * 0.02;
      vel[i*3+1] = 0.01 + Math.random() * 0.03;
      vel[i*3+2] = (Math.random() - 0.5) * 0.02;
    }
    return { positions: pos, velocities: vel };
  }, [count, h]);

  const posRef = useRef(positions);

  useFrame((_, delta) => {
    if (!pointsRef.current || type === 'none') return;
    const pos = posRef.current;
    const t = Date.now() * 0.001;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      if (type === 'fire') {
        pos[i3+1] += velocities[i3+1] * delta * 60 * intensity;
        pos[i3]   += Math.sin(t + i) * 0.005 * intensity;
        pos[i3+2] += Math.cos(t + i) * 0.005 * intensity;
        if (pos[i3+1] > h + 1) { pos[i3+1] = 0; pos[i3] = (Math.random()-0.5)*1.5*scale; pos[i3+2] = (Math.random()-0.5)*1.5*scale; }
      } else if (type === 'magic') {
        const angle = t * 0.8 + (i / count) * Math.PI * 2;
        const r = (0.8 + Math.sin(t * 0.5 + i) * 0.4) * scale;
        pos[i3]   = Math.cos(angle + i * 0.1) * r;
        pos[i3+1] = (h / 2) + Math.sin(t + i * 0.5) * h * 0.4;
        pos[i3+2] = Math.sin(angle + i * 0.1) * r;
      } else if (type === 'storm') {
        const side = i < count / 2 ? 1 : -1; // split: left amber, right teal
        const angle = t * 1.2 + (i / (count/2)) * Math.PI * 2;
        const r = (0.6 + Math.sin(t + i) * 0.3) * scale;
        pos[i3]   = side * (0.3 + Math.abs(Math.cos(angle)) * r);
        pos[i3+1] = h * 0.2 + Math.sin(t * 0.7 + i) * h * 0.35;
        pos[i3+2] = Math.sin(angle + i) * r * 0.5;
      } else if (type === 'lightning') {
        pos[i3]   = (Math.random() - 0.5) * 3 * scale;
        pos[i3+1] = Math.random() * h;
        pos[i3+2] = (Math.random() - 0.5) * 0.5;
      }
    }

    const geom = pointsRef.current.geometry as THREE.BufferGeometry;
    (geom.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });

  if (type === 'none') return null;

  const baseColor = type === 'storm' ? '#44aaff' : EFFECT_COLORS[type] || '#ffffff';

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[posRef.current, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={type === 'lightning' ? 0.04 : 0.06}
        color={baseColor}
        transparent
        opacity={0.85 * intensity}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function AccessoryMeshes({ accessories, scale }: { accessories: string[]; scale: number }) {
  const h = 4 * scale;
  return (
    <>
      {accessories.includes('halo') && (
        <mesh position={[0, h + 0.5, 0]} rotation={[Math.PI * 0.1, 0, 0]}>
          <torusGeometry args={[0.6 * scale, 0.06, 12, 48]} />
          <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={1.5} />
        </mesh>
      )}
      {accessories.includes('crown') && (
        <mesh position={[0, h + 0.2, 0]}>
          <coneGeometry args={[0.35 * scale, 0.5 * scale, 5]} />
          <meshStandardMaterial color="#ffd700" emissive="#ffa000" emissiveIntensity={0.8} metalness={0.8} roughness={0.2} />
        </mesh>
      )}
      {accessories.includes('fire_aura') && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8 * scale, 1.4 * scale, 32]} />
          <meshBasicMaterial color="#ff4400" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
      {accessories.includes('storm_ring') && (
        <mesh position={[0, h / 2, 0]} rotation={[Math.PI * 0.15, 0, 0]}>
          <torusGeometry args={[1.2 * scale, 0.04, 8, 64]} />
          <meshStandardMaterial color="#44aaff" emissive="#44aaff" emissiveIntensity={2.0} />
        </mesh>
      )}
      {accessories.includes('star_badge') && (
        <mesh position={[0.8 * scale, h * 0.75, 0.1]}>
          <octahedronGeometry args={[0.15 * scale, 0]} />
          <meshStandardMaterial color="#ffcc00" emissive="#ffcc00" emissiveIntensity={2} metalness={0.5} />
        </mesh>
      )}
      {accessories.includes('skull') && (
        <mesh position={[0, h + 1.2, 0]}>
          <sphereGeometry args={[0.25 * scale, 8, 6]} />
          <meshStandardMaterial color="#ddccbb" roughness={0.8} />
        </mesh>
      )}
    </>
  );
}

function GlowRing({ color, intensity, scale }: { color: string; intensity: number; scale: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity =
        (0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.15) * intensity;
    }
  });
  if (intensity < 0.05) return null;
  return (
    <mesh ref={meshRef} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.5 * scale, 2.5 * scale, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.4 * intensity} depthWrite={false} />
    </mesh>
  );
}

// GLTF model viewer (used when linkedModelId is set)
function GltfViewer({
  url, playingAnimation, animSpeed, onAnimationsLoaded,
}: {
  url: string;
  playingAnimation: string | null;
  animSpeed: number;
  onAnimationsLoaded: (names: string[]) => void;
}) {
  const { scene, animations } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  const { actions, names } = useAnimations(animations, groupRef);

  useEffect(() => {
    onAnimationsLoaded(names);
  }, [names, onAnimationsLoaded]);

  useEffect(() => {
    Object.values(actions).forEach(a => a?.stop());
    if (playingAnimation && actions[playingAnimation]) {
      actions[playingAnimation]!.reset().setEffectiveTimeScale(animSpeed).play();
    }
  }, [playingAnimation, animSpeed, actions]);

  return <group ref={groupRef}><primitive object={scene} /></group>;
}

// ── In-game GLB model viewer ───────────────────────────────────────────────────
function InGameModelViewer({
  modelId, playingAnimation, animSpeed, scale,
}: { modelId: string; playingAnimation: string | null; animSpeed: number; scale: number }) {
  const url = `${BASE}models/characters/${modelId}.glb`;
  const { scene: rawScene, animations } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null!);
  const scene = useMemo(() => {
    const clone = SkeletonUtils.clone(rawScene);
    // Apply basic white materials for preview
    clone.traverse(o => {
      if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; }
    });
    return clone;
  }, [rawScene]);
  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    if (!actions) return;
    const name = playingAnimation ?? 'Idle';
    const action = actions[name];
    if (!action) return;
    Object.values(actions).forEach(a => a?.fadeOut(0.2));
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.reset().fadeIn(0.2).play();
  }, [playingAnimation, actions]);

  useEffect(() => {
    if (!actions) return;
    Object.values(actions).forEach(a => { if (a?.isRunning()) a.timeScale = animSpeed; });
  }, [animSpeed, actions]);

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      <primitive object={scene} />
    </group>
  );
}

function DressingRoomScene({
  heroId, edit, modelUrl, baseModelId, playingAnimation, animSpeed, onAnimationsLoaded,
}: {
  heroId: string;
  edit: HeroEdit;
  modelUrl: string | null;
  baseModelId: string | null;
  playingAnimation: string | null;
  animSpeed: number;
  onAnimationsLoaded: (names: string[]) => void;
}) {
  return (
    <>
      <color attach="background" args={['#06060f']} />
      <fog attach="fog" args={['#06060f', 12, 35]} />

      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 4]} intensity={2.5} color="#fff8e8" castShadow />
      <directionalLight position={[-4, 4, -3]} intensity={1.0} color="#4488cc" />
      <pointLight position={[0, 6, 3]} intensity={1.5} color="#d4a017" distance={12} />
      <pointLight position={[-3, 2, 2]} intensity={0.8} color="#6644ff" distance={10} />
      <pointLight position={[3, 2, 2]} intensity={0.8} color="#44ccff" distance={10} />

      <Grid
        args={[20, 20]}
        cellSize={0.5} cellThickness={0.4} cellColor="#1a1a2e"
        sectionSize={2} sectionThickness={0.8} sectionColor="#2a2a4e"
        fadeDistance={15} fadeStrength={1} infiniteGrid
      />

      <Stars radius={40} depth={20} count={800} factor={2} fade speed={0.3} />

      {baseModelId ? (
        <Suspense fallback={null}>
          <InGameModelViewer
            modelId={baseModelId}
            playingAnimation={playingAnimation}
            animSpeed={animSpeed}
            scale={edit.scale}
          />
        </Suspense>
      ) : modelUrl ? (
        <Suspense fallback={null}>
          <GltfViewer
            url={modelUrl}
            playingAnimation={playingAnimation}
            animSpeed={animSpeed}
            onAnimationsLoaded={onAnimationsLoaded}
          />
        </Suspense>
      ) : (
        <Suspense fallback={null}>
          <HeroPortraitPlane heroId={heroId} edit={edit} />
        </Suspense>
      )}

      <ParticleEffect type={edit.effectType} intensity={edit.effectIntensity} scale={edit.scale} />
      <AccessoryMeshes accessories={edit.accessories} scale={edit.scale} />
      <GlowRing color={edit.emissiveColor || '#d4a017'} intensity={edit.emissiveIntensity * 0.5} scale={edit.scale} />

      <OrbitControls
        makeDefault
        enablePan enableZoom enableRotate
        minDistance={2} maxDistance={20}
        target={[0, 2 * edit.scale, 0]}
      />
    </>
  );
}

// ── Helper UI components ──────────────────────────────────────────────────────
function Slider({ label, value, min, max, step = 0.01, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/50 uppercase tracking-wider">{label}</span>
        <span className="text-[10px] font-mono text-white/70">{value.toFixed(2)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 appearance-none rounded bg-white/10 cursor-pointer accent-amber-500"
      />
    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-white/50 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-white/50">{value}</span>
        <input
          type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border border-white/20 bg-transparent"
        />
      </div>
    </div>
  );
}

function TabBtn({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex flex-col items-center gap-0.5 py-2 text-[9px] uppercase tracking-wider font-bold transition-colors border-b-2",
        active
          ? "border-amber-500 text-amber-300 bg-amber-950/30"
          : "border-transparent text-white/30 hover:text-white/60 hover:bg-white/5"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ToonAdmin() {
  const [, setLocation] = useLocation();
  const { data: characters } = useGetCharacters();
  const [models, setModels] = useState<ModelMeta[]>([]);
  const [selectedHeroId, setSelectedHeroId] = useState('human_warrior');
  const [activeTab, setActiveTab] = useState<'colors'|'effects'|'model'|'weapons'|'accessories'>('colors');
  const [saved, setSaved] = useState(false);
  const [expandedFactions, setExpandedFactions] = useState<Record<string, boolean>>({ Crusade: true, Fabled: false, Legion: false, Pirates: false });
  const [availableAnims, setAvailableAnims] = useState<string[]>([]);

  // Load persisted edits
  const [heroEdits, setHeroEdits] = useState<Record<string, HeroEdit>>(() => {
    try { return JSON.parse(localStorage.getItem('toon_admin_edits') || '{}'); } catch { return {}; }
  });

  const currentEdit: HeroEdit = heroEdits[selectedHeroId] ?? DEFAULT_EDIT;

  const updateEdit = useCallback((patch: Partial<HeroEdit>) => {
    setHeroEdits(prev => ({
      ...prev,
      [selectedHeroId]: { ...(prev[selectedHeroId] ?? DEFAULT_EDIT), ...patch },
    }));
    setSaved(false);
  }, [selectedHeroId]);

  const saveEdits = () => {
    localStorage.setItem('toon_admin_edits', JSON.stringify(heroEdits));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const resetEdit = () => {
    setHeroEdits(prev => {
      const next = { ...prev };
      delete next[selectedHeroId];
      return next;
    });
  };

  // Fetch models from /api/models
  useEffect(() => {
    fetch(`${BASE.replace(/\/$/, '')}/api/models`).then(r => r.json()).then(setModels).catch(() => {});
  }, []);

  const selectedChar = characters?.find(c => c.id === selectedHeroId);
  const modelUrl = currentEdit.linkedModelId
    ? `${BASE.replace(/\/$/, '')}/api/models/file/${currentEdit.linkedModelId}`
    : null;

  const weaponOptions = HERO_WEAPON_OPTIONS[selectedHeroId] ?? [];
  const currentWeapon = currentEdit.equippedWeapon ?? weaponOptions[0];
  const weaponTree = currentWeapon ? WEAPON_SKILL_TREES[currentWeapon] : undefined;

  const handleAnimationsLoaded = useCallback((names: string[]) => {
    setAvailableAnims(names);
    if (names.length > 0 && !currentEdit.playingAnimation) {
      updateEdit({ playingAnimation: names[0] });
    }
  }, [currentEdit.playingAnimation, updateEdit]);

  const factionOfHero = Object.entries(FACTION_GROUPS).find(([, ids]) => ids.includes(selectedHeroId))?.[0] ?? '';

  return (
    <div className="h-screen flex flex-col bg-[#06060f] text-white overflow-hidden select-none">

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="h-12 shrink-0 flex items-center gap-3 px-4 border-b border-white/8 bg-[#09090f]/90">
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="w-px h-5 bg-white/10" />
        <span className="font-display font-bold text-base text-amber-400/90 text-glow uppercase tracking-widest">⚒ Toon Dressing Room</span>
        {selectedChar && (
          <>
            <div className="w-px h-5 bg-white/10" />
            <span className="font-display text-sm text-white/70 font-bold">{selectedChar.name}</span>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider", FACTION_COLOR[factionOfHero] || 'text-white/40')}>
              {factionOfHero}
            </span>
          </>
        )}
        <div className="flex-1" />
        <button
          onClick={resetEdit}
          className="flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors text-[11px] border border-white/10 rounded px-2 py-1"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
        <button
          onClick={saveEdits}
          className={cn(
            "flex items-center gap-1.5 font-bold text-[11px] px-3 py-1.5 rounded border transition-all",
            saved
              ? "border-green-500/60 bg-green-950/50 text-green-300"
              : "border-amber-600/60 bg-amber-950/50 text-amber-300 hover:bg-amber-900/60"
          )}
        >
          {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {/* ── Main layout ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left sidebar: hero roster ─────────────────────────────────────── */}
        <div className="w-48 shrink-0 bg-[#08080e] border-r border-white/8 overflow-y-auto custom-scrollbar">
          <div className="p-2">
            {Object.entries(FACTION_GROUPS).map(([faction, ids]) => (
              <div key={faction} className="mb-1">
                <button
                  onClick={() => setExpandedFactions(p => ({ ...p, [faction]: !p[faction] }))}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1.5 rounded text-[10px] font-display font-bold uppercase tracking-widest transition-colors",
                    FACTION_COLOR[faction], "hover:bg-white/5"
                  )}
                >
                  {faction}
                  {expandedFactions[faction] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                <AnimatePresence>
                  {expandedFactions[faction] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      {ids.map(id => {
                        const char = characters?.find(c => c.id === id);
                        const isSelected = selectedHeroId === id;
                        const hasEdit = !!heroEdits[id];
                        return (
                          <button
                            key={id}
                            onClick={() => { setSelectedHeroId(id); setAvailableAnims([]); }}
                            className={cn(
                              "w-full flex items-center gap-2 px-2 py-1 text-left rounded transition-all text-[10px]",
                              isSelected
                                ? "bg-amber-950/60 border border-amber-600/40 text-amber-200"
                                : "text-white/50 hover:text-white/80 hover:bg-white/5"
                            )}
                          >
                            <img
                              src={`${BASE}images/chars/${id}.png`}
                              alt=""
                              className="w-7 h-9 object-cover object-top rounded-sm shrink-0 border border-white/10"
                              onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.2'; }}
                            />
                            <span className="leading-tight font-medium truncate flex-1">
                              {char ? char.name.split(' ').slice(0, 2).join(' ') : id.replace(/_/g, ' ')}
                            </span>
                            {hasEdit && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Has edits" />}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* ── Center: 3D viewport ───────────────────────────────────────────── */}
        <div className="flex-1 relative">
          {/* Portrait reference image — shown at natural size in bottom-left corner */}
          <img
            src={`${BASE}images/chars/${selectedHeroId}.png`}
            alt=""
            aria-hidden
            className="absolute bottom-10 left-3 h-32 w-auto object-contain object-bottom pointer-events-none select-none rounded"
            style={{ opacity: 0.28, zIndex: 2 }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />

          <WebGLErrorBoundary>
          <Canvas
            camera={{ position: [0, 4, 8], fov: 45 }}
            gl={{ antialias: true, alpha: false, outputColorSpace: THREE.SRGBColorSpace }}
            shadows
          >
            <DressingRoomScene
              heroId={selectedHeroId}
              edit={currentEdit}
              modelUrl={modelUrl}
              baseModelId={currentEdit.baseModelId}
              playingAnimation={currentEdit.playingAnimation}
              animSpeed={currentEdit.animSpeed}
              onAnimationsLoaded={handleAnimationsLoaded}
            />
          </Canvas>
          </WebGLErrorBoundary>

          {/* Viewport overlay info */}
          <div className="absolute bottom-3 left-3 flex flex-col gap-1 pointer-events-none">
            <div className="text-[9px] text-white/25 bg-black/40 rounded px-2 py-1 font-mono">
              Scroll: zoom  •  Drag: orbit  •  Right-drag: pan
            </div>
            {currentEdit.effectType !== 'none' && (
              <div className="text-[9px] px-2 py-1 rounded font-bold" style={{ background: EFFECT_COLORS[currentEdit.effectType] + '33', color: EFFECT_COLORS[currentEdit.effectType] }}>
                ✦ {currentEdit.effectType.toUpperCase()} effect active
              </div>
            )}
          </div>

          {/* Hero name overlay */}
          {selectedChar && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 text-center pointer-events-none">
              <div className="font-display text-lg font-bold text-white/80 text-glow uppercase tracking-widest drop-shadow-lg">
                {selectedChar.name}
              </div>
              <div className="text-[10px] text-white/35">{selectedChar.race} {selectedChar.role}</div>
            </div>
          )}
        </div>

        {/* ── Right panel: editor tabs ──────────────────────────────────────── */}
        <div className="w-72 shrink-0 bg-[#08080e] border-l border-white/8 flex flex-col overflow-hidden">

          {/* Tab bar */}
          <div className="flex border-b border-white/8">
            <TabBtn label="Colors" icon={<Palette className="w-3.5 h-3.5" />} active={activeTab==='colors'} onClick={() => setActiveTab('colors')} />
            <TabBtn label="Effects" icon={<Sparkles className="w-3.5 h-3.5" />} active={activeTab==='effects'} onClick={() => setActiveTab('effects')} />
            <TabBtn label="Model" icon={<Layers className="w-3.5 h-3.5" />} active={activeTab==='model'} onClick={() => setActiveTab('model')} />
            <TabBtn label="Skills" icon={<Sword className="w-3.5 h-3.5" />} active={activeTab==='weapons'} onClick={() => setActiveTab('weapons')} />
            <TabBtn label="Assets" icon={<Package className="w-3.5 h-3.5" />} active={activeTab==='accessories'} onClick={() => setActiveTab('accessories')} />
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">

            {/* ── COLORS tab ─────────────────────────────────────────────── */}
            {activeTab === 'colors' && (
              <>
                <div className="space-y-3">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Portrait Tint</p>
                  <ColorPicker label="Color Tint" value={currentEdit.colorTint} onChange={v => updateEdit({ colorTint: v })} />
                  <p className="text-[9px] text-white/25 italic">Multiplies portrait texture color</p>
                </div>
                <div className="w-full h-px bg-white/6" />
                <div className="space-y-3">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Emissive Glow</p>
                  <ColorPicker label="Glow Color" value={currentEdit.emissiveColor} onChange={v => updateEdit({ emissiveColor: v })} />
                  <Slider label="Glow Intensity" value={currentEdit.emissiveIntensity} min={0} max={3} onChange={v => updateEdit({ emissiveIntensity: v })} />
                </div>
                <div className="w-full h-px bg-white/6" />
                <div className="space-y-3">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Scale</p>
                  <Slider label="Hero Scale" value={currentEdit.scale} min={0.4} max={2.5} step={0.05} onChange={v => updateEdit({ scale: v })} />
                </div>
                {/* CSS-based live preview */}
                <div className="w-full h-px bg-white/6" />
                <div className="space-y-2">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">2D Preview</p>
                  <div className="flex justify-center rounded bg-black/40 p-3 border border-white/8">
                    <img
                      src={`${BASE}images/chars/${selectedHeroId}.png`}
                      alt={selectedHeroId}
                      className="h-28 object-cover object-top rounded"
                      style={{
                        filter: `drop-shadow(0 0 ${currentEdit.emissiveIntensity * 8}px ${currentEdit.emissiveColor})`,
                        mixBlendMode: 'normal',
                      }}
                      onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.2'; }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* ── EFFECTS tab ─────────────────────────────────────────────── */}
            {activeTab === 'effects' && (
              <>
                <div className="space-y-3">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Particle Effect</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['none','fire','magic','storm','lightning'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => updateEdit({ effectType: type })}
                        className={cn(
                          "px-2 py-2 rounded border text-[10px] font-bold uppercase tracking-wider transition-all",
                          currentEdit.effectType === type
                            ? "border-amber-500/60 bg-amber-950/50 text-amber-300"
                            : "border-white/10 text-white/40 hover:border-white/25 hover:text-white/70"
                        )}
                        style={currentEdit.effectType === type ? { boxShadow: `0 0 12px ${EFFECT_COLORS[type]}44` } : {}}
                      >
                        {type === 'none' ? '✕ None' : type === 'fire' ? '🔥 Fire' : type === 'magic' ? '✨ Magic' : type === 'storm' ? '◈ Storm' : '⚡ Lightning'}
                      </button>
                    ))}
                  </div>
                  {currentEdit.effectType !== 'none' && (
                    <Slider label="Intensity" value={currentEdit.effectIntensity} min={0.1} max={1.0} onChange={v => updateEdit({ effectIntensity: v })} />
                  )}
                </div>

                <div className="w-full h-px bg-white/6" />

                <div className="space-y-2">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Effect Info</p>
                  <div className="rounded bg-black/30 border border-white/6 p-3 text-[9px] text-white/40 leading-relaxed">
                    {currentEdit.effectType === 'none' && 'No particles. Select a type above to add effects.'}
                    {currentEdit.effectType === 'fire' && 'Hot ember particles rise from the hero\'s base — orange/red fire stream.'}
                    {currentEdit.effectType === 'magic' && 'Blue/purple sparkles orbit the hero in arcane spiral patterns.'}
                    {currentEdit.effectType === 'storm' && 'Dual-storm energy — amber Creation-Storm on one side, teal End-Falls on the other. Signature of FaithBarrier.'}
                    {currentEdit.effectType === 'lightning' && 'Random white/blue lightning flickers around the hero at high speed.'}
                  </div>
                </div>
              </>
            )}

            {/* ── MODEL tab ─────────────────────────────────────────────────── */}
            {activeTab === 'model' && (
              <>
                {/* In-game battle model selector */}
                <div className="space-y-3">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">In-Game Battle Model</p>
                  <p className="text-[9px] text-white/30 italic">Pick which 3D character model this hero uses in battle.</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => updateEdit({ baseModelId: null, playingAnimation: 'Idle' })}
                      className={cn(
                        "px-2 py-2 rounded border text-[10px] font-bold transition-all text-left",
                        !currentEdit.baseModelId
                          ? "border-amber-500/50 bg-amber-950/40 text-amber-300"
                          : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"
                      )}
                    >
                      ✕ Default
                    </button>
                    {IN_GAME_MODELS.map(m => (
                      <button
                        key={m.id}
                        onClick={() => updateEdit({ baseModelId: m.id, linkedModelId: null, playingAnimation: 'Idle' })}
                        className={cn(
                          "px-2 py-2 rounded border text-[10px] font-bold transition-all text-left",
                          currentEdit.baseModelId === m.id
                            ? "border-amber-500/50 bg-amber-950/40 text-amber-300"
                            : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Animation player (shown when in-game model is selected) */}
                {currentEdit.baseModelId && (
                  <>
                    <div className="w-full h-px bg-white/6" />
                    <div className="space-y-3">
                      <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
                        Animations {availableAnims.length > 0 && <span className="text-white/20">({availableAnims.length})</span>}
                      </p>
                      <Slider label="Playback Speed" value={currentEdit.animSpeed} min={0.1} max={3.0} step={0.05} onChange={v => updateEdit({ animSpeed: v })} />
                      {availableAnims.length === 0 && (
                        <p className="text-[9px] text-white/20 italic">Loading animations…</p>
                      )}
                      <div className="grid grid-cols-2 gap-1">
                        {availableAnims.map(name => {
                          // Strip "CharacterArmature|" prefix for display only
                          const label = name.replace(/^CharacterArmature\|/, '');
                          return (
                            <button
                              key={name}
                              onClick={() => updateEdit({ playingAnimation: currentEdit.playingAnimation === name ? 'Idle' : name })}
                              className={cn(
                                "flex items-center gap-1.5 px-2 py-1.5 rounded border text-[9px] transition-all text-left",
                                currentEdit.playingAnimation === name
                                  ? "border-green-500/50 bg-green-950/40 text-green-300"
                                  : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"
                              )}
                            >
                              {currentEdit.playingAnimation === name
                                ? <Pause className="w-2.5 h-2.5 shrink-0" />
                                : <Play className="w-2.5 h-2.5 shrink-0" />}
                              <span className="truncate font-mono">{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                <div className="w-full h-px bg-white/6" />

                {/* Scale */}
                <div className="space-y-2">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Scale</p>
                  <Slider label="Model Scale" value={currentEdit.scale} min={0.4} max={2.5} step={0.05} onChange={v => updateEdit({ scale: v })} />
                </div>

                {/* External model link (advanced) */}
                {!currentEdit.baseModelId && (
                  <>
                    <div className="w-full h-px bg-white/6" />
                    <div className="space-y-3">
                      <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Custom Model Link</p>
                      <p className="text-[9px] text-white/25 italic">Link an uploaded GLTF/GLB from /admin.</p>
                      {models.length === 0 ? (
                        <div className="rounded border border-white/8 p-3 text-center text-[10px] text-white/25">
                          No models uploaded yet.
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <button
                            onClick={() => updateEdit({ linkedModelId: null, playingAnimation: null })}
                            className={cn("w-full text-left px-3 py-2 rounded border text-[10px] transition-all",
                              !currentEdit.linkedModelId ? "border-amber-500/50 bg-amber-950/40 text-amber-300" : "border-white/10 text-white/40 hover:border-white/20")}
                          >✕ None</button>
                          {models.filter(m => m.status === 'ready').map(m => (
                            <button key={m.id}
                              onClick={() => updateEdit({ linkedModelId: m.id, playingAnimation: null })}
                              className={cn("w-full text-left px-3 py-2 rounded border text-[10px] transition-all",
                                currentEdit.linkedModelId === m.id ? "border-amber-500/50 bg-amber-950/40 text-amber-300" : "border-white/10 text-white/40 hover:border-white/20")}
                            >
                              <div className="font-bold text-[11px]">{m.name}</div>
                              <div className="text-[9px] opacity-50">{m.outputFile}</div>
                            </button>
                          ))}
                        </div>
                      )}
                      {availableAnims.length > 0 && (
                        <div className="space-y-1 mt-2">
                          <Slider label="Playback Speed" value={currentEdit.animSpeed} min={0.1} max={3.0} step={0.05} onChange={v => updateEdit({ animSpeed: v })} />
                          {availableAnims.map(name => (
                            <button key={name}
                              onClick={() => updateEdit({ playingAnimation: currentEdit.playingAnimation === name ? null : name })}
                              className={cn("w-full flex items-center gap-2 px-3 py-2 rounded border text-[10px] transition-all text-left",
                                currentEdit.playingAnimation === name ? "border-green-500/50 bg-green-950/40 text-green-300" : "border-white/10 text-white/40 hover:border-white/20")}
                            >
                              {currentEdit.playingAnimation === name ? <Pause className="w-3 h-3 shrink-0" /> : <Play className="w-3 h-3 shrink-0" />}
                              <span className="truncate font-mono">{name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── WEAPONS/SKILLS tab ──────────────────────────────────────── */}
            {activeTab === 'weapons' && (
              <>
                <div className="space-y-3">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Weapon Selection</p>
                  <div className="space-y-1">
                    {weaponOptions.map(wKey => {
                      const tree = WEAPON_SKILL_TREES[wKey];
                      if (!tree) return null;
                      return (
                        <button
                          key={wKey}
                          onClick={() => updateEdit({ equippedWeapon: wKey })}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded border text-left transition-all",
                            currentWeapon === wKey
                              ? "border-amber-500/60 bg-amber-950/50 text-amber-200"
                              : "border-white/10 text-white/50 hover:border-white/25 hover:text-white/80"
                          )}
                        >
                          <span className="text-xl leading-none">{tree.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold">{tree.displayName}</div>
                            <div className="text-[9px] opacity-50 line-clamp-1">{tree.description}</div>
                          </div>
                          {currentWeapon === wKey && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {weaponTree && (
                  <>
                    <div className="w-full h-px bg-white/6" />
                    <div className="space-y-2">
                      <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Skill Slots — {weaponTree.displayName}</p>
                      {weaponTree.slots.map(slot => {
                        const skill = slot.skills[0];
                        if (!skill) return null;
                        return (
                          <div key={slot.slot} className="flex items-start gap-2 rounded border border-white/6 bg-white/[0.02] px-3 py-2">
                            <span className="text-xl leading-none mt-0.5">{skill.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-bold text-white/80">{skill.name}</div>
                              <div className="text-[9px] text-white/35 italic line-clamp-2 leading-snug">{skill.description}</div>
                              <div className="flex gap-1.5 mt-1">
                                {skill.stats.slice(0, 2).map((s, i) => (
                                  <span key={i} className="text-[8px] bg-white/6 border border-white/10 rounded px-1 py-0.5 text-white/50 font-mono">{s}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                <div className="w-full h-px bg-white/6" />
                <div className="space-y-2">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Notes</p>
                  <textarea
                    value={currentEdit.notes}
                    onChange={e => updateEdit({ notes: e.target.value })}
                    placeholder="Hero notes, build tips, character lore..."
                    rows={4}
                    className="w-full rounded border border-white/10 bg-white/[0.03] text-[10px] text-white/60 p-2 resize-none placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 transition-colors"
                  />
                </div>
              </>
            )}

            {/* ── ACCESSORIES tab ──────────────────────────────────────────── */}
            {activeTab === 'accessories' && (
              <>
                <div className="space-y-3">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">3D Accessories</p>
                  <p className="text-[9px] text-white/25 italic">Toggle accessories visible in the viewport. Multiple can be active simultaneously.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ACCESSORY_DEFS.map(acc => {
                      const active = currentEdit.accessories.includes(acc.id);
                      return (
                        <button
                          key={acc.id}
                          onClick={() => {
                            const list = currentEdit.accessories;
                            updateEdit({ accessories: active ? list.filter(a => a !== acc.id) : [...list, acc.id] });
                          }}
                          className={cn(
                            "px-2 py-2.5 rounded border text-[10px] font-medium transition-all text-center",
                            active
                              ? "border-amber-500/60 bg-amber-950/50 text-amber-200"
                              : "border-white/10 text-white/40 hover:border-white/25 hover:text-white/70"
                          )}
                          style={active ? { boxShadow: `0 0 10px ${acc.color}44` } : {}}
                        >
                          {acc.label}
                        </button>
                      );
                    })}
                  </div>
                  {currentEdit.accessories.length > 0 && (
                    <button
                      onClick={() => updateEdit({ accessories: [] })}
                      className="w-full text-center text-[9px] text-white/30 hover:text-white/60 transition-colors py-1"
                    >
                      Clear all accessories
                    </button>
                  )}
                </div>

                <div className="w-full h-px bg-white/6" />
                <div className="space-y-2">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Active Accessories</p>
                  {currentEdit.accessories.length === 0 ? (
                    <p className="text-[9px] text-white/20 italic">None active</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {currentEdit.accessories.map(id => {
                        const def = ACCESSORY_DEFS.find(a => a.id === id);
                        return def ? (
                          <span key={id} className="text-[9px] px-2 py-0.5 rounded border border-amber-500/30 bg-amber-950/30 text-amber-300">
                            {def.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                <div className="w-full h-px bg-white/6" />
                <div className="rounded border border-white/6 bg-white/[0.02] p-3 text-[9px] text-white/35 leading-relaxed">
                  <strong className="text-white/50">Accessories render in 3D</strong> above/around the hero in the viewport. Use emissive glow (Colors tab) + particle effects (Effects tab) for dramatic visual builds.
                </div>
              </>
            )}

          </div>

          {/* Bottom save indicator */}
          <div className="shrink-0 border-t border-white/8 px-4 py-3 flex items-center justify-between">
            <span className="text-[9px] text-white/25 italic">
              {Object.keys(heroEdits).length} hero{Object.keys(heroEdits).length !== 1 ? 's' : ''} with saved edits
            </span>
            <button
              onClick={saveEdits}
              className={cn(
                "text-[10px] font-bold px-3 py-1.5 rounded border transition-all flex items-center gap-1.5",
                saved
                  ? "border-green-500/60 text-green-300 bg-green-950/50"
                  : "border-amber-600/40 text-amber-400/80 hover:text-amber-300 hover:border-amber-500/60"
              )}
            >
              <Save className="w-3 h-3" />
              {saved ? 'Saved' : 'Save All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
