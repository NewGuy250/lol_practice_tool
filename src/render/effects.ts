import type { Vec2 } from '../core/vec';

/**
 * Purely visual, non-simulation state (click markers, later: screen shake,
 * floating text). Lives in render/ and is driven by sim time passed in from
 * the main loop, so it stays deterministic even though it's not tested.
 */

export interface ClickMarker {
  position: Vec2;
  age: number;
}

export interface EffectsState {
  clickMarkers: ClickMarker[];
}

export const CLICK_MARKER_LIFETIME = 0.45;

export function createEffectsState(): EffectsState {
  return { clickMarkers: [] };
}

export function spawnClickMarker(state: EffectsState, position: Vec2): void {
  state.clickMarkers.push({ position: { ...position }, age: 0 });
}

export function stepEffects(state: EffectsState, dt: number): void {
  for (const marker of state.clickMarkers) {
    marker.age += dt;
  }
  state.clickMarkers = state.clickMarkers.filter((m) => m.age < CLICK_MARKER_LIFETIME);
}
