// Bake pre-rendered slash FX frame sequences into grid-atlas PNGs.
//
// Input:  a root directory with one subfolder per slash; each subfolder
//         contains N numbered PNG frames (e.g. slash3_00001.png .. _00013.png).
//         Sub-subfolders like `image/`, `png/`, `spine/` are ignored.
// Output: for every slash folder,
//           <outDir>/<slash>.png   grid atlas (cols × rows, each cell 256×144)
//           <outDir>/<slash>.json  { cols, rows, frameCount, frameW, frameH, duration }
//         and a top-level manifest.json listing all slashes.
//
// Usage:
//   node scripts/bake-slash-atlases.mjs <inputRoot> <outputDir> [--size 256x144]
//
// Requires `sharp` (already installed transitively via @gltf-transform/functions).
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node bake-slash-atlases.mjs <inputRoot> <outputDir> [--size WxH] [--duration SEC]');
  process.exit(1);
}
const inputRoot = path.resolve(args[0]);
const outputDir = path.resolve(args[1]);
const sizeArg   = args.find(a => a.startsWith('--size='))?.slice(7) ?? '256x144';
const [FRAME_W, FRAME_H] = sizeArg.split('x').map(Number);
const DURATION_SEC = Number(args.find(a => a.startsWith('--duration='))?.slice(11) ?? '0.40');

async function listSlashFolders(root) {
  const entries = await readdir(root, { withFileTypes: true });
  return entries.filter(e => e.isDirectory() && /^slash\d*$/.test(e.name)).map(e => e.name);
}

async function listFrames(folder) {
  // Frames can live in <slash>/png/, <slash>/image/, or directly in <slash>/.
  // Prefer `png/` (typically the fully-rendered high-alpha frames), fall back
  // to `image/`, then top-level. Skip the spine/ subfolder which contains a
  // Spine atlas meant for the Spine runtime, not a frame sequence.
  const candidates = [
    path.join(folder, 'png'),
    path.join(folder, 'image'),
    folder,
  ];
  for (const dir of candidates) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      const pngs = entries
        .filter(e => e.isFile() && /\.png$/i.test(e.name))
        .map(e => path.join(dir, e.name))
        .sort();
      if (pngs.length >= 2) return pngs;   // need at least 2 frames to animate
    } catch { /* dir doesn't exist */ }
  }
  return [];
}

function gridDims(n) {
  // Square-ish grid that fits all frames. Prefers slightly wider than tall.
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  return { cols, rows };
}

await mkdir(outputDir, { recursive: true });

const slashes = await listSlashFolders(inputRoot);
if (slashes.length === 0) {
  console.error(`No slash folders found in ${inputRoot}`);
  process.exit(1);
}

const manifestEntries = {};

for (const name of slashes) {
  const folder = path.join(inputRoot, name);
  const frames = await listFrames(folder);
  if (frames.length === 0) {
    console.warn(`  [${name}] no frames`);
    continue;
  }

  const { cols, rows } = gridDims(frames.length);
  const atlasW = cols * FRAME_W;
  const atlasH = rows * FRAME_H;

  // Downscale each frame to FRAME_W x FRAME_H (preserves alpha).
  const tiles = await Promise.all(frames.map(async (p, i) => {
    const buf = await sharp(p).resize(FRAME_W, FRAME_H, { fit: 'fill' }).png().toBuffer();
    return {
      input: buf,
      left: (i % cols) * FRAME_W,
      top:  Math.floor(i / cols) * FRAME_H,
    };
  }));

  const outPng  = path.join(outputDir, `${name}.png`);
  const outJson = path.join(outputDir, `${name}.json`);

  await sharp({
    create: { width: atlasW, height: atlasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(tiles)
    .png({ compressionLevel: 9 })
    .toFile(outPng);

  const meta = {
    name,
    atlas:       `${name}.png`,
    cols,
    rows,
    frameCount:  frames.length,
    frameWidth:  FRAME_W,
    frameHeight: FRAME_H,
    atlasWidth:  atlasW,
    atlasHeight: atlasH,
    /** Total duration of one slash cycle in seconds. 0.4s reads as a fast swing. */
    duration:    DURATION_SEC,
  };
  await writeFile(outJson, JSON.stringify(meta, null, 2));

  const s = await stat(outPng);
  console.log(`  [${name}]  ${cols}x${rows} grid, ${frames.length} frames  ->  ${atlasW}x${atlasH}px, ${(s.size/1024).toFixed(1)} KB`);

  manifestEntries[name] = meta;
}

const manifest = {
  version: '1.0.0',
  description: 'Grudge Studio slash-FX atlas library. Each entry is a grid-packed sprite sheet. See SlashTrail.tsx for runtime usage.',
  frameFormat: { width: FRAME_W, height: FRAME_H },
  effects: manifestEntries,
};
await writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\nWrote ${Object.keys(manifestEntries).length} slash atlases + manifest.json to ${outputDir}`);
