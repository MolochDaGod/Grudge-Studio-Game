import { create } from 'zustand';

export type TerrainType = 'grass' | 'sand' | 'lava' | 'water' | 'stone' | 'dirt';
export type EditorMode   = 'select' | 'place' | 'terrain' | 'erase';
export type TransformMode = 'translate' | 'rotate' | 'scale';

export const TERRAIN_COLORS: Record<TerrainType, string> = {
  grass: '#3e7a28',
  sand:  '#c8a840',
  lava:  '#cc3010',
  water: '#1050a0',
  stone: '#505060',
  dirt:  '#6b4a30',
};

export const TERRAIN_LABELS: Record<TerrainType, string> = {
  grass: 'Grass',
  sand:  'Sand',
  lava:  'Lava',
  water: 'Water',
  stone: 'Stone',
  dirt:  'Dirt',
};

export interface EditorProp {
  id: string;
  modelUrl: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  scale: number;
}

interface EditorState {
  levelId: string;
  gridW: number;
  gridH: number;
  tileSize: number;

  terrain: Record<string, TerrainType>;
  props: EditorProp[];

  selectedPropId: string | null;
  mode: EditorMode;
  transformMode: TransformMode;
  selectedAsset: string | null;
  selectedTerrain: TerrainType;
  snapEnabled: boolean;

  isDirty: boolean;

  initEditor: (
    levelId: string,
    gridW: number,
    gridH: number,
    tileSize: number,
    initialProps: EditorProp[],
  ) => void;

  setMode:          (mode: EditorMode)     => void;
  setTransformMode: (mode: TransformMode)  => void;
  setSelectedAsset: (url: string | null)   => void;
  selectProp:       (id: string | null)    => void;
  toggleSnap:       ()                     => void;
  setTerrain:       (x: number, z: number, type: TerrainType) => void;
  setSelectedTerrain:(t: TerrainType)      => void;

  addProp: (x: number, z: number) => void;
  updatePropTransform: (
    id: string,
    data: { x: number; y: number; z: number; rotY: number; scale: number },
  ) => void;
  deleteProp: (id: string) => void;

  saveMap:     () => void;
  loadSavedMap:(levelId: string) => boolean;
  clearEdits:  (levelId: string) => void;
}

let _propCounter = 0;

export const useEditorStore = create<EditorState>((set, get) => ({
  levelId:        '',
  gridW:          80,
  gridH:          80,
  tileSize:       1,
  terrain:        {},
  props:          [],
  selectedPropId: null,
  mode:           'select',
  transformMode:  'translate',
  selectedAsset:  null,
  selectedTerrain:'grass',
  snapEnabled:    true,
  isDirty:        false,

  initEditor: (levelId, gridW, gridH, tileSize, initialProps) => {
    _propCounter = 0;
    const saved = localStorage.getItem(`grudge-editor-${levelId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        set({
          levelId, gridW, gridH, tileSize,
          terrain: data.terrain ?? {},
          props:   (data.props ?? []).map((p: EditorProp) => ({ ...p, id: `prop_${_propCounter++}` })),
          selectedPropId: null,
          mode: 'select',
          isDirty: false,
        });
        return;
      } catch { /* ignore */ }
    }
    set({
      levelId, gridW, gridH, tileSize,
      terrain: {},
      props: initialProps.map(p => ({ ...p, id: `prop_${_propCounter++}` })),
      selectedPropId: null,
      mode: 'select',
      isDirty: false,
    });
  },

  setMode:           (mode)  => set({ mode, selectedPropId: mode !== 'select' ? null : get().selectedPropId }),
  setTransformMode:  (mode)  => set({ transformMode: mode }),
  setSelectedAsset:  (url)   => set({ selectedAsset: url }),
  selectProp:        (id)    => set({ selectedPropId: id }),
  toggleSnap:        ()      => set(s => ({ snapEnabled: !s.snapEnabled })),
  setSelectedTerrain:(t)     => set({ selectedTerrain: t }),

  setTerrain: (x, z, type) => set(s => ({
    terrain: { ...s.terrain, [`${x},${z}`]: type },
    isDirty: true,
  })),

  addProp: (x, z) => {
    const { selectedAsset, snapEnabled, tileSize } = get();
    if (!selectedAsset) return;
    const snapX = snapEnabled ? Math.round(x / tileSize) * tileSize : x;
    const snapZ = snapEnabled ? Math.round(z / tileSize) * tileSize : z;
    const newProp: EditorProp = {
      id:       `prop_${_propCounter++}`,
      modelUrl: selectedAsset,
      x:        snapX,
      y:        0,
      z:        snapZ,
      rotY:     0,
      scale:    1,
    };
    set(s => ({
      props:          [...s.props, newProp],
      selectedPropId: newProp.id,
      mode:           'select',
      isDirty:        true,
    }));
  },

  updatePropTransform: (id, data) => set(s => ({
    props:   s.props.map(p => p.id === id ? { ...p, ...data } : p),
    isDirty: true,
  })),

  deleteProp: (id) => set(s => ({
    props:          s.props.filter(p => p.id !== id),
    selectedPropId: s.selectedPropId === id ? null : s.selectedPropId,
    isDirty:        true,
  })),

  saveMap: () => {
    const { levelId, terrain, props } = get();
    const data = {
      terrain,
      props: props.map(({ id: _id, ...rest }) => rest),
    };
    localStorage.setItem(`grudge-editor-${levelId}`, JSON.stringify(data));
    set({ isDirty: false });
  },

  loadSavedMap: (levelId) => {
    const raw = localStorage.getItem(`grudge-editor-${levelId}`);
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      set(s => ({
        terrain: data.terrain ?? {},
        props: (data.props ?? []).map((p: EditorProp) => ({ ...p, id: `prop_${_propCounter++}` })),
        isDirty: false,
      }));
      return true;
    } catch { return false; }
  },

  clearEdits: (levelId) => {
    localStorage.removeItem(`grudge-editor-${levelId}`);
    set({ isDirty: false });
  },
}));

// Load saved props for battle scene (returns null if no saved data)
export function loadSavedProps(levelId: string): import('@/lib/levels').PropPlacement[] | null {
  const raw = localStorage.getItem(`grudge-editor-${levelId}`);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    return data.props ?? null;
  } catch { return null; }
}
