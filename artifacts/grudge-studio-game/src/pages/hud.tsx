import { Link } from 'wouter';
import { GameNav } from '@/components/game/GameNav';
import { HealthBar, StatBar } from '@/components/ui/health-bar';
import { CHARACTERS } from '@/lib/characters';

const DEMO = CHARACTERS.find((c) => c.id === 'human_warrior')!;

export default function HudPage() {
  return (
    <div className="h-screen w-screen bg-[#0a0a12] relative overflow-hidden">
      <GameNav />

      {/* 3D world sits behind this overlay in production; here we show the HUD chrome */}
      <div className="absolute inset-0 pt-11 flex flex-col pointer-events-none">
        <div className="flex-1" />

        {/* Bottom HUD bar */}
        <div className="pointer-events-auto px-4 pb-4">
          <div className="max-w-4xl mx-auto rounded-lg border border-white/15 bg-black/80 p-4 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded border border-amber-500/40 bg-amber-900/30 flex items-center justify-center text-2xl">
                ⚔️
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-amber-200 truncate">{DEMO.name}</div>
                <div className="text-xs text-white/50 mb-2">{DEMO.race} · {DEMO.role}</div>
                <HealthBar current={DEMO.hp} max={DEMO.hp} label="HP" />
                <div className="mt-1">
                  <StatBar current={100} max={100} label="MP" fillClass="bg-blue-500" />
                </div>
              </div>
              <div className="flex flex-col gap-2 text-xs">
                <Link
                  href="/world"
                  className="px-3 py-2 rounded bg-amber-600/80 hover:bg-amber-500 text-white font-semibold text-center"
                >
                  Open World
                </Link>
                <Link
                  href="/battle"
                  className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-white/90 font-semibold text-center border border-white/20"
                >
                  Enter Battle
                </Link>
              </div>
            </div>

            {/* Hotbar slots */}
            <div className="mt-4 flex gap-2 justify-center">
              {['1', '2', '3', '4', '5', '6', '7', '8'].map((slot) => (
                <div
                  key={slot}
                  className="w-10 h-10 rounded border border-white/20 bg-white/5 flex items-center justify-center text-white/40 text-xs font-mono"
                >
                  {slot}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="absolute top-14 left-1/2 -translate-x-1/2 text-white/30 text-xs pointer-events-none">
        HUD overlay — use <strong className="text-white/50">Open World</strong> for the 3D gameboard
      </p>
    </div>
  );
}