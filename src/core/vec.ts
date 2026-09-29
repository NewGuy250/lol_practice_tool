/** Minimal 2D vector math. All functions are pure and return new objects. */

export interface Vec2 {
  x: number;
  y: number;
}

export function vec(x: number, y: number): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, y: a.y * s };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function lengthSq(a: Vec2): number {
  return a.x * a.x + a.y * a.y;
}

export function length(a: Vec2): number {
  return Math.sqrt(lengthSq(a));
}

export function distance(a: Vec2, b: Vec2): number {
  return length(sub(a, b));
}

export function distanceSq(a: Vec2, b: Vec2): number {
  return lengthSq(sub(a, b));
}

/** Returns a unit vector in the direction of `a`, or (0,0) if `a` is the zero vector. */
export function normalize(a: Vec2): Vec2 {
  const len = length(a);
  if (len < 1e-9) return { x: 0, y: 0 };
  return { x: a.x / len, y: a.y / len };
}

/** Clamps a point to lie within [min, max] on both axes. */
export function clampVec(a: Vec2, min: Vec2, max: Vec2): Vec2 {
  return {
    x: Math.min(Math.max(a.x, min.x), max.x),
    y: Math.min(Math.max(a.y, min.y), max.y),
  };
}

export function angleOf(a: Vec2): number {
  return Math.atan2(a.y, a.x);
}

export function fromAngle(angle: number, len = 1): Vec2 {
  return { x: Math.cos(angle) * len, y: Math.sin(angle) * len };
}

/** Wraps an angle (radians) into (-PI, PI]. */
export function normalizeAngle(angle: number): number {
  let a = angle % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/** Moves `from` toward `to` by at most `maxDelta` units, without overshooting. */
export function moveToward(from: Vec2, to: Vec2, maxDelta: number): Vec2 {
  const diff = sub(to, from);
  const dist = length(diff);
  if (dist <= maxDelta || dist < 1e-9) return { ...to };
  return add(from, scale(diff, maxDelta / dist));
}
