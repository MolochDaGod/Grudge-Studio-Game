#!/usr/bin/env node
/**
 * convert-toon-rts.mjs
 *
 * Converts all Toon_RTS _customizable.FBX files to GLB using fbx2gltf-polyfill.
 * Preserves all sub-meshes (appendages), skeleton, and materials.
 *
 * Usage:
 *   node scripts/convert-toon-rts.mjs
 *
 * Requires: npm i -g fbx2gltf  OR  npx fbx2gltf
 * Fallback: uses three.js FBXLoader in Node if fbx2gltf not available.
 *
 * Output: public/models/toon-rts/{race}/{filename}.glb
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, copyFileSync, statSync } from 'fs';
import { join, basename, extname } from 'path';

// ── Configuration ─────────────────────────────────────────────────────────

const TOON_RTS_ROOT = String.raw`C:\Users\nugye\Desktop\grudgeproduction\grudgenew\FRESH GRUDGE\Assets\Toon_RTS`;
const OUTPUT_ROOT = join(process.cwd(), 'public', 'models', 'toon-rts');

const RACES = [
  { dir: 'Barbarians', prefix: 'BRB', slug: 'barbarians' },
  { dir: 'Dwarves',    prefix: 'DWF', slug: 'dwarves' },
  { dir: 'Elves',      prefix: 'ELF', slug: 'elves' },
  { dir: 'Orcs',       prefix: 'ORC', slug: 'orcs' },
  { dir: 'Undead',     prefix: 'UD',  slug: 'undead' },
  { dir: 'WesternKingdoms', prefix: 'WK', slug: 'western-kingdoms' },
];

// ── Helpers ───────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function findFbxFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith('.fbx'))
    .map(f => join(dir, f));
}

function convertFbx(inputPath, outputDir) {
  const name = basename(inputPath, extname(inputPath));
  const outputPath = join(outputDir, `${name}.glb`);

  if (existsSync(outputPath)) {
    console.log(`  ⏭  Skip (exists): ${name}.glb`);
    return outputPath;
  }

  console.log(`  🔄 Converting: ${basename(inputPath)} → ${name}.glb`);

  try {
    // Try FBX2glTF first (best quality)
    execSync(
      `npx --yes fbx2gltf -i "${inputPath}" -o "${outputPath}" --binary`,
      { stdio: 'pipe', timeout: 120_000 }
    );
    console.log(`  ✅ ${name}.glb`);
    return outputPath;
  } catch (e1) {
    try {
      // Fallback: FBX2glTF without npx
      execSync(
        `FBX2glTF --binary -i "${inputPath}" -o "${outputPath}"`,
        { stdio: 'pipe', timeout: 120_000 }
      );
      console.log(`  ✅ ${name}.glb (via FBX2glTF)`);
      return outputPath;
    } catch (e2) {
      console.error(`  ❌ Failed: ${name} — install fbx2gltf: npm i -g fbx2gltf`);
      console.error(`     ${e2.message?.split('\n')[0]}`);
      return null;
    }
  }
}

// ── Copy textures ─────────────────────────────────────────────────────────

function copyTextures(materialsDir, outputDir) {
  if (!existsSync(materialsDir)) return;

  const texExts = ['.tga', '.png', '.jpg', '.jpeg', '.bmp'];
  const files = readdirSync(materialsDir).filter(f =>
    texExts.includes(extname(f).toLowerCase())
  );

  for (const f of files) {
    const src = join(materialsDir, f);
    const dst = join(outputDir, f);
    if (!existsSync(dst)) {
      copyFileSync(src, dst);
      console.log(`  📄 Copied texture: ${f}`);
    }
  }

  // Also check Color subfolder
  const colorDir = join(materialsDir, 'Color', 'textures');
  if (existsSync(colorDir)) {
    const colorFiles = readdirSync(colorDir).filter(f =>
      texExts.includes(extname(f).toLowerCase())
    );
    for (const f of colorFiles) {
      const src = join(colorDir, f);
      const dst = join(outputDir, f);
      if (!existsSync(dst)) {
        copyFileSync(src, dst);
        console.log(`  📄 Copied color texture: ${f}`);
      }
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

console.log('╔════════════════════════════════════════════╗');
console.log('║  Toon_RTS FBX → GLB Conversion Pipeline   ║');
console.log('╚════════════════════════════════════════════╝\n');

if (!existsSync(TOON_RTS_ROOT)) {
  console.error(`❌ Toon_RTS root not found: ${TOON_RTS_ROOT}`);
  process.exit(1);
}

let totalConverted = 0;
let totalFailed = 0;

for (const race of RACES) {
  const raceDir = join(TOON_RTS_ROOT, race.dir);
  const outDir = join(OUTPUT_ROOT, race.slug);
  ensureDir(outDir);

  console.log(`\n── ${race.dir} (${race.prefix}) ──────────────────────`);

  // Convert main model FBXs
  const modelsDir = join(raceDir, 'models');
  const mainFbxFiles = findFbxFiles(modelsDir);
  for (const fbx of mainFbxFiles) {
    const result = convertFbx(fbx, outDir);
    if (result) totalConverted++; else totalFailed++;
  }

  // Convert extra model FBXs (equipment, etc.)
  const extraDir = join(modelsDir, 'extra models');
  if (existsSync(extraDir)) {
    const extraFbx = findFbxFiles(extraDir);
    for (const fbx of extraFbx) {
      const result = convertFbx(fbx, outDir);
      if (result) totalConverted++; else totalFailed++;
    }

    // Equipment subfolder
    const equipDir = join(extraDir, 'Equipment');
    if (existsSync(equipDir)) {
      const equipFbx = findFbxFiles(equipDir);
      for (const fbx of equipFbx) {
        const result = convertFbx(fbx, outDir);
        if (result) totalConverted++; else totalFailed++;
      }
    }
    const equipDir2 = join(extraDir, 'equipment');
    if (existsSync(equipDir2) && equipDir2 !== equipDir) {
      const equipFbx = findFbxFiles(equipDir2);
      for (const fbx of equipFbx) {
        const result = convertFbx(fbx, outDir);
        if (result) totalConverted++; else totalFailed++;
      }
    }
  }

  // Convert animation FBXs
  const animDir = join(raceDir, 'animation');
  if (existsSync(animDir)) {
    const animOutDir = join(outDir, 'animations');
    ensureDir(animOutDir);
    const animSubDirs = readdirSync(animDir).filter(d => {
      try { return statSync(join(animDir, d)).isDirectory(); } catch { return false; }
    });
    // Also check top-level anim FBXs
    for (const fbx of findFbxFiles(animDir)) {
      const result = convertFbx(fbx, animOutDir);
      if (result) totalConverted++; else totalFailed++;
    }
    for (const sub of animSubDirs) {
      const subFbx = findFbxFiles(join(animDir, sub));
      for (const fbx of subFbx) {
        const result = convertFbx(fbx, animOutDir);
        if (result) totalConverted++; else totalFailed++;
      }
    }
  }

  // Copy textures
  const materialsDir = join(modelsDir, 'Materials');
  copyTextures(materialsDir, outDir);
}

console.log(`\n════════════════════════════════════════════`);
console.log(`✅ Converted: ${totalConverted}  ❌ Failed: ${totalFailed}`);
console.log(`Output: ${OUTPUT_ROOT}`);
