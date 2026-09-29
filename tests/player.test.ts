import { describe, it, expect } from 'vitest';
import { createPlayer, stepPlayer, PLAYER_RADIUS, PLAYER_MOVE_SPEED } from '../src/entities/player';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../src/core/arena';
import { distance } from '../src/core/vec';

describe('player movement', () => {
  it('stays put with no command', () => {
    const p0 = createPlayer({ x: 100, y: 100 });
    const p1 = stepPlayer(p0, 1 / 60, {});
    expect(p1.position).toEqual({ x: 100, y: 100 });
    expect(p1.moveTarget).toBeNull();
  });

  it('sets a destination and moves toward it without overshooting in a single step', () => {
    const p0 = createPlayer({ x: 0 + PLAYER_RADIUS, y: 100 });
    const dt = 1 / 60;
    const p1 = stepPlayer(p0, dt, { moveTo: { x: 1000, y: 100 } });

    const expectedDelta = PLAYER_MOVE_SPEED * dt;
    expect(p1.position.x).toBeCloseTo(p0.position.x + expectedDelta);
    expect(p1.position.y).toBeCloseTo(100);
    expect(p1.moveTarget).not.toBeNull();
  });

  it('reaches the destination exactly and stops without overshoot', () => {
    let p = createPlayer({ x: 500, y: 500 });
    const dest = { x: 520, y: 500 }; // 20 units away, closer than one tick's travel distance
    p = stepPlayer(p, 1 / 60, { moveTo: dest });

    // One tick moves PLAYER_MOVE_SPEED/60 ≈ 5.67 units, so it should NOT arrive yet.
    expect(p.moveTarget).not.toBeNull();
    expect(distance(p.position, dest)).toBeGreaterThan(0);

    // Step enough times to definitely arrive; verify it lands exactly and clears the target.
    for (let i = 0; i < 600; i++) {
      p = stepPlayer(p, 1 / 60, {});
    }
    expect(p.position.x).toBeCloseTo(dest.x, 5);
    expect(p.position.y).toBeCloseTo(dest.y, 5);
    expect(p.moveTarget).toBeNull();
  });

  it('never overshoots the destination across many steps', () => {
    let p = createPlayer({ x: 100, y: 100 });
    const dest = { x: 900, y: 700 };
    p = stepPlayer(p, 1 / 60, { moveTo: dest });

    let steps = 0;
    while (p.moveTarget !== null && steps < 10_000) {
      const before = distance(p.position, dest);
      p = stepPlayer(p, 1 / 60, {});
      const after = distance(p.position, dest);
      // Distance to destination must never increase and must never go negative/overshoot.
      expect(after).toBeLessThanOrEqual(before + 1e-9);
      steps++;
    }
    expect(p.position.x).toBeCloseTo(dest.x, 5);
    expect(p.position.y).toBeCloseTo(dest.y, 5);
  });

  it('stop clears the move target and halts the player in place', () => {
    let p = createPlayer({ x: 100, y: 100 });
    p = stepPlayer(p, 1 / 60, { moveTo: { x: 900, y: 100 } });
    const posAfterOneStep = p.position;

    p = stepPlayer(p, 1 / 60, { stop: true });
    expect(p.moveTarget).toBeNull();
    expect(p.position).toEqual(posAfterOneStep);

    // Further steps with no command keep it stationary.
    p = stepPlayer(p, 1 / 60, {});
    expect(p.position).toEqual(posAfterOneStep);
  });

  it('clamps movement so the player never leaves the arena', () => {
    let p = createPlayer({ x: 100, y: 100 });
    // Click far outside the arena bounds.
    p = stepPlayer(p, 1 / 60, { moveTo: { x: -5000, y: -5000 } });

    for (let i = 0; i < 2000; i++) {
      p = stepPlayer(p, 1 / 60, {});
    }

    expect(p.position.x).toBeCloseTo(PLAYER_RADIUS, 5);
    expect(p.position.y).toBeCloseTo(PLAYER_RADIUS, 5);
    expect(p.moveTarget).toBeNull(); // should arrive at the clamped corner and stop

    // Also check the opposite corner.
    let p2 = createPlayer({ x: 100, y: 100 });
    p2 = stepPlayer(p2, 1 / 60, { moveTo: { x: ARENA_WIDTH + 5000, y: ARENA_HEIGHT + 5000 } });
    for (let i = 0; i < 2000; i++) {
      p2 = stepPlayer(p2, 1 / 60, {});
    }
    expect(p2.position.x).toBeCloseTo(ARENA_WIDTH - PLAYER_RADIUS, 5);
    expect(p2.position.y).toBeCloseTo(ARENA_HEIGHT - PLAYER_RADIUS, 5);
  });

  it('updates facing to point toward the movement direction', () => {
    let p = createPlayer({ x: 500, y: 500 });
    p = stepPlayer(p, 1 / 60, { moveTo: { x: 500, y: 1000 } }); // straight down (+y)
    expect(p.facing).toBeCloseTo(Math.PI / 2);
  });

  it('holding the move command every tick keeps following an updating cursor', () => {
    let p = createPlayer({ x: 0 + PLAYER_RADIUS, y: 100 });
    // Simulate "hold right-click": destination resent every tick, tracking a moving cursor.
    for (let i = 0; i < 10; i++) {
      p = stepPlayer(p, 1 / 60, { moveTo: { x: 200 + i * 5, y: 100 } });
    }
    expect(p.moveTarget).toEqual({ x: 245, y: 100 });
  });
});
