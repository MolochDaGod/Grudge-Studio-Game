import * as THREE from 'three';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BoneInfo {
  name: string;
  depth: number;
  parent: string | null;
  worldPos: THREE.Vector3;
  childCount: number;
}

export interface AnimClipInfo {
  name: string;
  duration: number;
  tracks: number;
}

export interface SkeletonReport {
  bones: BoneInfo[];
  animations: AnimClipInfo[];
  totalVertices: number;
  totalTriangles: number;
  boundingBox: THREE.Box3;
  skeletonType: 'mixamo' | 'quaternius' | 'rpg-pack' | 'generic' | 'none';
}

// ── Role → bone name patterns ────────────────────────────────────────────────
// Each role lists regex patterns that match across Mixamo, Quaternius, and RPG
// pack naming conventions.

export type BoneRole =
  | 'hips' | 'spine' | 'chest' | 'neck' | 'head'
  | 'leftShoulder' | 'leftUpperArm' | 'leftLowerArm' | 'leftHand'
  | 'rightShoulder' | 'rightUpperArm' | 'rightLowerArm' | 'rightHand'
  | 'leftUpperLeg' | 'leftLowerLeg' | 'leftFoot'
  | 'rightUpperLeg' | 'rightLowerLeg' | 'rightFoot';

const ROLE_PATTERNS: Record<BoneRole, RegExp[]> = {
  hips:           [/hips/i, /pelvis/i, /root/i],
  spine:          [/spine$/i, /spine[._]?1/i, /spine[._]?lower/i],
  chest:          [/chest/i, /spine[._]?2/i, /spine[._]?upper/i],
  neck:           [/neck/i],
  head:           [/head$/i],
  leftShoulder:   [/l[._]?shoulder/i, /shoulder[._]?l/i, /clavicle[._]?l/i],
  leftUpperArm:   [/l[._]?upper[._]?arm/i, /arm[._]?upper[._]?l/i, /upperarm[._]?l/i],
  leftLowerArm:   [/l[._]?lower[._]?arm/i, /arm[._]?lower[._]?l/i, /forearm[._]?l/i],
  leftHand:       [/l[._]?hand/i, /hand[._]?l/i, /fist[._]?l/i],
  rightShoulder:  [/r[._]?shoulder/i, /shoulder[._]?r/i, /clavicle[._]?r/i],
  rightUpperArm:  [/r[._]?upper[._]?arm/i, /arm[._]?upper[._]?r/i, /upperarm[._]?r/i],
  rightLowerArm:  [/r[._]?lower[._]?arm/i, /arm[._]?lower[._]?r/i, /forearm[._]?r/i],
  rightHand:      [/r[._]?hand/i, /hand[._]?r/i, /fist[._]?r/i],
  leftUpperLeg:   [/l[._]?upper[._]?leg/i, /leg[._]?upper[._]?l/i, /thigh[._]?l/i, /upperleg[._]?l/i],
  leftLowerLeg:   [/l[._]?lower[._]?leg/i, /leg[._]?lower[._]?l/i, /shin[._]?l/i, /lowerleg[._]?l/i],
  leftFoot:       [/l[._]?foot/i, /foot[._]?l/i],
  rightUpperLeg:  [/r[._]?upper[._]?leg/i, /leg[._]?upper[._]?r/i, /thigh[._]?r/i, /upperleg[._]?r/i],
  rightLowerLeg:  [/r[._]?lower[._]?leg/i, /leg[._]?lower[._]?r/i, /shin[._]?r/i, /lowerleg[._]?r/i],
  rightFoot:      [/r[._]?foot/i, /foot[._]?r/i],
};

// ── Skeleton type heuristics ─────────────────────────────────────────────────

function detectSkeletonType(boneNames: string[]): SkeletonReport['skeletonType'] {
  if (boneNames.length === 0) return 'none';
  const joined = boneNames.join(' ');
  if (/mixamorig/i.test(joined)) return 'mixamo';
  // Quaternius uses Fist.L / Fist.R, Armor, etc.
  if (boneNames.some(n => /^Fist\./i.test(n))) return 'quaternius';
  // RPG Pack: CharacterArmature prefix
  if (boneNames.some(n => /CharacterArmature/i.test(n))) return 'rpg-pack';
  return 'generic';
}

// ── Core inspection ──────────────────────────────────────────────────────────

export function inspectSkeleton(
  scene: THREE.Object3D,
  animations?: THREE.AnimationClip[],
): SkeletonReport {
  const bones: BoneInfo[] = [];
  let totalVertices = 0;
  let totalTriangles = 0;
  const box = new THREE.Box3();
  const boneNames: string[] = [];

  // Collect bones
  function walkBones(obj: THREE.Object3D, depth: number, parentName: string | null) {
    if ((obj as THREE.Bone).isBone || obj.type === 'Bone') {
      const wp = new THREE.Vector3();
      obj.getWorldPosition(wp);
      bones.push({
        name: obj.name,
        depth,
        parent: parentName,
        worldPos: wp,
        childCount: obj.children.length,
      });
      boneNames.push(obj.name);
    }
    for (const child of obj.children) {
      walkBones(child, depth + ((obj as THREE.Bone).isBone ? 1 : 0), obj.name);
    }
  }
  walkBones(scene, 0, null);

  // Mesh stats
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry) {
      const geo = obj.geometry;
      const posAttr = geo.getAttribute('position');
      if (posAttr) totalVertices += posAttr.count;
      if (geo.index) {
        totalTriangles += geo.index.count / 3;
      } else if (posAttr) {
        totalTriangles += posAttr.count / 3;
      }
      geo.computeBoundingBox();
      if (geo.boundingBox) {
        const worldBox = geo.boundingBox.clone().applyMatrix4(obj.matrixWorld);
        box.union(worldBox);
      }
    }
  });

  // Animation info
  const animInfos: AnimClipInfo[] = (animations ?? []).map((clip) => ({
    name: clip.name,
    duration: clip.duration,
    tracks: clip.tracks.length,
  }));

  return {
    bones,
    animations: animInfos,
    totalVertices,
    totalTriangles,
    boundingBox: box,
    skeletonType: detectSkeletonType(boneNames),
  };
}

// ── Pretty-print bone tree ──────────────────────────────────────────────────

export function printSkeletonTree(report: SkeletonReport): string {
  const lines: string[] = [];
  lines.push(`Skeleton type: ${report.skeletonType}`);
  lines.push(`Bones: ${report.bones.length} | Verts: ${report.totalVertices} | Tris: ${report.totalTriangles}`);
  lines.push(`Animations: ${report.animations.map(a => `${a.name}(${a.duration.toFixed(2)}s)`).join(', ') || 'none'}`);
  lines.push('');
  for (const bone of report.bones) {
    const indent = '  '.repeat(bone.depth);
    const pos = `[${bone.worldPos.x.toFixed(2)}, ${bone.worldPos.y.toFixed(2)}, ${bone.worldPos.z.toFixed(2)}]`;
    lines.push(`${indent}├─ ${bone.name} ${pos}`);
  }
  return lines.join('\n');
}

// ── Find bone by semantic role ──────────────────────────────────────────────

export function findBoneByRole(scene: THREE.Object3D, role: BoneRole): THREE.Object3D | null {
  const patterns = ROLE_PATTERNS[role];
  if (!patterns) return null;

  let bestMatch: THREE.Object3D | null = null;

  scene.traverse((obj) => {
    if (!((obj as THREE.Bone).isBone || obj.type === 'Bone')) return;
    // Strip common prefixes for matching
    const stripped = obj.name
      .replace(/^mixamorig[01]?:/i, '')
      .replace(/^CharacterArmature\|/i, '');
    for (const pat of patterns) {
      if (pat.test(stripped) || pat.test(obj.name)) {
        bestMatch = obj;
        return;
      }
    }
  });

  return bestMatch;
}

// ── Build a role → bone name mapping for an entire skeleton ─────────────────

export function buildBoneRoleMap(scene: THREE.Object3D): Partial<Record<BoneRole, string>> {
  const map: Partial<Record<BoneRole, string>> = {};
  const roles = Object.keys(ROLE_PATTERNS) as BoneRole[];
  for (const role of roles) {
    const bone = findBoneByRole(scene, role);
    if (bone) map[role] = bone.name;
  }
  return map;
}
