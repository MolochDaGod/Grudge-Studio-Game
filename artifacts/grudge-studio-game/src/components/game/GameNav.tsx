import { Link, useLocation } from 'wouter';

const LINKS = [
  { href: '/world', label: 'World' },
  { href: '/hud', label: 'HUD' },
  { href: '/battle', label: 'Battle' },
  { href: '/vfx', label: 'VFX' },
  { href: '/spells', label: 'Spells' },
  { href: '/panel', label: 'Panel' },
] as const;

export function GameNav() {
  const [path] = useLocation();

  return (
    <nav className="absolute top-0 left-0 right-0 z-50 flex items-center gap-2 px-3 py-2 bg-black/70 border-b border-white/10 backdrop-blur-sm">
      <span className="text-xs font-bold tracking-widest text-amber-400 mr-2">GRUDGE</span>
      {LINKS.map(({ href, label }) => {
        const active = path === href || path.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={[
              'px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wide transition-colors',
              active
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent',
            ].join(' ')}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}