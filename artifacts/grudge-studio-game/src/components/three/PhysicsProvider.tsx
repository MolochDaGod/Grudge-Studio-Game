/**
 * PhysicsProvider — composite wrapper for both physics engines.
 *
 * Provides:
 * 1. @react-three/rapier <Physics> for character bodies, terrain, triggers
 * 2. Cannon-ES combat world stepper for weapon hitbox detection
 * 3. React context for combat world access from child components
 */

import React, { createContext, useContext, useRef } from 'react';
import { Physics } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import { stepCombatWorld, combatWorld } from '@/lib/physics/cannon-combat-world';
import type * as CANNON from 'cannon-es';

// ── Combat World Context ────────────────────────────────────────────────────

interface CombatWorldContextValue {
  world: typeof combatWorld;
}

const CombatWorldContext = createContext<CombatWorldContextValue | null>(null);

/** Access the singleton Cannon-ES combat world from any R3F child component. */
export function useCombatWorld(): typeof combatWorld {
  const ctx = useContext(CombatWorldContext);
  if (!ctx) throw new Error('useCombatWorld must be used inside <PhysicsProvider>');
  return ctx.world;
}

// ── Combat World Stepper ────────────────────────────────────────────────────
// Must be a child of <Canvas> so useFrame works.

function CombatWorldStepper() {
  useFrame((_, delta) => {
    // Clamp dt to prevent physics explosions on tab-switch / lag spikes
    const dt = Math.min(delta, 1 / 30);
    stepCombatWorld(dt);
  });
  return null;
}

// ── PhysicsProvider ─────────────────────────────────────────────────────────

interface PhysicsProviderProps {
  children: React.ReactNode;
  /** Enable Rapier debug wireframes (default: false) */
  debug?: boolean;
  /** Gravity vector for Rapier world (default: [0, -9.81, 0]) */
  gravity?: [number, number, number];
  /** Pause all physics simulation */
  paused?: boolean;
}

export function PhysicsProvider({
  children,
  debug = false,
  gravity = [0, -9.81, 0],
  paused = false,
}: PhysicsProviderProps) {
  const worldValue = useRef<CombatWorldContextValue>({ world: combatWorld });

  return (
    <Physics
      gravity={gravity}
      debug={debug}
      paused={paused}
      timeStep="vary"
    >
      <CombatWorldContext.Provider value={worldValue.current}>
        <CombatWorldStepper />
        {children}
      </CombatWorldContext.Provider>
    </Physics>
  );
}
