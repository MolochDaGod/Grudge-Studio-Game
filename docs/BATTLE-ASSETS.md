# Grudge Tactics — Battle assets & cylinder fix

**Live:** https://game.grudge-studio.com/game/battle  
**Repo:** https://github.com/MolochDaGod/Grudge-Studio-Game  
**Deploy:** Vercel project (alias `game.grudge-studio.com`, `tactics.grudge-studio.com`)  
**Config:** `artifacts/api-server/vercel.json` (`BASE_PATH=/game/`)

## Why heroes rendered as cylinders/capsules

Battle uses `Grudge6CharacterModel` for faction heroes (`human_*`, `elf_*`, …).

| Layer | Behavior |
|-------|----------|
| Placeholder | Blue/red **capsule** (`LoadingPlaceholder` / `SolidSilhouette`) while loading **or** after load error |
| Real mesh | Race FBX from CDN: `models/grudge6/races/{WK\|BRB\|DWF\|ELF\|ORC\|UD}_Characters.fbx` |
| Equipment | Child mesh toggles (`grudge6-equipment.ts`) + race atlas textures |

**Bug (fixed in code):** loader built URLs as:

```text
/game/api/assets/models/grudge6/races/WK_Characters.fbx
```

Vercel only rewrote `/api/assets/*` → R2. The `/game/api/assets/*` path returned the **SPA `index.html`** (HTTP 200, ~2 KB HTML). `FBXLoader` failed → permanent capsules.

CDN files are healthy (~0.6–1.2 MB Kaydara FBX each).

**Fix:**

1. `grudge6RaceModelUrl` / `grudge6RaceTextureUrl` → **`/api/assets/...`** (domain root, no `/game` prefix)
2. Belt-and-suspenders rewrite: `/game/api/assets/:path*` → R2
3. `cdnProxyUrl()` helper documents the rule

## Single scene / no asset mismatch

| Asset class | SSOT | Path |
|-------------|------|------|
| **Heroes (battle)** | R2 race FBX + equipment | `/api/assets/models/grudge6/races/*` |
| **Hero animations** | Mixamo / weapon library (no clips in race FBX) | `/game/anims` or CDN via library |
| **Buildings / towers / walls** | **Vercel public/** mirror | `/game/models/maps/{medieval,elven,orc,ruins}/*.glb` |
| **Map atlases** | Co-located with map pack | `.../maps/<pack>/atlas.png` |
| **Grid collision** | `levels.ts` `obstacleTiles` + `blockedTiles` on props | Same world units as `tileSize` |

Do **not** mix incomplete R2 map keys (some `medieval/*` return HTML 200) with local GLBs in one battle — grey/missing props and wrong scale.

Prop scale is intentional (~`0.008`–`0.015`) so fortress packs match the tactical grid. Colliders are **tile occupancy** (`obstacleTiles` / `blockedTiles`), not mesh trimeshes (cheap + deterministic for tactics).

## `30grudge6characters.glb` (desktop pack)

Path: `C:\Users\nugye\Desktop\MouseWithoutBorders\30grudge6characters.glb` (~262 MB)

| Fact | Value |
|------|--------|
| Roots | **30** `AuxScene` (one hero each) |
| Skeleton | `Bip001` |
| Races | WK, BRB, DWF, ELF, ORC, UD modular parts |
| Animations | **0** embedded — use runtime Mixamo/weapon clips |
| Role | Pre-baked loadout pack / alternate skins; **live battle SSOT remains race FBX** |

Process:

```bash
node scripts/process-grudge6-heroes.mjs --in "C:/Users/.../30grudge6characters.glb"
# optional: --optimize   # needs @gltf-transform/cli
```

Then: Blender/gltf-transform split per AuxScene → meshopt → R2 `models/grudge6/heroes/`.

## Buildings / towers / deployables

Catalog: `src/lib/asset-catalog.ts` + placements in `src/lib/levels.ts`.  
Renderer: `ScenePropLayer` (atlas-colored `MeshStandardMaterial`, shadows).

Game-ready checklist per prop:

1. **Format:** GLB (binary glTF 2.0), not FBX at runtime  
2. **Textures:** pack atlas or embedded color; `atlas.png` + white material  
3. **Scale:** keep `levels.ts` scales; change grid/`tileSize` only with full level re-author  
4. **Collision:** set `blockedTiles` on prop to match footprint  
5. **One scene:** all props for a level use the same theme pack folder  

Deployables (lane deploy / towers): `build-catalog.ts` + `DeployOverlays` — same GLB path rules.

## Deploy

```bash
# from monorepo root (as Vercel does)
VITE_BASE_PATH=/game/ pnpm --filter @workspace/grudge-studio-game run build
# or push main → Vercel auto-deploy
```

Smoke after deploy:

```bash
# Must be Kaydara FBX, not HTML
curl -sL "https://game.grudge-studio.com/api/assets/models/grudge6/races/WK_Characters.fbx" | head -c 4
# expect: Kayd

curl -sL "https://game.grudge-studio.com/game/api/assets/models/grudge6/races/WK_Characters.fbx" | head -c 4
# after rewrite fix also Kayd
```
