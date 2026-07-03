import React from 'react';
import { cn } from '@/lib/utils';

export const GAME_CHROME = {
  battleTop: 52,
  battleBottom: 130,
  deployTop: 56,
  deployBottom: 0,
} as const;

export interface GameViewportProps {
  /** Three.js / R3F scene — fills the area between top and bottom chrome */
  canvas: React.ReactNode;
  topBar?: React.ReactNode;
  bottomBar?: React.ReactNode;
  /** Floating HUD panels (minimap, tooltips, side panels) */
  children?: React.ReactNode;
  loading?: React.ReactNode;
  topHeight?: number;
  bottomHeight?: number;
  className?: string;
}

/**
 * Full-screen game shell: canvas layer + chrome + overlays.
 * Uses CSS variables so canvas always fills the viewport between HUD bars.
 */
export function GameViewport({
  canvas,
  topBar,
  bottomBar,
  children,
  loading,
  topHeight = GAME_CHROME.battleTop,
  bottomHeight = GAME_CHROME.battleBottom,
  className,
}: GameViewportProps) {
  const style = {
    '--game-chrome-top': `${topHeight}px`,
    '--game-chrome-bottom': `${bottomHeight}px`,
  } as React.CSSProperties;

  return (
    <div className={cn('game-viewport select-none', className)} style={style}>
      <div className="game-canvas-layer" data-game-canvas>
        {canvas}
      </div>
      <div className="game-canvas-vignette" aria-hidden />

      {topBar && (
        <header className="game-chrome-top" data-game-chrome="top">
          {topBar}
        </header>
      )}

      {bottomBar && (
        <footer className="game-chrome-bottom" data-game-chrome="bottom">
          {bottomBar}
        </footer>
      )}

      {children && (
        <div className="game-overlay-layer pointer-events-none">
          {children}
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 z-50 pointer-events-auto">{loading}</div>
      )}
    </div>
  );
}

/** Wrapper for panels that need pointer events inside the overlay layer */
export function GameOverlayPanel({
  children,
  className,
  position = 'right',
}: {
  children: React.ReactNode;
  className?: string;
  position?: 'right' | 'left' | 'center' | 'bottom-left' | 'bottom-right';
}) {
  const posClass =
    position === 'right'
      ? 'top-[var(--game-chrome-top)] right-3 bottom-[var(--game-chrome-bottom)]'
      : position === 'left'
        ? 'top-[var(--game-chrome-top)] left-3 bottom-[var(--game-chrome-bottom)]'
        : position === 'bottom-left'
          ? 'bottom-[calc(var(--game-chrome-bottom)+12px)] left-3'
          : position === 'bottom-right'
            ? 'bottom-[calc(var(--game-chrome-bottom)+12px)] right-3'
            : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';

  return (
    <div className={cn('absolute z-30 pointer-events-auto', posClass, className)}>
      {children}
    </div>
  );
}