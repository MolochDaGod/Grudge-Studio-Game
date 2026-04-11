/**
 * Collision groups — powers of 2, shared between Rapier and Cannon-ES.
 *
 * Pattern from gonnavis/annihilate: each layer is a bit flag so they can be
 * combined with bitwise OR for collision masks.
 */

// ── Bit-flag groups ─────────────────────────────────────────────────────────

export const GROUP_TERRAIN        = 0x0001; // 1   — ground, walls, obstacles
export const GROUP_PLAYER         = 0x0002; // 2   — player character body
export const GROUP_ENEMY          = 0x0004; // 4   — enemy character body
export const GROUP_NPC            = 0x0008; // 8   — neutral NPC body
export const GROUP_PLAYER_WEAPON  = 0x0010; // 16  — player weapon hitbox (attacker)
export const GROUP_ENEMY_WEAPON   = 0x0020; // 32  — enemy weapon hitbox (attacker)
export const GROUP_TRIGGER        = 0x0040; // 64  — teleporters, zone triggers, jump pads
export const GROUP_SHIELD         = 0x0080; // 128 — shield collider (blocks weapon hits)
export const GROUP_PROJECTILE     = 0x0100; // 256 — arrows, spells, etc.
export const GROUP_SENSOR         = 0x0200; // 512 — detection radius, aggro zones

export const GROUP_ALL = 0xFFFF;

// ── Rapier interaction-group helpers ────────────────────────────────────────
// Rapier packs membership (high 16 bits) and filter (low 16 bits) into one u32.
// See: https://rapier.rs/docs/user_guides/javascript/colliders#collision-groups

/** Build a Rapier-compatible interaction group from membership + filter masks. */
export function rapierGroups(membership: number, filter: number): number {
  return ((membership & 0xFFFF) << 16) | (filter & 0xFFFF);
}

// ── Rapier presets ──────────────────────────────────────────────────────────

/** Player character body: collides with terrain, enemies, enemy weapons, triggers */
export const RAPIER_PLAYER = rapierGroups(
  GROUP_PLAYER,
  GROUP_TERRAIN | GROUP_ENEMY | GROUP_NPC | GROUP_ENEMY_WEAPON | GROUP_TRIGGER,
);

/** Enemy character body: collides with terrain, players, player weapons, triggers */
export const RAPIER_ENEMY = rapierGroups(
  GROUP_ENEMY,
  GROUP_TERRAIN | GROUP_PLAYER | GROUP_NPC | GROUP_PLAYER_WEAPON | GROUP_TRIGGER,
);

/** NPC body: collides with terrain, player, enemy */
export const RAPIER_NPC = rapierGroups(
  GROUP_NPC,
  GROUP_TERRAIN | GROUP_PLAYER | GROUP_ENEMY,
);

/** Terrain/ground: collides with everything that has terrain in its filter */
export const RAPIER_TERRAIN = rapierGroups(
  GROUP_TERRAIN,
  GROUP_ALL,
);

/** Trigger zone (sensor): collides with player + enemy */
export const RAPIER_TRIGGER = rapierGroups(
  GROUP_TRIGGER,
  GROUP_PLAYER | GROUP_ENEMY | GROUP_NPC,
);

/** Shield collider: collides with player weapons */
export const RAPIER_SHIELD = rapierGroups(
  GROUP_SHIELD,
  GROUP_PLAYER_WEAPON,
);

// ── Cannon-ES preset objects ────────────────────────────────────────────────
// Usage: new CANNON.Body({ collisionFilterGroup: CANNON_PLAYER.group, collisionFilterMask: CANNON_PLAYER.mask })

export const CANNON_PLAYER = {
  group: GROUP_PLAYER,
  mask: GROUP_TERRAIN | GROUP_ENEMY | GROUP_NPC | GROUP_ENEMY_WEAPON | GROUP_TRIGGER,
};

export const CANNON_ENEMY = {
  group: GROUP_ENEMY,
  mask: GROUP_TERRAIN | GROUP_PLAYER | GROUP_NPC | GROUP_PLAYER_WEAPON | GROUP_TRIGGER,
};

export const CANNON_PLAYER_WEAPON = {
  group: GROUP_PLAYER_WEAPON,
  mask: GROUP_ENEMY | GROUP_SHIELD | GROUP_ENEMY_WEAPON,
};

export const CANNON_ENEMY_WEAPON = {
  group: GROUP_ENEMY_WEAPON,
  mask: GROUP_PLAYER | GROUP_SHIELD,
};

export const CANNON_SHIELD = {
  group: GROUP_SHIELD,
  mask: GROUP_PLAYER_WEAPON,
};

export const CANNON_TERRAIN = {
  group: GROUP_TERRAIN,
  mask: GROUP_ALL,
};

export const CANNON_PROJECTILE = {
  group: GROUP_PROJECTILE,
  mask: GROUP_TERRAIN | GROUP_PLAYER | GROUP_ENEMY | GROUP_SHIELD,
};
