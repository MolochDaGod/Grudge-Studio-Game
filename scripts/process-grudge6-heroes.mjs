#!/usr/bin/env node
/**
 * Convert `30grudge6characters.glb` (multi-root modular heroes) into
 * game-ready per-hero GLBs for Grudge Tactics.
 *
 * Input GLB facts (verified 2026-07-10):
 *   - ~262 MB, glTF 2.0 binary
 *   - 30 AuxScene roots (= 30 pre-assembled heroes)
 *   - 137 skins, Bip001 skeleton (3ds Max style)
 *   - Race mesh prefixes: WK_, BRB_, DWF_, ELF_, ORC_, UD_
 *   - Modular parts: Units_Body/head/Arms/Legs/shoulderpads + weapons/shields
 *   - 0 embedded animations → use Mixamo / weapon anim library at runtime
 *
 * Best-practice pipeline:
 *   1. Split 30 roots into individual GLBs
 *   2. meshopt / Draco compress
 *   3. Upload to R2: assets.grudge-studio.com/models/grudge6/heroes/
 *   4. Optional: keep race FBX modular path (current Grudge6CharacterModel)
 *      as SSOT — multi-GLB is a pre-baked loadout pack
 *
 * Prerequisites:
 *   npm i -g @gltf-transform/cli
 *   # or: pnpm dlx @gltf-transform/cli ...
 *
 * Usage:
 *   node scripts/process-grudge6-heroes.mjs \
 *     --in "C:/Users/nugye/Desktop/MouseWithoutBorders/30grudge6characters.glb" \
 *     --out "./artifacts/grudge-studio-game/public/models/grudge6/heroes"
 *
 * This script does NOT require three.js — it shells out to gltf-transform when
 * available, and always writes a manifest JSON for the loader.
 */

import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  existsSync,
  writeFileSync,
  readFileSync,
  copyFileSync,
} from 'node:fs';
import { join, resolve, basename } from 'node:path';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const input = resolve(
  arg(
    'in',
    process.env.GRUDGE6_HEROES_GLB ||
      'C:/Users/nugye/Desktop/MouseWithoutBorders/30grudge6characters.glb',
  ),
);
const outDir = resolve(
  arg('out', './artifacts/grudge-studio-game/public/models/grudge6/heroes'),
);

if (!existsSync(input)) {
  console.error(`Input missing: ${input}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

// Inspect JSON chunk for root count (no full mesh load)
const buf = readFileSync(input);
const chunkLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.subarray(20, 20 + chunkLen).toString('utf8'));
const nodeNames = (json.nodes || []).map((n) => n?.name).filter(Boolean);
const auxCount = nodeNames.filter((n) => n === 'AuxScene').length;
const races = ['WK', 'BRB', 'DWF', 'ELF', 'ORC', 'UD'];
const raceHits = Object.fromEntries(
  races.map((r) => [
    r,
    nodeNames.filter((n) => n.startsWith(`${r}_`) || n.startsWith(`${r}-`)).length,
  ]),
);

console.log('=== Source GLB ===');
console.log(`  file:     ${input}`);
console.log(`  size MB:  ${(buf.length / 1e6).toFixed(1)}`);
console.log(`  nodes:    ${json.nodes?.length ?? 0}`);
console.log(`  meshes:   ${json.meshes?.length ?? 0}`);
console.log(`  skins:    ${json.skins?.length ?? 0}`);
console.log(`  anims:    ${json.animations?.length ?? 0}`);
console.log(`  AuxScene: ${auxCount} (expect 30 heroes)`);
console.log(`  race hits:`, raceHits);

const manifest = {
  source: basename(input),
  generatedAt: new Date().toISOString(),
  heroCount: auxCount,
  skeleton: 'Bip001',
  animationsEmbedded: (json.animations?.length ?? 0) > 0,
  races: raceHits,
  notes: [
    'No clips in source — runtime uses loadWeaponAnimations() / Mixamo retarget.',
    'Prefer modular race FBX + equipment toggle (Grudge6CharacterModel) for live game.',
    'This pack is pre-assembled loadouts for portraits / alternate hero skins.',
    'Target height in battle: normalize to ~1.5 world units (see grudge6-model-loader).',
  ],
  pipeline: {
    compress: 'gltf-transform optimize --texture-compress webp --compress meshopt',
    upload: 'R2 models/grudge6/heroes/*.glb via assets CDN',
    runtimeLoader: 'Grudge6CharacterModel + race FBX SSOT',
  },
  // Slot mapping for future split tools (order is document order of AuxScene)
  heroes: Array.from({ length: auxCount }, (_, i) => ({
    index: i,
    id: `hero_${String(i + 1).padStart(2, '0')}`,
    outFile: `hero_${String(i + 1).padStart(2, '0')}.glb`,
  })),
};

const manifestPath = join(outDir, 'manifest.json');
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Wrote ${manifestPath}`);

// Copy source next to out for tooling (optional large copy)
const copySrc = arg('copy-source', 'false') === 'true';
if (copySrc) {
  const dest = join(outDir, '30grudge6characters.source.glb');
  console.log(`Copying source → ${dest} (large)...`);
  copyFileSync(input, dest);
}

// Try gltf-transform optimize on a single copy if CLI present (full split needs custom tool)
function hasCli(cmd) {
  const r = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
  return r.status === 0 || (r.stdout || r.stderr || '').length > 0;
}

const useNpx = !hasCli('gltf-transform');
const cmd = useNpx ? 'npx' : 'gltf-transform';
const optimized = join(outDir, '30grudge6characters.optimized.glb');

console.log('\n=== Recommended next commands ===');
console.log(`# 1) Inspect in https://gltf.report/ or Blender`);
console.log(`# 2) Compress whole pack (still multi-root):`);
console.log(
  `${useNpx ? 'npx @gltf-transform/cli' : 'gltf-transform'} optimize "${input}" "${optimized}" --compress meshopt --texture-compress webp`,
);
console.log(`# 3) Split AuxScene roots with Blender batch or gltf-transform prune per-root`);
console.log(`# 4) Upload: wrangler r2 object put grudge-assets/models/grudge6/heroes/...`);
console.log(`# 5) Runtime: keep race FBX path (fixed /api/assets proxy) as battle SSOT`);

// Attempt optimize if user passes --optimize
if (process.argv.includes('--optimize')) {
  console.log('\nRunning gltf-transform optimize (this may take several minutes)...');
  const args = useNpx
    ? [
        '--yes',
        '@gltf-transform/cli',
        'optimize',
        input,
        optimized,
        '--compress',
        'meshopt',
      ]
    : ['optimize', input, optimized, '--compress', 'meshopt'];
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    console.error('optimize failed — install @gltf-transform/cli and retry');
    process.exit(r.status ?? 1);
  }
  console.log(`Optimized → ${optimized}`);
}

console.log('\nDone.');
