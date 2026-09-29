import type { Vec2 } from '../core/vec';
import { add, scale, normalize } from '../core/vec';
import type { LinearAbilityDef } from '../abilities/definitions';

/** A live linear projectile in flight. `circle`/`beam`/`cone`/`ring` shots arrive in Phase 3. */
export interface LinearSkillshot {
  abilityId: string;
  archetype: 'linear' | 'linearSlow';
  /** Current leading-edge position. */
  position: Vec2;
  /** Position last tick, used for swept-circle collision. */
  previousPosition: Vec2;
  /** Unit vector of travel. */
  direction: Vec2;
  speed: number;
  /** Full width; collision radius is width / 2. */
  width: number;
  distanceTraveled: number;
  range: number;
  color: string;
}

export function spawnLinearSkillshot(
  ability: LinearAbilityDef,
  origin: Vec2,
  direction: Vec2
): LinearSkillshot {
  return {
    abilityId: ability.id,
    archetype: ability.archetype,
    position: { ...origin },
    previousPosition: { ...origin },
    direction: normalize(direction),
    speed: ability.speed,
    width: ability.width,
    distanceTraveled: 0,
    range: ability.range,
    color: ability.color,
  };
}

export function stepLinearSkillshot(shot: LinearSkillshot, dt: number): LinearSkillshot {
  const delta = shot.speed * dt;
  return {
    ...shot,
    previousPosition: shot.position,
    position: add(shot.position, scale(shot.direction, delta)),
    distanceTraveled: shot.distanceTraveled + delta,
  };
}

export function isLinearSkillshotExpired(shot: LinearSkillshot): boolean {
  return shot.distanceTraveled >= shot.range;
}
