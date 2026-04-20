// Inspect new GLB character rigs to discover bone names, animation clip names,
// and rough bounding-box size. Parses the GLB JSON chunk directly so there is no
// dependency on Three's browser-coupled GLTFLoader.
//
// Usage (from artifacts/grudge-studio-game):
//   node scripts/inspect-glb.mjs
//
// Output: scripts/inspect-results.json

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const CHAR_DIR   = path.resolve(__dirname, '..', 'public', 'models', 'characters');

const TARGET_IDS = [
  'assassin_female', 'assassin_male',
  'mixamo_generic',
  'dwarf_male',
  'elf_female', 'elf_male',
  'goblin_new', 'goblin_backstabber_female', 'goblin_backstabber_male',
  'human_battle_mage_female', 'human_battle_mage_male',
  'lizardfolk_male',
  'night_stalker_female', 'night_stalker_male',
  'orc_scout_female', 'orc_scout_male',
  'swordman',
  'vampire_aristocrat_female', 'vampire_aristocrat_male',
  'undead_grave_knight_female', 'undead_grave_knight_male',
  'vampire_female',
  'werewolf_mixamo',
  // Apr-2026 second batch — Growerz + Racalvin
  'growerz_yellow', 'growerz_dread', 'growerz_green', 'growerz_led',
  'racalvin',
];

function parseGLBJson(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const magic = dv.getUint32(0, true);
  if (magic !== 0x46546c67) throw new Error('Not a GLB (bad magic)');
  const version = dv.getUint32(4, true);
  if (version !== 2) throw new Error(`Unsupported GLB version ${version}`);
  const chunkLen  = dv.getUint32(12, true);
  const chunkType = dv.getUint32(16, true);
  if (chunkType !== 0x4e4f534a) throw new Error('First chunk is not JSON');
  const jsonBytes = buf.subarray(20, 20 + chunkLen);
  let end = jsonBytes.length;
  while (end > 0 && jsonBytes[end - 1] === 0x20) end--;
  const json = JSON.parse(new TextDecoder().decode(jsonBytes.subarray(0, end)));
  return { json };
}

function getAccessorMinMax(json, accessorIdx) {
  const acc = json.accessors?.[accessorIdx];
  if (!acc?.min || !acc?.max) return null;
  return { min: acc.min, max: acc.max };
}

function computeBoundingBox(json) {
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  let found = false;
  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives ?? []) {
      const posIdx = prim.attributes?.POSITION;
      if (posIdx == null) continue;
      const mm = getAccessorMinMax(json, posIdx);
      if (!mm) continue;
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], mm.min[i]);
        max[i] = Math.max(max[i], mm.max[i]);
      }
      found = true;
    }
  }
  if (!found) return { min, max, size: [0, 0, 0] };
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}

function collectBoneNames(json) {
  const names = new Set();
  const nodes = json.nodes ?? [];
  for (const skin of json.skins ?? []) {
    for (const j of skin.joints ?? []) {
      if (nodes[j]?.name) names.add(nodes[j].name);
    }
  }
  return [...names];
}

function collectMaterialNames(json) {
  return (json.materials ?? []).map(m => m.name).filter(Boolean);
}

function collectClipNames(json) {
  return (json.animations ?? []).map(a => a.name).filter(Boolean);
}

function collectExternalTextureUris(json) {
  return (json.images ?? [])
    .map(img => img.uri)
    .filter(u => typeof u === 'string' && !u.startsWith('data:'));
}

function findBonesMatching(bones, pattern) {
  const re = new RegExp(pattern);
  return bones.filter(b => re.test(b));
}

async function inspect(id) {
  const file = path.join(CHAR_DIR, `${id}.glb`);
  const bytes = await readFile(file);
  const { json } = parseGLBJson(bytes);
  const bones = collectBoneNames(json);
  const clips = collectClipNames(json);
  const materials = collectMaterialNames(json);
  const textureUris = collectExternalTextureUris(json);
  const bbox = computeBoundingBox(json);
  const usesMixamoBones = bones.some(b => b.startsWith('mixamorig'));
  const usesCCBones = bones.some(b => b.startsWith('CC_Base_'));
  return {
    id,
    file: path.basename(file),
    sizeBytes: bytes.length,
    bbox,
    suggestedScale: 1.6 / Math.max(bbox.size[1], 0.0001),
    bones: {
      count: bones.length,
      hasFistR: bones.includes('Fist.R'),
      hasFistL: bones.includes('Fist.L'),
      hasMixamoRightHand: bones.includes('mixamorig:RightHand'),
      hasMixamoLeftHand:  bones.includes('mixamorig:LeftHand'),
      hasRightHand:       bones.includes('RightHand'),
      hasLeftHand:        bones.includes('LeftHand'),
      hasHead:            bones.includes('Head') || bones.includes('mixamorig:Head'),
      usesMixamoBones,
      usesCCBones,
      ccRightHand: findBonesMatching(bones, '^CC_Base_R_Hand(_\\d+)?$'),
      ccLeftHand:  findBonesMatching(bones, '^CC_Base_L_Hand(_\\d+)?$'),
      ccHead:      findBonesMatching(bones, '^CC_Base_Head(_\\d+)?$'),
      all: bones,
    },
    clips,
    materialNames: materials,
    externalTextureUris: textureUris,
  };
}

const out = {};
for (const id of TARGET_IDS) {
  try {
    out[id] = await inspect(id);
    const { bbox, bones, clips } = out[id];
    console.log(`OK  ${id.padEnd(34)} size_y=${bbox.size[1].toFixed(2)}  bones=${bones.count}  clips=${clips.length}  mixamo=${bones.usesMixamoBones}`);
  } catch (e) {
    out[id] = { id, error: String(e?.message ?? e) };
    console.log(`ERR ${id.padEnd(34)} ${out[id].error}`);
  }
}

const outPath = path.resolve(__dirname, 'inspect-results.json');
await writeFile(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log(`\nWrote ${outPath}`);
