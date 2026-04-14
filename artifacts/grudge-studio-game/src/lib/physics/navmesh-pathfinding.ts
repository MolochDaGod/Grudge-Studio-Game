/**
 * Navmesh Pathfinding Service
 *
 * Wraps donmccurdy/three-pathfinding for AI and unit movement.
 *
 * Architecture:
 * 1. Load a nav mesh GLB (created in Blender or via Recast)
 * 2. Build zone data from the mesh geometry
 * 3. Query paths between world-space points
 * 4. Clamp WASD movement to stay on the navmesh surface
 *
 * The nav mesh is a simplified low-poly version of the walkable terrain.
 * It lives in the same world-space as the game scene but is invisible.
 *
 * Usage:
 *   const nav = new NavmeshService();
 *   await nav.loadNavmesh('/models/levels/ruins_navmesh.glb');
 *   const path = nav.findPath(startPos, targetPos);
 *   // path = [Vector3, Vector3, ...] waypoints
 *
 * For the tactical grid mode, this can generate smooth 3D paths between
 * tile centers that follow terrain contours instead of straight lines.
 */

import * as THREE from 'three';
import { Pathfinding, PathfindingHelper } from 'three-pathfinding';
import { GLTFLoader } from 'three-stdlib';

// ── Types ───────────────────────────────────────────────────────────────────

export interface NavmeshConfig {
  /** URL to the navmesh GLB file */
  url: string;
  /** Zone ID (default: 'level') — supports multiple zones for large maps */
  zoneId?: string;
}

// ── Service ─────────────────────────────────────────────────────────────────

export class NavmeshService {
  private pathfinding = new Pathfinding();
  private zones = new Map<string, boolean>();
  private loader = new GLTFLoader();
  private helper: PathfindingHelper | null = null;

  // Reusable temp vectors
  private _start = new THREE.Vector3();
  private _end = new THREE.Vector3();
  private _clampEnd = new THREE.Vector3();

  /**
   * Load a navmesh GLB and register it as a zone.
   *
   * The GLB should contain a single mesh representing the walkable surface.
   * Create it in Blender: model the walkable floor, export as GLB.
   */
  async loadNavmesh(config: NavmeshConfig): Promise<void>;
  async loadNavmesh(url: string, zoneId?: string): Promise<void>;
  async loadNavmesh(urlOrConfig: string | NavmeshConfig, zoneId?: string): Promise<void> {
    const config = typeof urlOrConfig === 'string'
      ? { url: urlOrConfig, zoneId: zoneId ?? 'level' }
      : { zoneId: 'level', ...urlOrConfig };

    const zone = config.zoneId!;

    return new Promise((resolve, reject) => {
      this.loader.load(
        config.url,
        (gltf) => {
          let navmeshGeometry: THREE.BufferGeometry | null = null;

          gltf.scene.traverse((node) => {
            if (node instanceof THREE.Mesh && !navmeshGeometry) {
              navmeshGeometry = node.geometry;
            }
          });

          if (!navmeshGeometry) {
            reject(new Error(`No mesh found in navmesh GLB: ${config.url}`));
            return;
          }

          const zoneData = Pathfinding.createZone(navmeshGeometry);
          this.pathfinding.setZoneData(zone, zoneData);
          this.zones.set(zone, true);

          console.log(`[NavmeshService] Loaded zone "${zone}" from ${config.url}`);
          resolve();
        },
        undefined,
        (error) => {
          console.error(`[NavmeshService] Failed to load ${config.url}:`, error);
          reject(error);
        },
      );
    });
  }

  /**
   * Build a navmesh zone directly from a BufferGeometry.
   * Useful when you generate terrain procedurally.
   */
  loadFromGeometry(geometry: THREE.BufferGeometry, zoneId = 'level'): void {
    const zoneData = Pathfinding.createZone(geometry);
    this.pathfinding.setZoneData(zoneId, zoneData);
    this.zones.set(zoneId, true);
  }

  /**
   * Build a simple flat navmesh from the tactical grid dimensions.
   *
   * Creates a plane geometry matching the grid, so pathfinding works
   * even without a custom navmesh GLB. Units will path on a flat surface.
   */
  loadFromGrid(
    gridW: number,
    gridH: number,
    tileSize: number,
    zoneId = 'level',
  ): void {
    const width = gridW * tileSize;
    const height = gridH * tileSize;
    const cx = width / 2;
    const cz = height / 2;

    // Create a subdivided plane so the navmesh has enough triangles for pathfinding
    const geo = new THREE.PlaneGeometry(width, height, gridW, gridH);
    // PlaneGeometry is XY by default; rotate to XZ (Y=up)
    geo.rotateX(-Math.PI / 2);
    // Center it on the grid
    geo.translate(cx, 0, cz);

    this.loadFromGeometry(geo, zoneId);
  }

  /** Check if a zone is loaded */
  hasZone(zoneId = 'level'): boolean {
    return this.zones.has(zoneId);
  }

  /**
   * Find a path between two world-space positions.
   *
   * Returns an array of Vector3 waypoints (start is omitted),
   * or null if no path exists.
   */
  findPath(
    start: THREE.Vector3 | [number, number, number],
    end: THREE.Vector3 | [number, number, number],
    zoneId = 'level',
  ): THREE.Vector3[] | null {
    if (!this.zones.has(zoneId)) return null;

    this._start.set(
      ...(Array.isArray(start) ? start : [start.x, start.y, start.z]) as [number, number, number],
    );
    this._end.set(
      ...(Array.isArray(end) ? end : [end.x, end.y, end.z]) as [number, number, number],
    );

    const groupID = this.pathfinding.getGroup(zoneId, this._start);
    if (groupID === null) return null;

    const path = this.pathfinding.findPath(this._start, this._end, zoneId, groupID);
    return path;
  }

  /**
   * Get the navmesh group ID for a position.
   * Returns null if position is off the navmesh.
   */
  getGroup(position: THREE.Vector3, zoneId = 'level'): number | null {
    if (!this.zones.has(zoneId)) return null;
    return this.pathfinding.getGroup(zoneId, position);
  }

  /**
   * Get the closest node on the navmesh to a position.
   */
  getClosestNode(position: THREE.Vector3, zoneId = 'level', groupID?: number) {
    if (!this.zones.has(zoneId)) return null;
    const group = groupID ?? this.pathfinding.getGroup(zoneId, position);
    if (group === null) return null;
    return this.pathfinding.getClosestNode(position, zoneId, group);
  }

  /**
   * Get a random walkable position near a given point.
   * Useful for AI wander behavior.
   */
  getRandomNearby(
    position: THREE.Vector3,
    range: number,
    zoneId = 'level',
  ): THREE.Vector3 | null {
    if (!this.zones.has(zoneId)) return null;
    const groupID = this.pathfinding.getGroup(zoneId, position);
    if (groupID === null) return null;
    const node = this.pathfinding.getRandomNode(zoneId, groupID, position, range);
    return node instanceof THREE.Vector3 ? node : node?.centroid ?? null;
  }

  /**
   * Clamp a movement step to stay on the navmesh surface.
   *
   * Used for real-time WASD movement: given where the character is and
   * where they want to go, returns the closest valid position on the navmesh.
   *
   * This is the key function for open-world / MOBA movement — it prevents
   * characters from walking through walls or off cliffs.
   */
  clampStep(
    start: THREE.Vector3,
    desiredEnd: THREE.Vector3,
    currentNode: any,
    zoneId = 'level',
  ): { position: THREE.Vector3; node: any } | null {
    if (!this.zones.has(zoneId)) return null;
    const groupID = this.pathfinding.getGroup(zoneId, start);
    if (groupID === null) return null;

    const node = currentNode ?? this.pathfinding.getClosestNode(start, zoneId, groupID);
    if (!node) return null;

    const updatedNode = this.pathfinding.clampStep(
      start, desiredEnd, node, zoneId, groupID, this._clampEnd,
    );

    return {
      position: this._clampEnd.clone(),
      node: updatedNode,
    };
  }

  // ── Debug helper ────────────────────────────────────────────────────────

  /**
   * Create or get the PathfindingHelper for visual debugging.
   * Add the returned Object3D to your scene.
   */
  getHelper(): PathfindingHelper {
    if (!this.helper) {
      this.helper = new PathfindingHelper();
    }
    return this.helper;
  }

  /**
   * Update the debug helper to show a path.
   */
  debugPath(
    playerPos: THREE.Vector3,
    targetPos: THREE.Vector3,
    path: THREE.Vector3[] | null,
  ): void {
    if (!this.helper) return;
    this.helper.reset();
    this.helper.setPlayerPosition(playerPos);
    this.helper.setTargetPosition(targetPos);
    if (path) this.helper.setPath(path);
  }
}

// ── Singleton instance ──────────────────────────────────────────────────────
// Most games need exactly one pathfinding service.

export const navmeshService = new NavmeshService();
