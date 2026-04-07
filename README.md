# Realm of Grudges — 3D Tactical RPG

A browser-based 3D turn-based tactics game inspired by Mario + Rabbids: Kingdom Battle, built with React, Three.js, and Vite.

## Features

- **3D Tactical Battles** — Isometric tile-based combat on 80×80 to 140×140 grids with 4 themed levels (Graveyard Ruins, Orc Stronghold, Elven Citadel, Iron Bastion)
- **50+ GLTF Character Models** — Quaternius character packs with bone-attached weapons, material overrides, and animation blending
- **7 Weapon Skill Trees** — Greataxe, Fire Staff, Dark Staff, Daggers, Greatsword, Longbow, Sword & Shield, War Hammer, Rusted Blade — each with 5 skill slots (basic, core, utility, special, ultimate)
- **Cover System** — Directional half-cover (25% reduction) and heavy-cover (50% reduction) from obstacle adjacency, shown in the attack preview HUD
- **Tactical AI** — Scoring-based enemy AI with move evaluation, target selection, skill/ability scoring, and 3 difficulty levels (easy, normal, hard)
- **Charge Time Turn System** — Speed-based CT accumulation (like FFT) with a visual turn order bar
- **Facing & Flanking** — 4-directional facing with rear attack bonus (+50% damage, +25% crit chance)
- **Status Effects** — Stun, poison, freeze with immunity after expiry to prevent stun-lock
- **Combat VFX** — Projectile trails, physical slash arcs, elemental explosions, crit bursts, camera shake, melee dash lunges
- **4 Camera Modes** — Tactical isometric (Q/E 45° rotation), free orbit, third-person follow, RTS overhead
- **Map Editor** — In-game prop placement for custom level design
- **Minimap** — Real-time unit tracker for large maps

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
│   │   │   ├── levels.ts           # 4 level definitions with obstacle layouts and 3D props
│   │   │   ├── weapon-skills.ts    # 7 weapon skill trees with 45+ skills
│   │   │   ├── character-model-map.ts  # 40+ character configs with material/weapon/anim mappings
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

Output goes to `artifacts/grudge-studio-game/dist/public/`.

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

## License

MIT

## Credits

Created by **Racalvin The Pirate King** — Grudge Studio

Co-Authored-By: Oz <oz-agent@warp.dev>
