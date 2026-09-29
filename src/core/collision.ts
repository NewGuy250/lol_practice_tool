import type { Vec2 } from './vec';
import { sub, dot, lengthSq, distanceSq } from './vec';

/**
 * Pure collision geometry, unit-tested in tests/collision.test.ts.
 * Archetype-specific shapes (beam, cone, ring) are added in Phase 3.
 */

export function circleCircle(aPos: Vec2, aRadius: number, bPos: Vec2, bRadius: number): boolean {
  const r = aRadius + bRadius;
  return distanceSq(aPos, bPos) <= r * r;
}

/** Closest point on segment [a, b] to point p. */
export function closestPointOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const ab = sub(b, a);
  const abLenSq = lengthSq(ab);
  if (abLenSq < 1e-9) return { ...a };
  let t = dot(sub(p, a), ab) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + ab.x * t, y: a.y + ab.y * t };
}

/**
 * Swept-circle (capsule) test: did a moving circle (from `projPrev` to
 * `projNow`, radius `projRadius`) touch a stationary circle at `playerPos`
 * at any point along that path this tick?
 *
 * This is required for fast projectiles: at 2000 u/s and a 60 Hz step, a
 * projectile travels ~33 units per tick, so testing only the endpoint
 * position against the player's circle would let it tunnel straight
 * through a player standing in its path.
 */
export function circleVsSweptCircle(
  playerPos: Vec2,
  playerRadius: number,
  projPrev: Vec2,
  projNow: Vec2,
  projRadius: number
): boolean {
  const closest = closestPointOnSegment(playerPos, projPrev, projNow);
  const r = playerRadius + projRadius;
  return distanceSq(playerPos, closest) <= r * r;
}
