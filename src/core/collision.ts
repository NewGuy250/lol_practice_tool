import type { Vec2 } from './vec';
import { sub, dot, lengthSq, distanceSq, length, angleOf, normalizeAngle } from './vec';

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

/**
 * Tests a circle against an oriented rectangle (used for `beam` shots).
 * The rectangle is centered at `rectCenter`, rotated by `angle` radians
 * (its local +x axis points along `angle`), with half-extents `halfLength`
 * along that local x axis and `halfWidth` along the local y axis.
 */
export function circleVsOrientedRect(
  circleCenter: Vec2,
  circleRadius: number,
  rectCenter: Vec2,
  halfLength: number,
  halfWidth: number,
  angle: number
): boolean {
  // Transform the circle center into the rectangle's local (unrotated) space.
  const dx = circleCenter.x - rectCenter.x;
  const dy = circleCenter.y - rectCenter.y;
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;

  // Closest point on the now axis-aligned rect to the circle center.
  const closestX = Math.max(-halfLength, Math.min(halfLength, localX));
  const closestY = Math.max(-halfWidth, Math.min(halfWidth, localY));

  const distX = localX - closestX;
  const distY = localY - closestY;
  return distX * distX + distY * distY <= circleRadius * circleRadius;
}

/**
 * Tests a circle against a sector/wedge (used for `cone` shots) with its
 * apex at `origin`, pointing along unit vector `dir`, spanning `halfAngle`
 * radians on each side of `dir`, out to `range` units.
 *
 * Approximation: a circle at distance d from the apex overlaps the
 * (unbounded) wedge if the angle between `dir` and the circle's center is
 * within `halfAngle` plus the angle the circle's own radius subtends at
 * that distance (the tangent-line test) — then that's clipped by `range`.
 * This is a close, cheap approximation rather than exact arc geometry, and
 * is what the unit tests below pin down.
 */
export function circleVsCone(
  circleCenter: Vec2,
  circleRadius: number,
  origin: Vec2,
  dir: Vec2,
  halfAngle: number,
  range: number
): boolean {
  const toCenter = sub(circleCenter, origin);
  const d = length(toCenter);

  if (d - circleRadius > range) return false; // entirely beyond range
  if (d <= circleRadius) return true; // circle contains the apex

  const angularRadius = Math.asin(Math.min(1, circleRadius / d));
  const angleToCenter = Math.abs(normalizeAngle(angleOf(toCenter) - angleOf(dir)));
  return angleToCenter <= halfAngle + angularRadius;
}
