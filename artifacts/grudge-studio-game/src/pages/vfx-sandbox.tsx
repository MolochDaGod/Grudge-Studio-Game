import { useMemo } from 'react';
import { VfxSandbox, type CharacterVfxContext } from '@workspace/vfx-sandbox';
import { useLocation } from 'wouter';
import { GameNav } from '@/components/game/GameNav';
import { useAuthStore } from '@/store/use-auth-store';
import { useGameStore } from '@/store/use-game-store';
import { CHARACTERS } from '@/lib/characters';
import {
  abilityClassFromRole,
  mapCharacterModelId,
  roleFromCharacterId,
} from '@/lib/character-identity';

const SPELLS_PATHS = new Set(['/spells', '/spellbook']);

function resolveActiveCharacterId(
  pendingIds: string[] | undefined,
  squadIds: string[],
  backendCharModelId: string | null,
): string | null {
  if (pendingIds?.[0]) return pendingIds[0];
  if (squadIds[0]) return squadIds[0];
  return backendCharModelId;
}

export default function VfxSandboxPage() {
  const [path] = useLocation();
  const defaultTab = SPELLS_PATHS.has(path) ? 'spells' : 'effects';
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');

  const {
    grudgeId,
    displayName,
    isAuthenticated,
    backendCharacters,
  } = useAuthStore();
  const pendingSquad = useGameStore((s) => s.pendingSquad);
  const playerSquad = useGameStore((s) => s.playerSquad);

  const characterContext = useMemo((): CharacterVfxContext | null => {
    const backendModelId = backendCharacters[0]
      ? mapCharacterModelId(backendCharacters[0])
      : null;

    const characterId = resolveActiveCharacterId(
      pendingSquad?.selectedIds,
      playerSquad,
      backendModelId,
    );

    if (!characterId && !grudgeId) return null;

    const staticHero = CHARACTERS.find((c) => c.id === characterId);
    const backendHero = backendCharacters.find(
      (c) => mapCharacterModelId(c) === characterId,
    );
    const role = staticHero?.role
      ?? (characterId ? roleFromCharacterId(characterId) : null);

    return {
      grudgeId: isAuthenticated ? grudgeId : null,
      displayName: displayName ?? null,
      characterId,
      characterName: staticHero?.name ?? backendHero?.name ?? characterId,
      role,
      abilityClassKey: role ? abilityClassFromRole(role) : null,
    };
  }, [
    backendCharacters,
    displayName,
    grudgeId,
    isAuthenticated,
    pendingSquad?.selectedIds,
    playerSquad,
  ]);

  return (
    <div className="h-screen w-screen flex flex-col bg-black">
      <GameNav />
      <div className="flex-1 min-h-0">
        <VfxSandbox
          key={`${path}-${characterContext?.characterId ?? 'none'}`}
          defaultTab={defaultTab}
          homeHref={`${base}/`}
          characterContext={characterContext}
        />
      </div>
    </div>
  );
}