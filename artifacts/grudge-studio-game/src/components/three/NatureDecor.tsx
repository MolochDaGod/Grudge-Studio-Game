import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const BASE = import.meta.env.BASE_URL;
const N = (f: string) => `${BASE}models/nature/${f}`;

const TREE_FILES = [
  "CommonTree_1.gltf",
  "CommonTree_2.gltf",
  "CommonTree_3.gltf",
  "CommonTree_4.gltf",
  "CommonTree_5.gltf",
];
const DEAD_FILES = [
  "DeadTree_1.gltf",
  "DeadTree_2.gltf",
  "DeadTree_3.gltf",
];
const ROCK_FILES = [
  "Pebble_Round_1.gltf",
  "Pebble_Round_2.gltf",
  "Pebble_Round_3.gltf",
];
const BUSH_FILES = [
  "Bush_Common.gltf",
  "Bush_Common_Flowers.gltf",
];
const MUSHROOM_FILES = [
  "Mushroom_Common.gltf",
];

function rng(seed: number): number {
  const x = Math.sin(seed + 1) * 43758.5453;
  return x - Math.floor(x);
}

type DecorItem = {
  file: string;
  pos: [number, number, number];
  rot: number;
  scale: number;
};

function useDecorItems(gridW: number, gridH: number, tileSize: number): DecorItem[] {
  return useMemo(() => {
    const mapW = gridW * tileSize;
    const mapH = gridH * tileSize;
    const pad = tileSize * 2;
    const items: DecorItem[] = [];
    let seed = 7;
    const next = () => { seed += 3; return rng(seed); };
    const pick = (arr: string[]) => arr[Math.floor(next() * arr.length)];

    const addTree = (x: number, z: number) => {
      items.push({
        file: pick(TREE_FILES),
        pos: [x + (next() - 0.5) * tileSize, 0, z + (next() - 0.5) * tileSize],
        rot: next() * Math.PI * 2,
        scale: 0.45 + next() * 0.35,
      });
    };
    const addRock = (x: number, z: number) => {
      items.push({
        file: pick(ROCK_FILES),
        pos: [x + (next() - 0.5) * tileSize * 1.5, 0, z + (next() - 0.5) * tileSize * 1.5],
        rot: next() * Math.PI * 2,
        scale: 1.2 + next() * 1.2,
      });
    };
    const addBush = (x: number, z: number) => {
      items.push({
        file: pick(BUSH_FILES),
        pos: [x + (next() - 0.5) * tileSize, 0, z + (next() - 0.5) * tileSize],
        rot: next() * Math.PI * 2,
        scale: 0.4 + next() * 0.3,
      });
    };
    const addDead = (x: number, z: number) => {
      items.push({
        file: pick(DEAD_FILES),
        pos: [x + (next() - 0.5) * tileSize, 0, z + (next() - 0.5) * tileSize],
        rot: next() * Math.PI * 2,
        scale: 0.4 + next() * 0.3,
      });
    };
    const addMushroom = (x: number, z: number) => {
      items.push({
        file: MUSHROOM_FILES[0],
        pos: [x + (next() - 0.5) * tileSize, 0, z + (next() - 0.5) * tileSize],
        rot: next() * Math.PI * 2,
        scale: 0.3 + next() * 0.25,
      });
    };

    // North border — dense tree line
    for (let i = 0; i <= gridW; i++) {
      const x = (i / gridW) * mapW;
      addTree(x, -pad * (0.6 + next() * 0.8));
      if (next() > 0.5) addRock(x + tileSize * 0.5, -pad * 0.3);
      if (next() > 0.6) addBush(x - tileSize * 0.3, -pad * 0.2);
    }

    // South border — dense tree line
    for (let i = 0; i <= gridW; i++) {
      const x = (i / gridW) * mapW;
      addTree(x, mapH + pad * (0.6 + next() * 0.8));
      if (next() > 0.5) addRock(x + tileSize * 0.4, mapH + pad * 0.3);
      if (next() > 0.6) addDead(x - tileSize * 0.3, mapH + pad * 0.2);
    }

    // West border
    for (let i = 0; i <= gridH; i++) {
      const z = (i / gridH) * mapH;
      addTree(-pad * (0.6 + next() * 0.8), z);
      if (next() > 0.55) addRock(-pad * 0.3, z + tileSize * 0.3);
      if (next() > 0.7) addMushroom(-pad * 0.15, z - tileSize * 0.2);
    }

    // East border
    for (let i = 0; i <= gridH; i++) {
      const z = (i / gridH) * mapH;
      addTree(mapW + pad * (0.6 + next() * 0.8), z);
      if (next() > 0.55) addRock(mapW + pad * 0.3, z + tileSize * 0.3);
      if (next() > 0.7) addBush(mapW + pad * 0.15, z - tileSize * 0.2);
    }

    // Corner clusters — extra density
    const corners = [
      [-pad * 1.2, -pad * 1.2],
      [mapW + pad * 1.2, -pad * 1.2],
      [-pad * 1.2, mapH + pad * 1.2],
      [mapW + pad * 1.2, mapH + pad * 1.2],
    ];
    for (const [cx, cz] of corners) {
      for (let k = 0; k < 4; k++) addTree(cx, cz);
      addRock(cx, cz);
      addBush(cx + tileSize * 0.5, cz - tileSize * 0.5);
    }

    return items;
  }, [gridW, gridH, tileSize]);
}

type ModelItemProps = {
  url: string;
  pos: [number, number, number];
  rot: number;
  scale: number;
};

function ModelItem({ url, pos, rot, scale }: ModelItemProps) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((n) => {
      if ((n as THREE.Mesh).isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  return (
    <primitive
      object={clone}
      position={pos}
      rotation={[0, rot, 0]}
      scale={scale}
    />
  );
}

interface NatureDecorProps {
  gridW: number;
  gridH: number;
  tileSize: number;
}

export function NatureDecor({ gridW, gridH, tileSize }: NatureDecorProps) {
  const items = useDecorItems(gridW, gridH, tileSize);
  return (
    <>
      {items.map((item, i) => (
        <ModelItem key={i} url={N(item.file)} pos={item.pos} rot={item.rot} scale={item.scale} />
      ))}
    </>
  );
}

// Preload all model types used
[...TREE_FILES, ...DEAD_FILES, ...ROCK_FILES, ...BUSH_FILES, ...MUSHROOM_FILES].forEach((f) =>
  useGLTF.preload(N(f))
);
