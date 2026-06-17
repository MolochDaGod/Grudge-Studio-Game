import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Flame, Snowflake, Zap, Sparkles, Bomb, Star, Sword, Wind, Skull,
  Search, Loader2, Play, RefreshCw, Wand2, BookOpen,
} from 'lucide-react';
import type { CharacterVfxContext, EffectCategory, EffectPreset, SpellEntry, VfxSandboxTab } from '../types';
import {
  effectToPreset,
  flattenSpellEntries,
  load3dFxRegistry,
  loadAbilityEffects,
  loadShaderPair,
} from '../registry';
import { useVfxPreview } from '../hooks/useVfxPreview';
import { BUILTIN_SHADERS } from '../shaders';

const CATEGORY_ICONS: Record<string, typeof Flame> = {
  fire: Flame,
  ice: Snowflake,
  lightning: Zap,
  magic: Sparkles,
  impact: Bomb,
  aura: Star,
  portal: Sparkles,
  combat: Sword,
  annihilator: Skull,
  environment: Wind,
};

export interface VfxSandboxProps {
  defaultTab?: VfxSandboxTab['id'];
  homeHref?: string;
  className?: string;
  /** When set, spells tab defaults to this character's class abilities. */
  characterContext?: CharacterVfxContext | null;
}

export function VfxSandbox({
  defaultTab = 'effects',
  homeHref,
  className = '',
  characterContext = null,
}: VfxSandboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<VfxSandboxTab['id']>(defaultTab);

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (characterContext?.abilityClassKey && tab === 'spells') {
      setGroup(characterContext.abilityClassKey);
    }
  }, [characterContext?.abilityClassKey, tab]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<EffectCategory | 'all'>('all');
  const [group, setGroup] = useState<string>(
    characterContext?.abilityClassKey && defaultTab === 'spells'
      ? characterContext.abilityClassKey
      : 'all',
  );
  const [presets, setPresets] = useState<EffectPreset[]>([]);
  const [spells, setSpells] = useState<SpellEntry[]>([]);
  const [categories, setCategories] = useState<Record<string, { name: string; color: string; count: number }>>({});
  const [active, setActive] = useState<EffectPreset | null>(null);
  const [activeSpell, setActiveSpell] = useState<SpellEntry | null>(null);
  const [bloomStrength, setBloomStrength] = useState(1.5);
  const [intensity, setIntensity] = useState(1);
  const [autoRotate, setAutoRotate] = useState(true);

  const { ready, webglOk, playPreset, clear } = useVfxPreview(containerRef, {
    bloomStrength,
    bloomRadius: 0.4,
    bloomThreshold: 0.2,
    intensity,
    autoRotate,
    showGrid: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [fx, abilities] = await Promise.all([load3dFxRegistry(), loadAbilityEffects()]);
        if (cancelled) return;
        const list = Object.values(fx.effects).map(effectToPreset);
        setPresets(list);
        setCategories(fx.categories);
        setSpells(flattenSpellEntries(abilities, fx));
        if (list[0]) {
          setActive(list[0]);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load VFX data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const play = useCallback(async (preset: EffectPreset) => {
    setActive(preset);
    setActiveSpell(null);
    const registry = await load3dFxRegistry();
    const shaders = { ...BUILTIN_SHADERS };
    if (preset.shader) {
      const pair = await loadShaderPair(registry, preset.shader);
      if (pair) shaders[preset.shader] = pair;
    }
    playPreset(preset, shaders);
  }, [playPreset]);

  const playSpell = useCallback(async (spell: SpellEntry) => {
    setActiveSpell(spell);
    if (!spell.mapped3dFxId) return;
    const registry = await load3dFxRegistry();
    const fx = registry.effects[spell.mapped3dFxId];
    if (!fx) return;
    const preset = effectToPreset(fx);
    setActive(preset);
    await play(preset);
  }, [play]);

  useEffect(() => {
    if (ready && active && tab === 'effects' && !activeSpell) play(active);
  }, [ready, active, tab, activeSpell, play]);

  const filteredEffects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return presets.filter(p => {
      if (category !== 'all' && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    });
  }, [presets, search, category]);

  const spellGroups = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of spells) map.set(s.group, s.groupLabel);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [spells]);

  const filteredSpells = useMemo(() => {
    const q = search.trim().toLowerCase();
    return spells.filter(s => {
      if (group !== 'all' && s.group !== group) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.binding.effect.toLowerCase().includes(q) ||
        (s.mapped3dFxId ?? '').toLowerCase().includes(q)
      );
    });
  }, [spells, search, group]);

  return (
    <div className={`flex flex-col h-full min-h-screen bg-[#0a0a0f] text-white ${className}`}>
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/60 backdrop-blur">
        <Sparkles className="w-5 h-5 text-amber-400" />
        <div>
          <h1 className="text-sm font-bold tracking-widest text-amber-300">VFX SANDBOX</h1>
          <p className="text-[10px] text-white/50">Shared 3D effects + spell bindings for all Grudge games</p>
        </div>
        {characterContext?.characterId ? (
          <div className="ml-4 text-[10px] text-white/50 border border-white/10 rounded px-2 py-1">
            <span className="text-amber-300/90">{characterContext.characterName ?? characterContext.characterId}</span>
            {characterContext.role ? <span className="text-white/40"> · {characterContext.role}</span> : null}
            {characterContext.grudgeId ? (
              <span className="text-white/30 block font-mono truncate max-w-[140px]">
                {characterContext.grudgeId.slice(0, 8)}…
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="ml-auto flex gap-2">
          {homeHref ? (
            <a href={homeHref} className="text-xs px-3 py-1.5 rounded border border-white/15 hover:bg-white/10">Home</a>
          ) : null}
          <button
            type="button"
            onClick={() => setTab('effects')}
            className={`text-xs px-3 py-1.5 rounded border ${tab === 'effects' ? 'bg-amber-500/20 border-amber-500/40 text-amber-200' : 'border-white/15 text-white/70'}`}
          >
            <Flame className="w-3 h-3 inline mr-1" />3D FX
          </button>
          <button
            type="button"
            onClick={() => setTab('spells')}
            className={`text-xs px-3 py-1.5 rounded border ${tab === 'spells' ? 'bg-amber-500/20 border-amber-500/40 text-amber-200' : 'border-white/15 text-white/70'}`}
          >
            <BookOpen className="w-3 h-3 inline mr-1" />Spells
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-72 shrink-0 border-r border-white/10 flex flex-col bg-black/40">
          <div className="p-3 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-white/40" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={tab === 'effects' ? 'Search 3D effects…' : 'Search spells…'}
                className="w-full pl-8 pr-3 py-2 text-xs rounded bg-white/5 border border-white/10 outline-none focus:border-amber-500/50"
              />
            </div>
            {tab === 'effects' ? (
              <div className="flex flex-wrap gap-1 mt-2">
                <FilterChip active={category === 'all'} onClick={() => setCategory('all')} label="All" />
                {Object.entries(categories).map(([id, c]) => (
                  <FilterChip key={id} active={category === id} onClick={() => setCategory(id as EffectCategory)} label={c.name} />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1 mt-2 max-h-24 overflow-y-auto">
                <FilterChip active={group === 'all'} onClick={() => setGroup('all')} label="All" />
                {spellGroups.map(([id, label]) => (
                  <FilterChip key={id} active={group === id} onClick={() => setGroup(id)} label={label} />
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-white/50 text-xs gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading registry…
              </div>
            ) : error ? (
              <p className="text-xs text-red-400 p-2">{error}</p>
            ) : tab === 'effects' ? (
              filteredEffects.map(p => {
                const Icon = CATEGORY_ICONS[p.category] ?? Sparkles;
                const selected = active?.id === p.id && !activeSpell;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => play(p)}
                    className={`w-full text-left px-2 py-2 rounded text-xs flex gap-2 items-start ${selected ? 'bg-amber-500/15 border border-amber-500/30' : 'hover:bg-white/5 border border-transparent'}`}
                  >
                    <Icon className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <span>
                      <span className="font-semibold block">{p.name}</span>
                      <span className="text-white/45 line-clamp-2">{p.description}</span>
                    </span>
                  </button>
                );
              })
            ) : (
              filteredSpells.map(spell => {
                const selected = activeSpell?.id === spell.id;
                return (
                  <button
                    key={spell.id}
                    type="button"
                    onClick={() => playSpell(spell)}
                    className={`w-full text-left px-2 py-2 rounded text-xs ${selected ? 'bg-amber-500/15 border border-amber-500/30' : 'hover:bg-white/5 border border-transparent'}`}
                  >
                    <span className="font-semibold block">{spell.name}</span>
                    <span className="text-white/45 block">{spell.groupLabel}</span>
                    <span className="text-[10px] text-cyan-300/80">2D: {spell.binding.effect}</span>
                    {spell.mapped3dFxId ? (
                      <span className="text-[10px] text-amber-300/80 block">3D: {spell.mapped3dFxId}</span>
                    ) : (
                      <span className="text-[10px] text-white/30 block">No 3D mapping</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className="flex-1 relative min-w-0">
          {!webglOk ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-red-300">WebGL unavailable</div>
          ) : (
            <div ref={containerRef} className="absolute inset-0" />
          )}
          {active ? (
            <div className="absolute bottom-3 left-3 right-3 md:right-auto md:max-w-md rounded-lg bg-black/70 border border-white/10 p-3 text-xs backdrop-blur">
              <div className="font-bold text-amber-200">{active.name}</div>
              <div className="text-white/60 mt-1">{active.description}</div>
              {activeSpell ? (
                <div className="mt-2 text-white/50">
                  Spell: {activeSpell.name} · sprite <code className="text-cyan-300">{activeSpell.binding.effect}</code>
                  {activeSpell.binding.beam ? <> · beam <code>{activeSpell.binding.beam}</code></> : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </main>

        <aside className="w-56 shrink-0 border-l border-white/10 p-3 space-y-4 bg-black/40 text-xs hidden lg:block">
          <Section title="Preview">
            <button type="button" onClick={() => active && play(active)} className="flex items-center gap-1 px-2 py-1.5 rounded bg-amber-600/30 border border-amber-500/40 w-full justify-center">
              <Play className="w-3 h-3" /> Replay
            </button>
            <button type="button" onClick={clear} className="flex items-center gap-1 px-2 py-1.5 rounded border border-white/15 w-full justify-center mt-1">
              <RefreshCw className="w-3 h-3" /> Clear
            </button>
          </Section>
          <Section title="Bloom">
            <Slider label="Strength" value={bloomStrength} min={0} max={3} step={0.1} onChange={setBloomStrength} />
          </Section>
          <Section title="Effect">
            <Slider label="Intensity" value={intensity} min={0.2} max={3} step={0.1} onChange={setIntensity} />
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={autoRotate} onChange={e => setAutoRotate(e.target.checked)} />
              Auto-rotate camera
            </label>
          </Section>
          <Section title="Registry">
            <Stat label="3D effects" value={presets.length} />
            <Stat label="Spell bindings" value={spells.length} />
            <Stat label="Mapped spells" value={spells.filter(s => s.mapped3dFxId).length} />
          </Section>
          <p className="text-[10px] text-white/35 leading-relaxed">
            Replaces legacy <Wand2 className="w-3 h-3 inline" /> 3dfx-viewer and VFX_BROWSER pages with a unified React sandbox wired to ObjectStore.
          </p>
        </aside>
      </div>
    </div>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-0.5 rounded text-[10px] border ${active ? 'bg-white/15 border-white/25' : 'border-white/10 text-white/50'}`}
    >
      {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">{title}</div>
      {children}
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-white/50">{label} {value.toFixed(1)}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full mt-1" />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between py-0.5 text-white/60">
      <span>{label}</span>
      <span className="text-amber-300">{value}</span>
    </div>
  );
}