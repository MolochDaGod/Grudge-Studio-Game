import { Link } from 'wouter';
import { GameNav } from '@/components/game/GameNav';

/** Placeholder panel — links to character select / team builder flows. */
export default function PanelPage() {
  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <GameNav />
      <div className="pt-16 px-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-amber-300 mb-2">Game Panel</h1>
        <p className="text-white/60 text-sm mb-6">
          Equipment, attributes, and skills live here. Use the links below while the full panel is wired up.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/teams" className="px-4 py-2 rounded bg-white/10 hover:bg-white/15 border border-white/20 text-sm">
            Team Builder
          </Link>
          <Link href="/select" className="px-4 py-2 rounded bg-white/10 hover:bg-white/15 border border-white/20 text-sm">
            Character Select
          </Link>
          <Link href="/skill-tree" className="px-4 py-2 rounded bg-white/10 hover:bg-white/15 border border-white/20 text-sm">
            Skill Tree
          </Link>
        </div>
      </div>
    </div>
  );
}