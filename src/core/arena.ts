import type { Vec2 } from './vec';
import { clampVec } from './vec';

/**
 * The fixed world-space arena. Lives in core/ (not render/) so that
 * entities/ and game/ can depend on it without reaching into the
 * rendering layer, per the architecture rule in PLAN.md.
 */
export const ARENA_WIDTH = 2400;
export const ARENA_HEIGHT = 1400;

/** Clamps a point so a circle of the given radius stays fully inside the arena. */
export function clampToArena(point: Vec2, radius: number): Vec2 {
  return clampVec(
    point,
    { x: radius, y: radius },
    { x: ARENA_WIDTH - radius, y: ARENA_HEIGHT - radius }
  );
}
