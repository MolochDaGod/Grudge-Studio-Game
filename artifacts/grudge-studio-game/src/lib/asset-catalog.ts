import { mapModelUrl, localUrl } from './asset-config';

/** Local path (dev server / bundled public/) */
const M = (pack: string, file: string) => localUrl(`models/maps/${pack}/${file}.glb`);
/** CDN-resolved path (prod R2 CDN, local fallback in dev) */
const CDN = (pack: string, file: string) => mapModelUrl(pack, file);

export type AssetPack = 'medieval' | 'elven' | 'orc' | 'ruins';
export type AssetCategory = 'fortress' | 'tower' | 'wall' | 'gate' | 'building' | 'prop' | 'bridge' | 'ruin';

export interface AssetEntry {
  id: string;
  label: string;
  /** Local dev-server URL (always works in dev) */
  url: string;
  /** CDN URL — resolved via asset-config (R2 in prod, local in dev) */
  cdnUrl: string;
  pack: AssetPack;
  category: AssetCategory;
}

export const ASSET_CATALOG: AssetEntry[] = [
  // ── MEDIEVAL ──────────────────────────────────────────────────────────────
  { id: 'med_fortress',   label: 'Fortress',     url: M('medieval','fortress_full'),     pack: 'medieval', category: 'fortress'  },
  { id: 'med_barracks',   label: 'Barracks',     url: M('medieval','barracks'),          pack: 'medieval', category: 'building'  },
  { id: 'med_ammourry',   label: 'Armoury',      url: M('medieval','ammourry'),          pack: 'medieval', category: 'building'  },
  { id: 'med_stairs',     label: 'Stairs',       url: M('medieval','stairs_full1'),      pack: 'medieval', category: 'building'  },
  { id: 'med_tower_01',   label: 'Tower 1',      url: M('medieval','tower_01'),          pack: 'medieval', category: 'tower'     },
  { id: 'med_tower_02',   label: 'Tower 2',      url: M('medieval','tower_02_1'),        pack: 'medieval', category: 'tower'     },
  { id: 'med_tower_03',   label: 'Tower 3',      url: M('medieval','tower_03_1_full'),   pack: 'medieval', category: 'tower'     },
  { id: 'med_tower_04',   label: 'Tower 4',      url: M('medieval','tower_04_full'),     pack: 'medieval', category: 'tower'     },
  { id: 'med_tower_05',   label: 'Tower 5',      url: M('medieval','tower_05_full'),     pack: 'medieval', category: 'tower'     },
  { id: 'med_wall_01',    label: 'Wall 1',       url: M('medieval','wall_01_full'),      pack: 'medieval', category: 'wall'      },
  { id: 'med_wall_02',    label: 'Wall 2',       url: M('medieval','wall_02_1'),         pack: 'medieval', category: 'wall'      },
  { id: 'med_fense',      label: 'Fence',        url: M('medieval','fense_fyull'),       pack: 'medieval', category: 'wall'      },
  { id: 'med_gate_01',    label: 'Gate 1',       url: M('medieval','minnor_gates_01'),   pack: 'medieval', category: 'gate'      },
  { id: 'med_gate_02',    label: 'Gate 2',       url: M('medieval','minnor_gates_02'),   pack: 'medieval', category: 'gate'      },
  { id: 'med_bridge',     label: 'Bridge',       url: M('medieval','bridge_full'),       pack: 'medieval', category: 'bridge'    },
  { id: 'med_sentry',     label: 'Sentry Hut',   url: M('medieval','sentry_hurt'),       pack: 'medieval', category: 'building'  },
  { id: 'med_brazier',    label: 'Brazier',      url: M('medieval','brazier'),           pack: 'medieval', category: 'prop'      },
  { id: 'med_fire_bell',  label: 'Fire Bell',    url: M('medieval','fire_bell'),         pack: 'medieval', category: 'prop'      },
  { id: 'med_firewoods',  label: 'Firewoods',    url: M('medieval','firewoods'),         pack: 'medieval', category: 'prop'      },
  { id: 'med_props',      label: 'Misc Props',   url: M('medieval','props_full'),        pack: 'medieval', category: 'prop'      },

  // ── ELVEN ─────────────────────────────────────────────────────────────────
  { id: 'elv_fortress',   label: 'Fortress',     url: M('elven','fortress_full'),        pack: 'elven',    category: 'fortress'  },
  { id: 'elv_kazarm',     label: 'Barracks',     url: M('elven','kazarm_1'),             pack: 'elven',    category: 'building'  },
  { id: 'elv_arsenal',    label: 'Arsenal',      url: M('elven','arsenal_1'),            pack: 'elven',    category: 'building'  },
  { id: 'elv_stairs',     label: 'Stairs',       url: M('elven','stairs_full'),          pack: 'elven',    category: 'building'  },
  { id: 'elv_tower_1',    label: 'Tower 1',      url: M('elven','tower_1'),              pack: 'elven',    category: 'tower'     },
  { id: 'elv_tower_2',    label: 'Tower 2',      url: M('elven','tower_2'),              pack: 'elven',    category: 'tower'     },
  { id: 'elv_tower_3',    label: 'Tower 3',      url: M('elven','tower_3_full'),         pack: 'elven',    category: 'tower'     },
  { id: 'elv_tower_4',    label: 'Tower 4',      url: M('elven','tower_4_full'),         pack: 'elven',    category: 'tower'     },
  { id: 'elv_tower_5',    label: 'Tower 5',      url: M('elven','tower_5_full'),         pack: 'elven',    category: 'tower'     },
  { id: 'elv_watchtower', label: 'Watchtower',   url: M('elven','watchtoer_1'),          pack: 'elven',    category: 'tower'     },
  { id: 'elv_wall_1',     label: 'Wall 1',       url: M('elven','wall_1_full'),          pack: 'elven',    category: 'wall'      },
  { id: 'elv_wall_2',     label: 'Wall 2',       url: M('elven','wall_2'),               pack: 'elven',    category: 'wall'      },
  { id: 'elv_fense',      label: 'Fence',        url: M('elven','fense_full'),           pack: 'elven',    category: 'wall'      },
  { id: 'elv_gate_2',     label: 'Gate 2',       url: M('elven','minnor_gates_2'),       pack: 'elven',    category: 'gate'      },
  { id: 'elv_gate_4',     label: 'Gate 4',       url: M('elven','minnor_gates_4'),       pack: 'elven',    category: 'gate'      },
  { id: 'elv_bridge',     label: 'Bridge',       url: M('elven','bridge_full'),          pack: 'elven',    category: 'bridge'    },
  { id: 'elv_brazier',    label: 'Brazier',      url: M('elven','brazier_1'),            pack: 'elven',    category: 'prop'      },
  { id: 'elv_fire_bell',  label: 'Fire Bell',    url: M('elven','fire_bell_1'),          pack: 'elven',    category: 'prop'      },
  { id: 'elv_andiron',    label: 'Andiron',      url: M('elven','andiron1'),             pack: 'elven',    category: 'prop'      },
  { id: 'elv_props',      label: 'Misc Props',   url: M('elven','props_full'),           pack: 'elven',    category: 'prop'      },

  // ── ORC ───────────────────────────────────────────────────────────────────
  { id: 'orc_fortress',   label: 'Fortress',     url: M('orc','fortress_full'),          pack: 'orc',      category: 'fortress'  },
  { id: 'orc_barracks',   label: 'Barracks',     url: M('orc','barracks'),               pack: 'orc',      category: 'building'  },
  { id: 'orc_arsenal',    label: 'Arsenal',      url: M('orc','arsenal'),                pack: 'orc',      category: 'building'  },
  { id: 'orc_shed',       label: 'Shed',         url: M('orc','shed_01'),                pack: 'orc',      category: 'building'  },
  { id: 'orc_stairs',     label: 'Stairs',       url: M('orc','stairs_full'),            pack: 'orc',      category: 'building'  },
  { id: 'orc_tower_01',   label: 'Tower 1',      url: M('orc','tower_01'),               pack: 'orc',      category: 'tower'     },
  { id: 'orc_tower_02',   label: 'Tower 2',      url: M('orc','tower_02'),               pack: 'orc',      category: 'tower'     },
  { id: 'orc_tower_3',    label: 'Tower 3',      url: M('orc','tower_3_full'),           pack: 'orc',      category: 'tower'     },
  { id: 'orc_tower_4',    label: 'Tower 4',      url: M('orc','tower_4_full'),           pack: 'orc',      category: 'tower'     },
  { id: 'orc_tower_5',    label: 'Tower 5',      url: M('orc','tower_5_full'),           pack: 'orc',      category: 'tower'     },
  { id: 'orc_wall_1',     label: 'Wall 1',       url: M('orc','wall_1_full'),            pack: 'orc',      category: 'wall'      },
  { id: 'orc_wall_2',     label: 'Wall 2',       url: M('orc','wall_2_01'),              pack: 'orc',      category: 'wall'      },
  { id: 'orc_fense',      label: 'Fence',        url: M('orc','fense_full'),             pack: 'orc',      category: 'wall'      },
  { id: 'orc_gate_01',    label: 'Gate 1',       url: M('orc','minnor_gates_01'),        pack: 'orc',      category: 'gate'      },
  { id: 'orc_gate_02',    label: 'Gate 2',       url: M('orc','minnor_gates_02'),        pack: 'orc',      category: 'gate'      },
  { id: 'orc_bridge',     label: 'Bridge',       url: M('orc','bridge_full'),            pack: 'orc',      category: 'bridge'    },
  { id: 'orc_brazier',    label: 'Brazier',      url: M('orc','brazier_01'),             pack: 'orc',      category: 'prop'      },
  { id: 'orc_drum',       label: 'Alarm Drum',   url: M('orc','alarm_drum'),             pack: 'orc',      category: 'prop'      },
  { id: 'orc_firewoods',  label: 'Firewoods',    url: M('orc','firewoods'),              pack: 'orc',      category: 'prop'      },
  { id: 'orc_props',      label: 'Misc Props',   url: M('orc','props_full'),             pack: 'orc',      category: 'prop'      },

  // ── RUINS ─────────────────────────────────────────────────────────────────
  ...Array.from({ length: 21 }, (_, i) => ({
    id:       `ruin_${i + 1}`,
    label:    `Ruin ${i + 1}`,
    url:      M('ruins', `ruin_${i + 1}`),
    pack:     'ruins' as AssetPack,
    category: 'ruin'  as AssetCategory,
  })),
];

export const ASSET_BY_PACK: Record<AssetPack, AssetEntry[]> = {
  medieval: ASSET_CATALOG.filter(a => a.pack === 'medieval'),
  elven:    ASSET_CATALOG.filter(a => a.pack === 'elven'),
  orc:      ASSET_CATALOG.filter(a => a.pack === 'orc'),
  ruins:    ASSET_CATALOG.filter(a => a.pack === 'ruins'),
};

export const PACK_LABELS: Record<AssetPack, string> = {
  medieval: 'Medieval',
  elven:    'Elven',
  orc:      'Orc',
  ruins:    'Ruins',
};
