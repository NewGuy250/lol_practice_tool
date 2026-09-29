import { createPlayer, stepPlayer, spawnPositionCenter, PLAYER_RADIUS } from '../entities/player';
import type { PlayerState, PlayerCommand } from '../entities/player';
import { createBot, stepBot } from '../entities/bot';
import type { BotState } from '../entities/bot';
import { spawnLinearSkillshot, stepLinearSkillshot, isLinearSkillshotExpired } from '../entities/skillshot';
import type { LinearSkillshot } from '../entities/skillshot';
import { circleVsSweptCircle, circleCircle, circleVsOrientedRect, circleVsCone } from '../core/collision';
import { sub, length, normalize } from '../core/vec';
import type { Vec2 } from '../core/vec';
import {
  ABILITIES,
  PIERCING_BOLT,
  BINDING_ROOT,
  VOID_ERUPTION,
  ARCING_LANCE,
  SWEEPING_BLADE,
} from '../abilities/definitions';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../core/arena';

/**
 * Owns all simulation entities and advances them one fixed step at a time.
 * Pure/functional: `stepWorld` takes the previous state and returns the
 * next state plus a list of events for the renderer/UI/audio to react to.
 * Must not import from render/ or ui/ (see PLAN.md's architecture rule).
 */

export interface WorldEvent {
  type: 'hit' | 'cast';
  abilityId: string;
}

export interface WorldState {
  player: PlayerState;
  bots: BotState[];
  skillshots: LinearSkillshot[];
}

export function createWorld(): WorldState {
  const margin = 180;
  const bots = [
    createBot({ x: ARENA_WIDTH / 2, y: margin }, PIERCING_BOLT.id, 1),
    createBot({ x: ARENA_WIDTH / 2, y: ARENA_HEIGHT - margin }, BINDING_ROOT.id, 1.5),
    createBot({ x: margin, y: ARENA_HEIGHT / 2 }, VOID_ERUPTION.id, 2),
    createBot({ x: ARENA_WIDTH - margin, y: ARENA_HEIGHT / 2 }, ARCING_LANCE.id, 2.5),
    createBot({ x: margin, y: margin }, SWEEPING_BLADE.id, 3),
  ];
  return {
    player: createPlayer(spawnPositionCenter()),
    bots,
    skillshots: [],
  };
}

/** Unit direction from `origin` to `aimPoint`, defaulting to +x if they coincide. */
function directionTo(origin: Vec2, aimPoint: Vec2): Vec2 {
  const d = sub(aimPoint, origin);
  return length(d) > 1e-6 ? normalize(d) : { x: 1, y: 0 };
}

export interface WorldStepResult {
  world: WorldState;
  events: WorldEvent[];
}

export function stepWorld(world: WorldState, dt: number, playerCommand: PlayerCommand): WorldStepResult {
  const events: WorldEvent[] = [];

  const player = stepPlayer(world.player, dt, playerCommand);

  const bots: BotState[] = [];
  const newlySpawned: LinearSkillshot[] = [];
  for (const bot of world.bots) {
    const ability = ABILITIES[bot.abilityId];
    if (!ability) {
      bots.push(bot);
      continue;
    }
    const result = stepBot(bot, dt, ability, player.position);
    bots.push(result.bot);
    if (!result.cast) continue;

    events.push({ type: 'cast', abilityId: result.cast.abilityId });
    const { origin, aimPoint } = result.cast;

    switch (ability.archetype) {
      case 'linear':
      case 'linearSlow': {
        newlySpawned.push(spawnLinearSkillshot(ability, origin, directionTo(origin, aimPoint)));
        break;
      }
      case 'circle': {
        // Ground-targeted: the effect resolves instantly at the locked point.
        if (circleCircle(aimPoint, ability.radius, player.position, PLAYER_RADIUS)) {
          events.push({ type: 'hit', abilityId: ability.id });
        }
        break;
      }
      case 'beam': {
        // Instant-hit rectangle from the bot, along the locked aim direction.
        const direction = directionTo(origin, aimPoint);
        const halfLength = ability.length / 2;
        const halfWidth = ability.width / 2;
        const rectCenter = {
          x: origin.x + direction.x * halfLength,
          y: origin.y + direction.y * halfLength,
        };
        const angle = Math.atan2(direction.y, direction.x);
        if (circleVsOrientedRect(player.position, PLAYER_RADIUS, rectCenter, halfLength, halfWidth, angle)) {
          events.push({ type: 'hit', abilityId: ability.id });
        }
        break;
      }
      case 'cone': {
        // Instant-hit sector from the bot, along the locked aim direction.
        const direction = directionTo(origin, aimPoint);
        if (circleVsCone(player.position, PLAYER_RADIUS, origin, direction, ability.angle / 2, ability.range)) {
          events.push({ type: 'hit', abilityId: ability.id });
        }
        break;
      }
    }
  }

  const survivors: LinearSkillshot[] = [];
  for (const shot of world.skillshots) {
    const stepped = stepLinearSkillshot(shot, dt);
    const projectileRadius = stepped.width / 2;
    const hit = circleVsSweptCircle(
      player.position,
      PLAYER_RADIUS,
      stepped.previousPosition,
      stepped.position,
      projectileRadius
    );
    if (hit) {
      events.push({ type: 'hit', abilityId: stepped.abilityId });
      continue; // the projectile disappears on hit
    }
    if (!isLinearSkillshotExpired(stepped)) {
      survivors.push(stepped);
    }
  }

  return {
    world: { player, bots, skillshots: [...survivors, ...newlySpawned] },
    events,
  };
}
