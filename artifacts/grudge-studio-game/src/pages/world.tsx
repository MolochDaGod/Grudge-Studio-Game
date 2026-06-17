import { lazy, Suspense } from 'react';
import { GameNav } from '@/components/game/GameNav';

const WorldBoardScene = lazy(() => import('@/components/world/WorldBoardScene'));

export default function WorldPage() {
  return (
    <div className="h-screen w-screen bg-black relative overflow-hidden">
      <GameNav />
      <div className="absolute inset-0 pt-11">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-white/50 text-sm">
              Loading 3D world…
            </div>
          }
        >
          <WorldBoardScene />
        </Suspense>
      </div>
    </div>
  );
}