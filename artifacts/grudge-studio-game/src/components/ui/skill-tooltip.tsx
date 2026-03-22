import { Target, Clock, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skill } from '@/lib/weapon-skills';

interface SkillTooltipProps {
  skill: Skill;
  tierLabel: string;
  tierColor: string;
}

const tagColors: Record<string, string> = {
  damage: 'text-orange-400', heal: 'text-green-400', buff: 'text-blue-400',
  debuff: 'text-purple-400', aoe: 'text-yellow-300', ultimate: 'text-yellow-400',
  attack: 'text-red-400', utility: 'text-cyan-400', move: 'text-sky-400',
};

export function SkillTooltip({ skill, tierLabel, tierColor }: SkillTooltipProps) {
  return (
    <div className="absolute bottom-full mb-2 z-50 pointer-events-none" style={{ width: 240, left: '50%', transform: 'translateX(-50%)' }}>
      <div className="bg-[#0d0d14] border border-primary/60 rounded-lg shadow-2xl p-3 text-left">
        {/* Header */}
        <div className="flex items-start gap-2 mb-1.5">
          <span className="text-2xl leading-none shrink-0">{skill.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display text-sm font-bold text-white uppercase tracking-wide leading-tight">{skill.name}</span>
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest shrink-0"
                style={{ backgroundColor: tierColor + '33', color: tierColor, border: `1px solid ${tierColor}55` }}
              >{tierLabel}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-[11px] text-white/70 italic leading-snug mb-2">{skill.description}</p>

        {/* Stats chips */}
        {skill.stats.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {skill.stats.map((s, i) => (
              <span key={i} className="text-[10px] bg-white/8 border border-white/15 rounded px-1.5 py-0.5 text-white/80 font-mono">{s}</span>
            ))}
          </div>
        )}

        {/* Tags + meta */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
          <span className="flex items-center gap-1 text-white/50"><Target className="w-2.5 h-2.5" />Range {skill.attackType === 'dash' ? `${skill.range}+${skill.dashBonus ?? 0} dash` : (skill.range ?? 1)}</span>
          {skill.attackType === 'jump' && (
            <span className="flex items-center gap-1 text-emerald-400 font-bold">🦘 Leap (ignores walls)</span>
          )}
          {skill.attackType === 'dash' && (
            <span className="flex items-center gap-1 text-amber-400 font-bold">💨 Dash (ignores LOS)</span>
          )}
          {skill.cooldown > 0 && skill.cooldown < 999 && (
            <span className="flex items-center gap-1 text-orange-400/80"><Clock className="w-2.5 h-2.5" />CD {skill.cooldown}</span>
          )}
          {skill.cooldown === 999 && (
            <span className="flex items-center gap-1 text-yellow-400"><Star className="w-2.5 h-2.5" />Once per battle</span>
          )}
          {skill.aoe && <span className="flex items-center gap-1 text-yellow-300"><Zap className="w-2.5 h-2.5" />AoE</span>}
          <div className="flex gap-1 flex-wrap">
            {skill.tags.map(t => (
              <span key={t} className={cn('capitalize font-bold', tagColors[t] ?? 'text-white/50')}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
