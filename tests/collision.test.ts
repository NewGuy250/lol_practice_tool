import { describe, it, expect } from 'vitest';
import { circleCircle, closestPointOnSegment, circleVsSweptCircle } from '../src/core/collision';

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
