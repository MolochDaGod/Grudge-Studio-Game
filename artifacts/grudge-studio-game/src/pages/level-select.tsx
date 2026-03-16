import { useLocation } from 'wouter';
import { useGameStore } from '@/store/use-game-store';
import { FantasyButton } from '@/components/ui/fantasy-button';
import { LEVELS } from '@/lib/levels';
import { ArrowLeft, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

const THEME_IMAGES: Record<string, string> = {
  ruins:    'image_1773522056852.png',   // Ruin pack preview
  orc:      'image_1773522072048.png',   // Orc fortress
  elven:    'image_1773522080785.png',   // Elven fortress
  medieval: 'image_1773522089831.png',   // Medieval fortress
};

const THEME_PALETTE: Record<string, { bg: string; border: string; glow: string }> = {
  ruins:    { bg: 'from-green-950 to-stone-950',  border: 'border-stone-500',  glow: '#8a8a6a' },
  orc:      { bg: 'from-red-950 to-orange-950',   border: 'border-red-600',    glow: '#cc4400' },
  elven:    { bg: 'from-emerald-950 to-teal-950', border: 'border-emerald-500', glow: '#22aa66' },
  medieval: { bg: 'from-slate-900 to-blue-950',   border: 'border-blue-600',   glow: '#4466aa' },
};

const GRID_LABELS: Record<string, string> = {
  ruins:    '80 × 80',
  orc:      '100 × 100',
  elven:    '120 × 120',
  medieval: '140 × 140',
};

export default function LevelSelect() {
  const [, setLocation] = useLocation();
  const { setCurrentLevelId, phase } = useGameStore();

  const handleSelectLevel = (levelId: string) => {
    setCurrentLevelId(levelId);
    setLocation('/battle');
  };

  if (phase !== 'battle') {
    // If somehow navigated here without squad, redirect
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-background z-0" />

      <div className="relative z-10 pt-8 px-4 container mx-auto max-w-6xl">
        <div className="flex items-center gap-4 mb-10">
          <FantasyButton variant="ghost" onClick={() => setLocation('/select')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </FantasyButton>
          <div>
            <h1 className="font-display text-4xl font-bold text-primary text-glow uppercase tracking-widest">
              Choose Battlefield
            </h1>
            <p className="text-muted-foreground font-serif italic mt-1">
              Select the arena where blood will be spilled.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {LEVELS.map((level, idx) => {
            const pal = THEME_PALETTE[level.theme];
            const imgFile = THEME_IMAGES[level.theme];
            return (
              <div
                key={level.id}
                className={cn(
                  'group relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all duration-300',
                  'hover:scale-[1.02] hover:shadow-2xl',
                  pal.border,
                )}
                style={{ boxShadow: `0 0 0 0 ${pal.glow}` }}
                onClick={() => handleSelectLevel(level.id)}
              >
                {/* Background image */}
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={`${import.meta.env.BASE_URL}images/${imgFile}`}
                    alt={level.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className={cn('absolute inset-0 bg-gradient-to-t', pal.bg, 'opacity-60')} />
                  <div className="absolute top-3 right-3 bg-black/70 px-2 py-1 rounded text-xs font-mono text-white border border-white/20">
                    ⊞ {GRID_LABELS[level.id]}
                  </div>
                  <div className="absolute top-3 left-3 bg-black/70 px-2 py-1 rounded text-xs font-bold text-white/80">
                    LVL {idx + 1}
                  </div>
                </div>

                {/* Info panel */}
                <div className={cn('p-5 bg-gradient-to-b', pal.bg, 'bg-opacity-90 border-t', pal.border)}>
                  <h2 className="font-display text-2xl font-bold text-white uppercase tracking-wide mb-1">
                    {level.name}
                  </h2>
                  <p className="text-white/70 text-sm font-serif italic leading-relaxed mb-4">
                    {level.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-4 text-xs font-mono text-white/60">
                      <span>Grid: {level.gridW}×{level.gridH}</span>
                      <span>Obstacles: {level.obstacleTiles.size}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FantasyButton
                        variant="ghost"
                        className="text-xs px-3 gap-1 border border-white/20"
                        onClick={(e) => { e.stopPropagation(); setLocation(`/map-editor/${level.id}`); }}
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </FantasyButton>
                      <FantasyButton
                        variant="primary"
                        className="text-sm px-6"
                        onClick={(e) => { e.stopPropagation(); handleSelectLevel(level.id); }}
                      >
                        Deploy
                      </FantasyButton>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
