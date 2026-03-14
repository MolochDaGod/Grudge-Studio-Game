# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### `artifacts/grudge-studio-game` — Grudge Studio: Realm of Grudges (FFT-style Tactical RPG)
- **React + Vite** web app at path `/`
- **Theme:** Dark fantasy, gold/amber accents, Cinzel Decorative font
- **Game type:** Final Fantasy Tactics–style tactical grid RPG
- **Grid:** Dynamic level-driven grids (80×80 to 140×140) with InstancedMesh tile rendering, BFS obstacle-aware movement, and CT-based turn order
- **Characters:** All 11 Grudge Studio characters from the Character Index lore doc (Frost Orc Berserker, Magma Orc Destroyer, Brother Maltheus, Canal Lurker, Warlord Garnok, Elven Archer, Orcish Warrior, Human Knight, Human Barbarian, Skeleton Warrior, Dwarven Forge Master)
- **npm packages used:** `@grudge/domain` (Card/CardType/Deck domain models), `zustand`, `framer-motion`, `lucide-react`, `@react-three/fiber`, `@react-three/drei`, `three`, `@types/three`
- **Logo:** `public/images/logo-nobg.png` (background removed)
- **Character portraits:** `public/images/chars/{character-id}.png` (AI-generated for all 11 characters, 3:4 ratio); `-nobg.png` variants with background removed for overlay use (home page side decorations)
- **Battle terrain:** `public/images/battle-terrain.png`, `public/images/select-bg.png`
- **Craftpix 3D Map Assets:** 94 GLB files converted from FBX (assimp) in `public/models/maps/`:
  - `ruins/` — 28 files: `ruin_1.glb` through `ruin_21.glb` (scattered graveyard/tombstone pieces)
  - `medieval/` — 26 files: fortress_full, 5 tower types, 2 wall types, 2 gate types, barracks, ammourry, stairs, bridge, brazier, fire_bell, firewoods, sentry_hurt, props_full, fense_fyull
  - `elven/` — 20 files: fortress_full, 5 tower types, watchtoer_1, 2 wall types, 2 gate types, kazarm_1, arsenal_1, stairs, bridge, fense, brazier_1, fire_bell_1, andiron1, props_full
  - `orc/` — 20 files: fortress_full, 5 tower types, 2 wall types, 2 gate types, barracks, arsenal, shed_01, stairs, bridge, fense_full, brazier_01, alarm_drum, firewoods, props_full
  - **Scale:** ~0.009–0.012 for all craftpix models (FBX in cm converted 1:1 to GLB; scale applied in game for cm→meters)
- **Level system:** `src/lib/levels.ts` — 4 LevelDef entries:
  1. **Graveyard of the Fallen** (80×80): 590+ obstacles, 50 ruin props using all 21 ruin types in graveyard clusters
  2. **Orc Stronghold** (100×100): 1645+ obstacles, 50+ orc props — 2-ring fortress (outer OW=8, inner IW=28), keep, barracks, arsenal, shed, towers, gates
  3. **Elven Citadel** (120×120): 1800+ obstacles, 50+ elven props — 2-ring fortress + watchtowers + bridges + kazarm + arsenal
  4. **Iron Bastion** (140×140): 3000+ obstacles, 60+ medieval props — 3-ring fortress (outer/middle/inner walls) + keeps + barracks + ammourry + stairs
- **Three.js 3D Battle Scene:** `src/components/three/` — BattleScene.tsx (R3F Canvas with camera/lights/stars/fog), TileGrid.tsx (8×6 elevated 3D tile grid with highlight), CharacterModel.tsx (GLTF animated character with weapons via bone attachment)
- **3D Models:** `public/models/characters/` (orc/elf/human/barbarian/undead/dwarf/rogue/mage .glb from Quaternius packs), `public/models/weapons/` (greataxe/fire_staff/dark_staff/daggers/greatsword/bow/sword/shield/rusted_sword/war_hammer .glb)
- **Character config map:** `src/lib/character-model-map.ts` — per-character GLB model ID, scale [x,y,z], named material color overrides (sRGB hex), weapon attachment params, attack animation type
- **CharacterModel.tsx:** Uses `useGLTF` + `useAnimations` + `SkeletonUtils.clone` for independent instances; applies per-character material overrides; attaches weapons to `Fist.R` bone (shields to `Fist.L`); smooth animation transitions; HP arc ring + faction dot + name label
- **Weapon scales (actual GLB sizes):** greataxe=4.59u, fire_staff=7.63u, dark_staff=5.58u, daggers=0.91u, greatsword=2.41u, bow=5.44u, sword=1.50u, shield=2.56u, rusted_sword=1.50u, war_hammer=4.97u; target ~0.7-1.0 world units; scale = desiredSize / (charScale * nativeLength)
- **Lore data:** `src/lib/lore.ts` — CHARACTER_LORE with title, quote, backstory for all 11 characters
- **Animation names (all models share):** Death, Defeat, Idle, Jump, PickUp, Punch, RecieveHit, Roll, Run, SwordSlash, Victory, Walk (CharacterModel plays these via animation state machine)
- **Bone names:** `Fist.R` = right-hand weapon attachment, `Fist.L` = shield; `Head`, `Neck`, `Torso`, `Hips`, `CharacterArmature`
- **Camera:** Perspective, fov=50, isometric-style angle with OrbitControls (limited polar range)
- **Tile elevation map:** Pre-defined terrain variation in TileGrid.tsx
- **API endpoints:** `/api/game/characters`, `/api/game/leaderboard`, `POST /api/game/scores`

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
