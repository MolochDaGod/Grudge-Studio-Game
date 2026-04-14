# Realm of Grudges — 3D Tactical RPG

A browser-based 3D turn-based tactics game inspired by Mario + Rabbids: Kingdom Battle, built with React, Three.js, and Vite.

## Features

- **3D Tactical Battles** — Isometric tile-based combat on compact 40×40 to 70×70 grids with 4 themed levels (Graveyard Ruins, Orc Stronghold, Elven Citadel, Iron Bastion)
- **50+ GLTF Character Models** — Quaternius + RPG character packs with dynamic weapon attachment, per-character material overrides, animation retargeting, and model-pack-aware scaling
- **15+ Weapon Skill Trees** — Greataxe, Fire Staff, Dark Staff, Daggers, Greatsword, Longbow, Sword & Shield, War Hammer, Rusted Blade, Bow, Crossbow, Gun, Spear, Lance, Arcane Focus — each with 5 skill slots (basic, core, utility, special, ultimate)
- **Weapon-Aware Rendering** — Player's weapon choice drives the 3D model, bone-attached weapon, and animation set via `resolveWeaponConfig()` + `buildAnimMap()`. Fallback system for 9 missing weapon GLBs
- **Mobility System** — Team Jump (bounce off allies, Yoshi-style), Heroic Leap (fly over obstacles), Shadow Step (instant teleport), with parabolic arc and fade animations
- **Dash-Strike Mechanics** — Lunge Strike (dash + return to origin), Blitz Rush (dash + stay at target), Hit & Run (fast dash + return). Creates spatial risk/reward strategy
- **Long-Range Blasts** — Every weapon has 10-14 tile ranged blast options (Energy Wave, Piercing Shot, Shockwave Slam) injected universally
- **Friendly Targeting** — Heal/buff skills target allies with green zone highlights, cast animations, and heal_ring/buff_aura VFX
- **Color-Coded Tile Zones** — Red (enemy attacks), Blue (movement/self), Purple (mobility skills), Green (heals/buffs)
- **Cover System** — Directional half-cover (25% reduction) and heavy-cover (50% reduction) from obstacle adjacency, shown in the attack preview HUD
- **Tactical AI** — Scoring-based enemy AI with move evaluation, target selection, skill/ability scoring, and 3 difficulty levels (easy, normal, hard)
- **Charge Time Turn System** — Speed-based CT accumulation (like FFT) with a visual turn order bar
- **Facing & Flanking** — 4-directional facing with rear attack bonus (+50% damage, +25% crit chance)
- **Status Effects** — Stun, poison, freeze with immunity after expiry to prevent stun-lock
- **Combat VFX** — Projectile trails, physical slash arcs, elemental explosions, crit bursts, camera shake, melee dash lunges, heal rings, buff auras, magic circles, energy charges
- **Passive Skill Display** — Passive skills shown with dashed border, dimmed filter, and "PASSIVE" label; non-clickable
- **4 Camera Modes** — Tactical isometric (Q/E 45° rotation), free orbit, third-person follow, RTS overhead
- **Accessory System** — GLTFLoader-based async bone attachment for helmets, shoulder pads, capes
- **Map Editor** — In-game prop placement for custom level design
- **Minimap** — Real-time unit tracker for compact maps

## Tech Stack

- **React 19** + **TypeScript**
- **Three.js** via `@react-three/fiber` + `@react-three/drei`
- **Post-processing** — Bloom + Vignette via `@react-three/postprocessing`
- **Zustand** — State management
- **Tailwind CSS v4** — UI styling
- **Framer Motion** — HUD animations
- **Vite 7** — Build tooling
- **pnpm** workspaces — Monorepo management

## Project Structure

```
├── artifacts/grudge-studio-game/    # Main game application
│   ├── src/
│   │   ├── components/three/       # 3D scene (BattleScene, TileGrid, CharacterModel, CombatEffects)
│   │   ├── components/ui/          # HUD components (health bars, skill tooltips, minimap)
│   │   ├── lib/
│   │   │   ├── combat-engine.ts    # Damage calc, facing, BFS pathfinding, effect mapping
│   │   │   ├── cover-system.ts     # Directional cover mechanics (half/heavy)
│   │   │   ├── tactical-ai.ts      # Enemy AI with move/action scoring + difficulty levels
│   │   │   ├── levels.ts           # 4 compact level definitions with obstacle layouts and 3D props
│   │   │   ├── weapon-skills.ts    # 15+ weapon skill trees with 90+ skills, mobility, dash-strikes, long-range blasts
│   │   │   ├── character-model-map.ts  # 50+ character configs with material/weapon/anim mappings + RPG pack support
│   │   │   ├── animation-retarget.ts   # Bone retargeting, weapon-specific anim defaults, Mixamo library catalog
│   │   │   ├── hero-weapons.ts     # Per-character weapon options (3 choices each)
│   │   │   ├── texture-manager.ts  # Multi-texture loading, atlas slicing, cache
│   │   │   └── lore.ts             # Character lore and descriptions
│   │   ├── pages/                  # Route pages (battle, character-select, skill-tree, etc.)
│   │   └── store/use-game-store.ts # Zustand game state
│   └── public/models/              # GLTF models (characters, weapons, maps, nature)
├── lib/                            # Shared workspace libraries
│   ├── api-client-react/           # API client hooks
│   ├── api-spec/                   # API specification
│   ├── api-zod/                    # Zod validators
│   └── db/                         # Database schema (Drizzle)
└── vercel.json                     # Vercel deployment config
```

## Getting Started

### Prerequisites

- **Node.js** ≥ 22 (recommended: 22 LTS or 24)
- **pnpm** ≥ 10

### Install

```bash
pnpm install
```

### Development

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/grudge-studio-game run dev
```

### Production Build

```bash
pnpm --filter @workspace/grudge-studio-game run build
```

Output goes to `artifacts/grudge-studio-game/dist/`.

### Preview Production Build

```bash
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/grudge-studio-game run serve
```

## Deployment (Vercel)

The project includes a `vercel.json` configured for the monorepo structure.

### One-Click Deploy

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com/new)
3. Vercel auto-detects `vercel.json` — no additional config needed
4. Set **Root Directory** to the repo root (not the artifact subfolder)

### Manual CLI Deploy

```bash
npx vercel --prod
```

### Environment Variables (optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_PATH` | `/` | Base URL path for the app |

## Game Systems

### Cover System (`lib/cover-system.ts`)

Tiles adjacent to obstacles gain directional cover:
- **Half Cover** — 25% damage reduction when one obstacle side faces the attacker
- **Heavy Cover** — 50% reduction when two obstacle sides block the attack angle (corner positions)
- Shown in the attack preview tooltip with a shield badge
- AI considers cover when choosing movement positions (hard difficulty weights it 3×)

### Tactical AI (`lib/tactical-ai.ts`)

Scoring-based AI that evaluates every option:
- **Move Scoring** — Distance to target, flanking position, cover quality, ally spread (anti-AoE)
- **Action Scoring** — Skill damage multipliers, AoE clustering, status effects, finishing blows, ultimate management
- **LOS Checks** — Ranged attacks require line-of-sight; jump/dash skills bypass it
- **3 Difficulty Levels**: `easy` (random from top 3), `normal` (best option), `hard` (cover-aware + exposed tile avoidance)

### Combat Engine (`lib/combat-engine.ts`)

- Facing-based defense (rear attacks halve defense)
- Block chance on frontal attacks (25%)
- Crit chance: 10% front / 35% rear
- Cover damage reduction applied after all other calculations
- Bresenham line-of-sight for ranged attacks
- Mobility skill detection (`isMobilitySkill`)
- Dash landing tile resolution (`findDashLandingTile`)

### Character Rendering Pipeline

- `CharacterModel` receives `weaponType` prop → resolves weapon config via `resolveWeaponConfig()` (handles fallbacks for missing GLBs, RPG-pack scale correction)
- Animations driven by `buildAnimMap()` which merges: global defaults → weapon-specific anims → per-character overrides → runtime overrides
- Full weapon-specific animation sets for walk, run, idle, attack, block, hurt per weapon type
- Accessory system loads helmets/capes/shoulder pads via async GLTFLoader with cleanup on unmount
- Voxel character branch for skeleton-less models with procedural animation

### Mobility & Spatial Strategy

- **Team Jump** — Bounce off adjacent ally to reach 5-tile range (ignores obstacles)
- **Heroic Leap** — Fly 6 tiles over everything (parabolic Y arc, 4.0 peak height)
- **Shadow Step** — Teleport 4 tiles (fade out → snap → fade in)
- **Dash-Strike-Return** — Lunge to enemy, strike, spring back to origin tile (position unchanged)
- **Blitz Rush** — Dash to enemy, strike, stay at adjacent tile near target (reposition)
- Visual events: `unit-jump`, `unit-flight`, `unit-teleport` drive WalkingUnit arc animations

## License

MIT

## Credits

Created by **Racalvin The Pirate King** — Grudge Studio

Co-Authored-By: Oz <oz-agent@warp.dev>
