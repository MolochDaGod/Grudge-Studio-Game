/**
 * Character identity helpers — grudge_id, backend UUID, and roster model IDs.
 *
 * Three IDs coexist in the game:
 *   grudge_id     — player account (from auth JWT)
 *   character.id  — backend character UUID or numeric id
 *   characterId   — roster/model key e.g. "human_mage" (3D + portraits)
 */
import { CHARACTERS } from '@/lib/characters';
import type { GrudgeCharacter } from '@/lib/grudge-api';

/** Map API class names to roster suffix used in characterId. */
export function classToModelSuffix(classId: string): string {
  switch (classId.toLowerCase().replace(/\s+/g, '_')) {
    case 'rogue':
      return 'ranger';
    case 'cleric':
    case 'mage_priest':
    case 'magepriest':
      return 'worg';
    default:
      return classId.toLowerCase().replace(/\s+/g, '_');
  }
}

/** Map a backend character to a 3D model / portrait roster id. */
export function mapCharacterModelId(char: GrudgeCharacter): string {
  const race = char.race.toLowerCase().replace(/\s+/g, '_');
  const suffix = classToModelSuffix(char.class);
  const id = `${race}_${suffix}`;
  return CHARACTERS.some((c) => c.id === id) ? id : `${race}_warrior`;
}

/** Role label from a roster id (human_mage → Mage). */
export function roleFromCharacterId(characterId: string): string {
  const hero = CHARACTERS.find((c) => c.id === characterId);
  if (hero) return hero.role;
  const suffix = characterId.split('_').pop() ?? 'warrior';
  if (suffix === 'worg') return 'Worg';
  return suffix.charAt(0).toUpperCase() + suffix.slice(1);
}

/** abilityEffects.json class key from tactical role. */
export function abilityClassFromRole(role: string): string {
  switch (role.toLowerCase()) {
    case 'worg':
      return 'worge';
    case 'mage':
      return 'mage';
    case 'ranger':
      return 'ranger';
    default:
      return 'warrior';
  }
}

export function tacticalUnitId(char: GrudgeCharacter): string {
  return `grudge_${String(char.id)}`;
}