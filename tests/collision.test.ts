import { describe, it, expect } from 'vitest';
import {
  circleCircle,
  closestPointOnSegment,
  circleVsSweptCircle,
  circleVsOrientedRect,
  circleVsCone,
} from '../src/core/collision';

describe('circleCircle', () => {
  it('detects overlapping circles', () => {
    expect(circleCircle({ x: 0, y: 0 }, 5, { x: 8, y: 0 }, 5)).toBe(true);
  });

  it('detects circles that are exactly touching as a hit (edge counts)', () => {
    expect(circleCircle({ x: 0, y: 0 }, 5, { x: 10, y: 0 }, 5)).toBe(true);
  });

  it('detects circles that are far apart as a miss', () => {
    expect(circleCircle({ x: 0, y: 0 }, 5, { x: 100, y: 0 }, 5)).toBe(false);
  });
});

describe('closestPointOnSegment', () => {
  it('returns the perpendicular projection when it falls within the segment', () => {
    const p = closestPointOnSegment({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(p.x).toBeCloseTo(5);
    expect(p.y).toBeCloseTo(0);
  });

  it('clamps to the start when the projection falls before the segment', () => {
    const p = closestPointOnSegment({ x: -5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(p).toEqual({ x: 0, y: 0 });
  });

  it('clamps to the end when the projection falls past the segment', () => {
    const p = closestPointOnSegment({ x: 15, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(p).toEqual({ x: 10, y: 0 });
  });

  it('handles a degenerate (zero-length) segment', () => {
    const p = closestPointOnSegment({ x: 3, y: 4 }, { x: 1, y: 1 }, { x: 1, y: 1 });
    expect(p).toEqual({ x: 1, y: 1 });
  });
});

describe('circleVsSweptCircle', () => {
  it('detects a direct hit when the projectile ends inside the player', () => {
    const hit = circleVsSweptCircle({ x: 0, y: 0 }, 65, { x: -50, y: 0 }, { x: 0, y: 0 }, 60);
    expect(hit).toBe(true);
  });

  it('misses when the projectile path never comes near the player', () => {
    const hit = circleVsSweptCircle({ x: 0, y: 0 }, 65, { x: 0, y: 1000 }, { x: 100, y: 1000 }, 60);
    expect(hit).toBe(false);
  });

  it('catches a fast projectile that tunnels past the player between ticks', () => {
    // A 2000 u/s projectile at 60 Hz moves ~33.3 units per tick — much less
    // than the player's diameter, so this case alone wouldn't prove much.
    // The real tunneling risk is a *wide* jump: simulate a worst case where
    // the projectile's endpoint-only positions straddle the player on both
    // sides in a single tick, which an endpoint-only (non-swept) check would
    // completely miss.
    const player = { x: 0, y: 0 };
    const playerRadius = 65;
    const projRadius = 60;
    const prev = { x: -150, y: 0 };
    const now = { x: 150, y: 0 };

    // Sanity check: naive endpoint-only circle tests both miss.
    expect(circleCircle(player, playerRadius, prev, projRadius)).toBe(false);
    expect(circleCircle(player, playerRadius, now, projRadius)).toBe(false);

    // But the swept segment passes directly through the player, so it must hit.
    expect(circleVsSweptCircle(player, playerRadius, prev, now, projRadius)).toBe(true);
  });

  it('never lets a 2000 u/s projectile pass through the player unregistered, across a full flight', () => {
    // Simulate a full linear-shot flight at 60 Hz directly at a stationary
    // player and assert the swept test fires on some tick before the shot's
    // endpoint position would already be well past the player.
    const dt = 1 / 60;
    const speed = 2000;
    const playerRadius = 65;
    const projRadius = 60; // width 120
    const player = { x: 600, y: 300 };

    let prev = { x: 0, y: 300 }; // directly upstream of the player, same y
    let hitTick = -1;
    for (let tick = 0; tick < 60; tick++) {
      const now = { x: prev.x + speed * dt, y: prev.y };
      if (circleVsSweptCircle(player, playerRadius, prev, now, projRadius)) {
        hitTick = tick;
        break;
      }
      prev = now;
    }

    expect(hitTick).toBeGreaterThanOrEqual(0);
  });

  it('a graze at exactly the combined radius counts as a hit', () => {
    const hit = circleVsSweptCircle({ x: 0, y: 0 }, 65, { x: -100, y: 125 }, { x: 100, y: 125 }, 60);
    // Closest point on the segment to the origin is (0, 125); combined radius is 125.
    expect(hit).toBe(true);
  });

  it('just outside the combined radius is a miss', () => {
    const hit = circleVsSweptCircle({ x: 0, y: 0 }, 65, { x: -100, y: 126 }, { x: 100, y: 126 }, 60);
    expect(hit).toBe(false);
  });
});

describe('circleVsOrientedRect', () => {
  // Rect: centered at (100, 0), 200 long (halfLength 100) x 40 wide (halfWidth 20),
  // unrotated (angle 0) — so it spans x in [0, 200], y in [-20, 20].

  it('hits when the circle center is inside the rect', () => {
    const hit = circleVsOrientedRect({ x: 100, y: 0 }, 10, { x: 100, y: 0 }, 100, 20, 0);
    expect(hit).toBe(true);
  });

  it('hits when the circle grazes the long edge exactly at the combined radius', () => {
    const hit = circleVsOrientedRect({ x: 100, y: 30 }, 10, { x: 100, y: 0 }, 100, 20, 0);
    expect(hit).toBe(true); // distance to edge is 10, equal to the circle's radius
  });

  it('misses just past the long edge', () => {
    const hit = circleVsOrientedRect({ x: 100, y: 31 }, 10, { x: 100, y: 0 }, 100, 20, 0);
    expect(hit).toBe(false);
  });

  it('misses beyond the short (end) edge', () => {
    // Rect ends at x=200; circle center at x=215 is 15 units past the edge, outside its radius 10.
    const hit = circleVsOrientedRect({ x: 215, y: 0 }, 10, { x: 100, y: 0 }, 100, 20, 0);
    expect(hit).toBe(false);
  });

  it('accounts for rotation: a rect rotated 90° checks along the y axis instead', () => {
    // Same rect rotated 90°: now spans y in [0, 200], x in [-20, 20] around its center.
    const insideRotated = circleVsOrientedRect({ x: 0, y: 100 }, 10, { x: 0, y: 100 }, 100, 20, Math.PI / 2);
    expect(insideRotated).toBe(true);

    // A point that would be inside the unrotated rect but is outside once rotated.
    const outsideAfterRotation = circleVsOrientedRect({ x: 100, y: 0 }, 10, { x: 0, y: 0 }, 100, 20, Math.PI / 2);
    expect(outsideAfterRotation).toBe(false);
  });
});

describe('circleVsCone', () => {
  const origin = { x: 0, y: 0 };
  const dir = { x: 1, y: 0 }; // pointing along +x
  const halfAngle = Math.PI / 6; // 30°, so a 60° total cone
  const range = 500;

  it('hits a target straight down the centerline, within range', () => {
    expect(circleVsCone({ x: 300, y: 0 }, 30, origin, dir, halfAngle, range)).toBe(true);
  });

  it('misses a target directly behind the apex', () => {
    expect(circleVsCone({ x: -300, y: 0 }, 30, origin, dir, halfAngle, range)).toBe(false);
  });

  it('misses a target beyond range even if angularly aligned', () => {
    expect(circleVsCone({ x: 600, y: 0 }, 30, origin, dir, halfAngle, range)).toBe(false);
  });

  it('hits a target just within range accounting for the circle radius reaching in', () => {
    // Center at 520 but radius 30 reaches back to 490, within the 500 range.
    expect(circleVsCone({ x: 520, y: 0 }, 30, origin, dir, halfAngle, range)).toBe(true);
  });

  it('hits a target well within the angular half-width', () => {
    const y = 300 * Math.tan(halfAngle * 0.5); // halfway to the edge angle
    expect(circleVsCone({ x: 300, y }, 20, origin, dir, halfAngle, range)).toBe(true);
  });

  it('misses a target well outside the angular half-width', () => {
    const y = 300 * Math.tan(halfAngle) + 200; // well past the edge angle
    expect(circleVsCone({ x: 300, y }, 20, origin, dir, halfAngle, range)).toBe(false);
  });

  it('hits when the circle overlaps the apex itself', () => {
    expect(circleVsCone({ x: 5, y: 5 }, 20, origin, dir, halfAngle, range)).toBe(true);
  });

  it('grazes near the angular edge thanks to the circle radius (tangent-line test)', () => {
    // Place the circle center exactly on the cone's edge ray at distance d;
    // any positive radius should register as a graze/hit at that exact angle.
    const d = 300;
    const edgeAngle = halfAngle;
    const center = { x: d * Math.cos(edgeAngle), y: d * Math.sin(edgeAngle) };
    expect(circleVsCone(center, 15, origin, dir, halfAngle, range)).toBe(true);
  });
});
