# Overview

This project is a pnpm workspace monorepo using TypeScript, focused on developing "Grudge Studio: Realm of Grudges," a Final Fantasy Tactics-style tactical grid RPG. The game features a dark fantasy theme with a rich lore, diverse character races and classes, and dynamic, level-driven battle grids. The project aims to deliver a compelling tactical RPG experience with detailed 3D environments, character models, and a robust API backend for game mechanics and leaderboards.

# User Preferences

I want iterative development. I prefer detailed explanations for complex changes. Please ask before making major architectural changes or introducing new external dependencies.

# System Architecture

The project is structured as a pnpm workspace monorepo.

**Core Technologies:**
- **Monorepo:** pnpm workspaces
- **Node.js:** v24
- **TypeScript:** v5.9
- **API Framework:** Express 5
- **Database:** PostgreSQL with Drizzle ORM
- **Validation:** Zod (`zod/v4`), `drizzle-zod`
- **API Codegen:** Orval (from OpenAPI spec)
- **Build Tool:** esbuild (CJS bundle)
- **Frontend:** React + Vite

**UI/UX and Game Design:**
- **Theme:** Dark fantasy, gold/amber accents, Cinzel Decorative font.
- **Game Type:** Final Fantasy Tactics–style tactical grid RPG.
- **Grid System:** Dynamic level-driven grids (80×80 to 140×140) with InstancedMesh tile rendering, BFS obstacle-aware movement, and CT-based turn order.
- **Characters:** 26 total (24 standard heroes across 6 races × 4 classes, plus 2 secret Pirates heroes). Races (Human, Barbarian, Dwarf, Elf, Orc, Undead) and Classes (Warrior, Worg, Mage, Ranger) have distinct stats and roles. Characters are GLB models with modular weapons and unique animation states.
- **Factions:** Crusade, Fabled, Legion, Pirates.
- **Rarity System:** Common, Uncommon, Rare, Epic, Legendary.
- **3D Battle Scene:** Built with React Three Fiber (`@react-three/fiber`), `@react-three/drei`, and `three`. Features a Sky component, ocean plane, island terrain, camera/lights/fog, InstancedMesh tile grid, animated GLTF characters, and 3D combat effects.
- **Map Editor:** In-game 3D editor at `/map-editor/:levelId` with modes for selecting, placing assets, terrain painting, height adjustment, and erasing. Supports 6 terrain types, a height system (0.5 units per level, max 8 levels), and 80+ craftpix GLB props with transform controls and grid snapping. Saves to `localStorage`.
- **Combat Effects:** 12 typed 3D effects (e.g., `fire_projectile`, `physical_slash`, `heal_burst`, `ultimate_nova`) spawned on skill use, timed via `performance.now()`.
- **Skill Tooltips:** Rich floating panels displaying skill icon, name, tier, description, stats, tags, range, cooldown, and AoE indicator.
- **Level System:** Four distinct levels (`src/lib/levels.ts`) with unique sizes, obstacle counts, and environmental props (Graveyard, Orc Stronghold, Elven Citadel, Iron Bastion), each with a distinct sky color theme.
- **Camera:** Perspective, fov=50, isometric-style angle with OrbitControls (limited polar range), PCFShadowMap shadows.

**Technical Implementation:**
- **Monorepo Structure:** `artifacts/` (deployable apps like `api-server`), `lib/` (shared libraries like `api-spec`, `api-client-react`, `api-zod`, `db`), `scripts/` (utility scripts).
- **TypeScript Configuration:** All packages extend `tsconfig.base.json` with `composite: true`. Root `tsconfig.json` manages project references for correct cross-package type-checking and build order. `emitDeclarationOnly` is used for type-checking, with actual JS bundling handled by esbuild/Vite.
- **API Server (`artifacts/api-server`):** Express 5 server. Routes in `src/routes/` use `@workspace/api-zod` for request/response validation and `@workspace/db` for persistence.
- **Database Layer (`lib/db`):** Drizzle ORM with PostgreSQL. Exports a Drizzle client and schema models. Drizzle Kit handles migrations.
- **API Specification (`lib/api-spec`):** Contains `openapi.yaml` and `orval.config.ts`. Generates React Query hooks (`lib/api-client-react`) and Zod schemas (`lib/api-zod`) for client-side API interaction and validation.
- **Character Model Configuration:** `src/lib/character-model-map.ts` defines per-character GLB model ID, scale, material overrides, weapon attachments, and animation types. `CharacterModel.tsx` uses `useGLTF`, `useAnimations`, and `SkeletonUtils.clone` for efficient rendering and smooth animation transitions.

# External Dependencies

- **PostgreSQL:** Primary database.
- **Orval:** API client and Zod schema generation from OpenAPI specification.
- **Craftpix 3D Assets:** 94 GLB files for map props (ruins, medieval, elven, orc themes).
- **Craftpix RPG UI Pack:** 316 PNG textures (`public/images/ui/`) used throughout the HUD — UnitFrame bar fills, ActionBar slot backgrounds, Avatar overlays, Window chrome (tiling), HeroSelect frames.
- **Craftpix Stylized Nature Pack:** 68 glTF models + 20 PNG textures (`public/models/nature/`) — trees (CommonTree_1-5, DeadTree_1-5), bushes, pebbles, mushrooms, grass/clover; placed as environment decoration ringing the battle map border via `NatureDecor.tsx`.
- **Quaternius RPG Characters:** 3D character models (orc, elf, human, barbarian, undead, dwarf, rogue, mage) and weapon models.
- **Zustand:** State management for the React frontend.
- **Framer Motion:** Animation library for the React frontend.
- **Lucide React:** Icon library for the React frontend.
- **React Three Fiber (`@react-three/fiber`), Drei (`@react-three/drei`), Three.js:** 3D rendering library and utilities.