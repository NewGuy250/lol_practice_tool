import { describe, it, expect } from 'vitest';
import { spawnLinearSkillshot, stepLinearSkillshot, isLinearSkillshotExpired } from '../src/entities/skillshot';
import { PIERCING_BOLT } from '../src/abilities/definitions';

describe('linear skillshot', () => {
  it('spawns at the origin with a normalized direction', () => {
    const shot = spawnLinearSkillshot(PIERCING_BOLT, { x: 10, y: 20 }, { x: 3, y: 4 });
    expect(shot.position).toEqual({ x: 10, y: 20 });
    expect(shot.previousPosition).toEqual({ x: 10, y: 20 });
    expect(shot.direction.x).toBeCloseTo(0.6);
    expect(shot.direction.y).toBeCloseTo(0.8);
    expect(shot.distanceTraveled).toBe(0);
  });

  it('advances by speed * dt each step and tracks previousPosition', () => {
    let shot = spawnLinearSkillshot(PIERCING_BOLT, { x: 0, y: 0 }, { x: 1, y: 0 });
    const dt = 1 / 60;
    shot = stepLinearSkillshot(shot, dt);
    expect(shot.position.x).toBeCloseTo(PIERCING_BOLT.speed * dt);
    expect(shot.previousPosition).toEqual({ x: 0, y: 0 });
    expect(shot.distanceTraveled).toBeCloseTo(PIERCING_BOLT.speed * dt);
  });

  it('expires once it has traveled its full range', () => {
    let shot = spawnLinearSkillshot(PIERCING_BOLT, { x: 0, y: 0 }, { x: 1, y: 0 });
    expect(isLinearSkillshotExpired(shot)).toBe(false);

    const dt = 1 / 60;
    let ticks = 0;
    while (!isLinearSkillshotExpired(shot) && ticks < 10_000) {
      shot = stepLinearSkillshot(shot, dt);
      ticks++;
    }
    expect(isLinearSkillshotExpired(shot)).toBe(true);
    expect(shot.distanceTraveled).toBeGreaterThanOrEqual(PIERCING_BOLT.range);
  });
});
