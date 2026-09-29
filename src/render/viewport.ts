import type { Vec2 } from '../core/vec';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../core/arena';

/**
 * Maps the fixed-size world arena onto the canvas, scaled uniformly to fit
 * (letterboxed) and recalculated on resize. Nothing outside this module
 * should need to know about screen pixels.
 */

export { ARENA_WIDTH, ARENA_HEIGHT };

export interface Viewport {
  /** CSS pixel size of the canvas element. */
  screenWidth: number;
  screenHeight: number;
  /** World units -> CSS pixels scale factor. */
  scale: number;
  /** CSS-pixel offset of the arena's top-left corner within the canvas. */
  offsetX: number;
  offsetY: number;
}

export function computeViewport(screenWidth: number, screenHeight: number): Viewport {
  const scale = Math.min(screenWidth / ARENA_WIDTH, screenHeight / ARENA_HEIGHT);
  const offsetX = (screenWidth - ARENA_WIDTH * scale) / 2;
  const offsetY = (screenHeight - ARENA_HEIGHT * scale) / 2;
  return { screenWidth, screenHeight, scale, offsetX, offsetY };
}

export function worldToScreen(viewport: Viewport, world: Vec2): Vec2 {
  return {
    x: viewport.offsetX + world.x * viewport.scale,
    y: viewport.offsetY + world.y * viewport.scale,
  };
}

export function screenToWorld(viewport: Viewport, screen: Vec2): Vec2 {
  return {
    x: (screen.x - viewport.offsetX) / viewport.scale,
    y: (screen.y - viewport.offsetY) / viewport.scale,
  };
}

/** Scales a world-space length (e.g. a radius) into CSS pixels. */
export function worldLengthToScreen(viewport: Viewport, length: number): number {
  return length * viewport.scale;
}
